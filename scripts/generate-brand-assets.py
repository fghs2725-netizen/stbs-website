"""Regenerates the OG card and favicon set from the existing STBS logo.

    python scripts/generate-brand-assets.py

Outputs (all flat colour, no gradients — brand-deep #0B1F33):
  public/og/stbs-og-1200x630.png   social card
  app/icon.png (512), app/apple-icon.png (180), app/favicon.ico (16/32/48)
  public/icon-192.png, public/icon-512.png   (referenced by app/manifest.ts)
"""
from PIL import Image, ImageDraw, ImageFont

BRAND_DEEP = (11, 31, 51)      # --brand-deep  #0B1F33
HAIRLINE = (40, 62, 82)        # brand-deep lifted one step, for rules on the dark band
INK_ON_DARK = (244, 247, 246)  # --surface-alt #F4F7F6
MUTED_ON_DARK = (150, 168, 182)
FONT = "public/fonts/noto-sans-regular.ttf"

logo = Image.open("public/stbs-logo-only.png").convert("RGBA")


def tight(im):
    """Crop transparent margin, ignoring the very faint outer glow."""
    a = im.getchannel("A").point(lambda v: 255 if v > 60 else 0)
    return im.crop(a.getbbox())


def paste_logo(canvas, box_w, box_h, cx, cy):
    lg = tight(logo)
    scale = min(box_w / lg.width, box_h / lg.height)
    lg = lg.resize((round(lg.width * scale), round(lg.height * scale)), Image.LANCZOS)
    canvas.alpha_composite(lg, (round(cx - lg.width / 2), round(cy - lg.height / 2)))


# ---------- OG card 1200x630 ----------
W, H, PAD = 1200, 630, 72
og = Image.new("RGBA", (W, H), BRAND_DEEP + (255,))
d = ImageDraw.Draw(og)

lg = tight(logo)
lh = 96
lw = round(lg.width * lh / lg.height)
og.alpha_composite(lg.resize((lw, lh), Image.LANCZOS), (PAD, PAD))

d.line([(PAD, 216), (W - PAD, 216)], fill=HAIRLINE, width=1)

h1 = ImageFont.truetype(FONT, 66)
y = 250
for line in ["Water infrastructure for", "industrial & commercial sites"]:
    d.text((PAD, y), line, font=h1, fill=INK_ON_DARK, stroke_width=1, stroke_fill=INK_ON_DARK)
    y += 84

sub = ImageFont.truetype(FONT, 28)
d.text((PAD, y + 20), "Borewell drilling · Tubewell construction · Rainwater recharge", font=sub, fill=MUTED_ON_DARK)

d.line([(PAD, H - 96), (W - PAD, H - 96)], fill=HAIRLINE, width=1)
foot = ImageFont.truetype(FONT, 24)
d.text((PAD, H - 72), "Haryana & NCR  ·  Since 1992", font=foot, fill=MUTED_ON_DARK)
url = "www.stbs.in"
d.text((W - PAD - d.textlength(url, font=foot), H - 72), url, font=foot, fill=INK_ON_DARK)

og.convert("RGB").save("public/og/stbs-og-1200x630.png", optimize=True)


# ---------- icons: logo centred on a brand-deep square ----------
def icon(size, pad_ratio=0.10):
    c = Image.new("RGBA", (size, size), BRAND_DEEP + (255,))
    inner = size * (1 - 2 * pad_ratio)
    paste_logo(c, inner, inner, size / 2, size / 2)
    return c

icon(512).convert("RGB").save("app/icon.png", optimize=True)
icon(180, 0.08).convert("RGB").save("app/apple-icon.png", optimize=True)
icon(192).convert("RGB").save("public/icon-192.png", optimize=True)
icon(512).convert("RGB").save("public/icon-512.png", optimize=True)
icon(64, 0.06).convert("RGB").save("app/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("generated")
