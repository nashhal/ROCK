<?php
declare(strict_types=1);
require_once __DIR__ . '/../api/bootstrap.php';
require_once __DIR__ . '/../api/order-schema.php';
require_once __DIR__ . '/../api/business-schema.php';

rock_start_session();
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$action = $method === 'GET' ? (string)($_GET['action'] ?? 'overview') : (string)($_POST['action'] ?? '');

if (!rock_is_configured()) rock_json(['error' => 'إعداد قاعدة البيانات غير مكتمل.'], 503);

try {
    $pdo = rock_db();
    if (!rock_is_install_complete($pdo)) rock_json(['error' => 'أكمل الإعداد الأولي للمتجر أولاً.'], 503);
    rock_ensure_order_schema($pdo);
    rock_ensure_business_schema($pdo);
    $admin = rock_require_admin();
    $role = rock_admin_role();

    if ($method === 'GET') {
        if ($action === 'overview') {
            $products = $pdo->query("SELECT
                COUNT(*) AS total,
                SUM(active = 1 AND image_approved = 1) AS active,
                SUM(active = 0 OR image_approved = 0) AS hidden,
                SUM(track_stock = 1 AND stock_quantity <= low_stock_threshold) AS low_stock
                FROM rock_products")->fetch() ?: [];
            $orders = $pdo->query("SELECT
                COUNT(*) AS total,
                SUM(status = 'new') AS new_count,
                SUM(status IN ('waiting_rep','contacting','confirmed','preparing','out_for_delivery')) AS processing,
                SUM(status = 'delivered') AS delivered,
                COALESCE(SUM(CASE WHEN status <> 'cancelled' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN total ELSE 0 END),0) AS revenue_30d
                FROM rock_orders")->fetch() ?: [];
            $customers = (int)$pdo->query('SELECT COUNT(*) FROM rock_customers')->fetchColumn();
            $recent = $pdo->query('SELECT order_number, customer_name, customer_city, status, total, created_at
                FROM rock_orders ORDER BY created_at DESC LIMIT 6')->fetchAll();
            rock_json(['products' => $products, 'orders' => $orders, 'customers' => $customers, 'recentOrders' => $recent, 'role' => $role]);
        }

        if ($action === 'inventory') {
            $rows = $pdo->query("SELECT id, model, name_ar, name_en, image, price, active,
                track_stock, stock_quantity, low_stock_threshold,
                (track_stock = 1 AND stock_quantity <= low_stock_threshold) AS low_stock
                FROM rock_products ORDER BY track_stock DESC, stock_quantity ASC, name_ar ASC")->fetchAll();
            rock_json(['products' => $rows, 'count' => count($rows)]);
        }

        if ($action === 'customers') {
            $query = trim((string)($_GET['q'] ?? ''));
            $params = [];
            $where = '';
            if ($query !== '') {
                $where = 'WHERE customer_name LIKE ? OR phone LIKE ? OR city LIKE ?';
                $like = '%' . mb_substr($query, 0, 90, 'UTF-8') . '%';
                $params = [$like, $like, $like];
            }
            $statement = $pdo->prepare("SELECT id, customer_name, phone, city, address, order_count, total_spent, last_order_at, created_at
                FROM rock_customers {$where} ORDER BY last_order_at DESC, customer_name ASC LIMIT 500");
            $statement->execute($params);
            rock_json(['customers' => $statement->fetchAll()]);
        }

        if ($action === 'staff') {
            rock_require_roles(['admin']);
            $rows = $pdo->query("SELECT id, username, full_name, role, is_active, created_at, updated_at
                FROM rock_admin_users ORDER BY FIELD(role,'admin','manager','sales_rep'), full_name, username")->fetchAll();
            rock_json(['staff' => $rows]);
        }

        if ($action === 'settings') {
            rock_require_roles(['admin']);
            $rows = $pdo->query('SELECT setting_key, setting_value FROM rock_store_settings')->fetchAll();
            $settings = [];
            foreach ($rows as $row) $settings[(string)$row['setting_key']] = (string)$row['setting_value'];
            $settings['payment_methods'] = json_decode($settings['payment_methods'] ?? '[]', true) ?: [];
            rock_json(['settings' => $settings]);
        }

        if ($action === 'reports') {
            $from = (string)($_GET['from'] ?? date('Y-m-d', strtotime('-29 days')));
            $to = (string)($_GET['to'] ?? date('Y-m-d'));
            $validDate = static fn(string $value): bool => preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1
                && DateTimeImmutable::createFromFormat('!Y-m-d', $value)?->format('Y-m-d') === $value;
            if (!$validDate($from) || !$validDate($to) || $from > $to || (strtotime($to) - strtotime($from)) > 366 * 86400) {
                rock_json(['error' => 'اختر فترة صحيحة لا تتجاوز سنة واحدة.'], 422);
            }
            $summary = $pdo->prepare("SELECT COUNT(*) AS order_count,
                COALESCE(SUM(total),0) AS revenue,
                COALESCE(AVG(total),0) AS average_order
                FROM rock_orders WHERE status <> 'cancelled' AND created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)");
            $summary->execute([$from, $to]);
            $daily = $pdo->prepare("SELECT DATE(created_at) AS day, COUNT(*) AS order_count, COALESCE(SUM(total),0) AS revenue
                FROM rock_orders WHERE status <> 'cancelled' AND created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY DATE(created_at) ORDER BY day ASC");
            $daily->execute([$from, $to]);
            rock_json(['from' => $from, 'to' => $to, 'summary' => $summary->fetch(), 'daily' => $daily->fetchAll()]);
        }

        rock_json(['error' => 'القسم المطلوب غير معروف.'], 404);
    }

    if ($method !== 'POST') {
        header('Allow: GET, POST');
        rock_json(['error' => 'الطريقة غير مدعومة.'], 405);
    }
    rock_check_csrf();

    if ($action === 'update-stock') {
        rock_require_roles(['admin', 'manager']);
        $id = trim((string)($_POST['product_id'] ?? ''));
        $quantity = filter_var($_POST['stock_quantity'] ?? null, FILTER_VALIDATE_INT);
        $reason = trim(strip_tags((string)($_POST['reason'] ?? 'تحديث مخزون')));
        if (!preg_match('/^[a-zA-Z0-9_-]{2,80}$/', $id) || $quantity === false || $quantity < 0 || $quantity > 10000000) {
            rock_json(['error' => 'تحقق من المنتج والكمية الجديدة.'], 422);
        }
        $pdo->beginTransaction();
        $find = $pdo->prepare('SELECT stock_quantity, track_stock FROM rock_products WHERE id = ? LIMIT 1 FOR UPDATE');
        $find->execute([$id]);
        $before = $find->fetch();
        if (!is_array($before)) {
            $pdo->rollBack();
            rock_json(['error' => 'المنتج غير موجود.'], 404);
        }
        $oldQuantity = (int)$before['stock_quantity'];
        $delta = $quantity - $oldQuantity;
        $pdo->prepare('UPDATE rock_products SET track_stock = 1, stock_quantity = ? WHERE id = ?')->execute([$quantity, $id]);
        if ($delta !== 0) {
            $movement = $pdo->prepare("INSERT INTO rock_inventory_movements
                (product_id, quantity_change, quantity_after, movement_type, reason, reference_type, created_by)
                VALUES (?, ?, ?, 'manual', ?, 'manual', ?)");
            $movement->execute([$id, $delta, $quantity, mb_substr($reason, 0, 255, 'UTF-8'), $admin['id']]);
        }
        $pdo->commit();
        rock_json(['ok' => true, 'productId' => $id, 'previous' => $oldQuantity, 'quantity' => $quantity, 'change' => $delta]);
    }

    if ($action === 'assign-order') {
        rock_require_roles(['admin', 'manager']);
        $orderId = filter_var($_POST['order_id'] ?? null, FILTER_VALIDATE_INT);
        $staffIdText = trim((string)($_POST['staff_id'] ?? ''));
        $staffId = $staffIdText === '' ? null : filter_var($staffIdText, FILTER_VALIDATE_INT);
        if ($orderId === false || $orderId < 1 || ($staffIdText !== '' && ($staffId === false || $staffId < 1))) {
            rock_json(['error' => 'بيانات الإسناد غير صحيحة.'], 422);
        }
        if ($staffId !== null) {
            $staff = $pdo->prepare("SELECT id FROM rock_admin_users WHERE id = ? AND role = 'sales_rep' AND is_active = 1 LIMIT 1");
            $staff->execute([$staffId]);
            if (!$staff->fetchColumn()) rock_json(['error' => 'المندوب غير موجود أو غير نشط.'], 404);
        }
        $update = $pdo->prepare('UPDATE rock_orders SET assigned_to = ?, assigned_by = ? WHERE id = ?');
        $update->execute([$staffId, $admin['id'], $orderId]);
        if ($update->rowCount() === 0) {
            $exists = $pdo->prepare('SELECT id FROM rock_orders WHERE id = ?');
            $exists->execute([$orderId]);
            if (!$exists->fetchColumn()) rock_json(['error' => 'الطلب غير موجود.'], 404);
        }
        rock_json(['ok' => true, 'orderId' => $orderId, 'assignedTo' => $staffId]);
    }

    if ($action === 'save-staff') {
        rock_require_roles(['admin']);
        $idText = trim((string)($_POST['id'] ?? ''));
        $id = $idText === '' ? null : filter_var($idText, FILTER_VALIDATE_INT);
        $username = trim((string)($_POST['username'] ?? ''));
        $fullName = trim((string)($_POST['full_name'] ?? ''));
        $staffRole = trim((string)($_POST['role'] ?? 'sales_rep'));
        $password = (string)($_POST['password'] ?? '');
        $active = (string)($_POST['is_active'] ?? '1') === '1';
        if (($idText !== '' && ($id === false || $id < 1)) || !preg_match('/^[A-Za-z0-9_.-]{3,40}$/', $username)
            || $fullName === '' || mb_strlen($fullName, 'UTF-8') > 120
            || !in_array($staffRole, ['manager', 'sales_rep'], true)) {
            rock_json(['error' => 'تحقق من الاسم واسم المستخدم والدور.'], 422);
        }
        if ($id === null) {
            if (strlen($password) < 12 || strlen($password) > 200) rock_json(['error' => 'كلمة المرور يجب ألا تقل عن 12 حرفاً.'], 422);
            $insert = $pdo->prepare('INSERT INTO rock_admin_users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)');
            try {
                $insert->execute([$username, password_hash($password, PASSWORD_DEFAULT), $staffRole, $fullName]);
            } catch (Throwable $error) {
                if (str_contains(strtolower($error->getMessage()), 'duplicate')) rock_json(['error' => 'اسم المستخدم مستخدم بالفعل.'], 409);
                throw $error;
            }
            rock_json(['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
        }
        if ((int)$id === (int)$admin['id']) rock_json(['error' => 'لا يمكنك تغيير دور حسابك الحالي من هذه الشاشة.'], 422);
        $pdo->prepare('UPDATE rock_admin_users SET username = ?, full_name = ?, role = ?, is_active = ? WHERE id = ?')
            ->execute([$username, $fullName, $staffRole, $active ? 1 : 0, $id]);
        if ($password !== '') {
            if (strlen($password) < 12 || strlen($password) > 200) rock_json(['error' => 'كلمة المرور يجب ألا تقل عن 12 حرفاً.'], 422);
            $pdo->prepare('UPDATE rock_admin_users SET password_hash = ? WHERE id = ?')->execute([password_hash($password, PASSWORD_DEFAULT), $id]);
        }
        rock_json(['ok' => true, 'id' => $id]);
    }

    if ($action === 'save-settings') {
        rock_require_roles(['admin']);
        $shipping = trim((string)($_POST['shipping_default_sar'] ?? '20'));
        $freeShipping = trim((string)($_POST['free_shipping_threshold_sar'] ?? '300'));
        $whatsapp = preg_replace('/[^0-9+]/', '', (string)($_POST['support_whatsapp'] ?? '')) ?? '';
        $payments = $_POST['payment_methods'] ?? [];
        if (!preg_match('/^\d{1,6}(?:\.\d{1,2})?$/', $shipping)
            || !preg_match('/^\d{1,7}(?:\.\d{1,2})?$/', $freeShipping)
            || strlen($whatsapp) > 18 || !is_array($payments)) {
            rock_json(['error' => 'تحقق من قيم الشحن وبيانات التواصل.'], 422);
        }
        $payments = array_values(array_intersect($payments, ['bank_transfer', 'cash_on_delivery']));
        if (!$payments) rock_json(['error' => 'اختر وسيلة دفع واحدة على الأقل.'], 422);
        $values = [
            'shipping_default_sar' => number_format((float)$shipping, 2, '.', ''),
            'free_shipping_threshold_sar' => number_format((float)$freeShipping, 2, '.', ''),
            'support_whatsapp' => $whatsapp,
            'payment_methods' => json_encode($payments, JSON_UNESCAPED_SLASHES),
        ];
        $save = $pdo->prepare('INSERT INTO rock_store_settings (setting_key, setting_value, updated_by) VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)');
        foreach ($values as $key => $value) $save->execute([$key, $value, $admin['id']]);
        rock_json(['ok' => true]);
    }

    rock_json(['error' => 'العملية غير معروفة.'], 404);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) $pdo->rollBack();
    error_log('[ROCK operations API] ' . $error->getMessage());
    rock_json(['error' => 'تعذّر تنفيذ العملية. تحقق من إعداد قاعدة البيانات ثم حاول مجدداً.'], 500);
}
