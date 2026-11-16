#!/usr/bin/env python3
"""Preenche especie_estado_bioma = (pares estado x bioma da API) filtrados pelos biomas que realmente
existem em cada estado (polígonos do IBGE, ver carregar_geo.py). APROXIMAÇÃO: o SALVE não informa
em qual bioma de cada estado a espécie ocorre; a API só faz "E" entre as duas listas."""
import json, subprocess, sys
from pathlib import Path
DATA = Path(__file__).resolve().parent.parent / "data"
CM = "Sistema Costeiro-Marinho"
LITORAL = {"AP","PA","MA","PI","CE","RN","PB","PE","AL","SE","BA","ES","RJ","SP","PR","SC","RS"}

def biomas_do_estado():
    """biomas que realmente existem no estado (polígonos IBGE em geo_estado_bioma) + costeiro nos litorâneos"""
    r = subprocess.run(["docker","exec","-i","extintopedia-db","psql","-tA","-F","|","-U","extinto","-d","extintopedia","-c",
                        "SELECT estado,bioma FROM geo_estado_bioma"], text=True, capture_output=True, check=True)
    m = {}
    for l in r.stdout.strip().splitlines():
        uf, b = l.split("|"); m.setdefault(uf, set()).add(b)
    for uf in LITORAL: m.setdefault(uf, set()).add(CM)
    return m
BIOMAS_DO_ESTADO = biomas_do_estado()
def q(v): return "'" + v.replace("'", "''") + "'"
cruz = json.loads((DATA / "estado_bioma.json").read_text())
sql, descartados, mantidos = ["BEGIN;", "TRUNCATE especie_estado_bioma;"], 0, 0
for uf, bs in cruz.items():
    for bioma, nomes in bs.items():
        if bioma not in BIOMAS_DO_ESTADO[uf]:
            descartados += len(nomes); continue
        for n in nomes:
            mantidos += 1
            sql.append(f"INSERT INTO especie_estado_bioma SELECT e.id,'{uf}',b.id FROM especie e, bioma b WHERE e.nome_cientifico={q(n)} AND b.nome={q(bioma)} ON CONFLICT DO NOTHING;")
sql.append("COMMIT;")
r = subprocess.run(["docker","exec","-i","extintopedia-db","psql","-q","-v","ON_ERROR_STOP=1","-U","extinto","-d","extintopedia"], input="\n".join(sql), text=True, capture_output=True)
print(r.stdout, r.stderr, f"mantidos={mantidos} descartados={descartados}")
sys.exit(r.returncode)
