<?php
declare(strict_types=1);

$root = dirname(__DIR__);
$api = file_get_contents($root . '/sales/api.php');
$app = file_get_contents($root . '/sales/app.js');
$html = file_get_contents($root . '/sales/index.html');
$css = file_get_contents($root . '/sales/styles.css');

$checks = [
    'Sales API must require the existing ROCK bootstrap' => str_contains($api, "require_once __DIR__ . '/../api/bootstrap.php'"),
    'Sales API must enforce CSRF for writes' => str_contains($api, 'rock_check_csrf()'),
    'Sales API must keep commission routes admin-only' => str_contains($api, "sales_require(\$pdo,'admin')") && str_contains($api, "if(\$method==='GET'&&\$action==='commissions')"),
    'Rep API payload must not include commission settings' => str_contains($api, "if(\$admin){\$v['discount']") && str_contains($api, "if(\$method==='GET'&&\$action==='settings'){sales_require(\$pdo,'admin')"),
    'Commission must be snapshotted after collection' => str_contains($api, 'sales_lock_commission($pdo,$d)') && str_contains($api, 'commission_locked_at'),
    'Sales reps must only read their own documents' => str_contains($api, "if(\$actor['role']==='rep'){\$sql.=' AND d.rep_id=?'"),
    'Quote prices must be loaded from the database' => str_contains($api, 'SELECT id,model,name_ar,price FROM rock_products'),
    'Tracked stock is deducted on shipping' => str_contains($api, "if(\$status==='shipped'&&\$d['stock_deducted_at']===null)"),
    'Payment over-collection must be rejected' => str_contains($api, 'المبلغ يتجاوز الرصيد المتبقي'),
    'Order status transitions must prevent workflow regression' => str_contains($api, '$transitions=') && str_contains($app, 'const transitions='),
    'Customer and document detail endpoints must exist' => str_contains($api, 'customer_detail') && str_contains($api, 'document_detail'),
    'Portal must be marked private from search engines' => str_contains($html, 'noindex,nofollow'),
    'Portal must expose admin-only commission navigation' => str_contains($html, 'data-tab="commissions"') && str_contains($html, 'admin-only'),
    'Portal must be responsive on mobile' => str_contains($css, '@media(max-width:640px)'),
    'Frontend must use server API, not localStorage' => str_contains($app, "new URL('api.php'") && !str_contains($app, 'localStorage')
];

$failed = [];
foreach ($checks as $label => $passed) {
    echo ($passed ? "PASS" : "FAIL") . " " . $label . PHP_EOL;
    if (!$passed) $failed[] = $label;
}
if ($failed) {
    fwrite(STDERR, count($failed) . " sales portal checks failed." . PHP_EOL);
    exit(1);
}
echo count($checks) . " sales portal checks passed." . PHP_EOL;
