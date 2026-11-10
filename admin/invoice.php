<?php
declare(strict_types=1);
require_once __DIR__ . '/../api/bootstrap.php';
require_once __DIR__ . '/../api/order-schema.php';
require_once __DIR__ . '/../api/business-schema.php';
rock_start_session();

if (empty($_SESSION['rock_admin_id']) || empty($_SESSION['rock_admin_username'])) {
    header('Location: ./');
    exit;
}
if (!rock_is_configured()) {
    http_response_code(503);
    exit('قاعدة بيانات ROCK غير متاحة.');
}

try {
    $pdo = rock_db();
    if (!rock_is_install_complete($pdo)) throw new RuntimeException('installation incomplete');
    rock_ensure_order_schema($pdo);
    rock_ensure_business_schema($pdo);

    $orderId = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$orderId || $orderId < 1) {
        http_response_code(400);
        exit('رقم الطلب غير صحيح.');
    }
    $query = $pdo->prepare('SELECT o.*, staff.full_name AS assigned_name
        FROM rock_orders o LEFT JOIN rock_admin_users staff ON staff.id = o.assigned_to
        WHERE o.id = ? LIMIT 1');
    $query->execute([$orderId]);
    $order = $query->fetch();
    if (!is_array($order)) {
        http_response_code(404);
        exit('الطلب غير موجود.');
    }
    if (rock_admin_role() === 'sales_rep' && (int)($order['assigned_to'] ?? 0) !== (int)$_SESSION['rock_admin_id']) {
        http_response_code(403);
        exit('هذا الطلب غير مسند إلى حسابك.');
    }
    $itemsQuery = $pdo->prepare('SELECT product_id, model, name_ar, name_en, unit_price, quantity, line_total
        FROM rock_order_items WHERE order_id = ? ORDER BY id ASC');
    $itemsQuery->execute([$orderId]);
    $items = $itemsQuery->fetchAll();
} catch (Throwable $error) {
    error_log('[ROCK invoice] ' . $error->getMessage());
    http_response_code(500);
    exit('تعذر تحميل مستند الطلب.');
}

function rock_invoice_status(string $status): string
{
    $labels = [
        'new' => 'طلب جديد', 'waiting_rep' => 'بانتظار المندوب', 'contacting' => 'جاري التواصل',
        'confirmed' => 'مؤكد', 'preparing' => 'قيد التجهيز', 'out_for_delivery' => 'خرج للتوصيل',
        'delivered' => 'تم التسليم', 'failed_delivery' => 'تعذر التسليم', 'cancelled' => 'ملغي'
    ];
    return $labels[$status] ?? $status;
}
function rock_invoice_h(mixed $value): string
{
    return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
$paymentLabel = (string)$order['payment_method'] === 'bank_transfer' ? 'تحويل بنكي' : 'الدفع عند الاستلام';
?>
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>مستند الطلب <?= rock_invoice_h($order['order_number']) ?> | ROCK</title>
  <style>
    *{box-sizing:border-box}body{margin:0;padding:28px;background:#f3f6f9;color:#10253d;font-family:"IBM Plex Sans Arabic",Tahoma,Arial,sans-serif;line-height:1.7}
    .actions{width:min(850px,100%);margin:0 auto 14px;display:flex;justify-content:space-between;gap:12px}
    .actions a,.actions button{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:8px 14px;border:1px solid #dce4ec;border-radius:4px;background:#fff;color:#25415e;font:700 11px inherit;text-decoration:none;cursor:pointer}
    .actions button{background:#071a33;color:#fff;border-color:#071a33}
    .sheet{width:min(850px,100%);margin:auto;padding:48px 54px;background:#fff;border:1px solid #dfe6ed}
    .head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding-bottom:28px;border-bottom:2px solid #071a33}
    .logo{width:122px;height:40px;object-fit:contain;object-position:right center}
    .document-label{margin-top:12px;color:#708195;font-size:10px;letter-spacing:.13em}
    h1{margin:3px 0;font-size:28px;color:#071a33}
    .meta{text-align:left;direction:ltr;font:600 11px/1.8 Inter,Arial,sans-serif;color:#526a81}
    .meta strong{display:block;color:#071a33;font-size:15px}
    .state{display:inline-flex;margin-top:8px;padding:3px 8px;border:1px solid #dce5ee;border-radius:3px;color:#3d6487;font:700 10px var(--font-ar);direction:rtl}
    .notice{margin:22px 0;padding:12px 14px;background:#f5f8fb;border-right:3px solid #1479dc;color:#52677c;font-size:11px}
    .details{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:26px 0}
    .details h2{margin:0 0 7px;color:#8291a1;font-size:9px;letter-spacing:.12em;font-weight:800}
    .details p{margin:0;color:#263f58;font-size:12px;line-height:1.9}
    table{width:100%;border-collapse:collapse;margin-top:20px}thead th{padding:10px;border-bottom:1px solid #cbd6e0;color:#8291a1;font-size:9px;text-align:right}
    tbody td{padding:12px 10px;border-bottom:1px solid #e8edf2;font-size:11px;color:#364f68}
    .ltr{direction:ltr;text-align:left;font-family:Inter,Arial,sans-serif;font-variant-numeric:tabular-nums}
    .totals{width:min(320px,100%);margin:22px 0 0 auto}
    .totals div{display:flex;justify-content:space-between;gap:18px;padding:7px 0;color:#66798b;font-size:11px}
    .totals .grand{margin-top:5px;padding-top:12px;border-top:1px solid #bfcbd6;color:#071a33;font-size:16px;font-weight:800}
    .foot{margin-top:42px;padding-top:16px;border-top:1px solid #e2e8ee;display:flex;justify-content:space-between;gap:14px;color:#8391a0;font-size:9px}
    @media(max-width:600px){body{padding:10px}.sheet{padding:25px 18px}.head{gap:10px}.logo{width:90px}.meta{font-size:9px}.details{gap:10px}.totals{width:100%}}
    @media print{body{padding:0;background:#fff}.actions{display:none!important}.sheet{width:100%;max-width:none;margin:0;padding:22mm 18mm;border:0}.notice{break-inside:avoid}table{break-inside:auto}tr{break-inside:avoid;break-after:auto}@page{size:A4;margin:0}}
  </style>
</head>
<body>
  <div class="actions"><a href="orders.php">العودة إلى الطلبات</a><button type="button" onclick="window.print()">طباعة / حفظ PDF</button></div>
  <main class="sheet">
    <header class="head">
      <div><img class="logo" src="../assets/brand/rock-logo.svg" alt="ROCK"><div class="document-label">ROCK / ORDER SUMMARY</div><h1>مستند الطلب</h1></div>
      <div class="meta"><strong><?= rock_invoice_h($order['order_number']) ?></strong><?= rock_invoice_h($order['created_at']) ?><div class="state"><?= rock_invoice_h(rock_invoice_status((string)$order['status'])) ?></div></div>
    </header>
    <div class="notice">هذا مستند لطلب العميل وليس إثباتاً على تحصيل المبلغ. يتم تأكيد التوفر ورسوم التوصيل وطريقة الدفع مع العميل قبل إتمام البيع.</div>
    <section class="details">
      <div><h2>بيانات العميل</h2><p><strong><?= rock_invoice_h($order['customer_name']) ?></strong><br><?= rock_invoice_h($order['customer_phone']) ?><br><?= rock_invoice_h($order['customer_city']) ?><br><?= rock_invoice_h($order['customer_address']) ?></p></div>
      <div><h2>تفاصيل الطلب</h2><p>طريقة الدفع: <?= rock_invoice_h($paymentLabel) ?><br>المندوب: <?= rock_invoice_h($order['assigned_name'] ?: 'غير محدد') ?><br>العملة: SAR</p></div>
    </section>
    <table>
      <thead><tr><th>المنتج</th><th>الموديل</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead>
      <tbody>
        <?php foreach ($items as $item): ?>
        <tr><td><strong><?= rock_invoice_h($item['name_ar']) ?></strong><br><span style="color:#8996a4"><?= rock_invoice_h($item['name_en']) ?></span></td><td class="ltr"><?= rock_invoice_h($item['model']) ?></td><td class="ltr"><?= (int)$item['quantity'] ?></td><td class="ltr"><?= number_format((float)$item['unit_price'], 2) ?></td><td class="ltr"><?= number_format((float)$item['line_total'], 2) ?></td></tr>
        <?php endforeach; ?>
      </tbody>
    </table>
    <div class="totals">
      <div><span>قيمة المنتجات</span><strong class="ltr"><?= number_format((float)$order['subtotal'], 2) ?> SAR</strong></div>
      <div><span>رسوم التوصيل</span><strong class="ltr"><?= number_format((float)$order['shipping_fee'], 2) ?> SAR</strong></div>
      <div class="grand"><span>الإجمالي</span><strong class="ltr"><?= number_format((float)$order['total'], 2) ?> SAR</strong></div>
    </div>
    <?php if (trim((string)$order['customer_notes']) !== ''): ?><div class="notice">ملاحظات العميل: <?= nl2br(rock_invoice_h($order['customer_notes'])) ?></div><?php endif; ?>
    <footer class="foot"><span>ROCK — فجر جديد</span><span>مستند داخلي · لا يمثل إيصال دفع</span></footer>
  </main>
</body>
</html>
