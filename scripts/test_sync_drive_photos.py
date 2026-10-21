#!/usr/bin/env python3
"""Regression tests for image selection used by the ROCK product catalog."""
from __future__ import annotations

import io
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sync_drive_photos import is_usable_product_image, white_edge_score  # noqa: E402


def encoded_image(mode: str, color, size: tuple[int, int] = (96, 96)) -> bytes:
    image = Image.new(mode, size, color)
    output = io.BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def main() -> int:
    white = white_edge_score(encoded_image("RGB", (255, 255, 255)))
    gray = white_edge_score(encoded_image("RGB", (128, 128, 128)))
    transparent = white_edge_score(encoded_image("RGBA", (30, 70, 110, 0)))
    assert white >= 0.99, f"White image should score near 1.0, got {white:.3f}"
    assert gray < 0.65, f"Gray image should not pass the white-background threshold, got {gray:.3f}"
    assert transparent >= 0.99, f"Transparent cut-out should render on white, got {transparent:.3f}"

    malformed_tall = encoded_image("RGB", (255, 255, 255), size=(62, 1800))
    malformed_wide = encoded_image("RGB", (255, 255, 255), size=(1800, 62))
    portrait_packshot = encoded_image("RGB", (255, 255, 255), size=(220, 352))
    tiny_preview = encoded_image("RGB", (255, 255, 255), size=(70, 70))
    assert not is_usable_product_image(malformed_tall), "Narrow vertical strip must be rejected"
    assert not is_usable_product_image(malformed_wide), "Narrow horizontal strip must be rejected"
    assert is_usable_product_image(portrait_packshot), "Normal portrait packshot should be accepted"
    assert not is_usable_product_image(tiny_preview), "Tiny preview must be rejected"
    print("ROCK image tests passed: white backgrounds, transparency, aspect ratios and minimum dimensions.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
