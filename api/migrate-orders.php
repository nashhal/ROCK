<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/order-schema.php';

header('Allow: POST');
header('Referrer-Policy: same-origin');

if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
    rock_json(['error' => 'استخدم POST لتشغيل الترقية.'], 405);
}
if (!rock_request_is_https()) {
    rock_json(['error' => 'يلزم HTTPS لتشغيل الترقية.'], 400);
}
if (!rock_is_configured()) {
    rock_json(['error' => 'أكمل api/config.php أولًا.'], 503);
}
$origin = trim((string)($_SERVER['HTTP_ORIGIN'] ?? ''));
if ($origin !== '') {
    $parts = parse_url($origin);
    $originHost = is_array($parts) ? strtolower((string)($parts['host'] ?? '')) : '';
    $host = strtolower(preg_replace('/:\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? '')));
    $scheme = is_array($parts) ? strtolower((string)($parts['scheme'] ?? '')) : '';
    if ($originHost === '' || $host === '' || $originHost !== $host || $scheme !== 'https') {
        rock_json(['error' => 'مصدر الطلب غير مسموح.'], 403);
    }
}
$token = (string)($_POST['setup_token'] ?? '');
global $ROCK_CONFIG;
$configToken = (string)($ROCK_CONFIG['setup_token'] ?? '');
if (strlen($configToken) < 40 || $token === '' || !hash_equals($configToken, $token)) {
    rock_json(['error' => 'رمز الترقية غير صحيح.'], 403);
}
try {
    $pdo = rock_db();
    if (!rock_is_install_complete($pdo)) {
        rock_json(['error' => 'لم تكتمل تهيئة المتجر؛ شغّل المثبّت الأولي أولًا.'], 409);
    }
    rock_install_order_schema($pdo);
    rock_json(['ok' => true, 'message' => 'اكتملت ترقية جداول الطلبات. احذف api/migrate-orders.php من الاستضافة الآن.']);
} catch (Throwable $error) {
    error_log('[ROCK order schema migration] ' . $error->getMessage());
    rock_json(['error' => 'لم تكتمل الترقية. راجع سجل PHP على الاستضافة.'], 500);
}
