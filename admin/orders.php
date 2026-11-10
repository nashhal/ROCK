<?php
declare(strict_types=1);
require_once __DIR__ . '/../api/bootstrap.php';
require_once __DIR__ . '/../api/order-schema.php';
rock_start_session();

if (empty($_SESSION['rock_admin_id']) || empty($_SESSION['rock_admin_username'])) {
    header('Location: ./');
    exit;
}
$csrf = htmlspecialchars(rock_csrf_token(), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$setupError = '';
try {
    if (!rock_is_configured()) {
        $setupError = 'إعداد قاعدة البيانات غير مكتمل.';
    } else {
        $pdo = rock_db();
        if (!rock_is_install_complete($pdo)) {
            $setupError = 'لم يتم تثبيت قاعدة بيانات المتجر بعد.';
        } else {
            rock_ensure_order_schema($pdo);
        }
    }
} catch (Throwable $error) {
    error_log('[ROCK orders page] ' . $error->getMessage());
    $setupError = 'تعذر الاتصال بقاعدة البيانات. تحقق من إعدادات Hostinger.';
}
?>
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <meta name="csrf-token" content="<?= $csrf ?>">
  <meta name="theme-color" content="#f5f8fc">
  <title>طلبات ROCK | إدارة المتجر</title>
  <style>
    :root{color-scheme:light;--navy:#071a33;--blue:#1479dc;--line:#dfe7f0;--muted:#687b91;--paper:#f5f8fc}
    *{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--navy);font-family:"IBM Plex Sans Arabic",Tahoma,Arial,sans-serif;line-height:1.65}
    a{color:inherit;text-decoration:none}.topbar{height:68px;background:#fff;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 max(18px,calc((100% - 1180px)/2))}
    .brand{font:900 22px/1 Inter,Arial,sans-serif;letter-spacing:.08em}.top-actions{display:flex;align-items:center;gap:10px}
    .link-btn,.btn{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:8px 14px;border:1px solid var(--line);border-radius:10px;background:#fff;color:#173653;font:700 12px inherit;cursor:pointer}
    .btn-primary{background:var(--navy);border-color:var(--navy);color:#fff}.btn:disabled{opacity:.55;cursor:wait}
    main{max-width:1180px;margin:0 auto;padding:34px 22px 70px}.heading{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:24px}
    .kicker{font:800 10px/1.4 Inter,Arial,sans-serif;letter-spacing:.16em;color:#327fc0}.heading h1{margin:8px 0 4px;font-size:clamp(27px,4vw,38px);line-height:1.2}.heading p{margin:0;color:var(--muted);font-size:13px}
    .stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:18px}.stat{padding:16px 18px;background:#fff;border:1px solid var(--line);border-radius:14px}.stat span{display:block;color:var(--muted);font-size:11px}.stat strong{display:block;margin-top:5px;font:800 24px/1.25 Inter,Arial,sans-serif;font-variant-numeric:tabular-nums}
    .panel{background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden}.toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:16px;border-bottom:1px solid var(--line)}
    .toolbar input,.toolbar select{min-height:42px;border:1px solid var(--line);border-radius:10px;padding:8px 12px;background:#fff;color:var(--navy);font:500 12px inherit;min-width:180px}
    .toolbar input{flex:1}.toolbar select{min-width:160px}.result-count{margin-inline-start:auto;color:var(--muted);font-size:11px}
    .orders{display:grid;gap:12px;padding:16px}.order{border:1px solid var(--line);border-radius:13px;padding:16px;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1.4fr) minmax(185px,.8fr);gap:18px;align-items:start}
    .order-top{display:flex;justify-content:space-between;gap:10px;align-items:center}.order-number{font:800 13px/1.4 Inter,Arial,sans-serif;letter-spacing:.02em;direction:ltr;unicode-bidi:embed}
    .order-date{font-size:10px;color:var(--muted);margin-top:5px}.customer{font-weight:800;font-size:14px}.customer-detail{font-size:11px;color:#5e748b;overflow-wrap:anywhere}
    .items{margin:8px 0 0;padding:0;list-style:none;display:grid;gap:5px;font-size:11px;color:#405a73}.items b{color:var(--navy);font-variant-numeric:tabular-nums}
    .order-total{font:900 18px/1.3 Inter,Arial,sans-serif;direction:ltr;text-align:left;font-variant-numeric:tabular-nums}.order-currency{font:700 10px "IBM Plex Sans Arabic",Arial,sans-serif;color:var(--muted)}
    .status-row{display:flex;gap:7px;margin-top:10px}.status-row select{flex:1;min-width:0;min-height:39px;border:1px solid var(--line);border-radius:9px;padding:6px;background:#fff;font:600 11px inherit}.status-row button{min-width:70px}
    .notes{margin-top:9px;padding:8px 10px;border-radius:8px;background:#f5f8fc;color:#556c83;font-size:10px;white-space:pre-wrap;overflow-wrap:anywhere}
    .empty,.error,.setup{margin:16px;padding:22px;border-radius:12px;background:#f5f8fc;color:#526b83;text-align:center;font-size:13px}.error,.setup{background:#fff4f2;color:#813d33}
    .order-status{display:inline-flex;align-items:center;border-radius:999px;padding:4px 9px;background:#eef4fb;color:#27577f;font-size:10px;font-weight:800;white-space:nowrap}
    footer{padding:20px;text-align:center;color:#8290a0;font-size:10px}
    @media(max-width:850px){.order{grid-template-columns:1fr 1fr}.order-actions{grid-column:1/-1}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:560px){.topbar{height:60px;padding:0 14px}.brand{font-size:18px}.top-actions{gap:6px}.link-btn,.btn{min-height:38px;padding:7px 10px;font-size:11px}main{padding:26px 13px 50px}.heading{display:block}.heading .top-actions{margin-top:14px}.stats{gap:8px}.stat{padding:12px}.stat strong{font-size:21px}.toolbar{padding:12px}.toolbar input,.toolbar select{min-width:100%;width:100%}.result-count{margin-inline-start:0}.orders{padding:10px}.order{grid-template-columns:1fr;gap:12px;padding:13px}.order-actions{grid-column:auto}.order-total{text-align:right}.status-row{max-width:none}}
    @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
  </style>
  <script src="orders-admin.js?v=20261110-orders-v1" defer></script>
</head>
<body>
  <header class="topbar">
    <a class="brand" href="../" aria-label="ROCK">ROCK</a>
    <div class="top-actions"><a class="link-btn" href="./">إدارة المنتجات</a><a class="link-btn" href="../" target="_blank" rel="noopener">عرض المتجر ↗</a></div>
  </header>
  <main>
    <div class="heading">
      <div><span class="kicker">ROCK / ORDER MANAGEMENT</span><h1>إدارة الطلبات</h1><p>طلبات العملاء المحفوظة في قاعدة بيانات المتجر.</p></div>
      <div class="top-actions"><button id="refreshOrders" class="btn" type="button">تحديث الطلبات</button><button id="exportOrders" class="btn btn-primary" type="button">تصدير CSV</button></div>
    </div>
    <?php if ($setupError !== ''): ?>
      <div class="setup"><?= htmlspecialchars($setupError, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></div>
    <?php else: ?>
      <section class="stats" aria-label="ملخص الطلبات">
        <article class="stat"><span>كل الطلبات الظاهرة</span><strong id="statAll">—</strong></article>
        <article class="stat"><span>طلبات جديدة</span><strong id="statNew">—</strong></article>
        <article class="stat"><span>قيد المعالجة</span><strong id="statActive">—</strong></article>
        <article class="stat"><span>تم التسليم</span><strong id="statDelivered">—</strong></article>
      </section>
      <section class="panel" aria-label="قائمة الطلبات">
        <div class="toolbar">
          <input id="searchOrders" type="search" placeholder="ابحث برقم الطلب أو اسم العميل أو الجوال أو المدينة" aria-label="بحث في الطلبات">
          <select id="statusFilter" aria-label="تصفية حسب الحالة">
            <option value="all">كل الحالات</option>
            <option value="new">طلب جديد</option><option value="waiting_rep">بانتظار المندوب</option>
            <option value="contacting">جاري التواصل</option><option value="confirmed">مؤكد</option>
            <option value="preparing">قيد التجهيز</option><option value="out_for_delivery">خرج للتوصيل</option>
            <option value="delivered">تم التسليم</option><option value="failed_delivery">تعذر التسليم</option>
            <option value="cancelled">ملغي</option>
          </select>
          <span id="resultCount" class="result-count" aria-live="polite">—</span>
        </div>
        <div id="ordersList" class="orders" aria-live="polite"><div class="empty">جارٍ تحميل الطلبات…</div></div>
      </section>
    <?php endif; ?>
  </main>
  <footer>ROCK — فجر جديد · بيانات الطلبات متاحة لمستخدمي لوحة الإدارة المسجلين فقط.</footer>
</body>
</html>
