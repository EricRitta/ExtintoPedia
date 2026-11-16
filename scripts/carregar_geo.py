#!/usr/bin/env python3
"""Carrega polígonos do IBGE (estados + biomas) no PostGIS, recorta bioma x estado e exporta GeoJSON leve
para app/public/geo/. Precisa de pyshp (.venv). Fontes: data/geo/uf.geojson e data/geo/biomas2025/*.shp"""
import json, subprocess, sys
from pathlib import Path
import shapefile

RAIZ = Path(__file__).resolve().parent.parent
GEO = RAIZ / "data" / "geo"
OUT = RAIZ / "app" / "public" / "geo"
UF = {"11":"RO","12":"AC","13":"AM","14":"RR","15":"PA","16":"AP","17":"TO","21":"MA","22":"PI","23":"CE","24":"RN",
      "25":"PB","26":"PE","27":"AL","28":"SE","29":"BA","31":"MG","32":"ES","33":"RJ","35":"SP","41":"PR","42":"SC",
      "43":"RS","50":"MS","51":"MT","52":"GO","53":"DF"}

def psql(sql, saida=False):
    r = subprocess.run(["docker","exec","-i","extintopedia-db","psql","-q","-v","ON_ERROR_STOP=1","-U","extinto","-d","extintopedia"]
                       + (["-tA"] if saida else []), input=sql, text=True, capture_output=True)
    if r.returncode: sys.exit(r.stderr)
    return r.stdout

def lit(o): return "'" + json.dumps(o, ensure_ascii=False).replace("'", "''") + "'"

sql = ["BEGIN;", "DROP TABLE IF EXISTS geo_estado_bioma, geo_bioma, geo_estado;",
       "CREATE TABLE geo_estado (sigla char(2) PRIMARY KEY, geom geometry(MultiPolygon,4674));",
       "CREATE TABLE geo_bioma (nome text PRIMARY KEY, geom geometry(MultiPolygon,4674));"]
for f in json.loads((GEO / "uf.geojson").read_text())["features"]:
    sql.append(f"INSERT INTO geo_estado VALUES ('{UF[f['properties']['codarea']]}', ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON({lit(f['geometry'])}),4674))));")
sf = shapefile.Reader(str(GEO / "biomas2025" / "lml_bioma_e250k_v20250911_A.shp"), encoding="utf-8")
for sr in sf.shapeRecords():
    nm = sr.record['NM_BIOMA'].replace("'", "''")
    sql.append(f"INSERT INTO geo_bioma VALUES ('{nm}', ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON({lit(sr.shape.__geo_interface__)}),4674))));")
sql += ["CREATE INDEX ON geo_estado USING gist(geom); CREATE INDEX ON geo_bioma USING gist(geom);",
        # recorte exato; ST_CollectionExtract(...,3) mantém só polígonos
        """CREATE TABLE geo_estado_bioma AS
           SELECT e.sigla AS estado, b.nome AS bioma,
                  ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Intersection(e.geom,b.geom)),3)) AS geom
           FROM geo_estado e JOIN geo_bioma b ON ST_Intersects(e.geom,b.geom);""",
        "DELETE FROM geo_estado_bioma WHERE geom IS NULL OR ST_IsEmpty(geom) OR ST_Area(geom::geography) < 1e6;",
        "COMMIT;"]
psql("\n".join(sql))

OUT.mkdir(parents=True, exist_ok=True)
def exporta(sel, arq):
    fc = psql(f"SELECT json_build_object('type','FeatureCollection','features',coalesce(json_agg(f),'[]'::json)) FROM ({sel}) f", True)
    (OUT / arq).write_text(fc.strip())
    print(arq, round(len(fc)/1024), "KB")

# mesma tolerância (~400 m) em estados e biomas: bordas coincidem (antes 0,02 x 0,005 desalinhava as linhas)
TOL = 0.004
simp = lambda g, t: f"ST_AsGeoJSON(ST_ReducePrecision(ST_SimplifyPreserveTopology({g},{t}),0.001),4)::json"
exporta(f"SELECT 'Feature' type, json_build_object('uf',sigla,'nome',(SELECT nome FROM estado WHERE sigla=g.sigla)) properties, {simp('geom',TOL)} geometry FROM geo_estado g ORDER BY 2::text", "estados.geojson")
for uf in UF.values():
    exporta(f"SELECT 'Feature' type, json_build_object('uf',estado,'bioma',bioma,'bioma_id',(SELECT id FROM bioma WHERE nome=g.bioma)) properties, {simp('geom',TOL)} geometry FROM geo_estado_bioma g WHERE estado='{uf}'", f"biomas_{uf}.geojson")
