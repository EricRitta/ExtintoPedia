#!/usr/bin/env python3
"""Coleta, da SALVE-API, as fichas (header) das espécies ameaçadas/extintas e baixa as fotos.

Saídas (em data/):
  search.json            lista completa retornada pela busca (inclui id_ficha do dia)
  fichas/<slug>.json     data do fichaHtml?section=header de cada espécie
  imagens/<slug>_{media,thumb}.jpg   (gerados localmente a partir do /full; precisa de Pillow -> .venv)
É retomável: o que já existe em disco não é baixado de novo.
Os IDs da API expiram no mesmo dia, então rode a coleta de uma vez só.
"""
import html, io, json, re, sys, time, unicodedata, urllib.request
from PIL import Image, ImageFile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ImageFile.LOAD_TRUNCATED_IMAGES = True
BASE = "https://salve.icmbio.gov.br/salve-api/public"
DATA = Path(__file__).resolve().parent.parent / "data"
CATEGORIAS = "127,128,129,130,131,132"  # EX, EW, RE, CR, EN, VU
WORKERS = 4
LIMITE = int(sys.argv[1]) if len(sys.argv) > 1 else None  # teste: processa só N espécies


def get(url, tentativas=4, timeout=90):
    for i in range(tentativas):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "ExtintoPedia-coletor/0.1"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            if i == tentativas - 1:
                raise
            time.sleep(2 * (i + 1))


def get_json(url):
    return json.loads(get(url))


def nome_cientifico(s):
    """Binomial (ou trinomial) = texto dentro de <i>; sem o autor."""
    m = re.search(r"<i>(.*?)</i>", s)
    txt = m.group(1) if m else re.sub(r"<[^>]+>", "", s)
    return html.unescape(txt).replace("\xa0", " ").strip()


TAMANHOS = {"media": 600, "thumb": 160}


def gerar_tamanhos(bruto, s):
    img = Image.open(io.BytesIO(bruto))
    img = img.convert("RGB")
    for nome, lado in TAMANHOS.items():
        c = img.copy()
        c.thumbnail((lado, lado))
        c.save(DATA / "imagens" / f"{s}_{nome}.jpg", "JPEG", quality=82, optimize=True)


def slug(nome):
    n = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", n.lower()).strip("_")


def buscar_todas():
    arq = DATA / "search.json"
    if arq.exists():
        return json.loads(arq.read_text())
    tudo, pag = [], 1
    while True:
        d = get_json(f"{BASE}/search?categoriaIds={CATEGORIAS}&paginationPageSize=500&paginationPageNumber={pag}")
        if d["status"] != 200:
            raise RuntimeError(d)
        tudo += d["data"]
        print(f"busca pág {pag}: {len(d['data'])}", flush=True)
        if len(d["data"]) < 500:
            break
        pag += 1
    arq.write_text(json.dumps(tudo, ensure_ascii=False))
    return tudo


def processar(reg):
    nome = nome_cientifico(reg["nm_cientifico"])
    s = slug(nome)
    f = DATA / "fichas" / f"{s}.json"
    try:
        if f.exists():
            ficha = json.loads(f.read_text())
        else:
            d = get_json(f"{BASE}/fichaHtml?idFicha={reg['id_ficha']}&section=header")
            if d["status"] != 200:
                return nome, "erro_ficha", d.get("msg")
            ficha = d["data"]
            f.write_text(json.dumps(ficha, ensure_ascii=False))
        foto = ficha.get("photo") if isinstance(ficha, dict) else None
        foto = foto or {}
        url = foto.get("url")
        # ficha "fantasma": url preenchida mas sem arquivo (404) ou formato que o servidor não entrega (.tif)
        if not url or not foto.get("diskFileName") or foto["diskFileName"].lower().endswith((".tif", ".tiff")):
            return nome, "sem_foto", None
        if not all((DATA / "imagens" / f"{s}_{t}.jpg").exists() for t in TAMANHOS):
            gerar_tamanhos(get(url), s)  # url termina em /full
        return nome, "ok", None
    except Exception as e:  # noqa: BLE001
        return nome, "erro", repr(e)


def main():
    (DATA / "fichas").mkdir(parents=True, exist_ok=True)
    (DATA / "imagens").mkdir(parents=True, exist_ok=True)
    regs = buscar_todas()
    if LIMITE:
        regs = regs[:LIMITE]
    print(f"{len(regs)} espécies", flush=True)
    cont, falhas = {}, []
    with ThreadPoolExecutor(WORKERS) as ex:
        for i, (nome, st, msg) in enumerate(ex.map(processar, regs), 1):
            cont[st] = cont.get(st, 0) + 1
            if st.startswith("erro"):
                falhas.append((nome, st, msg))
            if i % 50 == 0 or i == len(regs):
                print(f"{i}/{len(regs)} {cont}", flush=True)
    (DATA / "falhas.json").write_text(json.dumps(falhas, ensure_ascii=False, indent=1))
    print("fim", cont)


if __name__ == "__main__":
    main()
