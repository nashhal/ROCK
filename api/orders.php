<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/order-schema.php';

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
    header('Allow: POST');
    rock_json(['error' => 'الطريقة غير مدعومة.'], 405);
}

if (!rock_is_configured()) {
    rock_json(['error' => 'الطلبات الإلكترونية غير مفعّلة بعد. أكمل إعداد قاعدة بيانات ROCK على Hostinger.'], 503);
}

$contentType = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
if (!str_contains($contentType, 'application/json')) {
    rock_json(['error' => 'صيغة الطلب غير مدعومة.'], 415);
}

$origin = trim((string)($_SERVER['HTTP_ORIGIN'] ?? ''));
if ($origin !== '') {
    $originHost = strtolower((string)parse_url($origin, PHP_URL_HOST));
    $requestHost = strtolower((string)preg_replace('/:\\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? '')));
    if ($originHost === '' || $requestHost === '' || !hash_equals($requestHost, $originHost)) {
        rock_json(['error' => 'مصدر الطلب غير مسموح.'], 403);
    }
}

$raw = file_get_contents('php://input');
if (!is_string($raw) || strlen($raw) > 32768) {
    rock_json(['error' => 'بيانات الطلب فارغة أو أكبر من الحد المسموح.'], 413);
}
$payload = json_decode($raw, true);
if (!is_array($payload)) {
    rock_json(['error' => 'تعذّر قراءة بيانات الطلب.'], 400);
}
if (trim((string)($payload['website'] ?? '')) !== '') {
    rock_json(['error' => 'تعذّر التحقق من الطلب.'], 422);
}

function rock_order_text(mixed $value, int $maxLength): string
{
    $text = trim(strip_tags(is_scalar($value) ? (string)$value : ''));
    if (function_exists('mb_substr')) {
        return mb_substr($text, 0, $maxLength, 'UTF-8');
    }
    return substr($text, 0, $maxLength);
}

try {
    $pdo = rock_db();
    if (!rock_is_install_complete($pdo)) {
        rock_json(['error' => 'لم يتم إكمال إعداد متجر ROCK على الاستضافة.'], 503);
    }
    rock_ensure_order_schema($pdo);

    // Store only a keyed hash of the source IP; never persist the raw address.
    global $ROCK_CONFIG;
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $rateKey = hash_hmac('sha256', $ip, (string)$ROCK_CONFIG['setup_token']);
    $rate = $pdo->prepare("INSERT INTO rock_order_rate_limits (request_key, attempts, window_started_at)
      VALUES (?, 1, NOW())
      ON DUPLICATE KEY UPDATE
        attempts = IF(window_started_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE), 1, attempts + 1),
        window_started_at = IF(window_started_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE), NOW(), window_started_at)");
    $rate->execute([$rateKey]);
    $checkRate = $pdo->prepare('SELECT attempts FROM rock_order_rate_limits WHERE request_key = ? LIMIT 1');
    $checkRate->execute([$rateKey]);
    if ((int)$checkRate->fetchColumn() > 10) {
        rock_json(['error' => 'تم تجاوز عدد المحاولات. انتظر قليلاً ثم حاول مجددًا.'], 429);
    }

    $customer = is_array($payload['customer'] ?? null) ? $payload['customer'] : [];
    $name = rock_order_text($customer['name'] ?? '', 160);
    $phoneRaw = rock_order_text($customer['phone'] ?? '', 32);
    $phone = preg_replace('/[^0-9+]/', '', $phoneRaw) ?? '';
    $city = rock_order_text($customer['city'] ?? '', 120);
    $address = rock_order_text($customer['address'] ?? '', 500);
    $notes = rock_order_text($customer['notes'] ?? '', 2000);

    if ($name === '' || mb_strlen($name, 'UTF-8') < 2) {
        rock_json(['error' => 'أدخل اسم العميل بصورة صحيحة.'], 422);
    }
    $phoneDigits = preg_replace('/\\D/', '', $phone) ?? '';
    if (strlen($phoneDigits) < 8 || strlen($phoneDigits) > 15 || strlen($phone) > 18) {
        rock_json(['error' => 'أدخل رقم جوال صحيحًا مع مفتاح الدولة عند الحاجة.'], 422);
    }
    if ($city === '') {
        rock_json(['error' => 'أدخل المدينة لإتمام الطلب.'], 422);
    }

    $items = $payload['items'] ?? null;
    if (!is_array($items) || count($items) < 1 || count($items) > 30) {
        rock_json(['error' => 'السلة فارغة أو تحتوي عدداً غير مسموح به من المنتجات.'], 422);
    }

    $quantities = [];
    foreach ($items as $item) {
        if (!is_array($item)) {
            rock_json(['error' => 'أحد عناصر السلة غير صالح.'], 422);
        }
        $id = trim((string)($item['id'] ?? ''));
        $quantity = filter_var($item['qty'] ?? null, FILTER_VALIDATE_INT);
        if (!preg_match('/^[a-zA-Z0-9_-]{2,80}$/', $id) || $quantity === false || $quantity < 1 || $quantity > 99) {
            rock_json(['error' => 'تحقق من المنتجات والكميات في السلة.'], 422);
        }
        $quantities[$id] = ($quantities[$id] ?? 0) + $quantity;
        if ($quantities[$id] > 99) {
            rock_json(['error' => 'الكمية المطلوبة لأحد المنتجات تتجاوز الحد المسموح.'], 422);
        }
    }

    $pdo->beginTransaction();
    $productQuery = $pdo->prepare('SELECT id, model, name_ar, name_en, price
      FROM rock_products WHERE id = ? AND active = 1 AND image_approved = 1 LIMIT 1');
    $orderLines = [];
    $totalCents = 0;
    foreach ($quantities as $id => $quantity) {
        $productQuery->execute([$id]);
        $product = $productQuery->fetch();
        if (!is_array($product)) {
            $pdo->rollBack();
            rock_json(['error' => 'أحد المنتجات لم يعد متاحًا. حدّث المتجر وراجع السلة.'], 409);
        }
        $unitCents = (int)round((float)$product['price'] * 100);
        $lineCents = $unitCents * $quantity;
        $totalCents += $lineCents;
        if ($totalCents > 999999999999) {
            $pdo->rollBack();
            rock_json(['error' => 'إجمالي الطلب يتجاوز الحد المسموح.'], 422);
        }
        $orderLines[] = [
            'id' => (string)$product['id'],
            'model' => (string)$product['model'],
            'name_ar' => (string)$product['name_ar'],
            'name_en' => (string)$product['name_en'],
            'unit_cents' => $unitCents,
            'quantity' => $quantity,
            'line_cents' => $lineCents,
        ];
    }

    $orderNumber = 'RK-' . date('ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
    $amount = number_format($totalCents / 100, 2, '.', '');
    $insertOrder = $pdo->prepare('INSERT INTO rock_orders
      (order_number, customer_name, customer_phone, customer_city, customer_address, customer_notes, status, currency, subtotal, total, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $insertOrder->execute([$orderNumber, $name, $phone, $city, $address, $notes, 'new', 'SAR', $amount, $amount, 'storefront']);
    $orderId = (int)$pdo->lastInsertId();

    $insertItem = $pdo->prepare('INSERT INTO rock_order_items
      (order_id, product_id, model, name_ar, name_en, unit_price, quantity, line_total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    foreach ($orderLines as $line) {
        $insertItem->execute([
            $orderId,
            $line['id'],
            $line['model'],
            $line['name_ar'],
            $line['name_en'],
            number_format($line['unit_cents'] / 100, 2, '.', ''),
            $line['quantity'],
            number_format($line['line_cents'] / 100, 2, '.', ''),
        ]);
    }
    $history = $pdo->prepare('INSERT INTO rock_order_status_history (order_id, old_status, new_status, changed_by) VALUES (?, NULL, ?, NULL)');
    $history->execute([$orderId, 'new']);
    $pdo->commit();

    rock_json([
        'ok' => true,
        'orderNumber' => $orderNumber,
        'status' => 'new',
        'message' => 'تم استلام طلبك، وسيتم التواصل معك لتأكيد السعر والتوفر والتوصيل.',
    ], 201);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('[ROCK order API] ' . $error->getMessage());
    rock_json(['error' => 'تعذّر حفظ الطلب في الوقت الحالي. حاول مرة أخرى أو استخدم وسيلة التواصل المتاحة.'], 500);
}
