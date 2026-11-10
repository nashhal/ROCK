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
$role = rock_admin_role();
if ($role === 'sales_rep') {
    header('Location: orders.php');
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
            rock_ensure_business_schema($pdo);
        }
    }
} catch (Throwable $error) {
    error_log('[ROCK operations page] ' . $error->getMessage());
    $setupError = 'تعذر الاتصال بقاعدة البيانات. تحقق من إعدادات Hostinger.';
}
$isAdmin = $role === 'admin';
?>
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <meta name="csrf-token" content="<?= $csrf ?>">
  <meta name="theme-color" content="#ffffff">
  <title>تشغيل ROCK | لوحة الإدارة</title>
  <link rel="icon" href="../assets/brand/rock-logo.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="operations.css?v=20261110-editorial-ops-v1">
  <script src="operations.js?v=20261110-editorial-ops-v1" defer></script>
</head>
<body data-role="<?= htmlspecialchars($role, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" data-admin="<?= $isAdmin ? '1' : '0' ?>">
<header class="ops-topbar">
  <a class="ops-brand" href="./" aria-label="ROCK"><img src="../assets/brand/rock-logo.svg" alt="ROCK"></a>
  <div class="ops-top-actions">
    <span class="ops-user"><?= htmlspecialchars((string)($_SESSION['rock_admin_full_name'] ?? $_SESSION['rock_admin_username']), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></span>
    <a href="../" target="_blank" rel="noopener">عرض المتجر ↗</a>
    <a href="./">إدارة المنتجات</a>
    <a href="orders.php">الطلبات</a>
    <button id="logoutOperations" type="button">تسجيل الخروج</button>
  </div>
</header>

<?php if ($setupError !== ''): ?>
  <main class="ops-setup"><span class="ops-kicker">ROCK / SETUP</span><h1>إعداد نظام التشغيل</h1><p><?= htmlspecialchars($setupError, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></p><a href="../api/install.php">فتح معالج الإعداد</a></main>
<?php else: ?>
<main class="ops-shell">
  <aside class="ops-sidebar" aria-label="أقسام لوحة الإدارة">
    <div class="ops-workspace"><span class="ops-kicker">ROCK / WORKSPACE</span><strong>نظام تشغيل المتجر</strong><small>الريال السعودي · قاعدة المتجر</small></div>
    <nav class="ops-nav">
      <button type="button" data-view="overview" aria-current="page"><span>01</span> نظرة عامة</button>
      <button type="button" data-view="inventory"><span>02</span> المخزون</button>
      <button type="button" data-view="customers"><span>03</span> العملاء</button>
      <button type="button" data-view="reports"><span>04</span> التقارير</button>
      <?php if ($isAdmin): ?>
      <button type="button" data-view="staff"><span>05</span> فريق العمل</button>
      <button type="button" data-view="settings"><span>06</span> إعدادات المتجر</button>
      <?php endif; ?>
    </nav>
    <div class="ops-sidebar-note">ROCK — فجر جديد</div>
  </aside>

  <div class="ops-main">
    <div class="ops-page-heading">
      <div><span class="ops-kicker" id="viewKicker">OVERVIEW / 01</span><h1 id="viewTitle">نظرة عامة</h1><p id="viewDescription">صورة تشغيلية لما يحدث في المتجر الآن.</p></div>
      <button type="button" class="ops-button ops-button-light" id="refreshView">تحديث البيانات</button>
    </div>

    <section class="ops-view" id="view-overview" data-section="overview">
      <div class="ops-metrics" id="overviewMetrics">
        <article><span>كل المنتجات</span><strong data-metric="products">—</strong><small>في كتالوج ROCK</small></article>
        <article><span>طلبات جديدة</span><strong data-metric="newOrders">—</strong><small>تحتاج إلى متابعة</small></article>
        <article><span>مبيعات آخر 30 يوماً</span><strong data-metric="revenue">—</strong><small>باستثناء الطلبات الملغاة</small></article>
        <article><span>تنبيهات المخزون</span><strong data-metric="lowStock">—</strong><small>عند حد إعادة الطلب أو دونه</small></article>
      </div>
      <div class="ops-overview-grid">
        <section class="ops-panel">
          <div class="ops-panel-heading"><div><span class="ops-kicker">RECENT ACTIVITY</span><h2>أحدث الطلبات</h2></div><a href="orders.php">كل الطلبات ↗</a></div>
          <div class="ops-table-wrap"><table><thead><tr><th>رقم الطلب</th><th>العميل</th><th>الحالة</th><th>الإجمالي</th></tr></thead><tbody id="recentOrdersBody"><tr><td colspan="4" class="ops-empty">جارٍ تحميل البيانات…</td></tr></tbody></table></div>
        </section>
        <section class="ops-panel ops-attention">
          <div class="ops-panel-heading"><div><span class="ops-kicker">ATTENTION</span><h2>ما يحتاج انتباهك</h2></div></div>
          <div id="attentionList" class="ops-attention-list"><p class="ops-empty">جارٍ مراجعة المخزون والطلبات…</p></div>
        </section>
      </div>
    </section>

    <section class="ops-view" id="view-inventory" data-section="inventory" hidden>
      <div class="ops-section-intro"><div><h2>المخزون والكميات</h2><p>فعّل تتبع المخزون للمنتجات التي تعرف كمياتها. لا يتم افتراض كمية للمنتجات القديمة.</p></div><span id="inventoryCount" class="ops-count">—</span></div>
      <div class="ops-toolbar"><input id="inventorySearch" type="search" placeholder="ابحث بالاسم أو الموديل…" aria-label="بحث في المخزون"><select id="inventoryFilter" aria-label="تصفية المخزون"><option value="all">كل المنتجات</option><option value="tracked">متابعة المخزون</option><option value="low">منخفض أو نفد</option><option value="untracked">غير متابع</option></select></div>
      <div class="ops-panel"><div class="ops-table-wrap"><table><thead><tr><th>المنتج</th><th>الموديل</th><th>السعر</th><th>الكمية الحالية</th><th>حد التنبيه</th><th>تحديث الكمية</th></tr></thead><tbody id="inventoryBody"><tr><td colspan="6" class="ops-empty">جارٍ تحميل المخزون…</td></tr></tbody></table></div></div>
    </section>

    <section class="ops-view" id="view-customers" data-section="customers" hidden>
      <div class="ops-section-intro"><div><h2>قاعدة العملاء</h2><p>تُنشأ ملفات العملاء تلقائياً عند إرسال أول طلب محفوظ.</p></div><span id="customerCount" class="ops-count">—</span></div>
      <div class="ops-toolbar"><input id="customerSearch" type="search" placeholder="ابحث بالاسم أو الجوال أو المدينة…" aria-label="بحث العملاء"><button class="ops-button ops-button-light" id="exportCustomers" type="button">تصدير CSV</button></div>
      <div class="ops-panel"><div class="ops-table-wrap"><table><thead><tr><th>العميل</th><th>رقم الجوال</th><th>المدينة</th><th>عدد الطلبات</th><th>إجمالي قيمة الطلبات</th><th>آخر طلب</th></tr></thead><tbody id="customersBody"><tr><td colspan="6" class="ops-empty">جارٍ تحميل العملاء…</td></tr></tbody></table></div></div>
    </section>

    <section class="ops-view" id="view-reports" data-section="reports" hidden>
      <div class="ops-section-intro"><div><h2>تقارير الطلبات</h2><p>القيم مستخرجة من الطلبات غير الملغاة. لا تعني بالضرورة مبالغ محصلة لأن الدفع يتم خارج الموقع.</p></div></div>
      <form id="reportFilters" class="ops-toolbar ops-report-filters">
        <label>من تاريخ <input type="date" id="reportFrom" required></label>
        <label>إلى تاريخ <input type="date" id="reportTo" required></label>
        <button class="ops-button ops-button-dark" type="submit">تحديث التقرير</button>
        <button class="ops-button ops-button-light" id="exportReport" type="button">تصدير CSV</button>
      </form>
      <div class="ops-report-metrics" id="reportMetrics">
        <article><span>قيمة الطلبات</span><strong id="reportRevenue">—</strong></article>
        <article><span>عدد الطلبات</span><strong id="reportOrders">—</strong></article>
        <article><span>متوسط قيمة الطلب</span><strong id="reportAverage">—</strong></article>
      </div>
      <section class="ops-panel"><div class="ops-panel-heading"><div><span class="ops-kicker">DAILY PERFORMANCE</span><h2>القيمة الطلبات حسب اليوم</h2></div></div><div id="dailyReport" class="ops-daily-report"><p class="ops-empty">اختر الفترة لعرض البيانات.</p></div></section>
    </section>

    <?php if ($isAdmin): ?>
    <section class="ops-view" id="view-staff" data-section="staff" hidden>
      <div class="ops-section-intro"><div><h2>حسابات فريق العمل</h2><p>أنشئ مديراً أو مندوب مبيعات، وحدد صلاحياته. حسابات الإدارة لا تُعرض للعملاء.</p></div></div>
      <section class="ops-panel ops-staff-form-panel">
        <div class="ops-panel-heading"><div><span class="ops-kicker">TEAM ACCESS</span><h2 id="staffFormTitle">إضافة عضو جديد</h2></div><button type="button" class="ops-text-button" id="resetStaffForm">مسح النموذج</button></div>
        <form id="staffForm" class="ops-staff-form">
          <input type="hidden" name="id" id="staffId">
          <label>الاسم الكامل<input name="full_name" id="staffFullName" required maxlength="120"></label>
          <label>اسم المستخدم<input name="username" id="staffUsername" required minlength="3" maxlength="40" pattern="[A-Za-z0-9_.-]+"></label>
          <label>الدور<select name="role" id="staffRole"><option value="sales_rep">مندوب مبيعات</option><option value="manager">مدير</option></select></label>
          <label>كلمة المرور <input name="password" id="staffPassword" type="password" minlength="12" maxlength="200" autocomplete="new-password"><small>12 حرفاً على الأقل. مطلوبة للحساب الجديد، واختيارية عند تعديل الحساب.</small></label>
          <label class="ops-active-toggle"><input name="is_active" id="staffActive" type="checkbox" value="1" checked> الحساب نشط</label>
          <button class="ops-button ops-button-dark" type="submit" id="saveStaffButton">حفظ الحساب</button>
          <p id="staffFormMessage" class="ops-message" role="status" aria-live="polite"></p>
        </form>
      </section>
      <section class="ops-panel"><div class="ops-panel-heading"><div><span class="ops-kicker">TEAM DIRECTORY</span><h2>أعضاء الفريق</h2></div></div><div class="ops-table-wrap"><table><thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>الدور</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody id="staffBody"><tr><td colspan="5" class="ops-empty">جارٍ تحميل الفريق…</td></tr></tbody></table></div></section>
    </section>

    <section class="ops-view" id="view-settings" data-section="settings" hidden>
      <div class="ops-section-intro"><div><h2>إعدادات المتجر</h2><p>إعدادات تشغيل أساسية. لا يتم تفعيل بوابة دفع أو إرسال رسائل تلقائية من هذه الصفحة.</p></div></div>
      <form id="storeSettingsForm" class="ops-panel ops-settings-form">
        <div class="ops-settings-grid">
          <label>رسوم الشحن الافتراضية (ر.س)<input name="shipping_default_sar" id="shippingDefault" type="number" min="0" step="0.01" required></label>
          <label>حد الشحن المجاني (ر.س)<input name="free_shipping_threshold_sar" id="freeShipping" type="number" min="0" step="0.01" required></label>
          <label class="ops-wide">رقم واتساب خدمة العملاء (مع مفتاح الدولة)<input name="support_whatsapp" id="supportWhatsApp" inputmode="tel" placeholder="9665XXXXXXXX"></label>
          <fieldset class="ops-payment-options"><legend>طرق الدفع المعروضة</legend><label><input type="checkbox" name="payment_methods" value="bank_transfer"> تحويل بنكي</label><label><input type="checkbox" name="payment_methods" value="cash_on_delivery"> الدفع عند الاستلام</label><small>هذه إعدادات عرض فقط. لا يتم تنفيذ خصم أو معالجة دفع إلكتروني.</small></fieldset>
        </div>
        <div class="ops-form-footer"><p id="settingsMessage" class="ops-message" role="status" aria-live="polite"></p><button class="ops-button ops-button-dark" type="submit" id="saveSettingsButton">حفظ الإعدادات</button></div>
      </form>
    </section>
    <?php endif; ?>
    <footer class="ops-footer">ROCK — فجر جديد <span>لوحة داخلية · بياناتها للمستخدمين المصرح لهم فقط</span></footer>
  </div>
</main>
<?php endif; ?>
<div id="opsToast" class="ops-toast" role="status" aria-live="polite"></div>
</body>
</html>
