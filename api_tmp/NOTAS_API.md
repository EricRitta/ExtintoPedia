# SALVE-API (ICMBio) — notas de exploração (2026-11-16)

Base: https://salve.icmbio.gov.br/salve-api/   (versão v1.3.1u)
Docs oficiais (HTML): https://salve.icmbio.gov.br/salve-api/public/   (cópia em docs.html / docs.txt)
Tudo é GET, JSON: {msg, status, data, pagination, ...}. Sem autenticação. Cache de 60 min no servidor.
O site principal (salve.icmbio.gov.br/) está atrás do Cloudflare; a API não.

## Correção sobre o modelo suposto
O caminho certo é `/public/search` (e não `/public/search/search`, que funciona por acaso).
`categoriaIds=1` NÃO é uma categoria IUCN: retorna data=null. IDs válidos vêm de `/public/selectOptions`
(categorias IUCN: 127=EX 128=EW 129=RE 130=CR 131=EN 132=VU 133=NT 134=LC 135=DD 136=NA).

## Endpoints úteis
- totalNumbers: 15974 avaliadas, 15237 com ficha publicada, 1383 ameaçadas (16/11/2026)
- selectOptions: ids de taxonGroups, regions, categories, states, biomas, groups, threats, uses, hydrographicBasin
- search: filtros q, categoriaIds, grupoIds, regiaoIds, estadoIds, biomaIds, threatened, publicada, ...
  - paginação: paginationPageSize, paginationPageNumber (total vem em pagination.paginationTotalRecords/TotalPages)
  - SEM filtro, ou só com threatened/paginationPageSize => HTTP 500. Precisa de ao menos q/categoriaIds/grupoIds/etc.
  - threatened=S funciona combinado com outro filtro (ex.: grupoIds=1262&threatened=S => 104 mamíferos)
  - categoriaIds=127..132 (EX..VU) => 1393 registros (extintas + ameaçadas)
  - consultas grandes são lentas (categoriaIds=134 levou ~21s); usar paginationPageSize pequeno/moderado
  - campos de cada registro: id_ficha (AES, vale só no dia), nm_cientifico (HTML com <i>), no_comum,
    ds_grupo_salve, cd_categoria_final, de_categoria_final_completa, no_bioma, sg_estado, de_periodo_avaliacao,
    cd_situacao_ficha, st_possivelmente_extinta, ds_doi, dt_fim_avaliacao ...
- fichaHtml?idFicha=ID&section=header|taxonomicClassification|distribution|naturalHistory|population|threats|uses|conservation|research|bibliographicReferences|authors
- fichaPdf/{id}: PDF completo (~4,6 MB para Puma concolor)
- search?...&export=row => retorna pid; job/{pid} => downloadUrl; download?fileName=... => CSV (testado, funciona)
- speciePhoto/{id}/{full|small|thumb}

## Atenção para a indexação
- IDs de ficha são criptografados e só valem no mesmo dia: reindexar usando nm_cientifico como chave estável, e re-buscar o id_ficha quando for pegar detalhes.
- Para baixar tudo, a rota mais eficiente provavelmente é export=row (CSV) por grupo/categoria, em vez de paginar milhares de páginas.

## Imagens (testado)
- A foto vem em `fichaHtml?idFicha=ID&section=header` -> data.photo {authorName, diskFileName, fileName, url}
- `url` termina em `/full` (2042x3149, 3,5 MB no Puma). Trocar o sufixo por `/small` (162x250) ou `/thumb` (42x64); sem sufixo = small.
- Salvos em imagens/puma_concolor_{full,small,thumb}.jpg. Guardar authorName (crédito do fotógrafo) junto da imagem no banco.
- O id embutido na URL da foto também é criptografado: baixar a imagem na mesma execução em que a ficha for lida.
