import { useEffect, useState } from "react";
import type { BrasilResumo, CategoriaCodigo, EstadoDetalhe, EstadoResumo } from "../shared/types.ts";
import { api } from "./api.ts";
import { MapView } from "./MapView.tsx";
import { BrasilPanel, EstadoPanel, Gaveta, type EscopoGaveta } from "./Panels.tsx";

export function App() {
  const [estados, setEstados] = useState<EstadoResumo[]>([]);
  const [uf, setUf] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<EstadoDetalhe | null>(null);
  const [biomaId, setBiomaId] = useState<number | null>(null);
  const [brasil, setBrasil] = useState<BrasilResumo | null>(null);
  // lista aberta por clique na legenda (estado/Brasil inteiro, já filtrada por categoria)
  const [filtroLegenda, setFiltroLegenda] = useState<CategoriaCodigo | null>(null);

  useEffect(() => { api.estados().then(setEstados); api.brasil().then(setBrasil); }, []);
  useEffect(() => {
    setDetalhe(null);
    setBiomaId(null);
    setFiltroLegenda(null);
    if (uf) api.estado(uf).then(setDetalhe);
  }, [uf]);

  const bioma = detalhe?.biomas.find((b) => b.id === biomaId) ?? null;

  const escolheBioma = (id: number | null) => { setFiltroLegenda(null); setBiomaId(id); };
  const escolheCategoria = (c: CategoriaCodigo) => { setBiomaId(null); setFiltroLegenda(c); };

  // o que a gaveta lista: bioma (clique no mapa/cartão), estado ou Brasil (clique na legenda)
  let escopo: EscopoGaveta | null = null;
  if (detalhe && bioma) escopo = { uf: detalhe.uf, titulo: `${bioma.nome} · ${detalhe.nome}`, biomaId: bioma.id, porCategoria: bioma.porCategoria, categoriaInicial: "" };
  else if (filtroLegenda && uf && detalhe) escopo = { uf, titulo: detalhe.nome, biomaId: null, porCategoria: detalhe.porCategoria, categoriaInicial: filtroLegenda };
  else if (filtroLegenda && !uf && brasil) escopo = { uf: null, titulo: "Brasil", biomaId: null, porCategoria: brasil.porCategoria, categoriaInicial: filtroLegenda };

  return (
    <div className="app">
      <MapView estados={estados} uf={uf} biomaId={biomaId} onEstado={setUf} onBioma={escolheBioma} />
      <aside className="painel">
        {uf ? (
          <EstadoPanel detalhe={detalhe} onVoltar={() => setUf(null)} onBioma={escolheBioma} biomaId={biomaId} onCategoria={escolheCategoria} />
        ) : (
          <BrasilPanel estados={estados} onEstado={setUf} onCategoria={escolheCategoria} />
        )}
      </aside>
      {escopo && <Gaveta escopo={escopo} onFechar={() => { setBiomaId(null); setFiltroLegenda(null); }} />}
    </div>
  );
}
