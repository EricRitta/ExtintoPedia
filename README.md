# ExtintoPedia — pipeline de dados (SALVE/ICMBio → Postgres)

Banco: Postgres 17 em container (nada local). `docker compose up -d` → localhost:5433, user/db `extinto`/`extintopedia`.
Python: `.venv/bin/python` (só Pillow; o resto é stdlib). Dados brutos em `data/`, notas da API em `api_tmp/NOTAS_API.md`.

Ordem de execução (do zero):
1. `docker compose up -d` e `docker exec -i extintopedia-db psql -U extinto -d extintopedia < db/schema.sql`
2. `data/ameacadas.csv` = exportação CSV da busca `categoriaIds=127..132` (ver NOTAS_API.md)
3. `.venv/bin/python scripts/coletar_fichas.py`      fichas (header) + fotos do SALVE, gera media/thumb
4. `.venv/bin/python scripts/fotos_inaturalist.py`   fallback de fotos (licença aberta) p/ quem ficou sem foto
5. `.venv/bin/python scripts/carregar_db.py`         carrega espécies/estados/biomas/imagens
6. `.venv/bin/python scripts/cruzar_estado_bioma.py` + `python3 scripts/carregar_cruzamento.py`  (estado x bioma, aproximado)
Os IDs de ficha da API expiram no mesmo dia: rode 3 de uma vez.

## App (localhost)
`app/` = TypeScript: Fastify (API, :3001) + React/Vite + MapLibre (:5173). Banco: ver acima (container).
- `docker compose up -d --build` → http://localhost:5173 (banco restaurado do backup + app, tudo em container)
- Dev com hot reload: `docker compose up -d db && cd app && npm install && npm run dev` (não junto com o container `app`)
- Geometria: `.venv/bin/python scripts/carregar_geo.py` (estados + biomas do IBGE → PostGIS → app/public/geo/*.geojson)
- Tela: Brasil (cor = nº de espécies) → clica no estado (zoom + biomas recortados + animal aleatório por bioma, sempre com foto) → clica no bioma (lista com filtros).
