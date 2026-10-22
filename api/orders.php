<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/order-domain.php';
require_once __DIR__ . '/order-schema.php';

header('Allow: POST');
header('Referrer-Policy: same-origin');

if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
    rock_json(['error' => 'هذه الواجهة تستقبل الطلبات باستخدام POST فقط.'], 405);
}
if (!rock_is_configured()) {
    rock_json(['error' => 'استقبال الطلبات غير مفعّل على هذه الاستضافة بعد.'], 503);
}
if (!rock_request_is_https()) {
    rock_json(['error' => 'يلزم تفعيل HTTPS قبل إرسال بيانات الطلب.'], 400);
}

$origin = trim((string)($_SERVER['HTTP_ORIGIN'] ?? ''));
if ($origin !== '') {
    $originParts = parse_url($origin);
    $originHost = is_array($originParts) ? strtolower((string)($originParts['host'] ?? '')) : '';
    $originScheme = is_array($originParts) ? strtolower((string)($originParts['scheme'] ?? '')) : '';
    $requestHost = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
    if ($originHost === '' || $requestHost === '' || $originHost !== preg_replace('/:\d+$/', '', $requestHost) || $originScheme !== 'https') {
        rock_json(['error' => 'مصدر الطلب غير مسموح. حدّث صفحة المتجر وحاول مجددًا.'], 403);
    }
}

$contentType = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
if (!str_contains($contentType, 'application/json')) {
    rock_json(['error' => 'نوع البيانات غير مدعوم.'], 415);
}
$contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > 20000) {
    rock_json(['error' => 'حجم الطلب أكبر من المسموح.'], 413);
}
$raw = file_get_contents('php://input');
if (!is_string($raw) || strlen($raw) > 20000) {
    rock_json(['error' => 'تعذّر قراءة الطلب.'], 400);
}
try {
    $payload = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
} catch (JsonException $error) {
    rock_json(['error' => 'بيانات الطلب ليست JSON صالحًا.'], 400);
}
if (!is_array($payload)) {
    rock_json(['error' => 'صيغة الطلب غير صحيحة.'], 422);
}

/* Quietly absorb bot submissions aimed at the hidden honeypot field. */
$honeypot = trim((string)($payload['website'] ?? ''));
if ($honeypot !== '') {
    rock_json(['ok' => true, 'orderNumber' => 'ROCK-RECEIVED', 'status' => 'received'], 202);
}

try {
    $pdo = rock_db();
    if (!rock_is_install_complete($pdo)) {
        rock_json(['error' => 'لم يكتمل إعداد قاعدة بيانات المتجر بعد.'], 503);
    }
    if (!rock_order_schema_ready($pdo)) {
        rock_json(['error' => 'تحتاج قاعدة البيانات إلى ترقية جداول الطلبات. راجع دليل إعداد ROCK.'], 503);
    }
    try {
        $order = rock_validate_public_order($payload);
    } catch (RockOrderValidationException $error) {
        rock_json(['error' => $error->getMessage()], $error->httpStatus);
    }

    $rawIdempotency = trim((string)($_SERVER['HTTP_IDEMPOTENCY_KEY'] ?? $payload['idempotencyKey'] ?? ''));
    if ($rawIdempotency === '') {
        $rawIdempotency = bin2hex(random_bytes(24));
    }
    if (strlen($rawIdempotency) > 120) {
        rock_json(['error' => 'مفتاح الطلب غير صالح. أعد تحميل الصفحة وحاول مرة أخرى.'], 422);
    }
    $idempotencyHash = hash('sha256', $rawIdempotency);

    $existingOrder = $pdo->prepare('SELECT order_number, status, total FROM rock_orders WHERE idempotency_hash = ? LIMIT 1');
    $existingOrder->execute([$idempotencyHash]);
    $existing = $existingOrder->fetch();
    if (is_array($existing)) {
        rock_json([
            'ok' => true,
            'duplicate' => true,
            'orderNumber' => (string)$existing['order_number'],
            'status' => (string)$existing['status'],
            'total' => $existing['total'] === null ? null : (string)$existing['total'],
            'currency' => 'SAR',
            'message' => 'تم تسجيل هذا الطلب سابقًا.',
        ]);
    }

    global $ROCK_CONFIG;
    $ipHash = hash_hmac('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'), (string)$ROCK_CONFIG['setup_token']);
    $pdo->beginTransaction();
    $pdo->prepare('INSERT IGNORE INTO rock_order_rate_limits (ip_hash, window_start, attempts, blocked_until) VALUES (?, UTC_TIMESTAMP(), 0, NULL)')
        ->execute([$ipHash]);
    $limitQuery = $pdo->prepare('SELECT window_start, attempts, blocked_until FROM rock_order_rate_limits WHERE ip_hash = ? FOR UPDATE');
    $limitQuery->execute([$ipHash]);
    $limit = $limitQuery->fetch();
    if (!is_array($limit)) {
        $pdo->rollBack();
        rock_json(['error' => 'تعذّر التحقق من معدل الطلبات. حاول لاحقًا.'], 503);
    }
    $blockedUntil = !empty($limit['blocked_until']) ? strtotime((string)$limit['blocked_until'] . ' UTC') : false;
    if ($blockedUntil !== false && $blockedUntil > time()) {
        $pdo->commit();
        rock_json(['error' => 'تم إيقاف إرسال الطلبات مؤقتًا. حاول بعد قليل.'], 429);
    }
    $windowStart = strtotime((string)$limit['window_start'] . ' UTC');
    $attempts = $windowStart !== false && (time() - $windowStart) < 600 ? (int)$limit['attempts'] : 0;
    if ($attempts >= 5) {
        $until = gmdate('Y-m-d H:i:s', time() + 900);
        $pdo->prepare('UPDATE rock_order_rate_limits SET attempts = ?, blocked_until = ? WHERE ip_hash = ?')
            ->execute([$attempts, $until, $ipHash]);
        $pdo->commit();
        rock_json(['error' => 'وصلت إلى الحد المؤقت للطلبات. حاول بعد 15 دقيقة.'], 429);
    }
    $nextAttempts = $attempts + 1;
    $window = $attempts === 0 ? gmdate('Y-m-d H:i:s') : (string)$limit['window_start'];
    $pdo->prepare('UPDATE rock_order_rate_limits SET window_start = ?, attempts = ?, blocked_until = NULL WHERE ip_hash = ?')
        ->execute([$window, $nextAttempts, $ipHash]);
    $pdo->commit();

    $ids = array_keys($order['items']);
    $marks = implode(',', array_fill(0, count($ids), '?'));
    $query = $pdo->prepare("SELECT id, model, name_ar, name_en, price, stock_quantity FROM rock_products WHERE active = 1 AND image_approved = 1 AND id IN ($marks)");
    $query->execute($ids);
    $products = [];
    foreach ($query->fetchAll() as $row) {
        $products[(string)$row['id']] = $row;
    }
    foreach ($ids as $id) {
        if (!isset($products[$id])) {
            rock_json(['error' => 'أحد المنتجات لم يعد متاحًا في الكتالوج. راجع السلة وحدّث الصفحة.'], 409);
        }
    }

    $subtotalMinor = 0;
    $preparedItems = [];
    foreach ($order['items'] as $id => $quantity) {
        $product = $products[$id];
        if (array_key_exists('stock_quantity', $product) && $product['stock_quantity'] !== null && (int)$product['stock_quantity'] < $quantity) {
            rock_json(['error' => 'الكمية المطلوبة غير متوفرة بالكامل للمنتج ' . (string)$product['model'] . '. حدّث السلة أو تواصل مع المتجر.'], 409);
        }
        $unitMinor = rock_order_decimal_to_minor($product['price']);
        $lineMinor = $unitMinor * $quantity;
        $subtotalMinor += $lineMinor;
        $preparedItems[] = [
            'productId' => $id,
            'model' => (string)$product['model'],
            'nameAr' => (string)$product['name_ar'],
            'nameEn' => (string)$product['name_en'],
            'unitMinor' => $unitMinor,
            'quantity' => $quantity,
            'lineMinor' => $lineMinor,
        ];
    }
    $subtotal = rock_order_minor_to_decimal($subtotalMinor);

    $pdo->beginTransaction();
    $orderNumber = '';
    for ($try = 0; $try < 3; $try++) {
        $candidate = rock_new_order_number();
        try {
            $insert = $pdo->prepare("INSERT INTO rock_orders
              (order_number, status, payment_status, customer_name, customer_phone, customer_city, customer_address, customer_notes, currency, subtotal, shipping, total, source, idempotency_hash)
              VALUES (?, 'new', 'not_configured', ?, ?, ?, ?, ?, 'SAR', ?, NULL, NULL, 'web', ?)");
            $insert->execute([
                $candidate,
                $order['customerName'],
                $order['customerPhone'],
                $order['customerCity'],
                $order['customerAddress'],
                $order['customerNotes'],
                $subtotal,
                $idempotencyHash,
            ]);
            $orderId = (int)$pdo->lastInsertId();
            $orderNumber = $candidate;
            break;
        } catch (PDOException $error) {
            if ($error->getCode() === '23000' && $try < 2) {
                $existingOrder->execute([$idempotencyHash]);
                $retryExisting = $existingOrder->fetch();
                if (is_array($retryExisting)) {
                    $pdo->rollBack();
                    rock_json([
                        'ok' => true,
                        'duplicate' => true,
                        'orderNumber' => (string)$retryExisting['order_number'],
                        'status' => (string)$retryExisting['status'],
                        'total' => $retryExisting['total'] === null ? null : (string)$retryExisting['total'],
                        'currency' => 'SAR',
                    ]);
                }
                continue;
            }
            throw $error;
        }
    }
    if ($orderNumber === '') {
        throw new RuntimeException('Could not allocate a unique order number.');
    }

    $itemInsert = $pdo->prepare('INSERT INTO rock_order_items (order_id, product_id, model, name_ar, name_en, unit_price, quantity, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    foreach ($preparedItems as $item) {
        $itemInsert->execute([
            $orderId,
            $item['productId'],
            $item['model'],
            $item['nameAr'],
            $item['nameEn'],
            rock_order_minor_to_decimal($item['unitMinor']),
            $item['quantity'],
            rock_order_minor_to_decimal($item['lineMinor']),
        ]);
    }
    $pdo->prepare('INSERT INTO rock_order_events (order_id, actor_admin_id, actor_username, event_type, from_status, to_status) VALUES (?, NULL, ?, ?, NULL, ?)')
        ->execute([$orderId, 'storefront', 'order_received', 'new']);
    $pdo->commit();

    rock_json([
        'ok' => true,
        'duplicate' => false,
        'orderNumber' => $orderNumber,
        'status' => 'new',
        'paymentStatus' => 'not_configured',
        'subtotal' => $subtotal,
        'shipping' => null,
        'total' => null,
        'currency' => 'SAR',
        'message' => 'تم تسجيل طلبك لدى المتجر. التوصيل والدفع غير مؤكدين؛ سيؤكد المتجر السعر النهائي والتوفر يدويًا.',
    ], 201);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('[ROCK public orders API] ' . $error->getMessage());
    rock_json(['error' => 'تعذّر تسجيل الطلب الآن. لم نؤكد استلامه؛ حاول مجددًا أو استخدم وسيلة التواصل المنشورة.'], 500);
}
