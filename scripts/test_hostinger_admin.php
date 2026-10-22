<?php
declare(strict_types=1);

require_once __DIR__ . '/../api/image-quality.php';

function test_assert(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

function test_make_image(string $path, int $width, int $height, array $background, bool $drawProduct = true): void
{
    $image = imagecreatetruecolor($width, $height);
    $bg = imagecolorallocate($image, $background[0], $background[1], $background[2]);
    imagefill($image, 0, 0, $bg);

    if ($drawProduct) {
        $ink = imagecolorallocate($image, 12, 34, 62);
        $detail = imagecolorallocate($image, 45, 108, 180);
        imagefilledrectangle($image, (int)($width * 0.27), (int)($height * 0.18), (int)($width * 0.73), (int)($height * 0.82), $ink);
        imagefilledrectangle($image, (int)($width * 0.36), (int)($height * 0.29), (int)($width * 0.64), (int)($height * 0.38), $detail);
    }

    imagewebp($image, $path, 92);
    imagedestroy($image);
}

$work = sys_get_temp_dir() . '/rock-admin-quality-' . bin2hex(random_bytes(6));
mkdir($work, 0700, true);

try {
    $clear = $work . '/clear.webp';
    $dark = $work . '/dark.webp';
    $blank = $work . '/blank.webp';
    $strip = $work . '/strip.webp';
    $pale = $work . '/pale-spec.webp';

    test_make_image($clear, 420, 420, [255, 255, 255], true);
    test_make_image($dark, 420, 420, [30, 42, 58], true);
    test_make_image($blank, 420, 420, [255, 255, 255], false);
    test_make_image($strip, 70, 1800, [255, 255, 255], false);
    test_make_image($pale, 420, 420, [232, 250, 250], true);

    $valid = rock_inspect_image($clear);
    test_assert($valid['ok'] === true, 'clear white-background product image should pass');

    $invalidBackground = rock_inspect_image($dark);
    test_assert($invalidBackground['ok'] === false && $invalidBackground['reason'] === 'background_not_white', 'dark backgrounds should be rejected');

    $invalidBlank = rock_inspect_image($blank);
    test_assert($invalidBlank['ok'] === false && $invalidBlank['reason'] === 'not_clear_enough', 'blank images should be rejected');

    $invalidStrip = rock_inspect_image($strip);
    test_assert($invalidStrip['ok'] === false && $invalidStrip['reason'] === 'low_resolution', 'narrow vertical strips should be rejected');

    $invalidPale = rock_inspect_image($pale);
    test_assert($invalidPale['ok'] === false && $invalidPale['reason'] === 'background_not_white', 'pale cyan specification sheets should be rejected');

    $normalized = $work . '/normalized.webp';
    $saved = rock_normalize_product_image($clear, $normalized);
    test_assert($saved['ok'] === true && is_file($normalized), 'accepted image should normalize to WebP');
    $size = getimagesize($normalized);
    test_assert($size !== false && $size[0] === 600 && $size[1] === 600, 'normalized product image should be square 600px WebP');

    echo "Hostinger product image quality tests passed.\n";
} finally {
    foreach (glob($work . '/*') ?: [] as $file) {
        @unlink($file);
    }
    @rmdir($work);
}
