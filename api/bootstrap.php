<?php
declare(strict_types=1);

$ROCK_CONFIG_FILE = __DIR__ . '/config.php';
$ROCK_CONFIG = is_file($ROCK_CONFIG_FILE) ? require $ROCK_CONFIG_FILE : null;

function rock_is_configured(): bool
{
    global $ROCK_CONFIG;
    return is_array($ROCK_CONFIG)
        && !empty($ROCK_CONFIG['db_host'])
        && !empty($ROCK_CONFIG['db_name'])
        && !empty($ROCK_CONFIG['db_user'])
        && array_key_exists('db_password', $ROCK_CONFIG)
        && !empty($ROCK_CONFIG['setup_token']);
}

function rock_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, max-age=0');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function rock_db(): PDO
{
    global $ROCK_CONFIG;
    if (!rock_is_configured()) {
        throw new RuntimeException('Hostinger configuration is missing.');
    }
    if (!extension_loaded('pdo_mysql')) {
        throw new RuntimeException('The PHP pdo_mysql extension is required.');
    }

    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = (string)$ROCK_CONFIG['db_host'];
    $name = (string)$ROCK_CONFIG['db_name'];
    $user = (string)$ROCK_CONFIG['db_user'];
    $password = (string)$ROCK_CONFIG['db_password'];
    $dsn = 'mysql:host=' . $host . ';dbname=' . $name . ';charset=utf8mb4';

    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function rock_start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    global $ROCK_CONFIG;
    $secure = (
        (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off')
        || strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https'
    );
    $sessionName = is_array($ROCK_CONFIG) && !empty($ROCK_CONFIG['session_name'])
        ? (string)$ROCK_CONFIG['session_name']
        : 'rock_admin_session';

    session_name($sessionName);
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();

    if (empty($_SESSION['rock_csrf'])) {
        $_SESSION['rock_csrf'] = bin2hex(random_bytes(32));
    }
}

function rock_csrf_token(): string
{
    rock_start_session();
    return (string)$_SESSION['rock_csrf'];
}

function rock_request_is_https(): bool
{
    return (
        (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off')
        || strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https'
    );
}

function rock_check_csrf(): void
{
    rock_start_session();
    $provided = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf'] ?? '');
    $expected = (string)($_SESSION['rock_csrf'] ?? '');
    if ($provided === '' || $expected === '' || !hash_equals($expected, $provided)) {
        rock_json(['error' => 'انتهت صلاحية الجلسة. حدّث الصفحة وحاول مرة أخرى.'], 403);
    }
}

function rock_require_admin(): array
{
    rock_start_session();
    if (empty($_SESSION['rock_admin_id']) || empty($_SESSION['rock_admin_username'])) {
        rock_json(['error' => 'يلزم تسجيل الدخول.'], 401);
    }
    return ['id' => (int)$_SESSION['rock_admin_id'], 'username' => (string)$_SESSION['rock_admin_username']];
}

function rock_is_install_complete(PDO $pdo): bool
{
    try {
        $statement = $pdo->prepare('SELECT meta_value FROM rock_site_meta WHERE meta_key = ? LIMIT 1');
        $statement->execute(['installation_complete']);
        return $statement->fetchColumn() === '1';
    } catch (Throwable $error) {
        return false;
    }
}

function rock_root(): string
{
    return dirname(__DIR__);
}

function rock_safe_image_path(mixed $path): string
{
    if (!is_string($path)) {
        return '';
    }
    return preg_match('~^(?:assets|uploads)/products/[a-z0-9_-]+\.webp$~i', $path) === 1 ? $path : '';
}

function rock_manifest_visible_ids(): ?array
{
    $file = rock_root() . '/data/product-image-quality.js';
    if (!is_file($file)) {
        return null;
    }

    $source = (string)file_get_contents($file);
    $marker = 'globalThis.ROCK_PRODUCT_IMAGE_QUALITY = ';
    $start = strpos($source, $marker);
    $end = strrpos($source, ';');
    if ($start === false || $end === false || $end <= $start) {
        return null;
    }

    $manifest = json_decode(substr($source, $start + strlen($marker), $end - ($start + strlen($marker))), true);
    if (!is_array($manifest) || !isset($manifest['visibleIds']) || !is_array($manifest['visibleIds'])) {
        return null;
    }
    return array_values(array_filter($manifest['visibleIds'], 'is_string'));
}

function rock_public_product(array $row): array
{
    $image = rock_safe_image_path((string)($row['image'] ?? ''));
    $gallery = json_decode((string)($row['images_json'] ?? '[]'), true);
    if (!is_array($gallery)) {
        $gallery = [];
    }
    $gallery = array_values(array_unique(array_filter(array_map('rock_safe_image_path', $gallery))));
    if ($image !== '' && !in_array($image, $gallery, true)) {
        array_unshift($gallery, $image);
    }

    return [
        'id' => (string)$row['id'],
        'barcode' => (string)($row['barcode'] ?? ''),
        'model' => (string)($row['model'] ?? ''),
        'category' => (string)($row['category'] ?? 'power'),
        'price' => (float)$row['price'],
        'image' => $image,
        'nameAr' => (string)($row['name_ar'] ?? ''),
        'nameEn' => (string)($row['name_en'] ?? ''),
        'descriptionEn' => (string)($row['description_en'] ?? ''),
        'picturesUrl' => (string)($row['pictures_url'] ?? ''),
        'images' => $gallery,
        'active' => (bool)$row['active'],
        'imageApproved' => (bool)$row['image_approved'],
        'stockTracked' => array_key_exists('stock_quantity', $row) && $row['stock_quantity'] !== null,
        'inStock' => !array_key_exists('stock_quantity', $row) || $row['stock_quantity'] === null || (int)$row['stock_quantity'] > 0,
    ];
}

require_once __DIR__ . '/image-quality.php';
