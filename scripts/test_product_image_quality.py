#!/usr/bin/env python3
"""Tests for ROCK listing-photo quality filtering."""
from __future__ import annotations

import io
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from product_image_quality import analyze_image, build_manifest, MIN_SIDE  # noqa: E402


def image_bytes(size=(400, 400), background=(255, 255, 255), draw_object=True):
    image = Image.new("RGB", size, background)
    if draw_object:
        draw = ImageDraw.Draw(image)
        draw.rounded_rectangle((110, 80, 290, 320), radius=25, fill=(20, 45, 80), outline=(5, 10, 20), width=5)
    output = io.BytesIO()
    image.save(output, format="WEBP", quality=92)
    return output.getvalue()


def main() -> int:
    # Use the production analyzer with temporary assets so no user catalogue files change.
    from unittest.mock import patch
    import tempfile

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        asset_dir = root / "assets" / "products"
        asset_dir.mkdir(parents=True)
        clear_white = asset_dir / "clear.webp"
        clear_white.write_bytes(image_bytes())
        transparent = asset_dir / "transparent.webp"
        transparent_image = Image.new("RGBA", (400, 400), (255, 255, 255, 0))
        ImageDraw.Draw(transparent_image).rounded_rectangle((110, 80, 290, 320), radius=25, fill=(20, 45, 80, 255), outline=(5, 10, 20, 255), width=5)
        transparent_image.save(transparent, format="WEBP", quality=92)
        nonwhite = asset_dir / "dark.webp"
        nonwhite.write_bytes(image_bytes(background=(35, 45, 60)))
        blurry = asset_dir / "blank.webp"
        blurry.write_bytes(image_bytes(draw_object=False))
        small = asset_dir / "small.webp"
        small.write_bytes(image_bytes(size=(150, 150)))
        strip = asset_dir / "strip.webp"
        strip.write_bytes(image_bytes(size=(80, 1800), draw_object=False))

        with patch("product_image_quality.ROOT", root):
            good = analyze_image("assets/products/clear.webp")
            assert good["visible"], f"Clear white packshot should pass: {good}"
            transparent_result = analyze_image("assets/products/transparent.webp")
            assert transparent_result["visible"], f"Transparent cut-out should pass when composited on white: {transparent_result}"
            assert not analyze_image("assets/products/dark.webp")["visible"], "Dark background must be hidden"
            assert analyze_image("assets/products/dark.webp")["reason"] == "background_not_white"
            assert not analyze_image("assets/products/blank.webp")["visible"], "Blank image must be hidden"
            assert analyze_image("assets/products/blank.webp")["reason"] == "insufficient_detail"
            assert not analyze_image("assets/products/small.webp")["visible"], "Small thumbnail must be hidden"
            assert analyze_image("assets/products/small.webp")["reason"] == "low_resolution"
            assert not analyze_image("assets/products/strip.webp")["visible"], "Strip photo must be hidden"

            catalog = [
                {"id": "good", "image": "assets/products/clear.webp"},
                {"id": "bad", "image": "assets/products/dark.webp"},
            ]
            manifest = build_manifest(catalog)
            assert manifest["visibleIds"] == ["good"], manifest["visibleIds"]

    print("Product photo quality tests passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
