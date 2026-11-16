import type { CategoriaCodigo } from "../shared/types.ts";

export const CATEGORIAS: { cod: CategoriaCodigo; nome: string; cor: string }[] = [
  { cod: "EX", nome: "Extinta", cor: "#222222" },
  { cod: "EW", nome: "Extinta na natureza", cor: "#6a3d9a" },
  { cod: "RE", nome: "Regionalmente extinta", cor: "#8c6d46" },
  { cod: "CR", nome: "Criticamente em perigo", cor: "#c0392b" },
  { cod: "EN", nome: "Em perigo", cor: "#e67e22" },
  { cod: "VU", nome: "Vulnerável", cor: "#d4a900" },
];
export const COR_CAT = Object.fromEntries(CATEGORIAS.map((c) => [c.cod, c.cor])) as Record<CategoriaCodigo, string>;
export const NOME_CAT = Object.fromEntries(CATEGORIAS.map((c) => [c.cod, c.nome])) as Record<CategoriaCodigo, string>;

export const COR_BIOMA: Record<string, string> = {
  "Amazônia": "#2e7d32",
  "Caatinga": "#c9a227",
  "Cerrado": "#b9824a",
  "Mata Atlântica": "#00796b",
  "Pampa": "#8bc34a",
  "Pantanal": "#1e88e5",
  "Sistema Costeiro-Marinho": "#26a0c9",
  "Desconhecido": "#9e9e9e",
};

export const ICONE_GRUPO: Record<string, string> = {
  "Mamíferos": "🐾", "Aves": "🐦", "Répteis": "🦎", "Anfíbios": "🐸",
  "Peixes Continentais": "🐟", "Peixes Marinhos (ósseos)": "🐠", "Tubarões e Raias": "🦈",
  "Invertebrados Terrestres": "🐛", "Invertebrados de Água Doce": "🦐", "Invertebrados Marinhos": "🦀",
};
