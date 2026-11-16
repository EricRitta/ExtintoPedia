#!/usr/bin/env python3
"""Cruzamento exato estado x bioma (ameaçadas/extintas) via API: search?estadoIds=X&biomaIds=Y.
Saída: data/estado_bioma.json  {"SP": {"Mata Atlântica": ["Nome cientifico", ...]}}
Retomável (cache por combinação em data/cruzamento/)."""
import json, re, sys, html
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from coletar_fichas import BASE, CATEGORIAS, DATA, get_json, nome_cientifico  # noqa: E402

def main():
    (DATA / "cruzamento").mkdir(exist_ok=True)
    opt = get_json(f"{BASE}/selectOptions")["data"]
    estados = {re.search(r"\((\w\w)\)$", e["name"]).group(1): e["id"] for e in opt["states"]}
    biomas = {b["name"]: b["id"] for b in opt["biomas"]}
    combos = [(uf, uid, bn, bid) for uf, uid in estados.items() for bn, bid in biomas.items()]
    def um(c):
        uf, uid, bn, bid = c
        arq = DATA / "cruzamento" / f"{uf}_{bid}.json"
        if arq.exists():
            return c, json.loads(arq.read_text())
        nomes, pag = [], 1
        while True:
            d = get_json(f"{BASE}/search?categoriaIds={CATEGORIAS}&estadoIds={uid}&biomaIds={bid}&paginationPageSize=500&paginationPageNumber={pag}")
            if d["status"] != 200:
                raise RuntimeError(d.get("msg"))
            nomes += [nome_cientifico(r["nm_cientifico"]) for r in d["data"] or []]
            if len(d["data"] or []) < 500:
                break
            pag += 1
        arq.write_text(json.dumps(nomes, ensure_ascii=False))
        return c, nomes
    saida = {}
    with ThreadPoolExecutor(3) as ex:
        for i, (c, nomes) in enumerate(ex.map(um, combos), 1):
            if nomes:
                saida.setdefault(c[0], {})[c[2]] = nomes
            if i % 20 == 0 or i == len(combos):
                print(f"{i}/{len(combos)}", flush=True)
    (DATA / "estado_bioma.json").write_text(json.dumps(saida, ensure_ascii=False))
    print("combos com espécies:", sum(len(v) for v in saida.values()), "pares:", sum(len(n) for v in saida.values() for n in v.values()))

if __name__ == "__main__":
    main()
