"""Corta cada hoja RGBA de IMAGENES en sus frames sueltos (componentes conexas del canal alfa).
Uso: python cortar.py [filtro_nombre]   -> escribe <Nombre>/rF_cC.png + _frames.json junto a la hoja."""
import glob, json, os, re, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

S = "C:/Users/aleco/AppData/Local/Temp/claude/0492001d3aab2e51/7dc3afe4-b73f-4144-8140-f1a1bf5fdbbf/scratchpad/"
os.makedirs(S + "qa", exist_ok=True)
filtro = sys.argv[1] if len(sys.argv) > 1 else None
resumen = {}


def bbox_dist(a, b):
    dx = max(a[0] - b[2], b[0] - a[2], 0)
    dy = max(a[1] - b[3], b[1] - a[3], 0)
    return (dx * dx + dy * dy) ** 0.5


for p in sorted(glob.glob("IMAGENES/**/*.png", recursive=True)):
    name = os.path.basename(p)[:-4]
    if re.fullmatch(r'r\d+_c\d+', name) or os.path.exists(os.path.join(os.path.dirname(p), '_frames.json')):
        continue
    if filtro and filtro not in name:
        continue
    im = Image.open(p)
    if im.mode != "RGBA":
        continue
    arr = np.array(im)
    a = arr[:, :, 3]
    m_all = a > 16
    # texto y motas (< 400 px) no cuentan para decidir los frames; luego se devuelven a su frame
    rl, rn = ndi.label(m_all, structure=np.ones((3, 3)))
    rs = np.array(ndi.sum(m_all, rl, range(1, rn + 1)))
    motas = np.zeros(m_all.shape, bool)
    mota_c = []
    if (rs >= 3000).sum() >= 6:
        for i in np.where(rs < 400)[0]:
            mk = rl == (i + 1)
            motas |= mk
            ys, xs = np.where(mk)
            mota_c.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1, mk))
    m = m_all & ~motas
    d = ndi.binary_dilation(m, iterations=8)
    lab, n = ndi.label(d)
    if n == 0:
        continue

    def split_gaps(mk, gap=3):
        """Parte una máscara por huecos vacíos de columnas y luego de filas (≥ gap px)."""
        out = [mk]
        for axis in (0, 1):
            nxt = []
            for q in out:
                occ = q.any(axis=axis)
                idxs = np.where(occ)[0]
                if len(idxs) == 0:
                    continue
                cuts, start = [], idxs[0]
                for u, v in zip(idxs[:-1], idxs[1:]):
                    if v - u > gap:
                        cuts.append((start, u + 1))
                        start = v
                cuts.append((start, idxs[-1] + 1))
                for lo, hi in cuts:
                    piece = np.zeros_like(q)
                    if axis == 0:
                        piece[:, lo:hi] = q[:, lo:hi]
                    else:
                        piece[lo:hi, :] = q[lo:hi, :]
                    nxt.append(piece)
            out = nxt
        return out

    pieces = []
    comp_of = []
    for i in range(1, n + 1):
        mk = m & (lab == i)
        if mk.sum() == 0:
            continue
        ps = split_gaps(mk)
        pieces.extend(ps)
        comp_of.extend([i] * len(ps))
    boxes = []
    area = []
    for q in pieces:
        ys, xs = np.where(q)
        boxes.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        area.append(q.sum())
    area = np.array(area)
    n = len(pieces)
    # dentro de una misma componente, los trozos pequeños (llamas, chispas) vuelven a su frame mayor
    parent = {i: i for i in range(n)}
    extras = []
    for i in sorted(range(n), key=lambda i: area[i]):
        sib = [j for j in range(n) if comp_of[j] == comp_of[i] and j != i and area[j] > 4 * area[i]]
        if sib:
            j = min(sib, key=lambda k: bbox_dist(boxes[i], boxes[k]))
            parent[i] = j
        elif area[i] < 1200:
            parent[i] = -1
            extras.append(i)
    groups = {}
    for i in range(n):
        r = i
        while r != -1 and parent[r] != r:
            r = parent[r]
        if r == -1:
            continue
        groups.setdefault(r, []).append(i)
    frames = []
    for j, mem in groups.items():
        mask = np.zeros(m.shape, bool)
        for k in mem:
            mask |= pieces[k]
        mask = ndi.binary_dilation(mask, iterations=3) & (a > 0)  # recupera bordes suaves
        ys, xs = np.where(mask)
        if len(xs) == 0:
            continue
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        for (mx0, my0, mx1, my1, mk) in mota_c:
            cx, cy = (mx0 + mx1) / 2, (my0 + my1) / 2
            if x0 - 8 <= cx <= x1 + 8 and y0 - 8 <= cy <= y1 + 8:
                mask |= mk
        ys, xs = np.where(mask)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        frames.append(dict(box=[int(x0), int(y0), int(x1), int(y1)], mask=mask))
    # frames pegados entre sí (sin hueco vacío): se cortan por los valles del perfil de ocupación
    def valley_cuts(mask, axis, minsep):
        cnt = mask.sum(axis=axis).astype(float)
        idx = np.where(cnt > 0)[0]
        lo, hi = idx.min(), idx.max() + 1
        sm = np.convolve(cnt, np.ones(9) / 9, mode="same")
        mx = sm[lo:hi].max()
        cuts, last = [], lo
        for x in range(lo + int(minsep), hi - int(minsep)):
            w = sm[max(lo, x - int(minsep) // 2): x + int(minsep) // 2 + 1]
            if sm[x] == w.min() and sm[x] < 0.45 * mx and x - last >= minsep:
                cuts.append(x)
                last = x
        return cuts

    def resplit(frames):
        wh = [(f["box"][2] - f["box"][0]) / (f["box"][3] - f["box"][1]) for f in frames]
        mw = float(np.median(wh))
        out = []
        for f, r in zip(frames, wh):
            w = f["box"][2] - f["box"][0]
            h = f["box"][3] - f["box"][1]
            axis, ratio = (0, r / mw) if r > mw else (1, mw / r)
            if ratio < 1.7:
                out.append(f)
                continue
            cuts = valley_cuts(f["mask"], axis, 0.4 * (h if axis == 0 else w) * (mw if axis == 0 else 1 / mw) ** (1 if axis == 0 else 1))
            if not cuts:
                out.append(f)
                continue
            edges = [0] + cuts + [f["mask"].shape[1 - axis]]
            for e0, e1 in zip(edges[:-1], edges[1:]):
                mk = np.zeros_like(f["mask"])
                if axis == 0:
                    mk[:, e0:e1] = f["mask"][:, e0:e1]
                else:
                    mk[e0:e1, :] = f["mask"][e0:e1, :]
                ys, xs = np.where(mk)
                if len(xs) < 300:
                    continue
                out.append(dict(box=[int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)], mask=mk))
        return out

    frames = resplit(frames)

    def deep_split(f, depth=0):
        """Corta por valles casi vacíos (< 12 % del máximo) que dejan masa suficiente a cada lado."""
        mk = f["mask"] & (a > 16)
        x0, y0, x1, y1 = f["box"]
        tot = mk.sum()
        for axis in (0, 1):
            cnt = mk.sum(axis=axis).astype(float)
            sm = np.convolve(cnt, np.ones(5) / 5, mode="same")
            lo, hi = (x0, x1) if axis == 0 else (y0, y1)
            mx = sm[lo:hi].max()
            span = (x1 - x0) if axis == 0 else (y1 - y0)
            other = (y1 - y0) if axis == 0 else (x1 - x0)
            best = None
            for x in range(lo + int(0.2 * other), hi - int(0.2 * other)):
                if sm[x] < 0.12 * mx and (best is None or sm[x] < sm[best]):
                    left = cnt[lo:x].sum()
                    right = cnt[x:hi].sum()
                    if left >= 0.12 * tot and right >= 0.12 * tot:
                        best = x
            if best is not None and depth < 12:
                parts = []
                for e0, e1 in ((lo, best), (best, hi)):
                    sub = np.zeros_like(f["mask"])
                    if axis == 0:
                        sub[:, e0:e1] = f["mask"][:, e0:e1]
                    else:
                        sub[e0:e1, :] = f["mask"][e0:e1, :]
                    ys, xs = np.where(sub)
                    if len(xs) == 0:
                        continue
                    parts.append(dict(box=[int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)], mask=sub))
                out = []
                for q in parts:
                    out.extend(deep_split(q, depth + 1))
                return out
        return [f]

    nf = []
    mareas = [int((f["mask"] & (a > 16)).sum()) for f in frames]
    mmed = float(np.median(mareas)) if mareas else 1.0
    for f in frames:
        parts = deep_split(f)
        pa = [int((q["mask"] & (a > 16)).sum()) for q in parts]
        # solo es un corte válido si cada trozo tiene el tamaño de un frame normal de esta hoja
        ok = len(parts) <= 4 and all(0.2 * mmed <= v <= 3.0 * mmed for v in pa)
        nf.extend(parts if ok else [f])
    frames = nf
    # frames mucho mayores que los demás (varios pegados en rejilla): se parten en celdas iguales
    if False and len(frames) >= 4:  # desactivado: parte retratos grandes
        ars = [(f["box"][2] - f["box"][0]) * (f["box"][3] - f["box"][1]) for f in frames]
        mda = float(np.median(ars))
        typ = [f for f, q in zip(frames, ars) if q <= 1.3 * mda]
        rw = float(np.median([f["box"][2] - f["box"][0] for f in typ]))
        rh = float(np.median([f["box"][3] - f["box"][1] for f in typ]))
        nf2 = []
        for f, q in zip(frames, ars):
            w = f["box"][2] - f["box"][0]
            h = f["box"][3] - f["box"][1]
            k, mrow = max(1, round(w / rw)), max(1, round(h / rh))
            casi = abs(w / rw - k) < 0.2 and abs(h / rh - mrow) < 0.2
            if q > 2.2 * mda and 2 <= k * mrow <= 8 and casi:
                x0, y0 = f["box"][0], f["box"][1]
                for ci in range(k):
                    for ri in range(mrow):
                        cx0, cx1 = x0 + round(ci * w / k), x0 + round((ci + 1) * w / k)
                        cy0, cy1 = y0 + round(ri * h / mrow), y0 + round((ri + 1) * h / mrow)
                        mk = np.zeros_like(f["mask"])
                        mk[cy0:cy1, cx0:cx1] = f["mask"][cy0:cy1, cx0:cx1]
                        ys, xs = np.where(mk & (a > 16))
                        if len(xs) < 300:
                            continue
                        nf2.append(dict(box=[int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)], mask=mk))
            else:
                nf2.append(f)
        frames = nf2
    # etiquetas de texto sueltas (poco relleno dentro de su caja) fuera, si la hoja es regular
    def fill(f):
        x0, y0, x1, y1 = f["box"]
        return float((f["mask"] & (a > 16)).sum()) / max(1, (x1 - x0) * (y1 - y0))
    sólidos = [f for f in frames if fill(f) > 0.3]
    if len(sólidos) >= 6:
        extras += [0] * sum(1 for f in frames if fill(f) <= 0.12)
        frames = [f for f in frames if fill(f) > 0.12]
    # trozos diminutos (llamas, chispas) vuelven a su frame más cercano
    ar = [int((f["mask"] & (a > 16)).sum()) for f in frames]
    med = float(np.median(ar))
    keep = [i for i in range(len(frames)) if ar[i] >= 0.2 * med]
    for i in range(len(frames)):
        if i in keep or not keep:
            continue
        j = min(keep, key=lambda k: bbox_dist(frames[i]["box"], frames[k]["box"]))
        frames[j]["mask"] = frames[j]["mask"] | frames[i]["mask"]
        b1, b2 = frames[i]["box"], frames[j]["box"]
        frames[j]["box"] = [min(b1[0], b2[0]), min(b1[1], b2[1]), max(b1[2], b2[2]), max(b1[3], b2[3])]
    frames = [frames[i] for i in keep] if keep else frames
    # filas por centro vertical
    hs = [f["box"][3] - f["box"][1] for f in frames]
    mh = float(np.median(hs))
    frames.sort(key=lambda f: (f["box"][1] + f["box"][3]) / 2)
    rows, cur = [], []
    for f in frames:
        cy = (f["box"][1] + f["box"][3]) / 2
        if cur and cy - np.mean([(g["box"][1] + g["box"][3]) / 2 for g in cur]) > 0.5 * mh:
            rows.append(cur)
            cur = []
        cur.append(f)
    if cur:
        rows.append(cur)
    outdir = os.path.join(os.path.dirname(p), name)
    os.makedirs(outdir, exist_ok=True)
    for old in glob.glob(outdir + "/r*_c*.png"):
        os.remove(old)
    meta = []
    qa = im.convert("RGBA")
    bgc = Image.new("RGBA", im.size, (40, 40, 48, 255))
    bgc.alpha_composite(qa)
    dr = ImageDraw.Draw(bgc)
    for r, row in enumerate(rows, 1):
        row.sort(key=lambda f: f["box"][0])
        for c, f in enumerate(row, 1):
            x0, y0, x1, y1 = f["box"]
            cut = arr.copy()
            cut[~f["mask"]] = 0  # solo los píxeles de este frame
            Image.fromarray(cut[y0:y1, x0:x1]).save(f"{outdir}/r{r}_c{c:02d}.png")
            meta.append(dict(archivo=f"r{r}_c{c:02d}.png", fila=r, columna=c, caja=f["box"]))
            dr.rectangle([x0, y0, x1, y1], outline=(0, 255, 120), width=3)
            dr.text((x0 + 4, y0 + 2), f"{r}.{c}", fill=(255, 255, 0))
    for s_ in extras:
        x0, y0, x1, y1 = boxes[s_]
        dr.rectangle([x0, y0, x1, y1], outline=(255, 60, 60), width=3)
    json.dump(dict(hoja=os.path.basename(p), tam=list(im.size), frames=meta, sueltos_sin_asignar=len(extras)), open(outdir + "/_frames.json", "w"), ensure_ascii=False, indent=1)
    bgc.convert("RGB").resize((im.width // 2, im.height // 2)).save(S + "qa/" + name.replace(" ", "_").replace("/", "_") + ".png")
    resumen[name] = (len(meta), [len(r) for r in rows], len(extras))
for k, v in resumen.items():
    print(k, v)
