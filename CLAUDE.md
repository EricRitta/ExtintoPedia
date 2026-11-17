# ExtintoPedia

Mapa interativo das espécies ameaçadas e extintas do Brasil (fonte: SALVE/ICMBio). Só roda em localhost: nada de complexidade de produção.
Fluxo da tela: Brasil (cor = nº de espécies) → clica no estado (zoom, biomas recortados, animal aleatório por bioma) → clica no bioma (lista com filtros). Clicar numa categoria da legenda (Brasil ou estado) abre a lista filtrada.
Regra do projeto: os animais aparecem com imagem. Cartões do mapa/bioma usam nome popular; nos cartões da lista, o científico vem em destaque e o popular em cinza abaixo.

## Como rodar
- **Tudo em Docker (jeito padrão, sem `node_modules` no host):** `docker compose up -d --build` → http://localhost:5173. Sobe o banco (PostGIS, porta 5433, `extinto`/`extintopedia`) e o app (um container só: Fastify serve a API e o front já compilado; porta 3001 interna, publicada como 5173). Com o volume do banco vazio (1ª vez ou `docker compose down -v`), o Postgres **restaura sozinho** `db/backup/extintopedia.sql.gz` (montado em `/docker-entrypoint-initdb.d`). Mudou código do `app/`? `docker compose up -d --build`. `./data` é montado em `/srv/data` (imagens e mapas; a API grava mapas lá).
- Postgres: **só em Docker** (nunca instalar local). O healthcheck usa `-h 127.0.0.1` de propósito: assim o banco só fica "healthy" depois da restauração.
- Dev com hot reload (opcional, precisa de `node_modules` no host): `docker compose up -d db && cd app && npm install && npm run dev` → http://localhost:5173 (Vite) com API em :3001. Não rode junto com o container `app` (mesma porta 5173).
- Python do pipeline: `.venv/bin/python` (Pillow, pyshp), roda no host. Ordem dos scripts: ver `README.md`.
- Restaurar na mão (banco já existente): `scripts/restaurar_db.sh`. Refazer o backup depois de mudanças no banco: `docker exec extintopedia-db pg_dump -U extinto -d extintopedia --no-owner | gzip -9 > db/backup/extintopedia.sql.gz`.

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

## ⚠ Escopo dos dados (não esquecer)
- **Só foram puxadas as espécies EXTINTAS e AMEAÇADAS** (EX, EW, RE, CR, EN, VU: 1.393). As ~16 mil avaliadas do SALVE (LC, NT, DD, NA…) **não** estão no banco. Qualquer total, ranking ou "espécies do estado" no app refere-se só a esse recorte. Ampliar para todas é decisão futura.

## Ficha da espécie (clique no cartão): decisões
- Ficha em duas camadas: (1) dados locais do banco, instantâneo; (2) seções extras da SALVE-API buscadas **sob demanda** e guardadas em cache (tabela `ficha_extra`, chave = nome científico, sobrevive a recargas do banco). Nada de baixar todas as fichas em lote (~170 KB/espécie, ~200 MB e 15 mil chamadas no total).
- Seções extras usadas: `header` (citação, autoria), `distribution`, `naturalHistory`, `population`, `uses`.
- **Ficam DE FORA por enquanto (pesadas; reavaliar depois): `conservation` (Ações de conservação, 57–74 KB/ficha, mais da metade da ficha) e `bibliographicReferences` (Referências, ~30 KB).** Também fora: `research`, `threats` detalhado (a lista de ameaças local vem do CSV).
- O HTML da API é sanitizado no servidor (lista branca de tags) antes de guardar/exibir.

## Interface: feito e pendente
- Feito: estados e biomas exportados com a mesma tolerância (`TOL` em `scripts/carregar_geo.py`) para as bordas alinharem; legenda clicável (abre a lista já filtrada por categoria, no Brasil ou no estado); lista de tipos de animal do estado também clicável; ranking com top 10; cartões da lista com nome científico, popular em cinza e tipo; pilha de fontes explícita. (O dono usa LibreWolf configurado para forçar JetBrains Mono em todos os sites: texto monoespaçado nas capturas dele é do navegador, não bug do app. Ignorar.)
- Feito: **ficha da espécie** (clique em cartão da lista ou no animal em destaque do bioma): `app/src/web/Ficha.tsx` + rotas `/api/especies/:id` (local) e `/api/especies/:id/extras` (SALVE sob demanda + cache `ficha_extra`; mapas de distribuição baixados em `data/mapas/`).
- Feito: gaveta da lista vai do topo à base da tela (margem 12 px), 2 colunas no celular; botão "← Voltar para o Brasil" escuro, largo e fixo (sticky) no topo do painel do estado; enquadramento do mapa reserva o painel à direita (desktop) ou embaixo (≤900 px).
- Feito: **barra superior** (`BarraTopo.tsx`: arara `app/public/logo.png` + nome "EXTINTO" (verde #67955f) "PÉDIA" (preto) em texto/CSS, como em `prints/logo-exemplo.png`) com hambúrguer à direita que abre/fecha o painel lateral (aberto por padrão no desktop, fechado no celular; clicar num estado o abre sozinho; o mapa e a gaveta reenquadram). **Rodapé flutuante** (`Rodape.tsx`): seta no centro embaixo, sobe a folha "Sobre" (dados, recorte, aviso do cruzamento aproximado, mapas IBGE, fotos, como citar, GitHub). Créditos do mapa saíram do canto do MapLibre e ficam no rodapé.
- Pendente: no desktop a gaveta cobre o estado no mapa quando abre (só a faixa do painel direito fica livre).

## Convenções
- Git: branch `main`. `node_modules`, `.venv`, logs e arquivos do banco ficam no `.gitignore`; o conteúdo do banco está em `db/backup/` e os dados brutos da API em `data/`.
- Commits terminam com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Respostas e textos da interface em português do Brasil.
