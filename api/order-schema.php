<?php
declare(strict_types=1);

function rock_install_order_schema(PDO $pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS rock_orders (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_number VARCHAR(32) NOT NULL UNIQUE,
      status VARCHAR(24) NOT NULL DEFAULT 'new',
      payment_status VARCHAR(24) NOT NULL DEFAULT 'not_configured',
      customer_name VARCHAR(120) NOT NULL,
      customer_phone VARCHAR(32) NOT NULL,
      customer_city VARCHAR(100) NOT NULL DEFAULT '',
      customer_address VARCHAR(255) NOT NULL DEFAULT '',
      customer_notes VARCHAR(1200) NOT NULL DEFAULT '',
      currency CHAR(3) NOT NULL DEFAULT 'SAR',
      subtotal DECIMAL(12,2) NULL DEFAULT NULL,
      shipping DECIMAL(12,2) NULL DEFAULT NULL,
      total DECIMAL(12,2) NOT NULL,
      source VARCHAR(20) NOT NULL DEFAULT 'web',
      idempotency_hash CHAR(64) NULL UNIQUE,
      stock_committed TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_rock_orders_status_created (status, created_at),
      INDEX idx_rock_orders_phone (customer_phone),
      INDEX idx_rock_orders_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS rock_order_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id BIGINT UNSIGNED NOT NULL,
      product_id VARCHAR(80) NOT NULL,
      model VARCHAR(120) NOT NULL,
      name_ar VARCHAR(255) NOT NULL,
      name_en VARCHAR(255) NOT NULL,
      unit_price DECIMAL(12,2) NOT NULL,
      quantity SMALLINT UNSIGNED NOT NULL,
      line_total DECIMAL(12,2) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_rock_order_items_order (order_id),
      INDEX idx_rock_order_items_product (product_id),
      CONSTRAINT fk_rock_order_items_order FOREIGN KEY (order_id) REFERENCES rock_orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS rock_order_events (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id BIGINT UNSIGNED NOT NULL,
      actor_admin_id BIGINT UNSIGNED NULL,
      actor_username VARCHAR(40) NOT NULL DEFAULT 'storefront',
      event_type VARCHAR(40) NOT NULL,
      from_status VARCHAR(24) NULL,
      to_status VARCHAR(24) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_rock_order_events_order (order_id, created_at),
      CONSTRAINT fk_rock_order_events_order FOREIGN KEY (order_id) REFERENCES rock_orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS rock_order_rate_limits (
      ip_hash CHAR(64) NOT NULL PRIMARY KEY,
      window_start DATETIME NOT NULL,
      attempts INT UNSIGNED NOT NULL DEFAULT 0,
      blocked_until DATETIME NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $productColumns = $pdo->query('SHOW COLUMNS FROM rock_products')->fetchAll(PDO::FETCH_COLUMN, 0);
    if (!in_array('stock_quantity', $productColumns, true)) {
        $pdo->exec('ALTER TABLE rock_products ADD COLUMN stock_quantity INT UNSIGNED NULL DEFAULT NULL AFTER sort_order');
    }
    if (!in_array('low_stock_threshold', $productColumns, true)) {
        $pdo->exec('ALTER TABLE rock_products ADD COLUMN low_stock_threshold INT UNSIGNED NOT NULL DEFAULT 5 AFTER stock_quantity');
    }

    $orderColumns = $pdo->query('SHOW COLUMNS FROM rock_orders')->fetchAll(PDO::FETCH_COLUMN, 0);
    if (!in_array('stock_committed', $orderColumns, true)) {
        $pdo->exec('ALTER TABLE rock_orders ADD COLUMN stock_committed TINYINT(1) NOT NULL DEFAULT 0 AFTER idempotency_hash');
    }

    $pdo->prepare("INSERT INTO rock_site_meta (meta_key, meta_value) VALUES ('orders_schema_version', '1')
      ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)")->execute();
}

function rock_order_schema_ready(PDO $pdo): bool
{
    try {
        return (bool)$pdo->query("SHOW TABLES LIKE 'rock_orders'")->fetchColumn()
            && (bool)$pdo->query("SHOW TABLES LIKE 'rock_order_items'")->fetchColumn()
            && (bool)$pdo->query("SHOW TABLES LIKE 'rock_order_rate_limits'")->fetchColumn();
    } catch (Throwable $error) {
        return false;
    }
}
