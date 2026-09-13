from __future__ import annotations

from collections import deque
from math import hypot
from pathlib import Path

from PIL import Image, ImageFilter
from rembg import new_session, remove

ROOT = Path("assets/products")
PADDING = 32
ALPHA_THRESHOLD = 18
MIN_COMPONENT_RATIO = 0.00035
KEEP_COMPONENT_RATIO = 0.0020
MAX_ANCHOR_DISTANCE = 0.34


def components(alpha: Image.Image):
    w, h = alpha.size
    px = alpha.load()
    seen = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            idx = y * w + x
            if seen[idx] or px[x, y] < ALPHA_THRESHOLD:
                continue
            q = deque([(x, y)])
            seen[idx] = 1
            points = []
            min_x = max_x = x
            min_y = max_y = y
            while q:
                cx, cy = q.popleft()
                points.append((cx, cy))
                min_x, max_x = min(min_x, cx), max(max_x, cx)
                min_y, max_y = min(min_y, cy), max(max_y, cy)
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        ni = ny * w + nx
                        if not seen[ni] and px[nx, ny] >= ALPHA_THRESHOLD:
                            seen[ni] = 1
                            q.append((nx, ny))
            yield {
                "points": points,
                "area": len(points),
                "bbox": (min_x, min_y, max_x + 1, max_y + 1),
                "center": ((min_x + max_x) / 2, (min_y + max_y) / 2),
            }


def clean_alpha(image: Image.Image) -> Image.Image:
    """Keep the actual product cluster and discard detached catalog text/artifacts."""
    alpha = image.getchannel("A").filter(ImageFilter.MedianFilter(3))
    w, h = alpha.size
    area = w * h
    comps = list(components(alpha))
    if not comps:
        return image

    cx, cy = w / 2, h / 2
    central = [
        c for c in comps
        if hypot(c["center"][0] - cx, c["center"][1] - cy) <= hypot(w, h) * 0.45
    ] or comps
    anchor = max(central, key=lambda c: c["area"])
    ax, ay = anchor["center"]
    min_area = max(48, int(area * MIN_COMPONENT_RATIO))
    keep_area = max(256, int(area * KEEP_COMPONENT_RATIO))
    max_distance = hypot(w, h) * MAX_ANCHOR_DISTANCE

    out = Image.new("L", (w, h), 0)
    out_px = out.load()
    for c in comps:
        dx = c["center"][0] - ax
        dy = c["center"][1] - ay
        distance = hypot(dx, dy)
        keep = c["area"] >= keep_area or (c["area"] >= min_area and distance <= max_distance)
        x1, y1, x2, y2 = c["bbox"]
        touches_edge = x1 <= 2 or y1 <= 2 or x2 >= w - 2 or y2 >= h - 2
        if touches_edge and c["area"] < keep_area * 2:
            keep = False
        if keep:
            for x, y in c["points"]:
                out_px[x, y] = 255

    out = out.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    image.putalpha(out)
    return image


def fit_square(image: Image.Image) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        raise RuntimeError("Background removal produced no foreground")
    left, top, right, bottom = bbox
    left = max(0, left - PADDING)
    top = max(0, top - PADDING)
    right = min(image.width, right + PADDING)
    bottom = min(image.height, bottom + PADDING)
    cropped = image.crop((left, top, right, bottom))
    side = max(cropped.width, cropped.height)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.alpha_composite(cropped, ((side - cropped.width) // 2, (side - cropped.height) // 2))
    return canvas


def process(path: Path, session) -> None:
    source = Image.open(path).convert("RGB")
    result = remove(source, session=session, alpha_matting=False, post_process_mask=True)
    image = result.convert("RGBA") if isinstance(result, Image.Image) else Image.open(result).convert("RGBA")
    image = clean_alpha(image)
    image = fit_square(image)
    image.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
    image.save(path, "WEBP", lossless=True, method=6)

    alpha = image.getchannel("A")
    if alpha.getbbox() is None:
        raise RuntimeError(f"No visible product remains after processing: {path}")
    transparent = sum(1 for value in alpha.getdata() if value == 0)
    if transparent < image.width * image.height * 0.05:
        raise RuntimeError(f"Cutout failed to produce a meaningful transparent background: {path}")


files = sorted(ROOT.glob("*.webp"))
if not files:
    raise SystemExit("No product WebP files found")

session = new_session("u2net")
for index, path in enumerate(files, 1):
    process(path, session)
    print(f"Processed safe product cutout {index}/{len(files)}: {path}")

print(f"Prepared safe transparent product cutouts: {len(files)} files")
