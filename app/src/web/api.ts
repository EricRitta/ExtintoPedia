import type { BrasilResumo, EspecieCard, FichaExtras, FichaLocal, EstadoDetalhe, EstadoResumo } from "../shared/types.ts";

async function get<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

export const api = {
  ficha: (id: number) => get<FichaLocal>(`/api/especies/${id}`),
  extras: (id: number) => get<FichaExtras>(`/api/especies/${id}/extras`),
  brasil: () => get<BrasilResumo>("/api/brasil"),
  estados: () => get<EstadoResumo[]>("/api/estados"),
  estado: (uf: string) => get<EstadoDetalhe>(`/api/estados/${uf}`),
  destaque: (uf: string, bioma: number) => get<EspecieCard | null>(`/api/estados/${uf}/biomas/${bioma}/destaque`),
  especies: (f: { uf?: string; bioma?: number | null; categoria?: string; grupo?: string; q?: string }) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v) p.set(k, String(v));
    return get<EspecieCard[]>(`/api/especies?${p}`);
  },
};
