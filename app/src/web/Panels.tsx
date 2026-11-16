import { useEffect, useState } from "react";
import type { BiomaResumo, BrasilResumo, CategoriaCodigo, EspecieCard, EstadoDetalhe, EstadoResumo, PorCategoria } from "../shared/types.ts";
import { api } from "./api.ts";
import { CATEGORIAS, COR_BIOMA, COR_CAT, ICONE_GRUPO, NOME_CAT } from "./constantes.ts";

// ---- peças pequenas ------------------------------------------------------------------------------
function BarraCategorias({ pc }: { pc: PorCategoria }) {
  const total = CATEGORIAS.reduce((a, c) => a + pc[c.cod], 0) || 1;
  return (
    <div className="barra" title={CATEGORIAS.map((c) => `${c.nome}: ${pc[c.cod]}`).join("\n")}>
      {CATEGORIAS.filter((c) => pc[c.cod] > 0).map((c) => (
        <span key={c.cod} style={{ width: `${(pc[c.cod] / total) * 100}%`, background: c.cor }} />
      ))}
    </div>
  );
}

function Legenda({ pc, onCategoria }: { pc: PorCategoria; onCategoria?: (c: CategoriaCodigo) => void }) {
  return (
    <ul className="legenda">
      {CATEGORIAS.filter((c) => pc[c.cod] > 0).map((c) => (
        <li key={c.cod} className={onCategoria ? "clicavel" : ""} onClick={() => onCategoria?.(c.cod)} title={onCategoria ? `Ver espécies: ${c.nome}` : undefined}>
          <span><i style={{ background: c.cor }} />{c.nome}</span><b>{pc[c.cod]}</b>
        </li>
      ))}
    </ul>
  );
}

function Selo({ cod }: { cod: CategoriaCodigo }) {
  return <span className="selo" style={{ background: COR_CAT[cod] }} title={NOME_CAT[cod]}>{cod}</span>;
}

function Foto({ e, tam }: { e: EspecieCard; tam: "media" | "thumb" }) {
  if (!e.imagem) return <div className="foto vazia" title="Sem foto disponível">{ICONE_GRUPO[e.grupo] ?? "🐾"}</div>;
  const i = e.imagem;
  const credito = `Foto: ${i.autor || "ICMBio/SALVE"}${i.licenca ? ` (${i.licenca.toUpperCase()})` : ""} · ${i.fonte === "salve" ? "SALVE/ICMBio" : "iNaturalist"}`;
  return <img className="foto" src={i[tam]} alt={e.nome} title={credito} loading="lazy" />;
}

const nomeDe = (e: EspecieCard) => (e.temNomePopular ? <span>{e.nome}</span> : <em>{e.nome}</em>);

// ---- painel inicial ------------------------------------------------------------------------------
export function BrasilPanel({ estados, onEstado, onCategoria }: { estados: EstadoResumo[]; onEstado: (uf: string) => void; onCategoria: (c: CategoriaCodigo) => void }) {
  const [br, setBr] = useState<BrasilResumo | null>(null);
  useEffect(() => { api.brasil().then(setBr); }, []);
  const ranking = [...estados].sort((a, b) => b.ameacadas - a.ameacadas).slice(0, 10);
  return (
    <div className="conteudo">
      <h1>ExtintoPedia</h1>
      <p className="sub">Espécies ameaçadas e extintas do Brasil, por estado e bioma. Fonte: SALVE / ICMBio.</p>
      {br && (
        <>
          <p className="sub"><b>{br.total}</b> espécies no total · <b>{br.ameacadas}</b> ameaçadas</p>
          <BarraCategorias pc={br.porCategoria} />
          <Legenda pc={br.porCategoria} onCategoria={onCategoria} />
        </>
      )}
      <p className="dica">Clique em um estado do mapa.</p>
      <div className="escala"><span>menos</span><i /><span>mais espécies</span></div>
      <h3>Top 10 estados com mais espécies ameaçadas</h3>
      <ol className="ranking">
        {ranking.map((e) => (
          <li key={e.uf} onClick={() => onEstado(e.uf)}>
            <span>{e.nome}</span><b>{e.ameacadas}</b>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---- painel do estado ----------------------------------------------------------------------------
export function EstadoPanel({ detalhe, onVoltar, onBioma, biomaId, onCategoria, onGrupo }: {
  detalhe: EstadoDetalhe | null; onVoltar: () => void; onBioma: (id: number) => void; biomaId: number | null; onCategoria: (c: CategoriaCodigo) => void; onGrupo: (g: string) => void;
}) {
  if (!detalhe) return <div className="conteudo"><button className="voltar" onClick={onVoltar}>← Brasil</button><p>Carregando…</p></div>;
  return (
    <div className="conteudo">
      <button className="voltar" onClick={onVoltar}>← Brasil</button>
      <h1>{detalhe.nome}</h1>
      <p className="sub">{detalhe.regiao} · <b>{detalhe.total}</b> espécies ameaçadas ou extintas</p>
      <BarraCategorias pc={detalhe.porCategoria} />
      <Legenda pc={detalhe.porCategoria} onCategoria={onCategoria} />
      <h3>Por tipo de animal</h3>
      <ul className="grupos">
        {detalhe.porGrupo.map((g) => (
          <li key={g.grupo} className="clicavel" onClick={() => onGrupo(g.grupo)} title={`Ver espécies: ${g.grupo}`}><span>{ICONE_GRUPO[g.grupo]} {g.grupo}</span><b>{g.n}</b></li>
        ))}
      </ul>
      <h3>Biomas</h3>
      {detalhe.biomas.map((b) => <CartaoBioma key={b.id} uf={detalhe.uf} b={b} ativo={b.id === biomaId} onAbrir={() => onBioma(b.id)} />)}
    </div>
  );
}

function CartaoBioma({ uf, b, ativo, onAbrir }: { uf: string; b: BiomaResumo; ativo: boolean; onAbrir: () => void }) {
  const [d, setD] = useState(b.destaque);
  const sortear = (ev: React.MouseEvent) => { ev.stopPropagation(); api.destaque(uf, b.id).then((x) => x && setD(x)); };
  return (
    <div className={`bioma ${ativo ? "ativo" : ""}`} onClick={onAbrir}>
      <div className="bioma-topo">
        <i className="ponto" style={{ background: COR_BIOMA[b.nome] ?? "#999" }} />
        <b>{b.nome}</b><span>{b.total} espécies</span>
      </div>
      <BarraCategorias pc={b.porCategoria} />
      {d ? (
        <div className="destaque">
          <Foto e={d} tam="thumb" />
          <div>
            <small>Em perigo neste bioma</small>
            <div className="nome">{nomeDe(d)} <Selo cod={d.categoria} /></div>
            <small>{d.grupo}</small>
          </div>
          <button title="Sortear outro" onClick={sortear}>🎲</button>
        </div>
      ) : <small className="sem">Nenhuma espécie ameaçada com foto neste bioma.</small>}
      <small className="ver">Ver lista →</small>
    </div>
  );
}

// ---- gaveta com a lista --------------------------------------------------------------------------
export interface EscopoGaveta {
  uf: string | null; // null = Brasil inteiro
  titulo: string;
  biomaId: number | null; // null = estado inteiro (ou Brasil)
  porCategoria: PorCategoria;
  categoriaInicial: CategoriaCodigo | "";
  grupoInicial: string;
}

export function Gaveta({ escopo, onFechar }: { escopo: EscopoGaveta; onFechar: () => void }) {
  const [categoria, setCategoria] = useState<string>(escopo.categoriaInicial);
  const [grupo, setGrupo] = useState(escopo.grupoInicial);
  const [q, setQ] = useState("");
  const [lista, setLista] = useState<EspecieCard[] | null>(null);

  // novo escopo (outro bioma, outro filtro vindo da legenda): reinicia os filtros
  useEffect(() => { setCategoria(escopo.categoriaInicial); setGrupo(escopo.grupoInicial); setQ(""); }, [escopo.uf, escopo.biomaId, escopo.categoriaInicial, escopo.grupoInicial]);
  useEffect(() => {
    setLista(null);
    const t = setTimeout(() => {
      api.especies({ uf: escopo.uf ?? undefined, bioma: escopo.biomaId, categoria, grupo, q: q.trim() }).then(setLista);
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [escopo.uf, escopo.biomaId, categoria, grupo, q]);

  return (
    <section className="gaveta">
      <header>
        <div><h2>{escopo.titulo}</h2><small>{lista ? `${lista.length} ${lista.length === 1 ? "espécie" : "espécies"}` : "…"}</small></div>
        <button onClick={onFechar} aria-label="Fechar">✕</button>
      </header>
      <div className="filtros">
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="">Todas as categorias</option>
          {CATEGORIAS.filter((c) => escopo.porCategoria[c.cod] > 0).map((c) => <option key={c.cod} value={c.cod}>{c.nome} ({escopo.porCategoria[c.cod]})</option>)}
        </select>
        <select value={grupo} onChange={(e) => setGrupo(e.target.value)}>
          <option value="">Todos os tipos de animal</option>
          {Object.keys(ICONE_GRUPO).map((g) => <option key={g} value={g}>{ICONE_GRUPO[g]} {g}</option>)}
        </select>
        <input placeholder="Buscar nome…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grade">
        {lista?.map((e) => (
          <article key={e.id} className="especie">
            <div className="moldura">
              <Foto e={e} tam="media" />
              <Selo cod={e.categoria} />
            </div>
            <div className="info">
              <div className="cientifico">{e.cientifico}</div>
              {e.temNomePopular && <div className="popular">{e.nome}</div>}
              <div className="tipo">{ICONE_GRUPO[e.grupo]} {e.grupo}</div>
            </div>
          </article>
        ))}
        {lista && !lista.length && <p className="sem">Nada encontrado com esses filtros.</p>}
      </div>
    </section>
  );
}

export type { EstadoDetalhe };
