from pathlib import Path
import subprocess

ROOT = Path('assets/products')
files = sorted(ROOT.glob('*.webp'))

# Product images are kept as source assets. During Pages build, this script:
# 1) removes connected near-white background from the corners only
# 2) trims transparent/empty margins
# 3) places the product on a transparent 1000x1000 canvas
# 4) caps product scale so every card gets a consistent visual size

def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

for src in files:
    if src.name == 'catalog-placeholder.webp':
        continue
    tmp = src.with_suffix('.prepared.webp')
    cmd = [
        'magick', str(src),
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

print(f'Prepared {len(files)} ROCK product images.')
