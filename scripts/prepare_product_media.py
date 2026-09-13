from __future__ import annotations

from collections import deque
from io import BytesIO
from pathlib import Path

from PIL import Image
from rembg import new_session, remove

ROOT = Path("assets/products")
PADDING = 28
ALPHA_THRESHOLD = 10
MIN_COMPONENT_RATIO = 0.0012
EDGE_MARGIN = 8


def components(alpha: Image.Image):
    """Yield connected foreground components from an alpha mask."""
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
            while q:
                cx, cy = q.popleft()
                points.append((cx, cy))
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        ni = ny * w + nx
                        if not seen[ni] and px[nx, ny] >= ALPHA_THRESHOLD:
                            seen[ni] = 1
                            q.append((nx, ny))
            yield points


def clean_alpha(image: Image.Image) -> Image.Image:
    """Remove tiny edge/header artifacts while preserving substantive product pieces."""
    alpha = image.getchannel("A")
    w, h = alpha.size
    area = w * h
    min_area = max(96, int(area * MIN_COMPONENT_RATIO))
    out = alpha.copy()
    draw = out.load()

    for points in components(alpha):
        if len(points) >= min_area:
            continue
        touches_edge = any(
            x <= EDGE_MARGIN or y <= EDGE_MARGIN or x >= w - 1 - EDGE_MARGIN or y >= h - 1 - EDGE_MARGIN
            for x, y in points
        )
        avg_y = sum(y for _, y in points) / len(points)
        header_like = avg_y < h * 0.30
        if touches_edge or header_like:
            for x, y in points:
                draw[x, y] = 0
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
    x = (side - cropped.width) // 2
    y = (side - cropped.height) // 2
    canvas.alpha_composite(cropped, (x, y))
    return canvas


def process(path: Path, session) -> None:
    source = Image.open(path).convert("RGB")
    out_bytes = remove(
        source,
        session=session,
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=10,
    )
    image = Image.open(BytesIO(out_bytes)).convert("RGBA")
    image = clean_alpha(image)
    image = fit_square(image)

    # Keep a generous working size for sharp browser rendering while remaining efficient.
    image.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
    image.save(path, "WEBP", lossless=True, method=6)

    alpha = image.getchannel("A")
    if alpha.getbbox() is None:
        raise RuntimeError(f"No visible product remains after processing: {path}")


files = sorted(ROOT.glob("*.webp"))
if not files:
    raise SystemExit("No product WebP files found")

session = new_session("u2net")
for index, path in enumerate(files, 1):
    process(path, session)
    print(f"Processed product media {index}/{len(files)}: {path}")

print(f"Prepared transparent product cutouts: {len(files)} files")
