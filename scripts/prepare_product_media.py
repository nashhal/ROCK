from __future__ import annotations

from collections import deque
from math import hypot
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter
from rembg import new_session, remove

ROOT = Path("assets/products")
PADDING = 28
ALPHA_THRESHOLD = 24
MIN_COMPONENT_RATIO = 0.0002
OVERLAP_PADDING_RATIO = 0.10


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


def overlaps(a, b, pad):
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    return not (ax2 + pad <= bx1 or bx2 + pad <= ax1 or ay2 + pad <= by1 or by2 + pad <= ay1)


def clean_alpha(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A").filter(ImageFilter.MedianFilter(3))
    w, h = alpha.size
    comps = list(components(alpha))
    if not comps:
        return image

    cx, cy = w / 2, h / 2
    central = [c for c in comps if hypot(c["center"][0] - cx, c["center"][1] - cy) <= hypot(w, h) * 0.46] or comps
    anchor = max(central, key=lambda c: c["area"])
    anchor_box = anchor["bbox"]
    ax, ay = anchor["center"]
    diagonal = hypot(w, h)
    anchor_radius = max(anchor_box[2] - anchor_box[0], anchor_box[3] - anchor_box[1]) * 0.75
    min_area = max(32, int(w * h * MIN_COMPONENT_RATIO))

    keep = {id(anchor)}
    for c in comps:
        if c is anchor or c["area"] < min_area:
            continue
        x1, y1, x2, y2 = c["bbox"]
        center_distance = hypot(c["center"][0] - ax, c["center"][1] - ay)
        box_pad = max(8, int(min(w, h) * OVERLAP_PADDING_RATIO))
        near_anchor = center_distance <= max(diagonal * 0.20, anchor_radius * 1.65)
        touches_anchor = overlaps(c["bbox"], anchor_box, box_pad)
        width = max(1, x2 - x1)
        height = max(1, y2 - y1)
        aspect = max(width / height, height / width)
        area_ratio = c["area"] / (w * h)
        likely_text = aspect >= 6.0 and area_ratio < 0.015
        if (touches_anchor or near_anchor) and not likely_text:
            keep.add(id(c))

    out = Image.new("L", (w, h), 0)
    out_px = out.load()
    for c in comps:
        if id(c) in keep:
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
    print(f"Processed product cutout {index}/{len(files)}: {path}")

print(f"Prepared improved transparent product cutouts: {len(files)} files")
