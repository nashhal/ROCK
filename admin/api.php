<?php
declare(strict_types=1);
require_once __DIR__ . '/../api/bootstrap.php';

rock_start_session();
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

function rock_admin_row(array $row): array
{
    $product = rock_public_product($row);
    $product['active'] = (bool)$row['active'];
    $product['imageApproved'] = (bool)$row['image_approved'];
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
      (id, barcode, model, category, price, image, name_ar, name_en, description_en, pictures_url, images_json, active, image_approved, sort_order)
      VALUES (:id, :barcode, :model, :category, :price, :image, :name_ar, :name_en, :description_en, :pictures_url, :images_json, :active, :image_approved, :sort_order)
      ON DUPLICATE KEY UPDATE barcode = VALUES(barcode), model = VALUES(model), category = VALUES(category), price = VALUES(price), image = VALUES(image), name_ar = VALUES(name_ar), name_en = VALUES(name_en), description_en = VALUES(description_en), pictures_url = VALUES(pictures_url), images_json = VALUES(images_json), active = VALUES(active), image_approved = VALUES(image_approved), sort_order = VALUES(sort_order)';
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
