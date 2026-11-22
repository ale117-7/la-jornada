"""Empaqueta los recortes de IMAGENES en atlas WebP para el juego.

Uso (desde la raíz del proyecto):  python scripts/arte/empaquetar.py

- Cada hoja (carpeta con `rF_cNN.png`, o `banda_NN.png` / `pieza_NN.png` en los escenarios) se
  reduce con una escala única para toda la hoja y se empaqueta en `public/arte/<id>.webp`
  (varias páginas si no cabe). Las bandas de escenario van cada una en su propia imagen.
- Escribe `src/render/art/manifest.json`: por hoja, sus páginas y, por fila, los cuadros
  `[página, x, y, w, h, ax, ay]` (ax, ay = punto de anclaje: centro del cuerpo y pie, en píxeles
  del cuadro).
"""
import glob, json, os, re, shutil, unicodedata
import numpy as np
from PIL import Image

RAIZ = "IMAGENES"
OUT_IMG = "public/arte"
OUT_MAN = "src/render/art/manifest.json"
ATLAS_W = 2048
ATLAS_H_MAX = 4096
PAD = 2


def slug(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def tope(cat: str, nombre: str) -> int:
    """Altura máxima (px) del cuadro más alto de la hoja tras reducir."""
    if cat == "Marcas y variantes":
        return 72
    if nombre == "Iconos de los demás sucesos":
        return 56
    if cat == "Base Colgante":
        return 150
    if cat == "Jefes y élites":
        return 300
    if cat == "Escenas de sucesos":
        return 320
    if cat == "Escenarios":
        return 120  # piezas sueltas
    return 180  # personajes y criaturas


def ancla(im: Image.Image):
    a = np.array(im)[:, :, 3] > 40
    if not a.any():
        return im.width / 2, im.height
    cols = a.sum(0).astype(float)
    dense = np.where(cols >= cols.max() * 0.4)[0]
    rows = np.where(a.any(1))[0]
    return float((dense[0] + dense[-1] + 1) / 2), float(rows[-1] + 1)


class Atlas:
    def __init__(self, sid: str):
        self.sid = sid
        self.pages: list[Image.Image] = []
        self.new_page()

    def new_page(self):
        self.pages.append(Image.new("RGBA", (ATLAS_W, ATLAS_H_MAX), (0, 0, 0, 0)))
        self.x = self.y = self.row_h = 0
        self.used_h = self.used_w = 0

    def put(self, im: Image.Image):
        w, h = im.size
        if self.x + w + PAD > ATLAS_W:
            self.x = 0
            self.y += self.row_h + PAD
            self.row_h = 0
        if self.y + h + PAD > ATLAS_H_MAX:
            self.crop_last()
            self.new_page()
        p = len(self.pages) - 1
        self.pages[p].paste(im, (self.x, self.y))
        pos = (p, self.x, self.y)
        self.x += w + PAD
        self.row_h = max(self.row_h, h)
        self.used_h = max(self.used_h, self.y + h)
        self.used_w = max(self.used_w, self.x - PAD)
        return pos

    def crop_last(self):
        p = self.pages[-1]
        self.pages[-1] = p.crop((0, 0, max(1, self.used_w), max(1, self.used_h)))

    def save(self) -> list[str]:
        self.crop_last()
        names = []
        for i, pg in enumerate(self.pages):
            name = f"{self.sid}{'' if i == 0 else f'-{i}'}.webp"
            pg.save(os.path.join(OUT_IMG, name), "WEBP", quality=90, method=4)
            names.append(f"arte/{name}")
        return names


def main():
    if os.path.isdir(OUT_IMG):
        shutil.rmtree(OUT_IMG)
    os.makedirs(OUT_IMG)
    os.makedirs(os.path.dirname(OUT_MAN), exist_ok=True)
    man = {}
    carpetas = sorted({os.path.dirname(p) for p in glob.glob(f"{RAIZ}/**/*.png", recursive=True) if re.fullmatch(r"(r\d+_c\d+|banda_\d+|pieza_\d+)\.png", os.path.basename(p))})
    for d in carpetas:
        partes = os.path.normpath(d).split(os.sep)
        mundo, capa, cat, nombre = partes[1], partes[2], partes[3], partes[4]
        sid = slug(nombre)
        assert sid not in man, f"id repetido: {sid}"
        files = sorted(os.listdir(d))
        rows: dict[str, list] = {}
        if cat == "Escenarios":
            bandas, piezas, suelo = [], [], []
            for f in files:
                m = re.fullmatch(r"r(\d+)_c(\d+)\.png", f)
                if f.startswith("banda_") or (m and int(m.group(1)) <= 3):
                    bandas.append(f)
                elif m and int(m.group(1)) == 4:
                    suelo.append(f)
                elif f.startswith("pieza_") or m:
                    piezas.append(f)
            pages = []
            for key, lista in (("banda", bandas), ("suelo", suelo)):
                for f in lista:
                    im = Image.open(os.path.join(d, f)).convert("RGBA")
                    s = min(1.0, 300 / im.height)
                    if s < 1:
                        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
                    name = f"{sid}-{key}{len(rows.get(key, [])) + 1}.webp"
                    im.save(os.path.join(OUT_IMG, name), "WEBP", quality=88, method=4)
                    pages.append(f"arte/{name}")
                    rows.setdefault(key, []).append([len(pages) - 1, 0, 0, im.width, im.height, im.width / 2, im.height])
            if piezas:
                at = Atlas(f"{sid}-piezas")
                ims = [Image.open(os.path.join(d, f)).convert("RGBA") for f in piezas]
                s = min(1.0, tope(cat, nombre) / max(i.height for i in ims))
                base = len(pages)
                for im in ims:
                    if s < 1:
                        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
                    p, x, y = at.put(im)
                    rows.setdefault("pieza", []).append([base + p, x, y, im.width, im.height, im.width / 2, im.height])
                pages += at.save()
            man[sid] = {"nombre": nombre, "mundo": mundo, "capa": capa, "cat": cat, "pages": pages, "rows": rows}
            continue
        frames = []
        for f in files:
            m = re.fullmatch(r"r(\d+)_c(\d+)\.png", f)
            if m:
                frames.append((int(m.group(1)), int(m.group(2)), f))
        frames.sort()
        ims = {(r, c): Image.open(os.path.join(d, f)).convert("RGBA") for r, c, f in frames}
        s = min(1.0, tope(cat, nombre) / max(i.height for i in ims.values()))
        at = Atlas(sid)
        for (r, c), im in ims.items():
            if s < 1:
                im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
            ax, ay = ancla(im)
            p, x, y = at.put(im)
            rows.setdefault(str(r), []).append([p, x, y, im.width, im.height, round(ax, 1), round(ay, 1)])
        man[sid] = {"nombre": nombre, "mundo": mundo, "capa": capa, "cat": cat, "pages": at.save(), "rows": rows}
        print(f"{sid}: {len(ims)} cuadros, escala {s:.2f}")
    for sh in man.values():
        sh["sizes"] = [list(Image.open(os.path.join("public", p)).size) for p in sh["pages"]]
    with open(OUT_MAN, "w", encoding="utf-8") as fh:
        json.dump(man, fh, ensure_ascii=False, separators=(",", ":"))
    total = sum(os.path.getsize(os.path.join(OUT_IMG, f)) for f in os.listdir(OUT_IMG))
    print(f"{len(man)} hojas · {len(os.listdir(OUT_IMG))} imágenes · {total / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
