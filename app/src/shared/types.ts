export type CategoriaCodigo = "EX" | "EW" | "RE" | "CR" | "EN" | "VU";
export type PorCategoria = Record<CategoriaCodigo, number>;

export interface Imagem {
  media: string; // URL
  thumb: string;
  autor: string | null;
  licenca: string | null;
  fonte: "salve" | "inaturalist";
  origem: string | null;
}

export interface EspecieCard {
  id: number;
  nome: string; // nome popular (ou científico, se não houver popular)
  temNomePopular: boolean;
  cientifico: string;
  categoria: CategoriaCodigo;
  grupo: string;
  imagem: Imagem | null;
}

export interface EstadoResumo {
  uf: string;
  nome: string;
  regiao: string;
  total: number;
  ameacadas: number; // CR+EN+VU
  porCategoria: PorCategoria;
}

export interface BiomaResumo {
  id: number;
  nome: string;
  total: number;
  porCategoria: PorCategoria;
  destaque: EspecieCard | null; // ameaçada aleatória, sempre com foto
}

export interface EstadoDetalhe extends EstadoResumo {
  porGrupo: { grupo: string; n: number }[];
  biomas: BiomaResumo[];
}

export interface Filtros {
  grupos: string[];
}

export interface BrasilResumo {
  total: number;
  ameacadas: number;
  porCategoria: PorCategoria;
}

// ---- ficha da espécie --------------------------------------------------------------------------
export interface FichaLocal {
  id: number;
  cientifico: string;
  autor: string | null;
  nome: string; // popular (ou científico, se não houver)
  temNomePopular: boolean;
  nomesComuns: string[];
  categoria: CategoriaCodigo;
  categoriaNome: string;
  grupo: string;
  taxonomia: { reino: string | null; filo: string | null; classe: string | null; ordem: string | null; familia: string | null; genero: string | null };
  criterio: string | null;
  possivelmenteExtinta: boolean;
  justificativa: string | null;
  endemicaBrasil: boolean | null;
  migratoria: boolean | null;
  tendencia: string | null;
  periodoAvaliacao: string | null;
  doi: string | null;
  ameacas: string[]; // linhas do CSV, ex.: "1.1 - Expansão urbana"
  planoAcao: string | null;
  estados: string[]; // siglas
  biomas: string[];
  imagem: Imagem | null;
}

/** Strings de texto livre vêm como HTML já sanitizado pelo servidor. */
export interface FichaExtras {
  distribuicaoGlobal: string | null;
  distribuicaoNacional: string | null;
  bacias: string | null;
  mapa: string | null; // URL local (/mapas/...)
  mapaLegenda: string | null;
  historia: {
    descricao: string | null;
    habitat: string | null;
    alimentacao: string | null;
    interacoes: string | null;
    reproducao: { intervaloNascimento: string | null; gestacao: string | null; prole: string | null } | null;
  };
  populacao: { tempoGeracional: string | null; tendencia: string | null; genetica: string | null; observacoes: string | null };
  usos: string | null;
  citacao: string | null;
  autoria: string | null;
  buscadoEm: string;
}
