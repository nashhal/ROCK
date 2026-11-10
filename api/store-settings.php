<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/order-schema.php';
require_once __DIR__ . '/business-schema.php';

if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'GET') {
    header('Allow: GET');
    rock_json(['error' => 'الطريقة غير مدعومة.'], 405);
}
if (!rock_is_configured()) rock_json(['error' => 'إعداد المتجر غير مكتمل.'], 503);

try {
    $pdo = rock_db();
    if (!rock_is_install_complete($pdo)) rock_json(['error' => 'المتجر لم يكتمل إعداده.'], 503);
    rock_ensure_order_schema($pdo);
    rock_ensure_business_schema($pdo);
    $rows = $pdo->query("SELECT setting_key, setting_value FROM rock_store_settings
        WHERE setting_key IN ('shipping_default_sar','free_shipping_threshold_sar','payment_methods','support_whatsapp',
        'order_request_notice_ar','order_request_notice_en')")->fetchAll();
    $settings = [];
    foreach ($rows as $row) $settings[(string)$row['setting_key']] = (string)$row['setting_value'];
    $methods = json_decode($settings['payment_methods'] ?? '[]', true);
    if (!is_array($methods)) $methods = ['cash_on_delivery'];
    $methods = array_values(array_intersect($methods, ['bank_transfer', 'cash_on_delivery']));
    if (!$methods) $methods = ['cash_on_delivery'];
    rock_json([
        'shippingDefaultSar' => (float)($settings['shipping_default_sar'] ?? 20),
        'freeShippingThresholdSar' => (float)($settings['free_shipping_threshold_sar'] ?? 300),
        'paymentMethods' => $methods,
        'supportWhatsApp' => (string)($settings['support_whatsapp'] ?? ''),
        'noticeAr' => (string)($settings['order_request_notice_ar'] ?? 'سنتواصل معك لتأكيد السعر والتوفر والتوصيل.'),
        'noticeEn' => (string)($settings['order_request_notice_en'] ?? 'We will contact you to confirm price, availability and delivery.'),
    ]);
} catch (Throwable $error) {
    error_log('[ROCK public settings API] ' . $error->getMessage());
    rock_json(['error' => 'تعذر تحميل إعدادات المتجر.'], 503);
}
