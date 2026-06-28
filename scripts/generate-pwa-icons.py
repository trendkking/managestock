"""Generate PWA icons (192, 512, maskable) from logo.png."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "frontend" / "public"
LOGO = PUBLIC / "logo.png"
BG = (255, 248, 248)  # primary-subtle

ICON_NAMES = ("pwa-192x192.png", "pwa-512x512.png", "pwa-maskable-512x512.png")


def icons_exist() -> bool:
    return all((PUBLIC / name).is_file() for name in ICON_NAMES)


def square_icon(bull, size: int, padding: float = 0.12, maskable: bool = False):
    from PIL import Image, ImageDraw

    canvas = Image.new("RGBA", (size, size), (*BG, 255))
    if maskable:
        draw = ImageDraw.Draw(canvas)
        inset = int(size * 0.08)
        draw.rounded_rectangle(
            (inset, inset, size - inset, size - inset),
            radius=size // 8,
            fill=(*BG, 255),
        )
        padding = 0.18
    inner = int(size * (1 - padding * 2))
    bw, bh = bull.size
    scale = min(inner / bw, inner / bh)
    tw, th = int(bw * scale), int(bh * scale)
    resized = bull.resize((tw, th), Image.Resampling.LANCZOS)
    x = (size - tw) // 2
    y = (size - th) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas


def main() -> None:
    try:
        from PIL import Image
    except ImportError:
        if icons_exist():
            print("Pillow not installed — using committed PWA icons")
            return
        raise SystemExit("Pillow required to generate PWA icons (pip install Pillow)")

    if not LOGO.exists():
        if icons_exist():
            print(f"logo missing ({LOGO}) — using committed PWA icons")
            return
        raise SystemExit(f"logo not found: {LOGO}")

    bull = Image.open(LOGO).convert("RGBA")
    for size, name in [(192, "pwa-192x192.png"), (512, "pwa-512x512.png")]:
        square_icon(bull, size).save(PUBLIC / name, "PNG", optimize=True)
        print(f"  {name}")
    square_icon(bull, 512, maskable=True).save(PUBLIC / "pwa-maskable-512x512.png", "PNG", optimize=True)
    print("  pwa-maskable-512x512.png")


if __name__ == "__main__":
    main()
