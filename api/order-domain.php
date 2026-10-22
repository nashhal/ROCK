<?php
declare(strict_types=1);

final class RockOrderValidationException extends RuntimeException
{
    public function __construct(string $message, public readonly int $httpStatus = 422)
    {
        parent::__construct($message);
    }
}

function rock_order_text(mixed $value, int $maxLength, string $field, bool $required = false): string
{
    if (!is_string($value) && !is_numeric($value)) {
        throw new RockOrderValidationException('حقل ' . $field . ' غير صالح.');
    }
    $text = trim((string)$value);
    $text = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $text) ?? '';
    $text = trim(preg_replace('/\s{2,}/u', ' ', $text) ?? $text);
    if ($required && $text === '') {
        throw new RockOrderValidationException('أدخل ' . $field . '.');
    }
    if (mb_strlen($text, 'UTF-8') > $maxLength) {
        throw new RockOrderValidationException('حقل ' . $field . ' أطول من المسموح.');
    }
    return $text;
}

function rock_order_normalize_phone(mixed $value): string
{
    $phone = rock_order_text($value, 64, 'رقم الجوال', true);
    $digits = [
        '٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9',
        '۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9',
    ];
    $phone = strtr($phone, $digits);
    $phone = preg_replace('/[^\d+]/u', '', $phone) ?? '';
    $hasPlus = str_starts_with($phone, '+');
    $phone = str_replace('+', '', $phone);
    $phone = ($hasPlus ? '+' : '') . $phone;
    if (!preg_match('/^\+?\d{7,18}$/', $phone)) {
        throw new RockOrderValidationException('أدخل رقم جوال صحيحًا مع رمز الدولة عند الحاجة.');
    }
    return $phone;
}

function rock_validate_public_order(array $payload): array
{
    if (!in_array($payload['confirmation'] ?? false, [true, 1, '1'], true)) {
        throw new RockOrderValidationException('أكد مراجعة ملخص الطلب قبل الإرسال.');
    }

    $name = rock_order_text($payload['customerName'] ?? '', 120, 'اسم العميل', true);
    $phone = rock_order_normalize_phone($payload['customerPhone'] ?? '');
    $city = rock_order_text($payload['customerCity'] ?? '', 100, 'المدينة');
    $address = rock_order_text($payload['customerAddress'] ?? '', 255, 'العنوان');
    $notes = rock_order_text($payload['customerNotes'] ?? '', 1200, 'الملاحظات');

    $items = $payload['items'] ?? null;
    if (!is_array($items) || count($items) < 1 || count($items) > 20) {
        throw new RockOrderValidationException('السلة غير صالحة. حدّث الصفحة ثم راجع المنتجات.');
    }

    $quantities = [];
    foreach ($items as $item) {
        if (!is_array($item)) {
            throw new RockOrderValidationException('أحد عناصر السلة غير صالح.');
        }
        $id = trim((string)($item['id'] ?? ''));
        $quantity = filter_var($item['qty'] ?? null, FILTER_VALIDATE_INT);
        if (!preg_match('/^[a-zA-Z0-9_-]{2,80}$/', $id) || $quantity === false || $quantity < 1 || $quantity > 99) {
            throw new RockOrderValidationException('أحد عناصر السلة أو كميته غير صالح.');
        }
        if (isset($quantities[$id])) {
            throw new RockOrderValidationException('السلة تحتوي عنصرًا مكررًا. حدّث الصفحة وحاول مجددًا.');
        }
        $quantities[$id] = $quantity;
    }

    return [
        'customerName' => $name,
        'customerPhone' => $phone,
        'customerCity' => $city,
        'customerAddress' => $address,
        'customerNotes' => $notes,
        'items' => $quantities,
    ];
}

function rock_order_decimal_to_minor(mixed $value): int
{
    $text = trim((string)$value);
    if (!preg_match('/^\d{1,10}(?:\.\d{1,2})?$/', $text)) {
        throw new RuntimeException('Invalid database money value.');
    }
    $parts = explode('.', $text, 2);
    $fraction = str_pad($parts[1] ?? '', 2, '0');
    return ((int)$parts[0] * 100) + (int)$fraction;
}

function rock_order_minor_to_decimal(int $minor): string
{
    if ($minor < 0) {
        throw new RuntimeException('Negative order total is not allowed.');
    }
    return intdiv($minor, 100) . '.' . str_pad((string)($minor % 100), 2, '0', STR_PAD_LEFT);
}

function rock_new_order_number(): string
{
    return 'ROCK-' . gmdate('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
}
