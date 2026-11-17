import { useEffect, useState } from "react";
import type { FichaExtras, FichaLocal } from "../shared/types.ts";
import { api } from "./api.ts";
import { COR_CAT, ICONE_GRUPO } from "./constantes.ts";

// links vêm do banco: só http(s) vira link clicável (nada de javascript:)
const linkSeguro = (url: string | null | undefined) => (url && /^https?:\/\//i.test(url) ? url : undefined);
const doiSeguro = (doi: string) => (/^10\.\d{4,9}\/\S+$/.test(doi) ? `https://doi.org/${encodeURI(doi)}` : undefined);

const sn = (v: boolean | null) => (v === null ? "—" : v ? "Sim" : "Não");

/** "11 - Clima" / "11.2 - Secas" (linhas repetidas do CSV) -> grupos {titulo, filhos} */
function agrupaAmeacas(linhas: string[]) {
  const grupos = new Map<string, { titulo: string; filhos: string[] }>();
  for (const l of new Set(linhas)) {
    const m = /^([\d.]+)\s*-\s*(.*)$/.exec(l);
    if (!m) continue;
    const topo = m[1].split(".")[0];
    const g = grupos.get(topo) ?? { titulo: "", filhos: [] };
    if (m[1].includes(".")) g.filhos.push(m[2]); else g.titulo = m[2];
    grupos.set(topo, g);
  }
  return [...grupos.entries()].sort((a, b) => Number(a[0]) - Number(b[0])).map(([, g]) => g);
}

const Html = ({ html }: { html: string | null }) => (html ? <div className="html" dangerouslySetInnerHTML={{ __html: html }} /> : null);
const Secao = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => <section className="f-secao"><h3>{titulo}</h3>{children}</section>;
const Sub = ({ titulo, html }: { titulo: string; html: string | null }) => (html ? <><h4>{titulo}</h4><Html html={html} /></> : null);

export function Ficha({ id, onFechar }: { id: number; onFechar: () => void }) {
  const [f, setF] = useState<FichaLocal | null>(null);
  const [x, setX] = useState<FichaExtras | null>(null);
  const [erroX, setErroX] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => { setF(null); api.ficha(id).then(setF); }, [id]);
  useEffect(() => {
    setX(null); setErroX(false);
    api.extras(id).then(setX).catch(() => setErroX(true));
  }, [id, tentativa]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onFechar]);

  const ameacas = f ? agrupaAmeacas(f.ameacas) : [];
  const credito = f?.imagem ? `Foto: ${f.imagem.autor || "ICMBio/SALVE"}${f.imagem.licenca ? ` (${f.imagem.licenca.toUpperCase()})` : ""} · ${f.imagem.fonte === "salve" ? "SALVE/ICMBio" : "iNaturalist"}` : "";

  return (
    <div className="f-fundo" onClick={onFechar}>
      <article className="f-janela" onClick={(e) => e.stopPropagation()}>
        <button className="f-fechar" onClick={onFechar} aria-label="Fechar">✕</button>
        {!f ? <p className="f-carregando">Carregando…</p> : (
          <>
            <header className="f-topo">
              <div className="f-foto">
                {f.imagem ? <img src={f.imagem.media} alt={f.nome} /> : <div className="f-semfoto">{ICONE_GRUPO[f.grupo] ?? "🐾"}<small>Sem foto disponível</small></div>}
                {credito && <small className="f-credito">{linkSeguro(f.imagem?.origem) ? <a href={linkSeguro(f.imagem?.origem)} target="_blank" rel="noreferrer">{credito}</a> : credito}</small>}
              </div>
              <div className="f-ident">
                <h2><em>{f.cientifico}</em></h2>
                {f.autor && <small className="f-autor">{f.autor}</small>}
                {f.temNomePopular && <div className="f-popular">{f.nomesComuns.join(", ")}</div>}
                <div className="f-selos">
                  <span className="selo grande" style={{ background: COR_CAT[f.categoria] }}>{f.categoria}</span>
                  <b>{f.categoriaNome}</b>
                  {f.possivelmenteExtinta && <span className="pex">possivelmente extinta</span>}
                </div>
                <div className="f-tipo">{ICONE_GRUPO[f.grupo]} {f.grupo}</div>
                <dl className="f-fatos">
                  {f.criterio && <><dt>Critério</dt><dd>{f.criterio}</dd></>}
                  {f.tendencia && <><dt>Tendência populacional</dt><dd>{f.tendencia}</dd></>}
                  <dt>Endêmica do Brasil</dt><dd>{sn(f.endemicaBrasil)}</dd>
                  <dt>Migratória</dt><dd>{sn(f.migratoria)}</dd>
                  {f.periodoAvaliacao && <><dt>Avaliação</dt><dd>{f.periodoAvaliacao}</dd></>}
                  {f.doi && <><dt>DOI</dt><dd>{doiSeguro(f.doi) ? <a href={doiSeguro(f.doi)} target="_blank" rel="noreferrer">{f.doi}</a> : f.doi}</dd></>}
                </dl>
              </div>
            </header>

            <div className="f-corpo">
              {f.justificativa && <Secao titulo="Por que está nesta categoria"><p className="texto">{f.justificativa}</p></Secao>}

              <Secao titulo="Onde vive">
                <div className="chips">{f.estados.map((u) => <span key={u} className="chip">{u}</span>)}</div>
                <div className="chips">{f.biomas.map((b) => <span key={b} className="chip bioma">{b}</span>)}</div>
                {x?.mapa && <figure className="f-mapa"><img src={x.mapa} alt={x.mapaLegenda ?? "Mapa de distribuição"} /><figcaption>{x.mapaLegenda}</figcaption></figure>}
                {x && <><Sub titulo="Distribuição global" html={x.distribuicaoGlobal} /><Sub titulo="Distribuição nacional" html={x.distribuicaoNacional} />
                  {x.bacias && <><h4>Bacias hidrográficas</h4><p className="texto">{x.bacias}</p></>}</>}
              </Secao>

              {!x && !erroX && <p className="f-carregando">Buscando mais detalhes no SALVE…</p>}
              {erroX && <p className="f-aviso">Não foi possível buscar os detalhes agora (SALVE indisponível). Estão aparecendo só os dados já salvos. <button onClick={() => setTentativa((t) => t + 1)}>Tentar de novo</button></p>}

              {x && (x.historia.descricao || x.historia.habitat || x.historia.alimentacao || x.historia.interacoes || x.historia.reproducao) && (
                <Secao titulo="História natural">
                  <Html html={x.historia.descricao} />
                  <Sub titulo="Habitat" html={x.historia.habitat} />
                  <Sub titulo="Alimentação" html={x.historia.alimentacao} />
                  {x.historia.reproducao && (
                    <><h4>Reprodução</h4><dl className="f-fatos">
                      {x.historia.reproducao.intervaloNascimento && <><dt>Intervalo entre nascimentos</dt><dd>{x.historia.reproducao.intervaloNascimento}</dd></>}
                      {x.historia.reproducao.gestacao && <><dt>Gestação</dt><dd>{x.historia.reproducao.gestacao}</dd></>}
                      {x.historia.reproducao.prole && <><dt>Tamanho da prole</dt><dd>{x.historia.reproducao.prole}</dd></>}
                    </dl></>
                  )}
                  <Sub titulo="Interações com outras espécies" html={x.historia.interacoes} />
                </Secao>
              )}

              {x && (x.populacao.observacoes || x.populacao.genetica || x.populacao.tempoGeracional) && (
                <Secao titulo="População">
                  {x.populacao.tempoGeracional && <dl className="f-fatos"><dt>Tempo geracional</dt><dd>{x.populacao.tempoGeracional}</dd></dl>}
                  <Html html={x.populacao.observacoes} />
                  <Sub titulo="Características genéticas" html={x.populacao.genetica} />
                </Secao>
              )}

              {ameacas.length > 0 && (
                <Secao titulo="Ameaças">
                  <ul className="ameacas">{ameacas.map((g, i) => <li key={i}><b>{g.titulo}</b>{g.filhos.length > 0 && <ul>{g.filhos.map((c) => <li key={c}>{c}</li>)}</ul>}</li>)}</ul>
                </Secao>
              )}

              {x?.usos && <Secao titulo="Usos"><Html html={x.usos} /></Secao>}
              {f.planoAcao && <Secao titulo="Plano de ação"><p className="texto">{f.planoAcao}</p></Secao>}

              <Secao titulo="Classificação">
                <p className="texto">{[f.taxonomia.reino, f.taxonomia.filo, f.taxonomia.classe, f.taxonomia.ordem, f.taxonomia.familia, f.taxonomia.genero].filter(Boolean).join(" › ")}</p>
              </Secao>

              {x?.citacao && <Secao titulo="Como citar"><Html html={x.citacao} /></Secao>}
              <p className="f-fonte">Fonte: SALVE / ICMBio. Ficha completa em salve.icmbio.gov.br. Seções de ações de conservação e referências bibliográficas não estão incluídas aqui.</p>
            </div>
          </>
        )}
      </article>
    </div>
  );
}
