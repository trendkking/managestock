"""Generate Open Graph and favicon assets from frontend/public/logo.png."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "frontend" / "public"
LOGO = PUBLIC / "logo.png"

OG_SIZE = (1200, 630)
APPLE_SIZE = 180
FAVICON_SIZES = (16, 32)

FONT_CANDIDATES = [
    Path("C:/Windows/Fonts/malgunbd.ttf"),
    Path("C:/Windows/Fonts/arialbd.ttf"),
    Path("/usr/share/fonts/truetype/noto/NotoSansKR-Bold.otf"),
    Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
]


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in FONT_CANDIDATES:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def gradient_background(size: tuple[int, int]) -> Image.Image:
    w, h = size
    base = Image.new("RGB", size)
    draw = ImageDraw.Draw(base)
    top = (185, 28, 28)
    bottom = (69, 10, 10)
    for y in range(h):
        t = y / max(h - 1, 1)
        color = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        draw.line([(0, y), (w, y)], fill=color)
    return base


def paste_bull(canvas: Image.Image, bull: Image.Image, scale: float, center: tuple[int, int]) -> None:
    bw, bh = bull.size
    tw = int(bw * scale)
    th = int(bh * scale)
    resized = bull.resize((tw, th), Image.Resampling.LANCZOS)
    x = center[0] - tw // 2
    y = center[1] - th // 2
    canvas.alpha_composite(resized, (x, y))


def generate_og_image(bull: Image.Image) -> Image.Image:
    bg = gradient_background(OG_SIZE).convert("RGBA")
    canvas = Image.new("RGBA", OG_SIZE)
    canvas.alpha_composite(bg)
    paste_bull(canvas, bull, scale=1.35, center=(600, 300))

    draw = ImageDraw.Draw(canvas)
    title_font = load_font(72)
    sub_font = load_font(36)
    title = "BULLSLONG"
    subtitle = "주식 계좌 관리 · 매매일지 · 수익률 경연 대회"

    tw = draw.textlength(title, font=title_font)
    draw.text(((OG_SIZE[0] - tw) / 2, 500), title, fill=(255, 255, 255), font=title_font)
    sw = draw.textlength(subtitle, font=sub_font)
    draw.text(((OG_SIZE[0] - sw) / 2, 575), subtitle, fill=(254, 226, 226), font=sub_font)

    return canvas.convert("RGB")


def generate_square_icon(bull: Image.Image, size: int, padding: float = 0.08) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = int(size * (1 - padding * 2))
    bw, bh = bull.size
    scale = min(inner / bw, inner / bh)
    tw, th = int(bw * scale), int(bh * scale)
    resized = bull.resize((tw, th), Image.Resampling.LANCZOS)
    x = (size - tw) // 2
    y = (size - th) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas


def generate_favicon_icon(bull: Image.Image, size: int, padding: float = 0.14) -> Image.Image:
    """Favicon: white square background so the bull stands out on browser tabs."""
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    inner = int(size * (1 - padding * 2))
    bw, bh = bull.size
    scale = min(inner / bw, inner / bh)
    tw, th = int(bw * scale), int(bh * scale)
    resized = bull.resize((tw, th), Image.Resampling.LANCZOS)
    x = (size - tw) // 2
    y = (size - th) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas


def main() -> None:
    if not LOGO.exists():
        raise SystemExit(f"logo not found: {LOGO}")

    bull = Image.open(LOGO).convert("RGBA")

    og = generate_og_image(bull)
    og_path = PUBLIC / "og-image.png"
    og.save(og_path, "PNG", optimize=True)

    for size in FAVICON_SIZES:
        icon = generate_favicon_icon(bull, size)
        icon.save(PUBLIC / f"favicon-{size}x{size}.png", "PNG", optimize=True)

    apple = generate_square_icon(bull, APPLE_SIZE, padding=0.1)
    apple.save(PUBLIC / "apple-touch-icon.png", "PNG", optimize=True)

    print("generated:")
    print(f"  {og_path} ({OG_SIZE[0]}x{OG_SIZE[1]})")
    for size in FAVICON_SIZES:
        print(f"  favicon-{size}x{size}.png")
    print(f"  apple-touch-icon.png ({APPLE_SIZE}x{APPLE_SIZE})")


if __name__ == "__main__":
    main()
