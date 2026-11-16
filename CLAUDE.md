# ExtintoPedia

Mapa interativo das espécies ameaçadas e extintas do Brasil (fonte: SALVE/ICMBio). Só roda em localhost: nada de complexidade de produção.
Fluxo da tela: Brasil (cor = nº de espécies) → clica no estado (zoom, biomas recortados, animal aleatório por bioma) → clica no bioma (lista com filtros).
Regra do projeto: os animais **sempre** aparecem com imagem e **nome popular** (científico só quando não há popular, em itálico).

## Como rodar
- Banco: **só em Docker** (nunca instalar Postgres local). `docker compose up -d` (PostGIS, porta 5433, usuário/db `extinto`/`extintopedia`).
- App: `cd app && npm install && npm run dev` → http://localhost:5173 (API Fastify em :3001).
- Python do pipeline: `.venv/bin/python` (Pillow, pyshp). Ordem dos scripts: ver `README.md`.
- Restaurar o banco do zero: `gunzip -c db/backup/extintopedia.sql.gz | docker exec -i extintopedia-db psql -U extinto -d extintopedia`.

## Stack
TypeScript em tudo no `app/` (Fastify + React/Vite + MapLibre, sem mapa-base, só polígonos do IBGE). Pipeline de dados em Python em `scripts/`.

## Fatos da SALVE-API que não são óbvios
- Docs oficiais em `https://salve.icmbio.gov.br/salve-api/public/`; notas e testes em `api_tmp/NOTAS_API.md`.
- `search` precisa de pelo menos um filtro real (sem filtro, ou só `threatened`, dá HTTP 500). IDs de categoria vêm de `selectOptions` (127=EX … 132=VU).
- `id_ficha` e IDs de foto são criptografados e **expiram no mesmo dia**: use `nome_cientifico` como chave estável.
- Fotos: o campo `photo` da ficha pode vir com `url` mas sem `diskFileName` (ficha "fantasma", 404) ou ser `.tif` (415). Tratamos como sem foto.
- Filtro `estadoIds`+`biomaIds` da API é só um "E" entre listas, não um cruzamento geográfico.

## Decisões e limitações
- Escopo atual: só ameaçadas e extintas (1.393 espécies, categorias EX/EW/RE/CR/EN/VU). Todas as ~16 mil fica para depois.
- **Estado × bioma é aproximado**: espécies por estado e por bioma vêm do SALVE separadas; o cruzamento filtra pelos biomas que existem de fato no estado (polígonos IBGE). A geometria é exata, o dado de ocorrência não.
- Fotos: 801 de 1.393 espécies (58%): 580 do SALVE + 221 do iNaturalist (só licença aberta; autor e licença ficam em `imagem`). 592 sem foto: aparecem na lista com o emoji do grupo; o sorteio do bioma usa só quem tem foto e nome popular. 187 espécies não têm nome popular.
- Imagens são geradas localmente (600 px e 160 px) a partir do `/full` do SALVE: as versões `small`/`thumb` da API nem sempre existem.
- Sistema Costeiro-Marinho não tem polígono (shapefile só tem os 6 biomas terrestres): aparece só como cartão nos estados litorâneos.

## Pendências de interface (capturas em `prints/`)
- Fonte dos cartões sai monoespaçada no navegador do dono (`system-ui` não resolve): definir pilha de fontes explícita.
- Legenda de categorias quebra linha e deixa o número órfão ("Criticamente em perigo / 361").
- A borda preta do estado (malha IBGE "intermediária") não alinha com as bordas dos biomas (1:250.000): aparecem lascas. Usar a mesma fonte/precisão, ou desenhar a borda a partir da união dos biomas.
- A gaveta da lista cobre o estado no mapa: ajustar o enquadramento quando abre.

## Convenções
- Git: branch `main`. `node_modules`, `.venv`, logs e arquivos do banco ficam no `.gitignore`; o conteúdo do banco está em `db/backup/` e os dados brutos da API em `data/`.
- Commits terminam com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Respostas e textos da interface em português do Brasil.
