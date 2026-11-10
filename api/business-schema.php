<?php
declare(strict_types=1);

/**
 * Backwards-compatible store operations schema.
 * Every change is additive and safe to run repeatedly on an existing ROCK DB.
 */
function rock_ensure_column(PDO $pdo, string $table, string $column, string $definition): void
{
    $check = $pdo->prepare('SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?');
    $check->execute([$table, $column]);
    if ((int)$check->fetchColumn() === 0) {
        $pdo->exec("ALTER TABLE `{$table}` ADD COLUMN `{$column}` {$definition}");
    }
}

function rock_ensure_index(PDO $pdo, string $table, string $index, string $definition): void
{
    $check = $pdo->prepare('SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?');
    $check->execute([$table, $index]);
    if ((int)$check->fetchColumn() === 0) {
        $pdo->exec("ALTER TABLE `{$table}` ADD {$definition}");
    }
}

function rock_ensure_business_schema(PDO $pdo): void
{
    // Product stock tracking is opt-in to avoid pretending legacy stock levels are known.
    rock_ensure_column($pdo, 'rock_products', 'track_stock', 'TINYINT(1) NOT NULL DEFAULT 0');
    rock_ensure_column($pdo, 'rock_products', 'stock_quantity', 'INT UNSIGNED NOT NULL DEFAULT 0');
    rock_ensure_column($pdo, 'rock_products', 'low_stock_threshold', 'INT UNSIGNED NOT NULL DEFAULT 5');
    rock_ensure_column($pdo, 'rock_admin_users', 'role', "VARCHAR(24) NOT NULL DEFAULT 'admin'");
    rock_ensure_column($pdo, 'rock_admin_users', 'full_name', "VARCHAR(120) NOT NULL DEFAULT ''");
    rock_ensure_column($pdo, 'rock_admin_users', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1');

    $pdo->exec("CREATE TABLE IF NOT EXISTS rock_customers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      customer_name VARCHAR(160) NOT NULL,
      phone VARCHAR(32) NOT NULL,
      city VARCHAR(120) NOT NULL DEFAULT '',
      address VARCHAR(500) NOT NULL DEFAULT '',
      notes TEXT NOT NULL,
      order_count INT UNSIGNED NOT NULL DEFAULT 0,
      total_spent DECIMAL(12,2) NOT NULL DEFAULT 0,
      last_order_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_rock_customer_phone (phone),
      INDEX idx_rock_customers_name (customer_name),
      INDEX idx_rock_customers_last_order (last_order_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS rock_inventory_movements (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      product_id VARCHAR(80) NOT NULL,
      quantity_change INT NOT NULL,
      quantity_after INT UNSIGNED NOT NULL,
      movement_type VARCHAR(24) NOT NULL,
      reason VARCHAR(255) NOT NULL DEFAULT '',
      reference_type VARCHAR(24) NOT NULL DEFAULT 'manual',
      reference_id BIGINT UNSIGNED NULL,
      created_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_rock_inventory_product (product_id, created_at),
      INDEX idx_rock_inventory_reference (reference_type, reference_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS rock_store_settings (
      setting_key VARCHAR(80) NOT NULL PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_by BIGINT UNSIGNED NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    rock_ensure_column($pdo, 'rock_orders', 'shipping_fee', 'DECIMAL(12,2) NOT NULL DEFAULT 0');
    rock_ensure_column($pdo, 'rock_order_items', 'stock_reserved', 'TINYINT(1) NOT NULL DEFAULT 0');
    rock_ensure_column($pdo, 'rock_orders', 'payment_method', "VARCHAR(32) NOT NULL DEFAULT 'cash_on_delivery'");
    rock_ensure_column($pdo, 'rock_orders', 'customer_id', 'BIGINT UNSIGNED NULL');
    rock_ensure_column($pdo, 'rock_orders', 'assigned_to', 'BIGINT UNSIGNED NULL');
    rock_ensure_column($pdo, 'rock_orders', 'assigned_by', 'BIGINT UNSIGNED NULL');
    rock_ensure_index($pdo, 'rock_orders', 'idx_rock_orders_customer', 'INDEX idx_rock_orders_customer (customer_id)');
    rock_ensure_index($pdo, 'rock_orders', 'idx_rock_orders_assignee', 'INDEX idx_rock_orders_assignee (assigned_to, status, created_at)');

    $defaults = [
        'shipping_default_sar' => '20',
        'free_shipping_threshold_sar' => '300',
        'payment_methods' => json_encode(['bank_transfer', 'cash_on_delivery'], JSON_UNESCAPED_SLASHES),
        'support_whatsapp' => '',
        'store_currency' => 'SAR',
        'order_request_notice_ar' => 'سنتواصل معك لتأكيد السعر والتوفر والتوصيل.',
        'order_request_notice_en' => 'We will contact you to confirm price, availability and delivery.',
    ];
    $insert = $pdo->prepare('INSERT IGNORE INTO rock_store_settings (setting_key, setting_value) VALUES (?, ?)');
    foreach ($defaults as $key => $value) {
        $insert->execute([$key, (string)$value]);
    }
}

function rock_admin_role(): string
{
    return (string)($_SESSION['rock_admin_role'] ?? 'admin');
}

function rock_require_roles(array $roles): array
{
    $admin = rock_require_admin();
    $role = rock_admin_role();
    if (!in_array($role, $roles, true)) {
        rock_json(['error' => 'ليست لديك صلاحية لتنفيذ هذه العملية.'], 403);
    }
    $admin['role'] = $role;
    return $admin;
}
