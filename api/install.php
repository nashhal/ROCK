<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';

function rock_install_page(string $title, string $message, bool $form = false, string $status = 'info'): never
{
    $safeTitle = htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $safeMessage = htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $noticeClass = $status === 'error' ? 'notice error' : 'notice';
    $tokenValue = isset($_POST['setup_token']) ? htmlspecialchars((string)$_POST['setup_token'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') : '';
    echo '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . $safeTitle . ' | ROCK</title>';
    echo '<style>body{margin:0;background:#f4f7fb;color:#10233e;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh;padding:22px;box-sizing:border-box}.panel{width:min(620px,100%);background:#fff;border:1px solid #e0e8f1;border-radius:18px;padding:28px;box-sizing:border-box;box-shadow:0 16px 50px #0b20390b}h1{font-size:25px;margin:0 0 12px}p{line-height:1.8;color:#54677f}.notice{padding:13px 15px;border-radius:9px;background:#eef5fd;border:1px solid #dbe9f8;line-height:1.8}.error{background:#fff4f2;border-color:#f2d4ce;color:#7e2d22}label{display:block;margin:17px 0 7px;font-weight:700;font-size:13px}input{width:100%;box-sizing:border-box;border:1px solid #d4deea;border-radius:8px;padding:13px;font:inherit}button{width:100%;margin-top:20px;border:0;border-radius:8px;background:#0b2039;color:#fff;padding:13px;font:700 14px Arial,sans-serif;cursor:pointer}code{direction:ltr;display:inline-block;background:#f3f5f7;padding:2px 5px;border-radius:4px}.small{font-size:12px;color:#74859b}</style></head><body><main class="panel"><h1>' . $safeTitle . '</h1><p>إعداد لوحة إدارة منتجات ROCK على Hostinger.</p><div class="' . $noticeClass . '">' . $safeMessage . '</div>';
    if ($form) {
        echo '<form method="post" action="install.php" autocomplete="off">';
        echo '<label for="setup_token">رمز الإعداد الموجود في api/config.php</label><input id="setup_token" name="setup_token" type="password" required minlength="40" autocomplete="off">';
        echo '<label for="admin_username">اسم المستخدم الجديد للوحة الإدارة</label><input id="admin_username" name="admin_username" required minlength="3" maxlength="40" pattern="[A-Za-z0-9_.-]{3,40}" autocomplete="username">';
        echo '<label for="admin_password">كلمة مرور قوية (12 حرفًا على الأقل)</label><input id="admin_password" name="admin_password" type="password" required minlength="12" autocomplete="new-password">';
        echo '<label for="admin_password_confirm">تأكيد كلمة المرور</label><input id="admin_password_confirm" name="admin_password_confirm" type="password" required minlength="12" autocomplete="new-password">';
        echo '<button type="submit">إنشاء قاعدة البيانات ولوحة الإدارة</button></form>';
    }
    echo '<p class="small">بعد الإعداد، احذف ملف api/install.php من File Manager. لا تشارك بيانات قاعدة البيانات أو رمز الإعداد.</p></main></body></html>';
    exit;
}

if (!rock_is_configured()) {
    http_response_code(503);
    rock_install_page('أكمل إعداد الاتصال أولًا', 'انسخ api/config.example.php إلى api/config.php، ثم أدخل بيانات قاعدة MySQL ورمز إعداد عشوائي طويل. لم يتم تغيير أي بيانات منتجات.', false, 'error');
}

try {
    $pdo = rock_db();
} catch (Throwable $error) {
    error_log('[ROCK installer] ' . $error->getMessage());
    http_response_code(503);
    rock_install_page('تعذر الاتصال بقاعدة البيانات', 'تحقق من اسم قاعدة البيانات والمستخدم وكلمة المرور واسم المضيف في api/config.php، وتأكد من تفعيل PDO MySQL في Hostinger.', true, 'error');
}

$tablesExist = false;
try {
    $tablesExist = (bool)$pdo->query("SHOW TABLES LIKE 'rock_site_meta'")->fetchColumn();
} catch (Throwable $error) {
    $tablesExist = false;
}
if ($tablesExist && rock_is_install_complete($pdo)) {
    http_response_code(409);
    rock_install_page('تم إعداد المتجر مسبقًا', 'قاعدة بيانات ROCK مثبتة بالفعل. لا تعِد تشغيل المثبّت؛ احذف هذا الملف ثم ادخل إلى admin/.', false);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    rock_install_page('تهيئة لوحة ROCK', 'سينشئ هذا الإجراء الجداول ويستورد كتالوج ROCK الحالي مع الحفاظ على أسماء المنتجات وأسعارها. لا يمكن تشغيله مرة ثانية بعد اكتمال التثبيت.', true);
}

global $ROCK_CONFIG;
$submittedToken = (string)($_POST['setup_token'] ?? '');
$configToken = (string)($ROCK_CONFIG['setup_token'] ?? '');
if (strlen($configToken) < 40 || $submittedToken === '' || !hash_equals($configToken, $submittedToken)) {
    http_response_code(403);
    rock_install_page('رمز إعداد غير صحيح', 'أدخل رمز الإعداد المطابق للقيمة التي حفظتها في api/config.php.', true, 'error');
}

$username = trim((string)($_POST['admin_username'] ?? ''));
$password = (string)($_POST['admin_password'] ?? '');
$confirmation = (string)($_POST['admin_password_confirm'] ?? '');
if (!preg_match('/^[A-Za-z0-9_.-]{3,40}$/', $username)) {
    http_response_code(422);
    rock_install_page('اسم المستخدم غير صالح', 'استخدم من 3 إلى 40 حرفًا إنجليزيًا أو رقمًا أو نقطة أو شرطة.', true, 'error');
}
if (strlen($password) < 12 || strlen($password) > 200 || !hash_equals($password, $confirmation)) {
    http_response_code(422);
    rock_install_page('كلمة المرور غير صالحة', 'استخدم كلمة مرور لا تقل عن 12 حرفًا وتأكد من تطابق الحقلين.', true, 'error');
}

try {
    $sourceFile = rock_root() . '/products.js';
    if (!is_file($sourceFile)) {
        throw new RuntimeException('products.js is missing. Upload the built ROCK site files before installation.');
    }
    $source = (string)file_get_contents($sourceFile);
    $assignment = strpos($source, 'const ROCK_PRODUCTS');
    $arrayStart = $assignment === false ? false : strpos($source, '[', $assignment);
    $arrayEnd = strrpos($source, ']');
    if ($arrayStart === false || $arrayEnd === false || $arrayEnd < $arrayStart) {
        throw new RuntimeException('Could not locate the product array.');
    }
    $catalog = json_decode(substr($source, $arrayStart, $arrayEnd - $arrayStart + 1), true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($catalog) || count($catalog) === 0) {
        throw new RuntimeException('The source product catalog is empty or invalid.');
    }

    $approvedIds = rock_manifest_visible_ids();
    if ($approvedIds === null) {
        $approvedIds = [];
        foreach ($catalog as $candidate) {
            $candidateImage = (string)($candidate['image'] ?? '');
            $relativeImage = rock_safe_image_path($candidateImage);
            if ($relativeImage !== '' && rock_inspect_image(rock_root() . '/' . $relativeImage)['ok']) {
                $approvedIds[] = (string)($candidate['id'] ?? '');
            }
        }
    }
    $approvedLookup = array_fill_keys($approvedIds, true);

    $pdo->exec("CREATE TABLE IF NOT EXISTS rock_site_meta (
      meta_key VARCHAR(80) NOT NULL PRIMARY KEY,
      meta_value TEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    if (rock_is_install_complete($pdo)) {
        http_response_code(409);
        rock_install_page('تم إعداد المتجر مسبقًا', 'قاعدة بيانات ROCK مثبتة بالفعل. لا تعِد تشغيل المثبّت؛ احذف هذا الملف ثم ادخل إلى admin/.', false);
    }

    $pdo->exec("CREATE TABLE IF NOT EXISTS rock_admin_users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(40) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS rock_login_attempts (
      ip_hash CHAR(64) NOT NULL PRIMARY KEY,
      attempts INT UNSIGNED NOT NULL DEFAULT 0,
      first_attempt_at DATETIME NOT NULL,
      locked_until DATETIME NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS rock_products (
      id VARCHAR(80) NOT NULL PRIMARY KEY,
      barcode VARCHAR(80) NOT NULL DEFAULT '',
      model VARCHAR(120) NOT NULL,
      category VARCHAR(40) NOT NULL DEFAULT 'power',
      price DECIMAL(12,2) NOT NULL,
      image VARCHAR(255) NOT NULL,
      name_ar VARCHAR(255) NOT NULL,
      name_en VARCHAR(255) NOT NULL,
      description_en TEXT NOT NULL,
      pictures_url VARCHAR(1000) NOT NULL DEFAULT '',
      images_json TEXT NOT NULL,
      active TINYINT(1) NOT NULL DEFAULT 0,
      image_approved TINYINT(1) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_rock_public_catalog (active, image_approved, sort_order),
      INDEX idx_rock_product_category (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $existingCount = (int)$pdo->query('SELECT COUNT(*) FROM rock_products')->fetchColumn();
    if ($existingCount > 0) {
        http_response_code(409);
        rock_install_page('قاعدة البيانات ليست فارغة', 'توجد منتجات في قاعدة البيانات لكن علامة التثبيت غير مكتملة. لم يتم استبدال أو حذف أي بيانات؛ راجع قاعدة البيانات قبل المتابعة.', false, 'error');
    }

    $pdo->beginTransaction();
    $insert = $pdo->prepare('INSERT INTO rock_products
      (id, barcode, model, category, price, image, name_ar, name_en, description_en, pictures_url, images_json, active, image_approved, sort_order)
      VALUES (:id, :barcode, :model, :category, :price, :image, :name_ar, :name_en, :description_en, :pictures_url, :images_json, :active, :image_approved, :sort_order)');
    $imported = 0;
    $approvedCount = 0;
    foreach ($catalog as $position => $item) {
        if (!is_array($item)) {
            continue;
        }
        $id = (string)($item['id'] ?? '');
        $image = rock_safe_image_path((string)($item['image'] ?? ''));
        $price = $item['price'] ?? null;
        if (!preg_match('/^[a-zA-Z0-9_-]{2,80}$/', $id) || $image === '' || !is_numeric($price) || (float)$price < 0) {
            continue;
        }

        $images = $item['images'] ?? [$image];
        if (!is_array($images)) {
            $images = [$image];
        }
        $images = array_values(array_unique(array_filter(array_map('rock_safe_image_path', $images))));
        if (!in_array($image, $images, true)) {
            array_unshift($images, $image);
        }
        $approved = isset($approvedLookup[$id]);
        $insert->execute([
            ':id' => $id,
            ':barcode' => substr((string)($item['barcode'] ?? ''), 0, 80),
            ':model' => trim((string)($item['model'] ?? '')),
            ':category' => (string)($item['category'] ?? 'power'),
            ':price' => number_format((float)$price, 2, '.', ''),
            ':image' => $image,
            ':name_ar' => trim((string)($item['nameAr'] ?? '')),
            ':name_en' => trim((string)($item['nameEn'] ?? '')),
            ':description_en' => (string)($item['descriptionEn'] ?? ''),
            ':pictures_url' => substr((string)($item['picturesUrl'] ?? ''), 0, 1000),
            ':images_json' => json_encode($images, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ':active' => $approved ? 1 : 0,
            ':image_approved' => $approved ? 1 : 0,
            ':sort_order' => (int)$position,
        ]);
        $imported++;
        if ($approved) {
            $approvedCount++;
        }
    }

    if ($imported === 0 || $approvedCount === 0) {
        throw new RuntimeException('No usable catalog items were imported.');
    }
    $userInsert = $pdo->prepare('INSERT INTO rock_admin_users (username, password_hash) VALUES (?, ?)');
    $userInsert->execute([$username, password_hash($password, PASSWORD_DEFAULT)]);
    $meta = $pdo->prepare('INSERT INTO rock_site_meta (meta_key, meta_value) VALUES (?, ?)');
    $meta->execute(['installation_complete', '1']);
    $meta->execute(['catalog_imported_count', (string)$imported]);
    $meta->execute(['catalog_approved_count', (string)$approvedCount]);
    $pdo->commit();

    rock_install_page('تم إعداد لوحة ROCK بنجاح', 'تم استيراد ' . $imported . ' منتجًا مع الحفاظ على الأسعار الموجودة، واعتماد ' . $approvedCount . ' منتجًا بصور اجتازت فحص الجودة. احذف api/install.php الآن، ثم سجّل الدخول من admin/.', false);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('[ROCK installer] ' . $error->getMessage());
    http_response_code(500);
    rock_install_page('لم يكتمل إعداد لوحة ROCK', 'تعذر إتمام الإعداد. تحقق من اتصال قاعدة البيانات ووجود ملفات المتجر ومجلد الصور. راجع سجل أخطاء PHP في Hostinger إذا تكررت المشكلة.', true, 'error');
}
