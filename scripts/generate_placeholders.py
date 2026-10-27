"""Generate small, clearly artificial 1600x900 WebP frames for local viewer development."""
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / "web" / "public" / "objects"
PACKS = {
    "tesla-roadster": ("#ff654f", "#ffca80", "ROADSTER"),
    "mount-everest": ("#6baf83", "#d8f1df", "EVEREST"),
    "excavator": ("#e3ba3d", "#fff0a9", "EXCAVATOR"),
}

for slug, (accent, pale, label) in PACKS.items():
    folder = ROOT / slug
    (folder / "rotate").mkdir(parents=True, exist_ok=True)
    frames = 144
    for frame in range(1, frames + 1):
        im = Image.new("RGB", (1600, 900), "#11111a")
        draw = ImageDraw.Draw(im)
        draw.ellipse((360, 90, 1240, 970), outline="#ffffff20", width=2)
        draw.ellipse((500, 170, 1100, 770), outline="#ffffff15", width=2)
        # A deliberately abstract silhouette communicates placeholder status.
        import math
        x = 800 + int(130 * math.sin(2 * math.pi * (frame - 1) / frames))
        draw.ellipse((x - 210, 370, x + 210, 550), fill=accent)
        draw.ellipse((x - 175, 330, x + 175, 515), fill=pale)
        draw.ellipse((x - 145, 390, x + 145, 500), fill=accent)
        draw.text((80, 70), f"{label}  /  SAMPLE FRAME PACK", fill="#ffffff")
        draw.text((80, 820), "PLACEHOLDER ART — REPLACE WITH PRODUCTION FRAME PACK", fill="#aaaab5")
        im.save(folder / "rotate" / f"{frame:04}.webp", "WEBP", quality=65, method=4)
        if frame == 1:
            im.save(folder / "poster.webp", "WEBP", quality=75)
    (folder / "manifest.json").write_text(json.dumps({"slug": slug, "width": 1600, "height": 900, "rotate": {"count": frames, "pattern": "rotate/{0000}.webp", "loop": True}, "background": "#11111a"}, indent=2), encoding="utf-8")
    print(f"Generated {slug}: {frames} rotate frames")
