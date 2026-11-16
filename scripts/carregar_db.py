#!/usr/bin/env python3
"""Carrega data/ameacadas.csv + fichas/imagens coletadas no Postgres (container extintopedia-db).

Gera SQL e envia via `docker exec -i extintopedia-db psql` (nada de banco local, nem driver Python).
Idempotente: limpa e recarrega especie/estado/bioma/imagem a cada execução (o schema vem de db/schema.sql).
Uso: python3 scripts/carregar_db.py
"""
import csv, json, re, subprocess, sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DATA = RAIZ / "data"
sys.path.insert(0, str(Path(__file__).parent))
from coletar_fichas import slug  # noqa: E402  (importa Pillow; use o .venv)

CAT = {"Extinta": "EX", "Extinta na Natureza": "EW", "Regionalmente Extinta": "RE",
       "Criticamente em Perigo": "CR", "Em Perigo": "EN", "Vulnerável": "VU"}
UF = {"Acre": "AC", "Amapá": "AP", "Amazonas": "AM", "Pará": "PA", "Rondônia": "RO", "Roraima": "RR",
      "Tocantins": "TO", "Alagoas": "AL", "Bahia": "BA", "Ceará": "CE", "Maranhão": "MA", "Paraíba": "PB",
      "Pernambuco": "PE", "Piauí": "PI", "Rio Grande do Norte": "RN", "Sergipe": "SE",
      "Distrito Federal": "DF", "Goiás": "GO", "Mato Grosso": "MT", "Mato Grosso do Sul": "MS",
      "Espírito Santo": "ES", "Minas Gerais": "MG", "Rio de Janeiro": "RJ", "São Paulo": "SP",
      "Paraná": "PR", "Rio Grande do Sul": "RS", "Santa Catarina": "SC"}


def q(v):
    """literal SQL texto (NULL se vazio)."""
    if v is None or str(v).strip() == "":
        return "NULL"
    return "'" + str(v).strip().replace("'", "''") + "'"


def sim_nao(v):
    v = (v or "").strip().lower()
    return "true" if v in ("sim", "s") else "false" if v in ("não", "nao", "n") else "NULL"


def lista(v):
    return [x.strip() for x in re.split(r",", v or "") if x.strip()]


def main():
    rows = list(csv.DictReader(open(DATA / "ameacadas.csv", encoding="utf-8-sig")))
    sql = ["BEGIN;", "TRUNCATE imagem, especie_estado_bioma, especie_bioma, especie_estado, especie, grupo, bioma RESTART IDENTITY CASCADE;"]
    grupos = sorted({r["grupo"] for r in rows})
    biomas = sorted({b for r in rows for b in lista(r["bioma"])})
    sql += [f"INSERT INTO grupo(nome) VALUES ({q(g)});" for g in grupos]
    sql += [f"INSERT INTO bioma(nome) VALUES ({q(b)});" for b in biomas]
    desconhecidos = set()
    for r in rows:
        nome = (r["subespecie"] or r["especie"]).strip()
        comuns = lista(r["nome_comum"])
        cats = CAT[r["categoria"]]
        arr = "ARRAY[" + ",".join(q(c) for c in comuns) + "]::text[]" if comuns else "'{}'"
        sql.append(
            "INSERT INTO especie(nome_cientifico,autor,nome_comum,nomes_comuns,reino,filo,classe,ordem_taxonomica,familia,genero,"
            "grupo_id,categoria,possivelmente_extinta,criterio,justificativa,endemica_brasil,tendencia_populacional,"
            "periodo_avaliacao,doi,migratoria,ameacas,acoes_conservacao,plano_acao) VALUES ("
            f"{q(nome)},{q(r['autor'])},{q(comuns[0] if comuns else None)},{arr},{q(r['reino'])},{q(r['filo'])},{q(r['classe'])},"
            f"{q(r['ordem'])},{q(r['familia'])},{q(r['genero'])},(SELECT id FROM grupo WHERE nome={q(r['grupo'])}),'{cats}',"
            f"{'true' if r['possivemente_extinta'].strip() else 'false'},{q(r['criterio'])},{q(r['justificativa'])},"
            f"{sim_nao(r['endemica_brasil'])},{q(r['tendencia_populacional'])},{q(r['mesano_avaliacao'])},NULL,"
            f"{sim_nao(r['migratoria'])},{q(r['ameaca'])},{q(r['acao_conservacao'])},{q(r['plano_de_acao'])});"
        )
        for e in lista(r["estado"]):
            if e in UF:
                sql.append(f"INSERT INTO especie_estado SELECT id,'{UF[e]}' FROM especie WHERE nome_cientifico={q(nome)};")
            else:
                desconhecidos.add(e)
        for b in lista(r["bioma"]):
            sql.append(f"INSERT INTO especie_bioma SELECT e.id,b.id FROM especie e, bioma b WHERE e.nome_cientifico={q(nome)} AND b.nome={q(b)};")
        # DOI e imagem a partir da ficha coletada
        s = slug(nome)
        fj = DATA / "fichas" / f"{s}.json"
        if fj.exists():
            ficha = json.loads(fj.read_text())
            if not isinstance(ficha, dict):
                ficha = {}
            if ficha.get("DOI"):
                sql.append(f"UPDATE especie SET doi={q(ficha['DOI'])} WHERE nome_cientifico={q(nome)};")
            foto = ficha.get("photo") or {}
            if foto.get("url") and foto.get("diskFileName") and not foto["diskFileName"].lower().endswith((".tif", ".tiff")) and (DATA / "imagens" / f"{s}_media.jpg").exists():
                sql.append(
                    "INSERT INTO imagem(especie_id,fonte,autor,licenca,url_origem,arquivo_media,arquivo_thumb) "
                    f"SELECT id,'salve',{q(foto.get('authorName'))},NULL,NULL,'{s}_media.jpg','{s}_thumb.jpg' "
                    f"FROM especie WHERE nome_cientifico={q(nome)};"
                )
                continue_img = True
            else:
                continue_img = False
        else:
            continue_img = False
        ij = DATA / "inat" / f"{s}.json"
        if not continue_img and ij.exists() and (DATA / "imagens" / f"{s}_media.jpg").exists():
            f = json.loads(ij.read_text()).get("foto")
            if f:
                sql.append(
                    "INSERT INTO imagem(especie_id,fonte,autor,licenca,url_origem,arquivo_media,arquivo_thumb) "
                    f"SELECT id,'inaturalist',{q(f['autor'])},{q(f['licenca'])},{q(f['pagina'])},'{s}_media.jpg','{s}_thumb.jpg' "
                    f"FROM especie WHERE nome_cientifico={q(nome)};"
                )
    sql.append("COMMIT;")
    if desconhecidos:
        print("estados fora do mapa:", desconhecidos)
    out = subprocess.run(
        ["docker", "exec", "-i", "extintopedia-db", "psql", "-q", "-v", "ON_ERROR_STOP=1", "-U", "extinto", "-d", "extintopedia"],
        input="\n".join(sql), text=True, capture_output=True)
    print(out.stdout, out.stderr)
    if out.returncode:
        sys.exit(out.returncode)
    print(f"{len(rows)} espécies carregadas")


if __name__ == "__main__":
    main()
