# ExtintoPedia

Mapa interativo das espécies ameaçadas e extintas do Brasil (fonte: SALVE/ICMBio). Só roda em localhost: nada de complexidade de produção.
Fluxo da tela: Brasil (cor = nº de espécies) → clica no estado (zoom, biomas recortados, animal aleatório por bioma) → clica no bioma (lista com filtros). Clicar numa categoria da legenda (Brasil ou estado) abre a lista filtrada.
Regra do projeto: os animais aparecem com imagem. Cartões do mapa/bioma usam nome popular; nos cartões da lista, o científico vem em destaque e o popular em cinza abaixo.

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

## Interface: feito e pendente
- Feito: estados e biomas exportados com a mesma tolerância (`TOL` em `scripts/carregar_geo.py`) para as bordas alinharem; legenda clicável (abre a lista já filtrada por categoria, no Brasil ou no estado); lista de tipos de animal do estado também clicável; ranking com top 10; cartões da lista com nome científico, popular em cinza e tipo; pilha de fontes explícita. (O dono usa LibreWolf configurado para forçar JetBrains Mono em todos os sites: texto monoespaçado nas capturas dele é do navegador, não bug do app. Ignorar.)
- Pendente: a gaveta da lista cobre o estado no mapa (ajustar o enquadramento quando abre).

## Convenções
- Git: branch `main`. `node_modules`, `.venv`, logs e arquivos do banco ficam no `.gitignore`; o conteúdo do banco está em `db/backup/` e os dados brutos da API em `data/`.
- Commits terminam com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Respostas e textos da interface em português do Brasil.
