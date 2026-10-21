#!/usr/bin/env python3
"""Build a fail-closed allowlist for product photos that are clear and white-background."""
from __future__ import annotations

import io
import json
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps, ImageStat

from sync_drive_photos import white_edge_score

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS_JS = ROOT / "products.js"
OUTPUT = ROOT / "data" / "product-image-quality.js"
MIN_SIDE = 280
MIN_ASPECT = 0.35
MAX_ASPECT = 2.5
MIN_WHITE_EDGE_SCORE = 0.80
MIN_EDGE_MEAN = 1.15


def read_products() -> list[dict]:
    source = PRODUCTS_JS.read_text(encoding="utf-8")
    marker = "const ROCK_PRODUCTS ="
    start = source.find(marker)
    if start < 0:
        raise RuntimeError("Could not locate ROCK_PRODUCTS in products.js")
    array_start = source.find("[", start + len(marker))
    if array_start < 0:
        raise RuntimeError("Could not locate the product array")
    products, _ = json.JSONDecoder().raw_decode(source[array_start:])
    return products


def analyze_image(relative_path: str) -> dict:
    path = ROOT / relative_path
    if not path.is_file():
        return {"visible": False, "reason": "missing"}

    try:
        raw = path.read_bytes()
        with Image.open(io.BytesIO(raw)) as original:
            image = ImageOps.exif_transpose(original).convert("RGB")
            width, height = image.size
            image.load()
    except Exception:
        return {"visible": False, "reason": "unreadable"}

    result = {"width": width, "height": height}
    if min(width, height) < MIN_SIDE:
        return {**result, "visible": False, "reason": "low_resolution"}

    aspect = width / height if height else 0
    if not MIN_ASPECT <= aspect <= MAX_ASPECT:
        return {**result, "visible": False, "reason": "malformed_aspect_ratio"}

    white_score = white_edge_score(raw)
    result["whiteEdgeScore"] = round(white_score, 3)
    if white_score < MIN_WHITE_EDGE_SCORE:
        return {**result, "visible": False, "reason": "background_not_white"}

    # A blank/washed-out image is not a usable packshot, even if its border is white.
    sample = image.copy()
    sample.thumbnail((128, 128), Image.Resampling.LANCZOS)
    edge_mean = ImageStat.Stat(sample.convert("L").filter(ImageFilter.FIND_EDGES)).mean[0]
    result["edgeMean"] = round(edge_mean, 2)
    if edge_mean < MIN_EDGE_MEAN:
        return {**result, "visible": False, "reason": "insufficient_detail"}

    return {**result, "visible": True, "reason": "clear_white_background"}


def build_manifest(products: list[dict]) -> dict:
    items = {}
    visible_ids = []
    for product in products:
        product_id = str(product.get("id") or "")
        image_path = str(product.get("image") or "")
        quality = analyze_image(image_path)
        quality["image"] = image_path
        items[product_id] = quality
        if quality["visible"]:
            visible_ids.append(product_id)
    return {
        "generatedBy": "scripts/product_image_quality.py",
        "criteria": {
            "minSide": MIN_SIDE,
            "minWhiteEdgeScore": MIN_WHITE_EDGE_SCORE,
            "minEdgeMean": MIN_EDGE_MEAN,
            "aspectRatio": [MIN_ASPECT, MAX_ASPECT],
        },
        "visibleIds": visible_ids,
        "images": items,
    }


def main() -> int:
    products = read_products()
    manifest = build_manifest(products)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        "/* Generated during CI from the actual primary product image files. */\n"
        "globalThis.ROCK_PRODUCT_IMAGE_QUALITY = "
        + json.dumps(manifest, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    visible = set(manifest["visibleIds"])
    hidden = [(p.get("id", "?"), manifest["images"].get(p.get("id", ""), {}).get("reason", "unknown")) for p in products if p.get("id") not in visible]
    print(f"Product photo quality: showing {len(visible)}/{len(products)} products with clear white-background images.")
    if hidden:
        print("Hidden products (id: reason):")
        for product_id, reason in hidden:
            print(f"  {product_id}: {reason}")
    if not visible:
        raise RuntimeError("No products passed the image quality checks; refusing to publish an empty catalog.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
