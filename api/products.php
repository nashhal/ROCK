<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    rock_json(['error' => 'Method not allowed.'], 405);
}
if (!rock_is_configured()) {
    rock_json(['error' => 'Live catalog is not configured.'], 503);
}

try {
    $pdo = rock_db();
    if (!rock_is_install_complete($pdo)) {
        rock_json(['error' => 'Live catalog is not installed.'], 503);
    }
    $statement = $pdo->query(
        'SELECT id, barcode, model, category, price, image, name_ar, name_en, description_en, pictures_url, images_json, active, image_approved
         FROM rock_products
         WHERE active = 1 AND image_approved = 1
         ORDER BY sort_order ASC, name_ar ASC'
    );
    $rows = $statement->fetchAll();
    $products = [];
    foreach ($rows as $row) {
        $public = rock_public_product($row);
        if ($public['image'] !== '' && $public['nameAr'] !== '' && $public['nameEn'] !== '') {
            $products[] = $public;
        }
    }
    rock_json(['products' => $products, 'source' => 'hostinger-mysql']);
} catch (Throwable $error) {
    error_log('[ROCK catalog API] ' . $error->getMessage());
    rock_json(['error' => 'The live catalog is temporarily unavailable.'], 503);
}
