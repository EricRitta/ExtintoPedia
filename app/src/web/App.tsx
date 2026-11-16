import { useEffect, useState } from "react";
import type { EstadoDetalhe, EstadoResumo } from "../shared/types.ts";
import { api } from "./api.ts";
import { MapView } from "./MapView.tsx";
import { BrasilPanel, EstadoPanel, Gaveta } from "./Panels.tsx";

export function App() {
  const [estados, setEstados] = useState<EstadoResumo[]>([]);
  const [uf, setUf] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<EstadoDetalhe | null>(null);
  const [biomaId, setBiomaId] = useState<number | null>(null);

  useEffect(() => { api.estados().then(setEstados); }, []);
  useEffect(() => {
    setDetalhe(null);
    setBiomaId(null);
    if (uf) api.estado(uf).then(setDetalhe);
  }, [uf]);

  const bioma = detalhe?.biomas.find((b) => b.id === biomaId) ?? null;

  return (
    <div className="app">
      <MapView estados={estados} uf={uf} biomaId={biomaId} onEstado={setUf} onBioma={setBiomaId} />
      <aside className="painel">
        {uf ? (
          <EstadoPanel detalhe={detalhe} onVoltar={() => setUf(null)} onBioma={setBiomaId} biomaId={biomaId} />
        ) : (
          <BrasilPanel estados={estados} onEstado={setUf} />
        )}
      </aside>
      {detalhe && bioma && <Gaveta uf={detalhe.uf} estado={detalhe.nome} bioma={bioma} grupos={detalhe.porGrupo.map((g) => g.grupo)} onFechar={() => setBiomaId(null)} />}
    </div>
  );
}
