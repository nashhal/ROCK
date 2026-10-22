<?php
declare(strict_types=1);

/**
 * Inspect a raster product image. The file must be a real JPEG/PNG/WebP,
 * at least 280px on both sides, have a sensible aspect ratio, a predominantly
 * true-white background and visible detail away from the canvas border.
 */
function rock_inspect_image(string $path): array
{
    if (!is_file($path) || !is_readable($path)) {
        return ['ok' => false, 'reason' => 'missing'];
    }

    $info = @getimagesize($path);
    if (!is_array($info) || empty($info['mime'])) {
        return ['ok' => false, 'reason' => 'unreadable'];
    }

    $mime = strtolower((string)$info['mime']);
    if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
        return ['ok' => false, 'reason' => 'unsupported_type'];
    }

    $width = (int)$info[0];
    $height = (int)$info[1];
    if (min($width, $height) < 280) {
        return ['ok' => false, 'reason' => 'low_resolution', 'width' => $width, 'height' => $height];
    }

    $aspect = $width / max(1, $height);
    if ($aspect < 0.35 || $aspect > 2.5) {
        return ['ok' => false, 'reason' => 'invalid_aspect_ratio', 'width' => $width, 'height' => $height];
    }

    if (!function_exists('imagecreatefromstring') || !function_exists('imagewebp')) {
        return ['ok' => false, 'reason' => 'gd_webp_required'];
    }

    $bytes = @file_get_contents($path);
    $source = $bytes === false ? false : @imagecreatefromstring($bytes);
    if (!$source) {
        return ['ok' => false, 'reason' => 'unreadable'];
    }

    // Composite transparent cut-outs over white before measuring the backdrop.
    $thumb = imagecreatetruecolor(128, 128);
    if (!$thumb) {
        imagedestroy($source);
        return ['ok' => false, 'reason' => 'image_processing_failed'];
    }
    $white = imagecolorallocate($thumb, 255, 255, 255);
    imagefill($thumb, 0, 0, $white);
    imagealphablending($thumb, true);

    $scale = min(128 / $width, 128 / $height);
    $drawWidth = max(1, (int)round($width * $scale));
    $drawHeight = max(1, (int)round($height * $scale));
    $dstX = (int)floor((128 - $drawWidth) / 2);
    $dstY = (int)floor((128 - $drawHeight) / 2);
    imagecopyresampled($thumb, $source, $dstX, $dstY, 0, 0, $drawWidth, $drawHeight, $width, $height);

    $pixels = 128 * 128;
    $whitePixels = 0;
    for ($y = 0; $y < 128; $y++) {
        for ($x = 0; $x < 128; $x++) {
            $rgb = imagecolorat($thumb, $x, $y);
            $red = ($rgb >> 16) & 255;
            $green = ($rgb >> 8) & 255;
            $blue = $rgb & 255;
            if (min($red, $green, $blue) >= 242 && (max($red, $green, $blue) - min($red, $green, $blue)) <= 12) {
                $whitePixels++;
            }
        }
    }
    $whiteFraction = $whitePixels / $pixels;

    // Average neighboring luminance difference inside the image, excluding the border.
    $edgeSum = 0.0;
    $edgeCount = 0;
    for ($y = 5; $y < 123; $y++) {
        for ($x = 5; $x < 123; $x++) {
            $rgb = imagecolorat($thumb, $x, $y);
            $r = ($rgb >> 16) & 255;
            $g = ($rgb >> 8) & 255;
            $b = $rgb & 255;
            $gray = (0.299 * $r) + (0.587 * $g) + (0.114 * $b);

            $nextRgb = imagecolorat($thumb, $x + 1, $y);
            $nr = ($nextRgb >> 16) & 255;
            $ng = ($nextRgb >> 8) & 255;
            $nb = $nextRgb & 255;
            $nextGray = (0.299 * $nr) + (0.587 * $ng) + (0.114 * $nb);

            $edgeSum += abs($gray - $nextGray);
            $edgeCount++;
        }
    }
    $edgeMean = $edgeCount > 0 ? $edgeSum / $edgeCount : 0.0;
    imagedestroy($thumb);
    imagedestroy($source);

    if ($whiteFraction < 0.52) {
        return ['ok' => false, 'reason' => 'background_not_white', 'width' => $width, 'height' => $height, 'white_fraction' => round($whiteFraction, 3)];
    }
    if ($edgeMean < 1.15) {
        return ['ok' => false, 'reason' => 'not_clear_enough', 'width' => $width, 'height' => $height, 'edge_mean' => round($edgeMean, 2)];
    }

    return [
        'ok' => true,
        'reason' => 'clear_white_background',
        'width' => $width,
        'height' => $height,
        'white_fraction' => round($whiteFraction, 3),
        'edge_mean' => round($edgeMean, 2),
    ];
}

/**
 * Save a verified uploaded image as a normalized 600x600 WebP on pure white.
 * The source aspect ratio is preserved and padding is added where needed.
 */
function rock_normalize_product_image(string $sourcePath, string $destinationPath): array
{
    $quality = rock_inspect_image($sourcePath);
    if (!$quality['ok']) {
        return $quality;
    }

    $bytes = @file_get_contents($sourcePath);
    $source = $bytes === false ? false : @imagecreatefromstring($bytes);
    if (!$source) {
        return ['ok' => false, 'reason' => 'unreadable'];
    }

    $sourceWidth = imagesx($source);
    $sourceHeight = imagesy($source);
    $canvas = imagecreatetruecolor(600, 600);
    if (!$canvas) {
        imagedestroy($source);
        return ['ok' => false, 'reason' => 'image_processing_failed'];
    }

    $white = imagecolorallocate($canvas, 255, 255, 255);
    imagefill($canvas, 0, 0, $white);
    imagealphablending($canvas, true);

    $scale = min(560 / $sourceWidth, 560 / $sourceHeight);
    $targetWidth = max(1, (int)round($sourceWidth * $scale));
    $targetHeight = max(1, (int)round($sourceHeight * $scale));
    $dstX = (int)floor((600 - $targetWidth) / 2);
    $dstY = (int)floor((600 - $targetHeight) / 2);
    imagecopyresampled($canvas, $source, $dstX, $dstY, 0, 0, $targetWidth, $targetHeight, $sourceWidth, $sourceHeight);

    $saved = imagewebp($canvas, $destinationPath, 88);
    imagedestroy($canvas);
    imagedestroy($source);

    if (!$saved || !is_file($destinationPath) || filesize($destinationPath) < 512) {
        @unlink($destinationPath);
        return ['ok' => false, 'reason' => 'image_save_failed'];
    }

    return ['ok' => true, 'path' => $destinationPath, 'width' => 600, 'height' => 600];
}
