#!/usr/bin/env python3
"""Sync original product images from the Google Drive links supplied in products.js.

The storefront is deployed from local, optimized WebP files. Drive URLs are only used
as source locations; product pages never depend on hotlinked Drive images.
"""
from __future__ import annotations

import io
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS_JS = ROOT / "products.js"
PRODUCT_DIR = ROOT / "assets" / "products"
MAX_IMAGES_PER_PRODUCT = 8
MAX_FOLDER_CANDIDATES = 24
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif", ".tif", ".tiff"}
FILE_ID_PATTERNS = [
    re.compile(r"/file/d/([A-Za-z0-9_-]+)"),
    re.compile(r"/open\?id=([A-Za-z0-9_-]+)"),
    re.compile(r"[?&]id=([A-Za-z0-9_-]+)"),
]
IMAGE_EXT_RE = re.compile(r"\.(?:jpe?g|png|webp|gif|bmp|avif|tiff?)(?:[?#]|$)", re.I)
USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"


def log(message: str) -> None:
    print(message, flush=True)


def get_session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": USER_AGENT})
    return s


def parse_drive_url(url: str) -> tuple[str | None, bool]:
    try:
        parsed = urlparse(url)
    except Exception:
        return None, False
    if parsed.netloc.lower() not in {"drive.google.com", "www.drive.google.com"}:
        return None, False
    path = parsed.path
    match = re.search(r"/folders/([A-Za-z0-9_-]+)", path)
    if match:
        return match.group(1), True
    for pattern in FILE_ID_PATTERNS:
        match = pattern.search(url)
        if match:
            return match.group(1), False
    return None, False


def entry_name(node) -> str:
    for selector in (".flip-entry-title", ".flip-entry-name", "[data-tooltip]", "[title]"):
        found = node.select_one(selector) if hasattr(node, "select_one") else None
        if found:
            for attr in ("data-tooltip", "title", "aria-label"):
                value = found.get(attr)
                if value and value.strip():
                    return value.strip()
            value = found.get_text(" ", strip=True)
            if value:
                return value
    if hasattr(node, "get"):
        for attr in ("data-tooltip", "title", "aria-label", "data-name"):
            value = node.get(attr)
            if value and value.strip():
                return value.strip()
    return node.get_text(" ", strip=True)[:200] if hasattr(node, "get_text") else ""


def folder_file_candidates(session: requests.Session, folder_id: str) -> list[tuple[str, str]]:
    urls = [
        f"https://drive.google.com/embeddedfolderview?id={folder_id}#grid",
        f"https://drive.google.com/drive/folders/{folder_id}?usp=drive_link",
    ]
    collected: list[tuple[str, str]] = []
    seen: set[str] = set()
    last_error = ""
    for url in urls:
        try:
            response = session.get(url, timeout=(5, 12))
            response.raise_for_status()
            html = response.text
        except Exception as exc:
            last_error = str(exc)
            continue
        soup = BeautifulSoup(html, "html.parser")
        # Preferred path: item nodes with visible filenames and file IDs.
        for node in soup.select(".flip-entry, [data-id]"):
            name = entry_name(node)
            file_id = node.get("data-id")
            if not file_id:
                link = node.select_one("a[href]")
                if link:
                    for pattern in FILE_ID_PATTERNS:
                        match = pattern.search(link.get("href", ""))
                        if match:
                            file_id = match.group(1)
                            break
            if file_id and file_id != folder_id and (IMAGE_EXT_RE.search(name) or node.select_one("img")):
                if file_id not in seen:
                    collected.append((file_id, name))
                    seen.add(file_id)
        # Fallback: parse file links and check content type later; Drive markup varies.
        for link in soup.find_all("a", href=True):
            href = link.get("href", "")
            match = None
            for pattern in FILE_ID_PATTERNS:
                match = pattern.search(href)
                if match:
                    break
            if not match:
                continue
            file_id = match.group(1)
            if file_id == folder_id or file_id in seen:
                continue
            name = entry_name(link) or entry_name(link.parent) or href
            if IMAGE_EXT_RE.search(name) or "/file/d/" in href or "/open?id=" in href:
                collected.append((file_id, name))
                seen.add(file_id)
        if collected:
            break
    if not collected and last_error:
        log(f"  Folder {folder_id}: cannot list folder ({last_error})")
    # Prefer clearly named image files; keep the folder's visual order for ties.
    collected.sort(key=lambda item: 0 if IMAGE_EXT_RE.search(item[1]) else 1)
    # Cap candidates so one inaccessible folder cannot stall the deployment.
    return collected[:MAX_FOLDER_CANDIDATES]


def download_drive_file(session: requests.Session, file_id: str) -> tuple[bytes | None, str]:
    urls = [
        f"https://drive.google.com/uc?export=download&id={file_id}",
        f"https://drive.usercontent.google.com/download?id={file_id}&export=download&authuser=0&confirm=t",
    ]
    last_error = "not an image"
    for url in urls:
        try:
            response = session.get(url, timeout=(5, 18), allow_redirects=True)
            if response.status_code != 200 or not response.content:
                last_error = f"HTTP {response.status_code}"
                continue
            content = response.content
            ctype = response.headers.get("content-type", "").lower()
            # Large-file confirmation forms are handled once, if present.
            if "text/html" in ctype or content[:20].lower().startswith(b"<!doctype html") or content[:15].lower().startswith(b"<html"):
                match = re.search(rb'name="confirm"\s+value="([^"]+)"', content)
                if match and "drive.google.com" in response.url:
                    confirm = match.group(1).decode("ascii", "ignore")
                    confirm_url = f"https://drive.google.com/uc?export=download&confirm={confirm}&id={file_id}"
                    response = session.get(confirm_url, timeout=(5, 18), allow_redirects=True)
                    content = response.content
                    ctype = response.headers.get("content-type", "").lower()
            if not content or "text/html" in ctype:
                last_error = "Google Drive returned an HTML page (permission or download confirmation)"
                continue
            try:
                with Image.open(io.BytesIO(content)) as test:
                    test.verify()
                return content, ""
            except Exception:
                last_error = f"download was not a supported image ({ctype or 'unknown content type'})"
        except Exception as exc:
            last_error = str(exc)
    return None, last_error


def image_to_webp(data: bytes, output: Path) -> bool:
    try:
        with Image.open(io.BytesIO(data)) as original:
            image = ImageOps.exif_transpose(original)
            image.load()
            if image.mode not in ("RGB", "RGBA"):
                if "A" in image.getbands():
                    image = image.convert("RGBA")
                else:
                    image = image.convert("RGB")
            image.thumbnail((1800, 1800), Image.Resampling.LANCZOS)
            output.parent.mkdir(parents=True, exist_ok=True)
            temporary = output.with_suffix(".tmp.webp")
            image.save(temporary, "WEBP", quality=88, method=6)
            temporary.replace(output)
            return True
    except Exception as exc:
        log(f"    Could not optimize image {output.name}: {exc}")
        return False



def white_edge_score(data: bytes) -> float:
    """Return the fraction of sampled outer-edge pixels that render near-white."""
    try:
        with Image.open(io.BytesIO(data)) as original:
            image = ImageOps.exif_transpose(original).convert("RGBA")
            image.thumbnail((96, 96), Image.Resampling.LANCZOS)
            if image.width < 8 or image.height < 8:
                return 0.0
            # Transparent product cut-outs render on white in the storefront.
            canvas = Image.new("RGBA", image.size, (255, 255, 255, 255))
            canvas.alpha_composite(image)
            rgb = canvas.convert("RGB")
            width, height = rgb.size
            border = max(2, min(width, height) // 12)
            pixels = rgb.load()
            samples: list[tuple[int, int, int]] = []
            for x in range(width):
                for y in range(border):
                    samples.append(pixels[x, y])
                for y in range(height - border, height):
                    samples.append(pixels[x, y])
            for y in range(border, height - border):
                for x in range(border):
                    samples.append(pixels[x, y])
                for x in range(width - border, width):
                    samples.append(pixels[x, y])
            if not samples:
                return 0.0
            near_white = sum(
                1 for red, green, blue in samples
                if min(red, green, blue) >= 228 and max(red, green, blue) - min(red, green, blue) <= 24
            )
            return near_white / len(samples)
    except Exception:
        return 0.0


MIN_PRODUCT_IMAGE_SIDE = 100
MIN_PRODUCT_IMAGE_ASPECT = 0.35
MAX_PRODUCT_IMAGE_ASPECT = 2.5


def image_dimensions(data: bytes) -> tuple[int, int] | None:
    """Return EXIF-corrected image dimensions, or None for non-images."""
    try:
        with Image.open(io.BytesIO(data)) as original:
            image = ImageOps.exif_transpose(original)
            return image.width, image.height
    except Exception:
        return None


def is_usable_product_image(data: bytes) -> bool:
    """Reject thumbnails and malformed panoramic/vertical strips before sync."""
    dimensions = image_dimensions(data)
    if not dimensions:
        return False
    width, height = dimensions
    if min(width, height) < MIN_PRODUCT_IMAGE_SIDE or height <= 0:
        return False
    aspect = width / height
    return MIN_PRODUCT_IMAGE_ASPECT <= aspect <= MAX_PRODUCT_IMAGE_ASPECT


def read_products() -> tuple[str, list[dict], int, int]:
    source = PRODUCTS_JS.read_text(encoding="utf-8")
    prefix = re.search(r"const\s+ROCK_PRODUCTS\s*=\s*", source)
    if not prefix:
        raise RuntimeError("Could not locate ROCK_PRODUCTS array in products.js")
    start = prefix.end()
    products, length = json.JSONDecoder().raw_decode(source[start:])
    return source, products, start, start + length


def sync_product(product: dict) -> tuple[str, int, str]:
    product_id = product.get("id", "")
    url = product.get("picturesUrl") or ""
    drive_id, is_folder = parse_drive_url(url)
    if not drive_id:
        return product_id, 0, "no Drive photo link"

    # Keep a safe, locally stored primary photo available throughout synchronization.
    image_rel = str(product.get("image") or "")
    existing_path = ROOT / image_rel if image_rel.startswith("assets/products/") else None
    existing_data = None
    if existing_path and existing_path.is_file():
        try:
            candidate = existing_path.read_bytes()
            if is_usable_product_image(candidate):
                existing_data = candidate
        except OSError:
            pass

    session = get_session()
    if is_folder:
        candidates = folder_file_candidates(session, drive_id)
    else:
        candidates = [(drive_id, "linked file")]
    if not candidates:
        return product_id, 0, "Drive folder yielded no image candidates"

    downloaded: list[tuple[bytes, str]] = []
    last_error = "no usable product images found"
    for file_id, filename in candidates:
        data, error = download_drive_file(session, file_id)
        if data:
            dimensions = image_dimensions(data)
            if not is_usable_product_image(data):
                shape = f"{dimensions[0]}x{dimensions[1]}" if dimensions else "unknown dimensions"
                log(f"  {product_id}: ignored malformed image ({shape})")
                last_error = f"ignored malformed supplier image ({shape})"
                continue
            downloaded.append((data, filename))
            if len(downloaded) >= MAX_IMAGES_PER_PRODUCT:
                break
        else:
            last_error = error

    if not downloaded:
        # Never replace an existing good image with a video, thumbnail, or narrow strip.
        return product_id, 0, last_error

    scores = [white_edge_score(data) for data, _filename in downloaded]
    best_index = max(range(len(scores)), key=scores.__getitem__)
    best_score = scores[best_index]
    keep_existing_white = (
        existing_data is not None
        and existing_path is not None
        and white_edge_score(existing_data) >= 0.65
        and best_score < 0.65
    )

    paths: list[str] = []
    if keep_existing_white:
        # Keep the verified white-background local packshot as the listing image.
        paths.append(image_rel)
        log(f"  {product_id}: kept existing white-background listing image")
        gallery = downloaded
        first_gallery_index = 2
    else:
        # Prefer the cleanest white/transparent supplier photo as the primary image.
        downloaded.insert(0, downloaded.pop(best_index))
        if best_score >= 0.65:
            log(f"  {product_id}: selected a white-background listing image ({best_score:.0%} white edge)")
        gallery = downloaded
        first_gallery_index = 1

    for index, (data, _filename) in enumerate(gallery, start=first_gallery_index):
        suffix = "" if index == 1 else f"-{index:02d}"
        output = PRODUCT_DIR / f"{product_id}{suffix}.webp"
        if image_to_webp(data, output):
            paths.append(f"assets/products/{output.name}")

    if not paths:
        return product_id, 0, "images could not be converted"

    # Remove stale numbered gallery images only after a successful, usable sync.
    for old in PRODUCT_DIR.glob(f"{product_id}-[0-9][0-9].webp"):
        if f"assets/products/{old.name}" not in paths:
            try:
                old.unlink()
            except OSError:
                pass

    product["image"] = paths[0]
    product["images"] = paths
    return product_id, len(paths), ""

def main() -> int:
    PRODUCT_DIR.mkdir(parents=True, exist_ok=True)
    source, products, start, end = read_products()
    eligible = [p for p in products if p.get("picturesUrl")]
    log(f"Checking official photo links for {len(eligible)} products; up to {MAX_IMAGES_PER_PRODUCT} gallery images each.")
    successes = 0
    total_images = 0
    warnings: list[str] = []
    # Keep the number of simultaneous requests low for Drive and GitHub Actions.
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(sync_product, product): product for product in eligible}
        for future in as_completed(futures):
            product = futures[future]
            try:
                pid, count, warning = future.result()
            except Exception as exc:
                pid, count, warning = product.get("id", "?"), 0, str(exc)
            if count:
                successes += 1
                total_images += count
                log(f"  {pid}: synced {count} images")
            else:
                warnings.append(f"{pid}: {warning}")
                log(f"  WARNING {pid}: {warning}")
    updated = source[:start] + json.dumps(products, ensure_ascii=False, indent=2) + source[end:]
    if updated != source:
        PRODUCTS_JS.write_text(updated, encoding="utf-8")
    log(f"Drive photo sync complete: {successes} products, {total_images} images.")
    if warnings:
        log(f"Products using existing local photos because Drive links were unavailable: {len(warnings)}")
        for warning in warnings:
            log(f"  - {warning}")
    # The workflow can still publish existing photos if a particular shared folder is restricted.
    return 0


if __name__ == "__main__":
    sys.exit(main())
