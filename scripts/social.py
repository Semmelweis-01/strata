
import subprocess, os, json
from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 640
BG=(15,17,21); FG=(223,227,234); DIM=(150,158,172); ACCENT=(214,182,122); FAULTC=(255,120,120)

# read the palette from the source of truth instead of duplicating it
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PALETTE = subprocess.run(
    ["node", "--input-type=module", "-e",
     "import('./src/palette.mjs').then(m => console.log(JSON.stringify("
     "Object.fromEntries(Object.entries(m.ROCKS).map(([k,v]) => [k, v.rgb])))))"],
    cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
if PALETTE.returncode != 0:
    raise SystemExit("palette read failed: " + PALETTE.stderr.strip())
ROCK_RGB = {k: tuple(v) for k, v in json.loads(PALETTE.stdout).items()}

env = {**os.environ, "WT_SESSION": "probe"}
os.chdir(r"C:\\Users\\yukino\\Documents\\deepseek-harness\\default-workspace\\demo-repo")
out = subprocess.run(["node", r"C:\\Users\\yukino\\Documents\\deepseek-harness\\default-workspace\\strata\\bin\\strata.mjs", "--json", "--max-rows", "28", "engine.js"],
                     capture_output=True, text=True, encoding="utf-8", env=env)
core = json.loads(out.stdout)
layers = list(reversed(core["layers"]))   # newest at the top, like the terminal renderer

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)
big  = ImageFont.truetype(r"C:\Windows\Fonts\consolab.ttf", 50)
sub  = ImageFont.truetype(r"C:\Windows\Fonts\consola.ttf", 18)
mono = ImageFont.truetype(r"C:\Windows\Fonts\consola.ttf", 14)

d.text((56, 34), "strata", font=big, fill=FG)
d.text((58, 100), "Read a file's git history as a geological core sample.", font=sub, fill=DIM)
d.text((58, 128), "zero dependencies  /  deterministic  /  npx strata", font=mono, fill=ACCENT)

TOP, BOTTOM = 178, H - 56
COLS, CW = 20, 16
CH = (BOTTOM - TOP) // max(1, len(layers))
MAXSHIFT = 6
LEFT_M   = 96
X0       = LEFT_M + 12
LABEL_X  = X0 + (COLS + MAXSHIFT) * CW + 34

offset = 0
for i, layer in enumerate(layers):
    y   = TOP + i * CH
    xoff = X0 + offset * CW
    rgb = ROCK_RGB.get(layer["rock"], (128,128,128))

    for c in range(COLS):
        cx = xoff + c * CW
        d.rectangle([cx, y + 1, cx + CW - 1, y + CH - 2], fill=rgb)

    if layer.get("fossil"):
        fx = xoff + (COLS // 2) * CW
        cy = y + CH // 2
        d.ellipse([fx + 3, cy - 4, fx + CW - 4, cy + 4], fill=(255,255,255))
    if layer.get("dike"):
        dx = xoff + (COLS // 2 + 3) * CW
        d.line([dx, y + 1, dx, y + CH - 2], fill=(255,140,90), width=2)
    if layer.get("fault"):
        d.text((LEFT_M - 10, y), "/", font=mono, fill=FAULTC)
        offset = min(MAXSHIFT, offset + 2)

    d.text((LEFT_M - 58, y + CH // 2 - 8), "%5.2f" % layer["depthMa"], font=mono, fill=(120,128,142))
    d.text((LABEL_X, y + CH // 2 - 8), layer["subject"][:30], font=mono, fill=DIM)

SIG = "github.com/Semmelweis-01/strata"
sig_w = d.textlength(SIG, font=mono)
d.text((W - 56 - sig_w, H - 38), SIG, font=mono, fill=DIM)

OUT = r"C:\\Users\\yukino\\Documents\\deepseek-harness\\default-workspace\\strata\\assets\\social-preview.png"
img.save(OUT, optimize=True)
print("layers", len(layers), "| rows", core["totalRows"], "| bytes", os.path.getsize(OUT))