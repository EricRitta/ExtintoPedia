#!/usr/bin/env python3
"""Para espécies sem foto no SALVE, busca a foto padrão no iNaturalist (só fotos com licença aberta).

Saídas (em data/):
  inat/<slug>.json            resultado da busca (inclusive quando não achou -> {"foto": null})
  imagens/<slug>_{media,thumb}.jpg
É retomável. Respeita ~1 requisição/s à API do iNaturalist. Precisa de Pillow (.venv).
"""
import csv, json, time, urllib.parse
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))
from coletar_fichas import DATA, get, gerar_tamanhos, slug  # noqa: E402

API = "https://api.inaturalist.org/v1/taxa"


def nomes_sem_foto():
    rows = list(csv.DictReader(open(DATA / "ameacadas.csv", encoding="utf-8-sig")))
    for r in rows:
        nome = (r["subespecie"] or r["especie"]).strip()
        if not (DATA / "imagens" / f"{slug(nome)}_media.jpg").exists():
            yield nome


def buscar(nome):
    url = f"{API}?{urllib.parse.urlencode({'q': nome, 'rank': 'species,subspecies', 'per_page': 5})}"
    for t in json.loads(get(url))["results"]:
        if t["name"].lower() != nome.lower():
            continue
        p = t.get("default_photo") or {}
        if p.get("license_code") and (p.get("large_url") or p.get("medium_url")):
            return {"taxon_id": t["id"], "nome_inat": t["name"], "autor": p.get("attribution"),
                    "licenca": p["license_code"], "foto_url": p.get("large_url") or p["medium_url"],
                    "pagina": f"https://www.inaturalist.org/taxa/{t['id']}", "nivel": "exato"}
    return None


def main():
    (DATA / "inat").mkdir(exist_ok=True)
    nomes = list(nomes_sem_foto())
    print(len(nomes), "espécies sem foto do SALVE", flush=True)
    cont = {"achou": 0, "sem_foto": 0, "erro": 0}
    for i, nome in enumerate(nomes, 1):
        s = slug(nome)
        arq = DATA / "inat" / f"{s}.json"
        try:
            if arq.exists():
                res = json.loads(arq.read_text())
            else:
                time.sleep(1.0)
                foto = buscar(nome)
                # subespécie sem foto própria: tenta a espécie (binomial) e marca o nível
                if not foto and len(nome.split()) == 3:
                    time.sleep(1.0)
                    foto = buscar(" ".join(nome.split()[:2]))
                    if foto:
                        foto["nivel"] = "especie"
                res = {"nome": nome, "foto": foto}
                arq.write_text(json.dumps(res, ensure_ascii=False))
            foto = res["foto"]
            if foto:
                if not (DATA / "imagens" / f"{s}_media.jpg").exists():
                    gerar_tamanhos(get(foto["foto_url"]), s)
                cont["achou"] += 1
            else:
                cont["sem_foto"] += 1
        except Exception as e:  # noqa: BLE001
            cont["erro"] += 1
            print("erro", nome, repr(e), flush=True)
        if i % 25 == 0 or i == len(nomes):
            print(f"{i}/{len(nomes)} {cont}", flush=True)
    print("fim", cont)


if __name__ == "__main__":
    main()
