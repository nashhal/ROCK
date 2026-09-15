from pathlib import Path
import shutil
import subprocess

ROOT = Path('assets/products')
files = sorted(ROOT.glob('*.webp'))
MAGICK = shutil.which('magick') or shutil.which('convert')

if not MAGICK:
    raise SystemExit('ImageMagick is required (magick or convert).')

# Product images remain source assets in git. During Pages build this prepares
# the working copy used by the deployed artifact:
# 1) removes connected near-white background from the image corners only
# 2) trims transparent/empty margins
# 3) centers the product on a transparent 1000x1000 canvas
# 4) keeps a consistent visual scale across product cards

def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

for src in files:
    tmp = src.with_suffix('.prepared.webp')
    cmd = [
        MAGICK, str(src),
        '-alpha', 'on',
        '-bordercolor', 'white', '-border', '2',
        '-fuzz', '8%',
        '-fill', 'none', '-draw', 'color 0,0 floodfill',
        '-shave', '2x2',
        '-trim',
        '+repage',
        '-resize', '780x780>',
        '-gravity', 'center',
        '-background', 'none',
        '-extent', '1000x1000',
        '-define', 'webp:lossless=false',
        '-quality', '88',
        str(tmp),
    ]
    try:
        run(cmd)
        tmp.replace(src)
    except Exception as exc:
        if tmp.exists():
            tmp.unlink()
        print(f'warning: could not prepare {src}: {exc}')

print(f'Prepared {len(files)} ROCK product images with {MAGICK}.')
