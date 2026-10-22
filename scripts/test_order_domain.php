<?php
declare(strict_types=1);
require_once __DIR__ . '/../api/order-domain.php';

function order_test_assert(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: " . $message . PHP_EOL);
        exit(1);
    }
}

$base = [
    'confirmation' => true,
    'customerName' => '  عميل تجريبي  ',
    'customerPhone' => '+966 50 123 4567',
    'customerCity' => 'جدة',
    'customerAddress' => 'عنوان تجريبي',
    'customerNotes' => '',
    'items' => [
        ['id' => 'rkch765', 'qty' => 2],
        ['id' => 'rkcbl146', 'qty' => 1],
    ],
];

$valid = rock_validate_public_order($base);
order_test_assert($valid['customerName'] === 'عميل تجريبي', 'customer name should be trimmed');
order_test_assert($valid['customerPhone'] === '+966501234567', 'phone should be normalized');
order_test_assert($valid['items']['rkch765'] === 2, 'line quantity should be validated');
order_test_assert(rock_order_decimal_to_minor('6.25') === 625, 'price should convert to integer minor units');
order_test_assert(rock_order_decimal_to_minor('0.5') === 50, 'single decimal digit should be padded');
order_test_assert(rock_order_minor_to_decimal(1215) === '12.15', 'minor units should convert to stable decimal');
order_test_assert(preg_match('/^ROCK-\d{8}-[A-F0-9]{6}$/', rock_new_order_number()) === 1, 'order number format should be stable');

$arabicPhone = $base;
$arabicPhone['customerPhone'] = '+٩٦٦ ٥٠ ١٢٣ ٤٥٦٧';
order_test_assert(rock_validate_public_order($arabicPhone)['customerPhone'] === '+966501234567', 'Arabic-Indic phone digits should normalize');

$invalid = $base;
$invalid['confirmation'] = false;
try {
    rock_validate_public_order($invalid);
    order_test_assert(false, 'order confirmation is required');
} catch (RockOrderValidationException $error) {
    order_test_assert($error->httpStatus === 422, 'invalid confirmation should return 422');
}

$invalid = $base;
$invalid['items'] = [['id' => '../bad', 'qty' => 1]];
try {
    rock_validate_public_order($invalid);
    order_test_assert(false, 'invalid product IDs should be rejected');
} catch (RockOrderValidationException $error) {
    order_test_assert(true, 'invalid product ID is rejected');
}

$invalid = $base;
$invalid['items'] = [['id' => 'rkch765', 'qty' => 100]];
try {
    rock_validate_public_order($invalid);
    order_test_assert(false, 'excessive quantity should be rejected');
} catch (RockOrderValidationException $error) {
    order_test_assert(true, 'excessive quantity is rejected');
}

$invalid = $base;
$invalid['items'] = [['id' => 'rkch765', 'qty' => 1], ['id' => 'rkch765', 'qty' => 2]];
try {
    rock_validate_public_order($invalid);
    order_test_assert(false, 'duplicate item IDs should be rejected');
} catch (RockOrderValidationException $error) {
    order_test_assert(true, 'duplicate IDs are rejected');
}

try {
    rock_order_decimal_to_minor('12.999');
    order_test_assert(false, 'money with more than 2 decimal places should be rejected');
} catch (RuntimeException $error) {
    order_test_assert(true, 'invalid decimal money is rejected');
}

echo "ROCK order-domain tests passed." . PHP_EOL;
