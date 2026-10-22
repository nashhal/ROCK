<?php
declare(strict_types=1);
require_once __DIR__ . '/../api/bootstrap.php';
rock_start_session();
$csrf = htmlspecialchars(rock_csrf_token(), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$configured = rock_is_configured();
$notice = '';
if (!$configured) {
    $notice = 'انسخ api/config.example.php إلى api/config.php، ثم أضف بيانات قاعدة MySQL ورمز إعداد قوي. بعد ذلك افتح api/install.php لإكمال التثبيت.';
} else {
    try {
        $pdo = rock_db();
        if (!rock_is_install_complete($pdo)) {
            $notice = 'قاعدة بيانات المتجر لم تُثبت بعد. افتح api/install.php لإتمام الإعداد الأولي.';
        }
    } catch (Throwable $error) {
        $notice = 'تعذر الاتصال بقاعدة البيانات. تحقق من إعدادات api/config.php في Hostinger.';
    }
}
?>
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta name="csrf-token" content="<?= $csrf ?>">
  <title>إدارة ROCK | فجر جديد مع روك</title>
  <link rel="icon" href="../assets/brand/rock-logo.svg" type="image/svg+xml">
  <link rel="stylesheet" href="admin.css?v=20261022-admin-v1">
  <script src="admin.js?v=20261022-admin-v1" defer></script>
</head>
<body data-setup-needed="<?= $notice !== '' ? '1' : '0' ?>">
  <header class="topbar">
    <a class="brand" href="../" aria-label="ROCK storefront"><img src="../assets/brand/rock-logo.svg" alt="ROCK"></a>
    <div class="top-actions"><a class="site-link" href="../" target="_blank" rel="noopener">عرض المتجر ↗</a><button id="logoutButton" class="btn btn-quiet" type="button" hidden>تسجيل الخروج</button></div>
  </header>
  <main class="page-shell">
    <?php if ($notice !== ''): ?>
      <section class="setup-notice"><span class="kicker">ROCK / SETUP</span><h1>لوحة إدارة المنتجات</h1><p><?= htmlspecialchars($notice, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></p><p class="setup-links"><a href="../api/install.php">فتح معالج الإعداد ↗</a> <a href="../HOSTINGER-ADMIN-SETUP.md">دليل الإعداد</a></p></section>
    <?php endif; ?>

    <section id="loginPanel" class="login-panel" <?= $notice !== '' ? 'hidden' : '' ?>>
      <div class="login-brand"><span class="kicker">ROCK / ADMIN</span><h1>إدارة المتجر<br><em>ببساطة.</em></h1><p>إدارة الأسعار والمنتجات والصور من مكان واحد.</p></div>
      <form id="loginForm" class="login-form">
        <h2>تسجيل الدخول</h2>
        <label for="loginUsername">اسم المستخدم</label><input id="loginUsername" name="username" required autocomplete="username" maxlength="40">
        <label for="loginPassword">كلمة المرور</label><input id="loginPassword" name="password" type="password" required autocomplete="current-password" maxlength="200">
        <button class="btn btn-primary full" type="submit">دخول إلى لوحة الإدارة</button>
        <p id="loginMessage" class="form-message" role="status" aria-live="polite"></p>
      </form>
    </section>

    <section id="dashboard" hidden>
      <div class="view-switcher" role="tablist" aria-label="مساحة الإدارة"><button class="view-tab active" type="button" role="tab" aria-selected="true" data-admin-view="products">المنتجات والكتالوج</button><button class="view-tab" type="button" role="tab" aria-selected="false" data-admin-view="orders">الطلبات</button></div>
      <div id="productsView">
      <div class="page-heading"><div><span class="kicker">ROCK / CATALOG</span><h1>إدارة المنتجات</h1><p>عدّل الأسعار والأسماء والصور، ثم احفظ ليظهر التغيير في المتجر.</p></div><button id="newProductButton" class="btn btn-primary" type="button">＋ إضافة منتج</button></div>
      <div class="stats">
        <article class="stat"><span>إجمالي المنتجات</span><strong id="totalCount">—</strong></article>
        <article class="stat"><span>معروضة في المتجر</span><strong id="activeCount">—</strong></article>
        <article class="stat"><span>مخفية</span><strong id="hiddenCount">—</strong></article>
      </div>
      <section class="catalog-panel">
        <div class="table-toolbar"><label class="search-label" for="searchProducts">بحث بالاسم أو الموديل أو الباركود</label><input id="searchProducts" type="search" placeholder="ابحث في الكتالوج…"><button id="refreshButton" class="btn btn-quiet" type="button">تحديث</button></div>
        <div id="catalogMessage" class="form-message" role="status" aria-live="polite"></div>
        <div class="table-scroll"><table><thead><tr><th>الصورة</th><th>الموديل</th><th>اسم المنتج</th><th>السعر</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody id="productsBody"></tbody></table></div>
        <p class="table-note">لن يظهر المنتج للزوار إلا إذا كان مفعّلًا وصورته الرئيسية واضحة بخلفية بيضاء.</p>
      </section>
      </div>
      <section id="ordersView" hidden>
        <div class="page-heading"><div><span class="kicker">ROCK / ORDERS</span><h1>طلبات المتجر</h1><p>طلبات العملاء المسجلة على قاعدة البيانات، مع انتقالات حالة موثّقة. لا يتم تحديث حالة الدفع من هذه اللوحة.</p></div><button id="refreshOrdersButton" class="btn btn-quiet" type="button">تحديث الطلبات</button></div>
        <div class="stats"><article class="stat"><span>إجمالي الطلبات</span><strong id="ordersTotalCount">—</strong></article><article class="stat"><span>بانتظار المراجعة</span><strong id="ordersNewCount">—</strong></article><article class="stat"><span>طلبات اليوم (UTC)</span><strong id="ordersTodayCount">—</strong></article></div>
        <section class="catalog-panel">
          <div class="table-toolbar"><label class="search-label" for="searchOrders">بحث برقم الطلب أو العميل أو الجوال</label><input id="searchOrders" type="search" placeholder="ابحث في الطلبات…"><button id="refreshOrdersInline" class="btn btn-quiet" type="button">تحديث</button></div>
          <div id="ordersMessage" class="form-message" role="status" aria-live="polite"></div>
          <div class="table-scroll"><table><thead><tr><th>رقم الطلب</th><th>العميل</th><th>الجوال</th><th>العناصر</th><th>الإجمالي</th><th>التاريخ</th><th>الحالة</th><th>التفاصيل</th></tr></thead><tbody id="ordersBody"></tbody></table></div>
          <p class="table-note">حالة الطلب لا تعني تأكيد الدفع. الدفع والشحن غير مربوطين بمزودين فعليين في هذه النسخة.</p>
        </section>
      </section>
    </section>
  </main>

  <div id="productDialog" class="dialog-wrap" hidden>
    <div class="dialog-backdrop" data-close-dialog></div>
    <section class="product-dialog" role="dialog" aria-modal="true" aria-labelledby="formTitle">
      <div class="dialog-header"><div><span class="kicker">ROCK / PRODUCT</span><h2 id="formTitle">إضافة منتج</h2></div><button type="button" class="icon-button" data-close-dialog aria-label="إغلاق">×</button></div>
      <form id="productForm">
        <div class="form-grid">
          <label>معرّف المنتج <input name="id" id="productId" required pattern="[A-Za-z0-9_-]{2,80}" maxlength="80" placeholder="rock-charger-65w"><small>إنجليزي، أرقام أو شرطات. لا تغيّره بعد الحفظ.</small></label>
          <label>الموديل / SKU <input name="model" required maxlength="120" placeholder="RKCH765"></label>
          <label>الباركود <input name="barcode" maxlength="80" placeholder="اختياري"></label>
          <label>التصنيف <select name="category" required><option value="power">الشحن والطاقة</option><option value="audio">الصوت والسماعات</option><option value="car">إكسسوارات السيارة</option><option value="lifestyle">إكسسوارات يومية</option></select></label>
          <label>السعر (ر.س) <input name="price" type="number" inputmode="decimal" min="0" max="999999999" step="0.01" required></label>
          <label>الاسم بالعربية <input name="name_ar" required maxlength="255"></label>
          <label class="wide-field">الاسم بالإنجليزية <input name="name_en" required maxlength="255"></label>
          <label class="wide-field">وصف مختصر بالإنجليزية <textarea name="description_en" rows="2" maxlength="12000"></textarea></label>
          <label class="wide-field">رابط صور أو صفحة المورّد (اختياري) <input name="pictures_url" type="url" placeholder="https://…"></label>
          <label class="wide-field image-field">صورة المنتج الرئيسية <input id="productImage" name="image" type="file" accept="image/jpeg,image/png,image/webp"><small>JPG أو PNG أو WebP، حتى 8MB. يجب أن تكون واضحة وخلفيتها بيضاء. تُرفض صور المواصفات والشرائط والمصغّرات.</small><span id="imageStatus" class="image-status"></span></label>
          <label class="active-toggle"><input name="active" type="checkbox" value="1" checked> عرض المنتج في المتجر</label>
        </div>
        <div class="dialog-actions"><button type="button" class="btn btn-quiet" data-close-dialog>إلغاء</button><button id="saveButton" type="submit" class="btn btn-primary">حفظ المنتج</button></div>
        <p id="productFormMessage" class="form-message" role="status" aria-live="polite"></p>
      </form>
    </section>
  </div>
  <div id="orderDetailDialog" class="dialog-wrap" hidden><div class="dialog-backdrop" data-close-order-dialog></div><section class="product-dialog order-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="orderDetailTitle"><div class="dialog-header"><div><span class="kicker">ROCK / ORDER</span><h2 id="orderDetailTitle">تفاصيل الطلب</h2></div><button type="button" class="icon-button" data-close-order-dialog aria-label="إغلاق">×</button></div><div id="orderDetailBody" class="order-detail-body"></div><div class="dialog-actions"><button type="button" class="btn btn-quiet" data-close-order-dialog>إغلاق</button></div></section></div>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <footer><span>ROCK — فجر جديد مع روك</span><span>لوحة إدارة محمية · لا يوجد دفع إلكتروني ضمن هذه اللوحة</span></footer>
</body>
</html>
