
import subprocess, os, json
from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 640
BG=(15,17,21); FG=(223,227,234); DIM=(150,158,172); ACCENT=(214,182,122); FAULTC=(255,120,120)

ROCK_RGB = {
 "sandstone":(214,182,122),"shale":(110,118,132),"limestone":(223,220,202),
 "basalt":(74,80,96),"granite":(196,166,150),"marble":(238,234,227),
 "chert":(130,136,112),"obsidian":(52,50,64),
}

env = {**os.environ, "WT_SESSION": "probe"}
os.chdir(r"C:\Users\yukino\Documents\deepseek-harness\default-workspace\demo-repo")
out = subprocess.run(["node", r"C:\Users\yukino\Documents\deepseek-harness\default-workspace\strata\bin\strata.mjs", "--json", "--max-rows", "28", "engine.js"],
                     capture_output=True, text=True, encoding="utf-8", env=env)
core = json.loads(out.stdout)

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)
big  = ImageFont.truetype(r"C:\Windows\Fonts\consolab.ttf", 50)
sub  = ImageFont.truetype(r"C:\Windows\Fonts\consola.ttf", 18)
mono = ImageFont.truetype(r"C:\Windows\Fonts\consola.ttf", 14)

d.text((56, 34), "strata", font=big, fill=FG)
d.text((58, 100), "Read a file's git history as a geological core sample.", font=sub, fill=DIM)
d.text((58, 128), "zero dependencies  /  deterministic  /  npx strata", font=mono, fill=ACCENT)

TOP, BOTTOM = 178, H - 56
CH, CW, COLS = 15, 16, 20
MAXSHIFT = 6                     # keep the core away from the label column
LEFT_M   = 96
X0       = LEFT_M + 12
CORE_R   = X0 + COLS * CW
LABEL_X  = X0 + (COLS + MAXSHIFT) * CW + 34   # right of the WIDEST possible core

rows = []
for layer in core["layers"]:
    for r in range(layer["rows"]):
        rows.append((layer, r == 0))
rows.reverse()
rows = rows[: (BOTTOM - TOP) // CH]

offset = 0
for i, (layer, is_first) in enumerate(rows):
    y    = TOP + i * CH
    xoff = X0 + offset * CW
    rgb  = ROCK_RGB.get(layer["rock"], (128,128,128))

    for c in range(COLS):
        cx = xoff + c * CW
        d.rectangle([cx, y, cx + CW - 1, y + CH - 1], fill=rgb)

    if layer.get("fossil"):
        fx = xoff + (COLS // 2) * CW
        d.ellipse([fx + 3, y + 3, fx + CW - 4, y + CH - 4], fill=(255,255,255))
    if layer.get("dike"):
        dx = xoff + (COLS // 2 + 3) * CW
        d.line([dx, y, dx, y + CH], fill=(255,140,90), width=2)
    if layer["fault"] and is_first:
        d.text((LEFT_M - 10, y), "/", font=mono, fill=FAULTC)

    if is_first:
        d.text((LEFT_M - 58, y), "%5.2f" % layer["depthMa"], font=mono, fill=(120,128,142))
        d.text((LABEL_X, y), layer["subject"][:28], font=mono, fill=DIM)

    if layer["fault"] and is_first:
        offset = min(MAXSHIFT, offset + 2)

SIG = "github.com/Semmelweis-01/strata"
sig_w = d.textlength(SIG, font=mono)
d.text((W - 56 - sig_w, H - 38), SIG, font=mono, fill=DIM)
img.save(r"C:\Users\yukino\Documents\deepseek-harness\default-workspace\strata\assets\social-preview.png", optimize=True)
print("rows", len(rows), "bytes", os.path.getsize(r"C:\Users\yukino\Documents\deepseek-harness\default-workspace\strata\assets\social-preview.png"))