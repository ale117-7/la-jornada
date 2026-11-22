"""Corta las hojas de escenarios (RGB, sin transparencia) en bandas (capas de parallax, cornisa)
y en piezas sueltas (tiles y detalles sobre fondo negro)."""
import glob, json, os, re, sys
import numpy as np
from PIL import Image, ImageDraw

S = "C:/Users/aleco/AppData/Local/Temp/claude/0492001d3aab2e51/7dc3afe4-b73f-4144-8140-f1a1bf5fdbbf/scratchpad/"
os.makedirs(S + "qa2", exist_ok=True)
filtro = sys.argv[1] if len(sys.argv) > 1 else None
DARK = 26


def runs(mask, minlen):
    out, start = [], None
    for i, v in enumerate(list(mask) + [False]):
        if v and start is None:
            start = i
        elif not v and start is not None:
            if i - start >= minlen:
                out.append((start, i))
            start = None
    return out


for p in sorted(glob.glob("IMAGENES/**/Escenarios/*.png", recursive=True)):
    name = os.path.basename(p)[:-4]
    if filtro and filtro not in name:
        continue
    if Image.open(p).mode != "RGB":
        continue
    im = Image.open(p).convert("RGB")
    arr = np.array(im)
    lum = arr.astype(int).sum(axis=2) / 3
    dark = lum < DARK
    W, H = im.size
    rowdark = dark.mean(axis=1)
    sep = rowdark > 0.985
    bands = runs(~sep, 14)
    # hojas sin separadores negros: los límites salen de los saltos bruscos entre filas
    OVERRIDE = {"Ciclos Invertidos": [0, 322, 601, 831, 941], "La Frontera de Ruido": [0, 329, 614, 854, 1024]}
    if name in OVERRIDE:
        cuts = OVERRIDE[name]
        bands = []
        for y0, y1 in zip(cuts[:-1], cuts[1:]):
            ys = np.where(rowdark[y0:y1] <= 0.985)[0]
            if len(ys):
                bands.append((y0 + int(ys.min()), y0 + int(ys.max()) + 1))
    outdir = os.path.join(os.path.dirname(p), name)
    os.makedirs(outdir, exist_ok=True)
    for old in glob.glob(outdir + "/banda_*.png") + glob.glob(outdir + "/pieza_*.png"):
        os.remove(old)
    meta = []
    qa = im.copy()
    dr = ImageDraw.Draw(qa)
    nb = np_ = 0
    for (y0, y1) in bands:
        sub = dark[y0:y1]
        if sub.mean() > 0.55:
            # franja de piezas sobre negro: se separa por columnas vacías
            cols = ~(sub.mean(axis=0) > 0.985)
            for (x0, x1) in runs(cols, 6):
                piece = dark[y0:y1, x0:x1]
                ys = np.where(~(piece.mean(axis=1) > 0.985))[0]
                if len(ys) == 0:
                    continue
                py0, py1 = y0 + ys.min(), y0 + ys.max() + 1
                if (x1 - x0) < 8 or (py1 - py0) < 8:
                    continue
                np_ += 1
                f = f"pieza_{np_:02d}.png"
                im.crop((x0, py0, x1, py1)).save(f"{outdir}/{f}")
                meta.append(dict(archivo=f, tipo="pieza", caja=[x0, int(py0), x1, int(py1)]))
                dr.rectangle([x0, py0, x1, py1], outline=(255, 255, 0), width=2)
        else:
            nb += 1
            f = f"banda_{nb:02d}.png"
            im.crop((0, y0, W, y1)).save(f"{outdir}/{f}")
            meta.append(dict(archivo=f, tipo="banda", caja=[0, y0, W, y1]))
            dr.rectangle([0, y0, W - 1, y1], outline=(0, 255, 120), width=4)
            dr.text((8, y0 + 6), f"banda {nb}", fill=(255, 255, 0))
    json.dump(dict(hoja=name + ".png", tam=[W, H], frames=meta), open(outdir + "/_frames.json", "w"), ensure_ascii=False, indent=1)
    qa.resize((W // 2, H // 2)).save(S + "qa2/" + re.sub(r"[ /]", "_", name) + ".png")
    print(name, f"bandas={nb} piezas={np_}")
