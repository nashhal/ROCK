<?php
declare(strict_types=1);

/**
 * Idempotent order schema migration.
 * Existing ROCK installations gain order support automatically on the first
 * order/API visit; existing product and admin data is never rewritten.
 */
function rock_ensure_order_schema(PDO $pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS rock_orders (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_number VARCHAR(32) NOT NULL UNIQUE,
      customer_name VARCHAR(160) NOT NULL,
      customer_phone VARCHAR(32) NOT NULL,
      customer_city VARCHAR(120) NOT NULL,
      customer_address VARCHAR(500) NOT NULL DEFAULT '',
      customer_notes TEXT NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'new',
      currency CHAR(3) NOT NULL DEFAULT 'SAR',
      subtotal DECIMAL(12,2) NOT NULL,
      total DECIMAL(12,2) NOT NULL,
      source VARCHAR(32) NOT NULL DEFAULT 'storefront',
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
      quantity INT UNSIGNED NOT NULL,
      line_total DECIMAL(12,2) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_rock_order_items_order (order_id),
      CONSTRAINT fk_rock_order_items_order FOREIGN KEY (order_id)
        REFERENCES rock_orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS rock_order_status_history (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id BIGINT UNSIGNED NOT NULL,
      old_status VARCHAR(32) NULL,
      new_status VARCHAR(32) NOT NULL,
      changed_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_rock_order_history_order (order_id, created_at),
      CONSTRAINT fk_rock_order_history_order FOREIGN KEY (order_id)
        REFERENCES rock_orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS rock_order_rate_limits (
      request_key CHAR(64) NOT NULL PRIMARY KEY,
      attempts INT UNSIGNED NOT NULL DEFAULT 0,
      window_started_at DATETIME NOT NULL,
      INDEX idx_rock_order_rate_window (window_started_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}
