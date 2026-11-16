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
