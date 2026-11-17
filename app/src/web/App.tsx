import { useEffect, useRef, useState } from "react";
import type { BrasilResumo, CategoriaCodigo, EstadoDetalhe, EstadoResumo } from "../shared/types.ts";
import { api } from "./api.ts";
import { MapView } from "./MapView.tsx";
import { BarraTopo } from "./BarraTopo.tsx";
import { Ficha } from "./Ficha.tsx";
import { Rodape } from "./Rodape.tsx";
import { Historico, TELA_INICIAL, type Tela } from "./historico.ts";
import { BrasilPanel, EstadoPanel, Gaveta, type EscopoGaveta } from "./Panels.tsx";

// identifica esta carga da página: os índices guardados no navegador só valem para a lista desta sessão
const SESSAO = Math.random().toString(36).slice(2);

export function App() {
  const [estados, setEstados] = useState<EstadoResumo[]>([]);
  // a tela atual vem da lista encadeada de histórico (Historico), ligada ao voltar/avançar do navegador
  const hist = useRef<Historico<Tela>>(null as unknown as Historico<Tela>);
  if (!hist.current) hist.current = new Historico(TELA_INICIAL);
  const [tela, setTela] = useState<Tela>(TELA_INICIAL);
  const { uf, biomaId, filtro, fichaId } = tela;
  const [detalhe, setDetalhe] = useState<EstadoDetalhe | null>(null);
  // painel lateral: aberto no desktop, fechado no celular; abrir um estado o abre
  const [painelAberto, setPainelAberto] = useState(() => window.innerWidth > 900);
  const [brasil, setBrasil] = useState<BrasilResumo | null>(null);

  // navegar = inserir na lista + empilhar no navegador (o índice vai no state para o popstate achar o nó)
  const ir = (mudanca: Partial<Tela>) => {
    const nova = { ...hist.current.valor, ...mudanca };
    if (JSON.stringify(nova) === JSON.stringify(hist.current.valor)) return;
    hist.current.inserir(nova);
    history.pushState({ i: hist.current.indice, sessao: SESSAO }, "");
    setTela(nova);
  };

  useEffect(() => {
    api.estados().then(setEstados); api.brasil().then(setBrasil);
    history.replaceState({ i: 0, sessao: SESSAO }, "");
    // voltar/avançar do navegador só move o cursor da lista; entradas de antes de um recarregamento
    // (outra sessão) não têm nó na lista nova e caem na tela inicial
    const aoNavegar = (ev: PopStateEvent) => {
      const { i, sessao } = ev.state ?? {};
      setTela(hist.current.irPara(sessao === SESSAO && typeof i === "number" ? i : 0));
    };
    window.addEventListener("popstate", aoNavegar);
    return () => window.removeEventListener("popstate", aoNavegar);
  }, []);

  useEffect(() => {
    setDetalhe(null);
    if (!uf) return;
    setPainelAberto(true);
    let vivo = true;
    api.estado(uf).then((d) => vivo && setDetalhe(d));
    return () => { vivo = false; };
  }, [uf]);

  const bioma = detalhe?.biomas.find((b) => b.id === biomaId) ?? null;

  const escolheEstado = (u: string | null) => ir({ uf: u, biomaId: null, filtro: null, fichaId: null });
  const escolheBioma = (id: number | null) => ir({ filtro: null, biomaId: id });
  const escolheCategoria = (c: CategoriaCodigo) => ir({ biomaId: null, filtro: { categoria: c, grupo: "" } });
  const escolheGrupo = (g: string) => ir({ biomaId: null, filtro: { categoria: "", grupo: g } });
  const abreFicha = (id: number | null) => ir({ fichaId: id });

  // o que a gaveta lista: bioma (clique no mapa/cartão), estado ou Brasil (clique na legenda)
  let escopo: EscopoGaveta | null = null;
  if (detalhe && bioma) escopo = { uf: detalhe.uf, titulo: `${bioma.nome} · ${detalhe.nome}`, biomaId: bioma.id, porCategoria: bioma.porCategoria, categoriaInicial: "", grupoInicial: "" };
  else if (filtro && uf && detalhe) escopo = { uf, titulo: detalhe.nome, biomaId: null, porCategoria: detalhe.porCategoria, categoriaInicial: filtro.categoria, grupoInicial: filtro.grupo };
  else if (filtro && !uf && brasil) escopo = { uf: null, titulo: "Brasil", biomaId: null, porCategoria: brasil.porCategoria, categoriaInicial: filtro.categoria, grupoInicial: filtro.grupo };

  return (
    <div className={`app ${painelAberto ? "" : "sem-painel"}`}>
      <BarraTopo painelAberto={painelAberto} onAlternar={() => setPainelAberto((a) => !a)} />
      <div className="palco">
        <MapView estados={estados} uf={uf} biomaId={biomaId} painelAberto={painelAberto} onEstado={escolheEstado} onBioma={escolheBioma} />
        <aside className="painel">
          {uf ? (
            <EstadoPanel detalhe={detalhe} onVoltar={() => escolheEstado(null)} onBioma={escolheBioma} biomaId={biomaId} onCategoria={escolheCategoria} onGrupo={escolheGrupo} onFicha={abreFicha} />
          ) : (
            <BrasilPanel estados={estados} onEstado={escolheEstado} onCategoria={escolheCategoria} />
          )}
        </aside>
        {escopo && <Gaveta escopo={escopo} onFechar={() => ir({ biomaId: null, filtro: null })} onFicha={abreFicha} />}
        <Rodape total={brasil?.total ?? null} />
      </div>
      {fichaId !== null && <Ficha id={fichaId} onFechar={() => abreFicha(null)} />}
    </div>
  );
}
