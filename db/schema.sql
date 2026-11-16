-- ExtintoPedia: espécies ameaçadas/extintas do Brasil (fonte: SALVE / ICMBio)
BEGIN;

DROP TABLE IF EXISTS imagem, especie_estado_bioma, especie_bioma, especie_estado, especie, estado, bioma, grupo, categoria CASCADE;

CREATE TABLE categoria (
    codigo   text PRIMARY KEY,           -- EX, EW, RE, CR, EN, VU
    nome     text NOT NULL,
    ameacada boolean NOT NULL,           -- CR/EN/VU
    ordem    int NOT NULL                -- gravidade (menor = mais grave)
);

CREATE TABLE grupo  (id serial PRIMARY KEY, nome text UNIQUE NOT NULL);
CREATE TABLE bioma  (id serial PRIMARY KEY, nome text UNIQUE NOT NULL);
CREATE TABLE estado (
    sigla  char(2) PRIMARY KEY,
    nome   text UNIQUE NOT NULL,
    regiao text NOT NULL
);

CREATE TABLE especie (
    id                    serial PRIMARY KEY,
    nome_cientifico       text UNIQUE NOT NULL,   -- chave estável (os IDs da API expiram por dia)
    autor                 text,
    nome_comum            text,                   -- nome popular principal (1º da lista)
    nomes_comuns          text[] NOT NULL DEFAULT '{}',
    reino text, filo text, classe text, ordem_taxonomica text, familia text, genero text,
    grupo_id              int REFERENCES grupo(id),
    categoria             text NOT NULL REFERENCES categoria(codigo),
    possivelmente_extinta boolean NOT NULL DEFAULT false,
    criterio              text,
    justificativa         text,
    endemica_brasil       boolean,
    tendencia_populacional text,
    periodo_avaliacao     text,                   -- mm/aaaa
    doi                   text,
    migratoria            boolean,
    ameacas               text,
    acoes_conservacao     text,
    plano_acao            text
);
CREATE INDEX ON especie (categoria);
CREATE INDEX ON especie (grupo_id);

CREATE TABLE especie_estado (
    especie_id int NOT NULL REFERENCES especie(id) ON DELETE CASCADE,
    estado     char(2) NOT NULL REFERENCES estado(sigla),
    PRIMARY KEY (especie_id, estado)
);
CREATE TABLE especie_bioma (
    especie_id int NOT NULL REFERENCES especie(id) ON DELETE CASCADE,
    bioma_id   int NOT NULL REFERENCES bioma(id),
    PRIMARY KEY (especie_id, bioma_id)
);

-- Cruzamento exato estado x bioma (preenchido numa etapa à parte, via API: estadoIds + biomaIds)
CREATE TABLE especie_estado_bioma (
    especie_id int NOT NULL REFERENCES especie(id) ON DELETE CASCADE,
    estado     char(2) NOT NULL REFERENCES estado(sigla),
    bioma_id   int NOT NULL REFERENCES bioma(id),
    PRIMARY KEY (especie_id, estado, bioma_id)
);
CREATE INDEX ON especie_estado_bioma (estado, bioma_id);

-- Uma imagem por espécie (pode vir do SALVE ou de fonte aberta externa)
CREATE TABLE imagem (
    especie_id   int PRIMARY KEY REFERENCES especie(id) ON DELETE CASCADE,
    fonte        text NOT NULL,        -- 'salve' | 'inaturalist'
    autor        text,                 -- crédito do fotógrafo
    licenca      text,                 -- ex.: cc-by-nc (NULL no SALVE: usar créditos do ICMBio/SALVE)
    url_origem   text,                 -- página/arquivo original
    arquivo_media text NOT NULL,       -- relativo a data/imagens/
    arquivo_thumb text NOT NULL
);

INSERT INTO categoria VALUES
 ('EX','Extinta',false,1), ('EW','Extinta na Natureza',false,2), ('RE','Regionalmente Extinta',false,3),
 ('CR','Criticamente em Perigo',true,4), ('EN','Em Perigo',true,5), ('VU','Vulnerável',true,6);

INSERT INTO estado (sigla, nome, regiao) VALUES
 ('AC','Acre','Norte'),('AP','Amapá','Norte'),('AM','Amazonas','Norte'),('PA','Pará','Norte'),
 ('RO','Rondônia','Norte'),('RR','Roraima','Norte'),('TO','Tocantins','Norte'),
 ('AL','Alagoas','Nordeste'),('BA','Bahia','Nordeste'),('CE','Ceará','Nordeste'),('MA','Maranhão','Nordeste'),
 ('PB','Paraíba','Nordeste'),('PE','Pernambuco','Nordeste'),('PI','Piauí','Nordeste'),
 ('RN','Rio Grande do Norte','Nordeste'),('SE','Sergipe','Nordeste'),
 ('DF','Distrito Federal','Centro-Oeste'),('GO','Goiás','Centro-Oeste'),('MT','Mato Grosso','Centro-Oeste'),
 ('MS','Mato Grosso do Sul','Centro-Oeste'),
 ('ES','Espírito Santo','Sudeste'),('MG','Minas Gerais','Sudeste'),('RJ','Rio de Janeiro','Sudeste'),('SP','São Paulo','Sudeste'),
 ('PR','Paraná','Sul'),('RS','Rio Grande do Sul','Sul'),('SC','Santa Catarina','Sul');

COMMIT;

-- Cache das seções extras da ficha (buscadas sob demanda na SALVE-API). Chave = nome científico:
-- sobrevive a recargas do banco (os ids das espécies mudam, o nome não). Fora do DROP/TRUNCATE de propósito.
CREATE TABLE IF NOT EXISTS ficha_extra (
    nome_cientifico text PRIMARY KEY,
    conteudo        jsonb NOT NULL,
    buscado_em      timestamptz NOT NULL DEFAULT now()
);
