import type { CategoriaCodigo } from "../shared/types.ts";

// Uma "tela" é tudo que o usuário enxerga como lugar: estado, bioma, lista filtrada e ficha aberta.
export interface Tela {
  uf: string | null;
  biomaId: number | null;
  filtro: { categoria: CategoriaCodigo | ""; grupo: string } | null;
  fichaId: number | null;
}

export const TELA_INICIAL: Tela = { uf: null, biomaId: null, filtro: null, fichaId: null };

interface No<T> {
  valor: T;
  anterior: No<T> | null;
  proximo: No<T> | null;
}

// Lista duplamente encadeada com cursor: cada nó é uma tela visitada.
// Navegar para uma tela nova insere depois do cursor e descarta o que vinha à frente
// (igual ao histórico do navegador); voltar/avançar só movem o cursor.
export class Historico<T> {
  private atual: No<T>;
  private pos = 0;

  constructor(inicial: T) {
    this.atual = { valor: inicial, anterior: null, proximo: null };
  }

  get valor(): T { return this.atual.valor; }
  get indice(): number { return this.pos; }

  inserir(valor: T): void {
    const no: No<T> = { valor, anterior: this.atual, proximo: null };
    this.atual.proximo = no; // o ramo "futuro" antigo fica sem referência
    this.atual = no;
    this.pos++;
  }

  // anda pelos ponteiros até o índice pedido (ou até onde a lista alcança)
  irPara(indice: number): T {
    while (this.pos > indice && this.atual.anterior) { this.atual = this.atual.anterior; this.pos--; }
    while (this.pos < indice && this.atual.proximo) { this.atual = this.atual.proximo; this.pos++; }
    return this.atual.valor;
  }
}
