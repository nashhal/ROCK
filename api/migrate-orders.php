<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/order-schema.php';

header('Allow: GET, POST');
header('Referrer-Policy: same-origin');
header('Cache-Control: no-store, max-age=0');

if (!rock_request_is_https()) {
    rock_json(['error' => 'يلزم HTTPS لتشغيل الترقية.'], 400);
}
if (!rock_is_configured()) {
    rock_json(['error' => 'أكمل api/config.php أولًا.'], 503);
}
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method === 'GET') {
    header('Content-Type: text/html; charset=utf-8');
    header('X-Robots-Tag: noindex, nofollow');
    echo '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ترقية طلبات ROCK</title><style>body{font-family:Arial,sans-serif;background:#f4f7fb;color:#152945;margin:0;padding:24px;display:grid;place-items:center;min-height:100vh;box-sizing:border-box}.panel{background:#fff;border:1px solid #dce5ef;border-radius:14px;padding:28px;width:min(520px,100%);box-sizing:border-box}label{display:block;font-weight:700;font-size:13px;margin:18px 0 8px}input,button{font:inherit;width:100%;box-sizing:border-box;padding:12px;border:1px solid #d4e0ed;border-radius:8px}button{background:#0b2039;color:#fff;border:0;font-weight:700;cursor:pointer}p{line-height:1.8;color:#5d7088;font-size:13px}</style><main class="panel"><h1>ترقية قاعدة بيانات ROCK</h1><p>تُستخدم هذه الصفحة مرة واحدة لإضافة جداول الطلبات وأعمدة المخزون إلى قاعدة متجر موجودة. لن تُحذف المنتجات أو تُستبدل أسعارها.</p><form method="post" action=""><label for="setup_token">رمز الإعداد المحفوظ في api/config.php</label><input id="setup_token" name="setup_token" type="password" minlength="40" autocomplete="off" required><p>بعد نجاح الترقية، احذف ملف api/migrate-orders.php من مدير الملفات.</p><button type="submit">ترقية قاعدة البيانات</button></form></main></html>';
    exit;
}
if ($method !== 'POST') {
    header('Allow: GET, POST');
    rock_json(['error' => 'استخدم النموذج مع POST لتشغيل الترقية.'], 405);
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
