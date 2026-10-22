<?php
declare(strict_types=1);
require_once __DIR__ . '/../api/bootstrap.php';
require_once __DIR__ . '/../api/order-schema.php';
require_once __DIR__ . '/../api/order-domain.php';

rock_start_session();
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

function rock_admin_row(array $row): array
{
    $product = rock_public_product($row);
    $product['active'] = (bool)$row['active'];
    $product['imageApproved'] = (bool)$row['image_approved'];
    $product['stockQuantity'] = array_key_exists('stock_quantity', $row) && $row['stock_quantity'] !== null ? (int)$row['stock_quantity'] : null;
    $product['lowStockThreshold'] = (int)($row['low_stock_threshold'] ?? 5);
    return $product;
}

function rock_read_product(PDO $pdo, string $id): ?array
{
    $statement = $pdo->prepare('SELECT * FROM rock_products WHERE id = ? LIMIT 1');
    $statement->execute([$id]);
    $row = $statement->fetch();
    return is_array($row) ? $row : null;
}

function rock_record_login_failure(PDO $pdo, string $ipHash): void
{
    $statement = $pdo->prepare('SELECT attempts, first_attempt_at FROM rock_login_attempts WHERE ip_hash = ? LIMIT 1');
    $statement->execute([$ipHash]);
    $current = $statement->fetch();
    $now = time();
    $first = is_array($current) ? strtotime((string)$current['first_attempt_at']) : false;
    $attempts = is_array($current) && $first !== false && ($now - $first) < 900
        ? ((int)$current['attempts'] + 1)
        : 1;
    $firstAt = $attempts === 1 ? date('Y-m-d H:i:s') : (string)$current['first_attempt_at'];
    $lockedUntil = $attempts >= 8 ? date('Y-m-d H:i:s', $now + 900) : null;
    $save = $pdo->prepare('INSERT INTO rock_login_attempts (ip_hash, attempts, first_attempt_at, locked_until)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE attempts = VALUES(attempts), first_attempt_at = VALUES(first_attempt_at), locked_until = VALUES(locked_until)');
    $save->execute([$ipHash, $attempts, $firstAt, $lockedUntil]);
}

function rock_delete_uploaded_image(string $relativePath): void
{
    if (preg_match('~^uploads/products/[a-z0-9_-]+\.webp$~i', $relativePath) !== 1) {
        return;
    }
    $fullPath = rock_root() . '/' . $relativePath;
    if (is_file($fullPath)) {
        @unlink($fullPath);
    }
}

$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$action = $method === 'GET'
    ? (string)($_GET['action'] ?? 'products')
    : (string)($_POST['action'] ?? '');

if (!rock_is_configured()) {
    rock_json(['error' => 'أكمل إعداد api/config.php أولًا. افتح api/install.php بعد ضبط بيانات قاعدة البيانات.'], 503);
}

try {
    $pdo = rock_db();
    if (!rock_is_install_complete($pdo)) {
        rock_json(['error' => 'لم يتم تثبيت لوحة الإدارة. افتح api/install.php أولًا.'], 503);
    }

    if ($method === 'GET' && $action === 'me') {
        $authenticated = !empty($_SESSION['rock_admin_id']) && !empty($_SESSION['rock_admin_username']);
        rock_json([
            'authenticated' => $authenticated,
            'username' => $authenticated ? (string)$_SESSION['rock_admin_username'] : '',
            'csrf' => rock_csrf_token(),
        ]);
    }

    if ($method === 'POST' && $action === 'login') {
        rock_check_csrf();
        $username = trim((string)($_POST['username'] ?? ''));
        $password = (string)($_POST['password'] ?? '');
        global $ROCK_CONFIG;
        $ipHash = hash_hmac('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'), (string)$ROCK_CONFIG['setup_token']);

        $attemptStatement = $pdo->prepare('SELECT attempts, locked_until FROM rock_login_attempts WHERE ip_hash = ? LIMIT 1');
        $attemptStatement->execute([$ipHash]);
        $attemptRow = $attemptStatement->fetch();
        if (is_array($attemptRow) && !empty($attemptRow['locked_until']) && strtotime((string)$attemptRow['locked_until']) > time()) {
            rock_json(['error' => 'تم إيقاف محاولات الدخول مؤقتًا. انتظر 15 دقيقة ثم حاول مجددًا.'], 429);
        }

        $statement = $pdo->prepare('SELECT id, username, password_hash FROM rock_admin_users WHERE username = ? LIMIT 1');
        $statement->execute([$username]);
        $user = $statement->fetch();
        if (!is_array($user) || !password_verify($password, (string)$user['password_hash'])) {
            rock_record_login_failure($pdo, $ipHash);
            usleep(250000);
            rock_json(['error' => 'اسم المستخدم أو كلمة المرور غير صحيحة.'], 401);
        }

        $pdo->prepare('DELETE FROM rock_login_attempts WHERE ip_hash = ?')->execute([$ipHash]);
        session_regenerate_id(true);
        $_SESSION['rock_admin_id'] = (int)$user['id'];
        $_SESSION['rock_admin_username'] = (string)$user['username'];
        $_SESSION['rock_csrf'] = bin2hex(random_bytes(32));
        rock_json(['authenticated' => true, 'username' => (string)$user['username'], 'csrf' => (string)$_SESSION['rock_csrf']]);
    }

    if ($method === 'POST' && $action === 'logout') {
        rock_require_admin();
        rock_check_csrf();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', [
                'expires' => time() - 42000,
                'path' => $params['path'],
                'domain' => $params['domain'],
                'secure' => $params['secure'],
                'httponly' => $params['httponly'],
                'samesite' => 'Strict',
            ]);
        }
        session_destroy();
        rock_json(['ok' => true]);
    }

    $admin = rock_require_admin();

    if ($method === 'GET' && $action === 'orders') {
        if (!rock_order_schema_ready($pdo)) {
            rock_json(['error' => 'جداول الطلبات غير جاهزة. شغّل api/migrate-orders.php ثم احذفه.'], 503);
        }
        $rows = $pdo->query("SELECT o.id, o.order_number, o.status, o.payment_status, o.customer_name, o.customer_phone,
                o.customer_city, o.customer_address, o.customer_notes, o.currency, o.subtotal, o.shipping, o.total,
                o.created_at, o.updated_at, COUNT(i.id) AS item_count
            FROM rock_orders o
            LEFT JOIN rock_order_items i ON i.order_id = o.id
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT 200")->fetchAll();
        rock_json(['orders' => $rows, 'count' => count($rows)]);
    }

    if ($method === 'GET' && $action === 'order_items') {
        if (!rock_order_schema_ready($pdo)) {
            rock_json(['error' => 'جداول الطلبات غير جاهزة.'], 503);
        }
        $orderId = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
        if ($orderId === false || $orderId < 1) {
            rock_json(['error' => 'معرّف الطلب غير صالح.'], 422);
        }
        $statement = $pdo->prepare('SELECT product_id, model, name_ar, name_en, unit_price, quantity, line_total
            FROM rock_order_items WHERE order_id = ? ORDER BY id ASC');
        $statement->execute([$orderId]);
        rock_json(['items' => $statement->fetchAll()]);
    }

    if ($method === 'GET' && $action === 'products') {
        $rows = $pdo->query('SELECT * FROM rock_products ORDER BY active DESC, sort_order ASC, name_ar ASC')->fetchAll();
        rock_json([
            'products' => array_map('rock_admin_row', $rows),
            'counts' => [
                'all' => count($rows),
                'active' => count(array_filter($rows, static fn(array $row): bool => (bool)$row['active'])),
                'hidden' => count(array_filter($rows, static fn(array $row): bool => !(bool)$row['active'])),
            ],
        ]);
    }

    if ($method !== 'POST') {
        header('Allow: GET, POST');
        rock_json(['error' => 'الطريقة غير مدعومة.'], 405);
    }

    rock_check_csrf();

    if ($action === 'order_shipping') {
        if (!rock_order_schema_ready($pdo)) {
            rock_json(['error' => 'جداول الطلبات غير جاهزة.'], 503);
        }
        $orderId = filter_var($_POST['order_id'] ?? null, FILTER_VALIDATE_INT);
        $shippingText = trim((string)($_POST['shipping'] ?? ''));
        if ($orderId === false || $orderId < 1 || !preg_match('/^\d{1,9}(?:\.\d{1,2})?$/', $shippingText)) {
            rock_json(['error' => 'أدخل رقم طلب صالحًا ورسوم شحن حتى منزلتين عشريتين.'], 422);
        }
        $shippingMinor = rock_order_decimal_to_minor($shippingText);
        $pdo->beginTransaction();
        $read = $pdo->prepare('SELECT status, subtotal FROM rock_orders WHERE id = ? FOR UPDATE');
        $read->execute([$orderId]);
        $order = $read->fetch();
        if (!is_array($order)) {
            $pdo->rollBack();
            rock_json(['error' => 'الطلب غير موجود.'], 404);
        }
        if ((string)$order['status'] !== 'new') {
            $pdo->rollBack();
            rock_json(['error' => 'يمكن تعديل رسوم الشحن فقط قبل تأكيد الطلب.'], 409);
        }
        $subtotalMinor = rock_order_decimal_to_minor($order['subtotal']);
        $totalMinor = $subtotalMinor + $shippingMinor;
        $update = $pdo->prepare('UPDATE rock_orders SET shipping = ?, total = ? WHERE id = ?');
        $update->execute([
            rock_order_minor_to_decimal($shippingMinor),
            rock_order_minor_to_decimal($totalMinor),
            $orderId,
        ]);
        $event = $pdo->prepare('INSERT INTO rock_order_events (order_id, actor_admin_id, actor_username, event_type, from_status, to_status)
            VALUES (?, ?, ?, ?, ?, ?)');
        $event->execute([$orderId, $admin['id'], $admin['username'], 'shipping_updated', 'new', 'new']);
        $pdo->commit();
        rock_json([
            'ok' => true,
            'id' => $orderId,
            'shipping' => rock_order_minor_to_decimal($shippingMinor),
            'total' => rock_order_minor_to_decimal($totalMinor),
        ]);
    }

    if ($action === 'order_status') {
        if (!rock_order_schema_ready($pdo)) {
            rock_json(['error' => 'جداول الطلبات غير جاهزة. شغّل api/migrate-orders.php ثم احذفه.'], 503);
        }
        $orderId = filter_var($_POST['order_id'] ?? null, FILTER_VALIDATE_INT);
        $nextStatus = trim((string)($_POST['status'] ?? ''));
        $allowed = ['new', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];
        if ($orderId === false || $orderId < 1 || !in_array($nextStatus, $allowed, true)) {
            rock_json(['error' => 'حالة الطلب أو معرّفه غير صالح.'], 422);
        }

        $transitions = [
            'new' => ['confirmed', 'cancelled'],
            'confirmed' => ['preparing', 'cancelled'],
            'preparing' => ['shipped', 'cancelled'],
            'shipped' => ['delivered'],
            'delivered' => [],
            'cancelled' => [],
        ];

        $pdo->beginTransaction();
        $read = $pdo->prepare('SELECT status, shipping, stock_committed FROM rock_orders WHERE id = ? FOR UPDATE');
        $read->execute([$orderId]);
        $current = $read->fetch();
        if (!is_array($current)) {
            $pdo->rollBack();
            rock_json(['error' => 'الطلب غير موجود.'], 404);
        }
        $fromStatus = (string)$current['status'];
        $stockCommitted = (bool)$current['stock_committed'];
        if ($fromStatus === $nextStatus) {
            $pdo->commit();
            rock_json(['ok' => true, 'id' => $orderId, 'status' => $nextStatus, 'unchanged' => true]);
        }
        if (!in_array($nextStatus, $transitions[$fromStatus] ?? [], true)) {
            $pdo->rollBack();
            rock_json(['error' => 'لا يمكن نقل الطلب من الحالة الحالية إلى الحالة المطلوبة.'], 409);
        }
        if ($nextStatus === 'confirmed' && $current['shipping'] === null) {
            $pdo->rollBack();
            rock_json(['error' => 'أدخل رسوم الشحن النهائية واحفظها قبل تأكيد الطلب.'], 409);
        }

        if ($nextStatus === 'confirmed' && !$stockCommitted) {
            $itemsQuery = $pdo->prepare('SELECT i.product_id, i.quantity, p.stock_quantity
                FROM rock_order_items i
                LEFT JOIN rock_products p ON p.id = i.product_id
                WHERE i.order_id = ?
                FOR UPDATE');
            $itemsQuery->execute([$orderId]);
            $stockItems = $itemsQuery->fetchAll();
            if (!$stockItems) {
                $pdo->rollBack();
                rock_json(['error' => 'الطلب لا يحتوي منتجات صالحة.'], 409);
            }
            foreach ($stockItems as $item) {
                if ($item['stock_quantity'] === null) {
                    continue;
                }
                if ((int)$item['stock_quantity'] < (int)$item['quantity']) {
                    $pdo->rollBack();
                    rock_json(['error' => 'المخزون لا يكفي للمنتج ' . (string)$item['product_id'] . '. حدّث الكميات قبل التأكيد.'], 409);
                }
            }
            $decrement = $pdo->prepare('UPDATE rock_products SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity IS NOT NULL AND stock_quantity >= ?');
            foreach ($stockItems as $item) {
                if ($item['stock_quantity'] === null) {
                    continue;
                }
                $quantity = (int)$item['quantity'];
                $decrement->execute([$quantity, (string)$item['product_id'], $quantity]);
                if ($decrement->rowCount() !== 1) {
                    $pdo->rollBack();
                    rock_json(['error' => 'تغير المخزون أثناء تأكيد الطلب. راجع الكمية وحاول مجددًا.'], 409);
                }
            }
            $stockCommitted = true;
        }

        $shouldRestock = $nextStatus === 'cancelled'
            && $stockCommitted
            && in_array($fromStatus, ['confirmed', 'preparing'], true);
        if ($shouldRestock) {
            $itemsQuery = $pdo->prepare('SELECT i.product_id, i.quantity, p.stock_quantity
                FROM rock_order_items i
                LEFT JOIN rock_products p ON p.id = i.product_id
                WHERE i.order_id = ?
                FOR UPDATE');
            $itemsQuery->execute([$orderId]);
            $restock = $pdo->prepare('UPDATE rock_products SET stock_quantity = stock_quantity + ? WHERE id = ? AND stock_quantity IS NOT NULL');
            foreach ($itemsQuery->fetchAll() as $item) {
                if ($item['stock_quantity'] !== null) {
                    $restock->execute([(int)$item['quantity'], (string)$item['product_id']]);
                }
            }
            $stockCommitted = false;
        }

        $update = $pdo->prepare('UPDATE rock_orders SET status = ?, stock_committed = ? WHERE id = ?');
        $update->execute([$nextStatus, $stockCommitted ? 1 : 0, $orderId]);
        $event = $pdo->prepare('INSERT INTO rock_order_events (order_id, actor_admin_id, actor_username, event_type, from_status, to_status)
            VALUES (?, ?, ?, ?, ?, ?)');
        $event->execute([$orderId, $admin['id'], $admin['username'], 'status_changed', $fromStatus, $nextStatus]);
        $pdo->commit();
        rock_json(['ok' => true, 'id' => $orderId, 'status' => $nextStatus, 'stockCommitted' => $stockCommitted]);
    }

    if ($action === 'delete') {
        $id = (string)($_POST['id'] ?? '');
        if (!preg_match('/^[a-zA-Z0-9_-]{2,80}$/', $id)) {
            rock_json(['error' => 'معرّف المنتج غير صالح.'], 422);
        }
        $product = rock_read_product($pdo, $id);
        if (!$product) {
            rock_json(['error' => 'المنتج غير موجود.'], 404);
        }
        $pdo->prepare('DELETE FROM rock_products WHERE id = ?')->execute([$id]);
        $image = (string)$product['image'];
        if (str_starts_with($image, 'uploads/products/')) {
            rock_delete_uploaded_image($image);
        }
        rock_json(['ok' => true, 'id' => $id]);
    }

    if ($action !== 'save') {
        rock_json(['error' => 'العملية غير معروفة.'], 400);
    }

    $id = trim((string)($_POST['id'] ?? ''));
    $barcode = trim((string)($_POST['barcode'] ?? ''));
    $model = trim((string)($_POST['model'] ?? ''));
    $category = trim((string)($_POST['category'] ?? 'power'));
    $priceText = trim((string)($_POST['price'] ?? ''));
    $nameAr = trim((string)($_POST['name_ar'] ?? ''));
    $nameEn = trim((string)($_POST['name_en'] ?? ''));
    $descriptionEn = trim((string)($_POST['description_en'] ?? ''));
    $picturesUrl = trim((string)($_POST['pictures_url'] ?? ''));
    $requestedActive = (string)($_POST['active'] ?? '0') === '1';
    $stockText = trim((string)($_POST['stock_quantity'] ?? ''));
    $thresholdText = trim((string)($_POST['low_stock_threshold'] ?? '5'));
    $stockQuantity = null;
    if ($stockText !== '') {
        if (!preg_match('/^\d{1,7}$/', $stockText) || (int)$stockText > 1000000) {
            rock_json(['error' => 'أدخل كمية مخزون صحيحة حتى مليون وحدة، أو اترك الحقل فارغًا لتعطيل تتبع المخزون.'], 422);
        }
        $stockQuantity = (int)$stockText;
    }
    if ($thresholdText === '') {
        $thresholdText = '5';
    }
    if (!preg_match('/^\d{1,7}$/', $thresholdText) || (int)$thresholdText > 1000000) {
        rock_json(['error' => 'حد التنبيه للمخزون غير صالح.'], 422);
    }
    $lowStockThreshold = (int)$thresholdText;

    if (!preg_match('/^[a-zA-Z0-9_-]{2,80}$/', $id)) {
        rock_json(['error' => 'معرّف المنتج يجب أن يحتوي على أحرف أو أرقام أو شرطة فقط.'], 422);
    }
    if ($model === '' || mb_strlen($model) > 120 || $nameAr === '' || mb_strlen($nameAr) > 255 || $nameEn === '' || mb_strlen($nameEn) > 255) {
        rock_json(['error' => 'أدخل الموديل والاسم العربي والاسم الإنجليزي بأطوال مناسبة.'], 422);
    }
    if (!in_array($category, ['power', 'audio', 'car', 'lifestyle'], true)) {
        rock_json(['error' => 'اختر تصنيفًا صحيحًا.'], 422);
    }
    if (!preg_match('/^\d{1,9}(?:\.\d{1,2})?$/', $priceText) || (float)$priceText < 0) {
        rock_json(['error' => 'أدخل سعرًا صحيحًا حتى منزلتين عشريتين.'], 422);
    }
    if (mb_strlen($barcode) > 80 || mb_strlen($descriptionEn) > 12000) {
        rock_json(['error' => 'بعض الحقول تتجاوز الحد المسموح.'], 422);
    }
    if ($picturesUrl !== '' && (!filter_var($picturesUrl, FILTER_VALIDATE_URL) || strtolower((string)parse_url($picturesUrl, PHP_URL_SCHEME)) !== 'https')) {
        rock_json(['error' => 'رابط صور المورّد يجب أن يبدأ بـ https://.'], 422);
    }

    $existing = rock_read_product($pdo, $id);
    $isNew = $existing === null;
    $oldImage = $existing ? (string)$existing['image'] : '';
    $image = $oldImage;
    $imageApproved = $existing ? (bool)$existing['image_approved'] : false;
    $gallery = $existing ? json_decode((string)$existing['images_json'], true) : [];
    if (!is_array($gallery)) {
        $gallery = [];
    }
    $gallery = array_values(array_unique(array_filter(array_map('rock_safe_image_path', $gallery))));
    $uploadedRelative = '';
    $upload = $_FILES['image'] ?? null;

    if (is_array($upload) && (int)($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
        if ((int)($upload['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK || !is_uploaded_file((string)($upload['tmp_name'] ?? ''))) {
            rock_json(['error' => 'تعذّر استلام ملف الصورة. حاول رفعه مجددًا.'], 422);
        }
        if ((int)($upload['size'] ?? 0) < 512 || (int)$upload['size'] > 8 * 1024 * 1024) {
            rock_json(['error' => 'حجم الصورة يجب أن يكون بين 512 بايت و8 ميجابايت.'], 422);
        }

        $directory = rock_root() . '/uploads/products';
        if (!is_dir($directory) && !@mkdir($directory, 0755, true) && !is_dir($directory)) {
            rock_json(['error' => 'تعذّر إنشاء مجلد صور المنتجات. تحقق من صلاحيات الملفات في Hostinger.'], 500);
        }
        $filename = strtolower($id) . '-' . bin2hex(random_bytes(5)) . '.webp';
        $uploadedRelative = 'uploads/products/' . $filename;
        $destination = rock_root() . '/' . $uploadedRelative;
        $quality = rock_normalize_product_image((string)$upload['tmp_name'], $destination);
        if (!$quality['ok']) {
            $reason = (string)($quality['reason'] ?? 'unknown');
            $messages = [
                'background_not_white' => 'لم تُقبل الصورة: الخلفية ليست بيضاء بما يكفي.',
                'not_clear_enough' => 'لم تُقبل الصورة: الصورة غير واضحة أو لا تحتوي تفاصيل كافية.',
                'low_resolution' => 'لم تُقبل الصورة: دقتها منخفضة. استخدم صورة أكبر من 280×280 بكسل.',
                'invalid_aspect_ratio' => 'لم تُقبل الصورة: أبعادها غير مناسبة أو تظهر كشريط طويل.',
                'gd_webp_required' => 'استضافة PHP تحتاج إلى تفعيل GD مع دعم WebP.',
                'unsupported_type' => 'صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WebP.',
            ];
            rock_json(['error' => $messages[$reason] ?? 'تعذّر التحقق من الصورة. استخدم صورة واضحة بخلفية بيضاء.'], 422);
        }
        $image = $uploadedRelative;
        $imageApproved = true;
        $gallery = [$uploadedRelative];
    } elseif ($isNew) {
        rock_json(['error' => 'ارفع صورة واضحة بخلفية بيضاء لإضافة المنتج.'], 422);
    }

    if ($image === '' || rock_safe_image_path($image) === '') {
        if ($uploadedRelative !== '') {
            rock_delete_uploaded_image($uploadedRelative);
        }
        rock_json(['error' => 'لا توجد صورة منتج صالحة. ارفع صورة رئيسية واضحة أولًا.'], 422);
    }
    if ($requestedActive && !$imageApproved) {
        if ($uploadedRelative !== '') {
            rock_delete_uploaded_image($uploadedRelative);
        }
        rock_json(['error' => 'لا يمكن عرض المنتج قبل اعتماد صورة واضحة بخلفية بيضاء. ارفع صورة بديلة أولًا.'], 422);
    }
    if (!in_array($image, $gallery, true)) {
        array_unshift($gallery, $image);
    }

    $sortOrder = $existing ? (int)$existing['sort_order'] : ((int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) + 10 FROM rock_products')->fetchColumn());
    $sql = 'INSERT INTO rock_products
      (id, barcode, model, category, price, image, name_ar, name_en, description_en, pictures_url, images_json, active, image_approved, sort_order, stock_quantity, low_stock_threshold)
      VALUES (:id, :barcode, :model, :category, :price, :image, :name_ar, :name_en, :description_en, :pictures_url, :images_json, :active, :image_approved, :sort_order, :stock_quantity, :low_stock_threshold)
      ON DUPLICATE KEY UPDATE barcode = VALUES(barcode), model = VALUES(model), category = VALUES(category), price = VALUES(price), image = VALUES(image), name_ar = VALUES(name_ar), name_en = VALUES(name_en), description_en = VALUES(description_en), pictures_url = VALUES(pictures_url), images_json = VALUES(images_json), active = VALUES(active), image_approved = VALUES(image_approved), sort_order = VALUES(sort_order), stock_quantity = VALUES(stock_quantity), low_stock_threshold = VALUES(low_stock_threshold)';
    try {
        $save = $pdo->prepare($sql);
        $save->execute([
            ':id' => $id,
            ':barcode' => $barcode,
            ':model' => $model,
            ':category' => $category,
            ':price' => number_format((float)$priceText, 2, '.', ''),
            ':image' => $image,
            ':name_ar' => $nameAr,
            ':name_en' => $nameEn,
            ':description_en' => $descriptionEn,
            ':pictures_url' => $picturesUrl,
            ':images_json' => json_encode($gallery, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ':active' => $requestedActive ? 1 : 0,
            ':image_approved' => $imageApproved ? 1 : 0,
            ':sort_order' => $sortOrder,
            ':stock_quantity' => $stockQuantity,
            ':low_stock_threshold' => $lowStockThreshold,
        ]);
    } catch (Throwable $error) {
        if ($uploadedRelative !== '') {
            rock_delete_uploaded_image($uploadedRelative);
        }
        if (str_contains(strtolower($error->getMessage()), 'duplicate')) {
            rock_json(['error' => 'معرّف المنتج مستخدم بالفعل. اختر معرّفًا آخر.'], 409);
        }
        throw $error;
    }

    if ($uploadedRelative !== '' && $oldImage !== '' && $oldImage !== $uploadedRelative && str_starts_with($oldImage, 'uploads/products/')) {
        rock_delete_uploaded_image($oldImage);
    }

    $saved = rock_read_product($pdo, $id);
    rock_json(['ok' => true, 'product' => rock_admin_row($saved ?? [])]);
} catch (Throwable $error) {
    error_log('[ROCK admin API] ' . $error->getMessage());
    rock_json(['error' => 'تعذّر تنفيذ العملية. تحقق من إعداد قاعدة البيانات ثم حاول مجددًا.'], 500);
}
