<?php
declare(strict_types=1);
require_once __DIR__ . '/../api/bootstrap.php';
require_once __DIR__ . '/../api/order-schema.php';
require_once __DIR__ . '/../api/business-schema.php';

rock_start_session();
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$action = $method === 'GET'
    ? (string)($_GET['action'] ?? 'orders')
    : (string)($_POST['action'] ?? '');

if (!rock_is_configured()) {
    rock_json(['error' => 'إعداد قاعدة بيانات ROCK غير مكتمل.'], 503);
}

try {
    $pdo = rock_db();
    if (!rock_is_install_complete($pdo)) {
        rock_json(['error' => 'لم يتم تثبيت قاعدة بيانات ROCK بعد.'], 503);
    }
    rock_ensure_order_schema($pdo);
    rock_ensure_business_schema($pdo);
    $admin = rock_require_admin();
    $role = rock_admin_role();

    if ($method === 'GET' && $action === 'orders') {
        $allowedStatuses = ['new', 'waiting_rep', 'contacting', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'failed_delivery', 'cancelled'];
        $status = trim((string)($_GET['status'] ?? 'all'));
        $query = trim((string)($_GET['q'] ?? ''));
        if ($status !== 'all' && !in_array($status, $allowedStatuses, true)) {
            rock_json(['error' => 'حالة الطلب غير معروفة.'], 422);
        }
        $where = [];
        $params = [];
        if ($status !== 'all') {
            $where[] = 'o.status = ?';
            $params[] = $status;
        }
        if ($role === 'sales_rep') {
            $where[] = 'o.assigned_to = ?';
            $params[] = $admin['id'];
        }
        if ($query !== '') {
            $where[] = '(o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ? OR o.customer_city LIKE ?)';
            $like = '%' . mb_substr($query, 0, 100, 'UTF-8') . '%';
            array_push($params, $like, $like, $like, $like);
        }
        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
        $sql = "SELECT o.id, o.order_number, o.customer_name, o.customer_phone, o.customer_city,
                    o.customer_address, o.customer_notes, o.status, o.currency, o.subtotal, o.shipping_fee, o.total, o.payment_method,
                    o.created_at, o.updated_at, o.assigned_to, staff.full_name AS assigned_name,
                    i.product_id, i.model, i.name_ar, i.name_en, i.unit_price, i.quantity, i.line_total
                FROM rock_orders o
                LEFT JOIN rock_admin_users staff ON staff.id = o.assigned_to
                LEFT JOIN rock_order_items i ON i.order_id = o.id
                {$whereSql}
                ORDER BY o.created_at DESC, o.id DESC
                LIMIT 1200";
        $statement = $pdo->prepare($sql);
        $statement->execute($params);
        $rows = $statement->fetchAll();
        $orders = [];
        foreach ($rows as $row) {
            $id = (int)$row['id'];
            if (!isset($orders[$id])) {
                $orders[$id] = [
                    'id' => $id,
                    'orderNumber' => (string)$row['order_number'],
                    'customerName' => (string)$row['customer_name'],
                    'customerPhone' => (string)$row['customer_phone'],
                    'customerCity' => (string)$row['customer_city'],
                    'customerAddress' => (string)$row['customer_address'],
                    'customerNotes' => (string)$row['customer_notes'],
                    'status' => (string)$row['status'],
                    'currency' => (string)$row['currency'],
                    'subtotal' => (string)$row['subtotal'],
                    'shippingFee' => (string)$row['shipping_fee'],
                    'paymentMethod' => (string)$row['payment_method'],
                    'total' => (string)$row['total'],
                    'createdAt' => (string)$row['created_at'],
                    'updatedAt' => (string)$row['updated_at'],
                    'assignedTo' => $row['assigned_to'] === null ? null : (int)$row['assigned_to'],
                    'assignedName' => (string)($row['assigned_name'] ?? ''),
                    'items' => [],
                ];
            }
            if ($row['product_id'] !== null) {
                $orders[$id]['items'][] = [
                    'productId' => (string)$row['product_id'],
                    'model' => (string)$row['model'],
                    'nameAr' => (string)$row['name_ar'],
                    'nameEn' => (string)$row['name_en'],
                    'unitPrice' => (string)$row['unit_price'],
                    'quantity' => (int)$row['quantity'],
                    'lineTotal' => (string)$row['line_total'],
                ];
            }
        }
        $salesReps = [];
        if (in_array($role, ['admin', 'manager'], true)) {
            $salesReps = $pdo->query("SELECT id, full_name, username FROM rock_admin_users
                WHERE role = 'sales_rep' AND is_active = 1 ORDER BY full_name, username")->fetchAll();
        }
        rock_json([
            'orders' => array_values($orders),
            'count' => count($orders),
            'salesReps' => $salesReps,
            'canAssign' => in_array($role, ['admin', 'manager'], true),
            'canManage' => in_array($role, ['admin', 'manager'], true),
        ]);
    }

    if ($method !== 'POST' || $action !== 'update-status') {
        header('Allow: GET, POST');
        rock_json(['error' => 'العملية غير مدعومة.'], 405);
    }

    rock_check_csrf();
    $id = filter_var($_POST['order_id'] ?? null, FILTER_VALIDATE_INT);
    $newStatus = trim((string)($_POST['status'] ?? ''));
    $allowedStatuses = ['new', 'waiting_rep', 'contacting', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'failed_delivery', 'cancelled'];
    if ($id === false || $id < 1 || !in_array($newStatus, $allowedStatuses, true)) {
        rock_json(['error' => 'تحقق من رقم الطلب والحالة الجديدة.'], 422);
    }

    $pdo->beginTransaction();
    $find = $pdo->prepare('SELECT status, assigned_to FROM rock_orders WHERE id = ? LIMIT 1 FOR UPDATE');
    $find->execute([$id]);
    $orderRow = $find->fetch();
    $oldStatus = is_array($orderRow) ? (string)$orderRow['status'] : false;
    if ($role === 'sales_rep' && (!is_array($orderRow) || (int)($orderRow['assigned_to'] ?? 0) !== (int)$admin['id'])) {
        $pdo->rollBack();
        rock_json(['error' => 'هذا الطلب غير مسند إلى حسابك.'], 403);
    }
    if (!is_string($oldStatus)) {
        $pdo->rollBack();
        rock_json(['error' => 'الطلب غير موجود.'], 404);
    }
    if ($oldStatus !== $newStatus) {
        $update = $pdo->prepare('UPDATE rock_orders SET status = ? WHERE id = ?');
        $update->execute([$newStatus, $id]);
        $history = $pdo->prepare('INSERT INTO rock_order_status_history (order_id, old_status, new_status, changed_by) VALUES (?, ?, ?, ?)');
        $history->execute([$id, $oldStatus, $newStatus, $admin['id']]);
    }
    $pdo->commit();
    rock_json(['ok' => true, 'orderId' => $id, 'status' => $newStatus]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('[ROCK orders admin API] ' . $error->getMessage());
    rock_json(['error' => 'تعذّر تنفيذ العملية. تحقق من الاتصال بقاعدة البيانات.'], 500);
}
