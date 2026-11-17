# ExtintoPedia

Mapa interativo das espécies **ameaçadas e extintas do Brasil**. Você começa no mapa do país, clica num estado, depois num bioma, e chega à lista de espécies (com foto) e à ficha de cada uma.

Os dados vêm do **SALVE**, o sistema de avaliação de espécies do ICMBio. O projeto roda só em `localhost`, é um trabalho de faculdade e não é feito para produção.

## O que dá para fazer

1. **Brasil:** os estados são coloridos pelo número de espécies. A legenda (EX, CR, EN…) é clicável e abre a lista filtrada por categoria.
2. **Estado:** o mapa dá zoom e mostra os biomas recortados dentro do estado. Cada bioma tem um animal sorteado (sempre com foto), e dá para sortear outro.
3. **Bioma ou legenda:** abre uma gaveta com a lista de espécies e filtros (categoria, tipo de animal, busca por nome).
4. **Espécie:** a ficha mostra taxonomia, critério de avaliação, ameaças, distribuição, história natural, população e usos.
5. **Botão voltar do navegador:** anda pelas telas que você visitou (veja [Histórico de navegação](#histórico-de-navegação-lista-encadeada)).

As categorias seguem a IUCN: **EX** extinta, **EW** extinta na natureza, **RE** regionalmente extinta, **CR** criticamente em perigo, **EN** em perigo, **VU** vulnerável.

## Como rodar

Só precisa de **Docker** ou **Podman** (não precisa de Node nem de Postgres instalados).

```
docker compose up -d --build      # ou: podman compose up -d --build
```

Abra http://localhost:5173.

- Na primeira vez, o Postgres **restaura sozinho** o banco a partir de `db/backup/extintopedia.sql.gz`.
- Mudou código em `app/`? Rode o comando de novo (o front é compilado dentro do build da imagem).
- Para zerar o banco e restaurar do backup: `docker compose down -v` e depois o `up` de novo.
- Dev com hot reload (opcional, precisa de Node no host): `docker compose up -d db && cd app && npm install && npm run dev`. Não rode junto com o container `app` (mesma porta).

## Como os dados se movem

```
SALVE-API (ICMBio) ──► scripts Python ──► Postgres + PostGIS ──► API Fastify ──► React + MapLibre
  fichas, fotos          scripts/            espécies, estados,     /api/...        mapa, lista, ficha
                                             biomas, imagens
IBGE (shapefiles) ───► carregar_geo.py ───► GeoJSON em app/public/geo/
iNaturalist (fotos) ─► fotos_inaturalist.py (só para quem ficou sem foto no SALVE)
```

**Pipeline (feito uma vez, resultado já está no backup do banco).** Ordem de execução do zero:

1. `docker compose up -d` e `docker exec -i extintopedia-db psql -U extinto -d extintopedia < db/schema.sql`
2. `data/ameacadas.csv`: exportação CSV da busca por categorias EX..VU (ver `api_tmp/NOTAS_API.md`)
3. `.venv/bin/python scripts/coletar_fichas.py`: fichas e fotos do SALVE (gera imagens de 600 px e 160 px)
4. `.venv/bin/python scripts/fotos_inaturalist.py`: foto de reserva (só licença aberta) para quem ficou sem
5. `.venv/bin/python scripts/carregar_db.py`: carrega espécies, estados, biomas e imagens
6. `.venv/bin/python scripts/cruzar_estado_bioma.py` e `python3 scripts/carregar_cruzamento.py`: cruzamento estado × bioma
7. `.venv/bin/python scripts/carregar_geo.py`: estados e biomas do IBGE → PostGIS → GeoJSON

O Python do pipeline roda no host (`.venv`, só Pillow). Os IDs de ficha da API **expiram no mesmo dia**, então o passo 3 deve rodar de uma vez.

**Em uso (cada clique):** a tela chama a API local, que consulta o Postgres. Os números do mapa, as listas e os sorteios vêm todos do banco.

**Ficha da espécie em duas camadas:**
1. Dados locais do banco, instantâneos.
2. Seções extras da SALVE-API (distribuição, história natural, população, usos, citação), buscadas **sob demanda** quando você abre a ficha e guardadas em cache na tabela `ficha_extra`. Assim não é preciso baixar as ~15 mil fichas. O mapa de distribuição também é baixado e guardado.

O HTML que vem da SALVE é limpo no servidor (lista branca de tags, sem scripts nem atributos) antes de ser guardado ou exibido.

## Sobre a SALVE-API

API pública e sem autenticação do ICMBio: https://salve.icmbio.gov.br/salve-api/public/. Notas e testes em [`api_tmp/NOTAS_API.md`](api_tmp/NOTAS_API.md). Pontos que não são óbvios:

- A busca (`search`) precisa de pelo menos um filtro real; sem filtro dá HTTP 500.
- IDs de ficha e de foto são criptografados e **expiram no mesmo dia**. A chave estável é o **nome científico**.
- Fotos às vezes vêm sem arquivo (404) ou em `.tif` (415). Tratamos como "sem foto".
- O filtro de estado + bioma da API é só um "E" entre listas, não um cruzamento geográfico (veja as limitações).

## Histórico de navegação (lista encadeada)

O botão voltar do navegador não deve tirar você do site. Como o app é uma página só, ele implementa o próprio histórico com uma **lista duplamente encadeada** em [`app/src/web/historico.ts`](app/src/web/historico.ts):

- Cada **nó** guarda uma `Tela`: estado, bioma, filtro da lista e ficha aberta, com ponteiros `anterior` e `proximo`.
- Um **cursor** marca o nó atual. Navegar para uma tela nova **insere** o nó depois do cursor e descarta o que vinha à frente (como o histórico de um navegador). Voltar e avançar só movem o cursor.
- O `App.tsx` liga a lista ao navegador: cada navegação faz `history.pushState` com o índice do nó, e o evento `popstate` (botão voltar/avançar) move o cursor e redesenha a tela do nó atual. A lista é a fonte de verdade da navegação.
- Entradas do navegador de antes de um recarregamento (F5) não têm nó na lista nova e levam à tela inicial.

## Limitações e decisões

- **Escopo:** só espécies **extintas e ameaçadas** (1.393). As ~16 mil avaliadas pelo SALVE (LC, NT, DD…) não estão no banco. Todo total e ranking do app refere-se a esse recorte.
- **Estado × bioma é aproximado.** O SALVE informa as espécies por estado e por bioma separadamente. O app cruza os dois filtrando pelos biomas que existem de fato no estado (polígonos do IBGE). A geometria é exata, o dado de ocorrência não.
- **Fotos:** 801 das 1.393 espécies (580 do SALVE e 221 do iNaturalist, só com licença aberta). As 592 sem foto aparecem na lista com o emoji do grupo. Autor e licença de cada foto ficam no banco e aparecem no app.
- O **Sistema Costeiro-Marinho** não tem polígono (o shapefile só tem os 6 biomas terrestres): aparece só como cartão nos estados litorâneos.
- **Fora da ficha, por serem pesadas:** ações de conservação e referências bibliográficas.
- A API valida a entrada (ids, UF, categoria, tamanho da busca) e devolve 400 em vez de erro do banco. O download de mapas só aceita https no domínio da SALVE, até 5 MB.

## Estrutura

```
app/
  src/server/   API Fastify (index.ts), ficha sob demanda (ficha.ts), limpeza de HTML (sanitize.ts)
  src/web/      React: App, MapView (MapLibre), Panels, Ficha, historico.ts (lista encadeada)
  src/shared/   tipos compartilhados entre front e API
  public/geo/   GeoJSON de estados e biomas
db/             schema.sql e backup/ (dump que o Postgres restaura sozinho)
scripts/        pipeline em Python (SALVE, iNaturalist, IBGE → banco)
data/           dados brutos, imagens geradas, shapefile do IBGE
api_tmp/        notas e testes da SALVE-API
docker-compose.yml   banco (PostGIS) + app, tudo em container
```

**Stack:** TypeScript (Fastify, React, Vite, MapLibre GL, sem mapa-base: só polígonos do IBGE), PostgreSQL 17 + PostGIS, Python no pipeline.

## Fontes e licenças dos dados

O código e os dados têm origens diferentes:

- **Espécies, fichas e mapas de distribuição:** [SALVE / ICMBio](https://salve.icmbio.gov.br). Consulte os termos de uso do SALVE antes de reutilizar.
- **Fotos:** do SALVE (créditos ao fotógrafo e ao ICMBio) e do [iNaturalist](https://www.inaturalist.org) (cada foto com a sua licença aberta; o autor e a licença aparecem no app).
- **Limites de estados e biomas:** [IBGE](https://www.ibge.gov.br), com citação da fonte.

Esses dados e imagens **não** estão cobertos pela licença do código e seguem as licenças e os termos das fontes acima.

## Como citar

Dados de espécies: ICMBio, Sistema de Avaliação do Risco de Extinção da Biodiversidade (SALVE), acessado em novembro de 2026.
