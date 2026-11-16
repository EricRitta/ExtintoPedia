import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FichaExtras } from "../shared/types.ts";
import { limpaHtml, textoSimples } from "./sanitize.ts";

const BASE = "https://salve.icmbio.gov.br/salve-api/public";

async function json(url: string): Promise<any> {
  const r = await fetch(url, { signal: AbortSignal.timeout(30_000), headers: { "User-Agent": "ExtintoPedia-local/0.1" } });
  if (!r.ok) throw new Error(`SALVE ${r.status} em ${url.split("?")[0]}`);
  return r.json();
}

const binomial = (html: string) => (/<i>(.*?)<\/i>/.exec(html)?.[1] ?? html.replace(/<[^>]+>/g, "")).replace(/&nbsp;| /g, " ").trim();
export const slug = (n: string) => n.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

/** Baixa o mapa de distribuição (o id do anexo expira no dia, então guardamos o arquivo). */
async function baixaMapa(url: string, nome: string, dirMapas: string): Promise<string | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    const tipo = r.headers.get("content-type") ?? "";
    if (!r.ok || !tipo.startsWith("image/")) return null;
    const ext = tipo.includes("png") ? "png" : tipo.includes("gif") ? "gif" : "jpg";
    await mkdir(dirMapas, { recursive: true });
    const arq = `${slug(nome)}.${ext}`;
    await writeFile(path.join(dirMapas, arq), Buffer.from(await r.arrayBuffer()));
    return `/mapas/${arq}`;
  } catch {
    return null;
  }
}

const nz = (v: unknown) => textoSimples(v);

export async function buscarExtras(nome: string, dirMapas: string): Promise<FichaExtras> {
  // o id da ficha expira no dia: pega o do dia pelo nome científico
  const busca = await json(`${BASE}/search?q=${encodeURIComponent(nome)}`);
  const reg = (busca.data ?? []).find((r: any) => binomial(r.nm_cientifico).toLowerCase() === nome.toLowerCase());
  if (!reg) throw new Error("ficha não encontrada no SALVE");
  const sec = (s: string) => json(`${BASE}/fichaHtml?idFicha=${reg.id_ficha}&section=${s}`).then((j) => j.data ?? {});
  const [header, dist, hist, pop, usos] = await Promise.all(["header", "distribution", "naturalHistory", "population", "uses"].map(sec));

  const mapaUrl: string | undefined = dist?.distributionMap?.image;
  const mapa = mapaUrl ? await baixaMapa(mapaUrl, nome, dirMapas) : null;
  const rep = hist?.reproduction;
  const temRep = rep && (rep.birthInterval || rep.gestationTime || rep.offspringSize);

  return {
    distribuicaoGlobal: limpaHtml(dist?.globalDistribution),
    distribuicaoNacional: limpaHtml(dist?.nationalDistribution),
    bacias: nz(dist?.watersheds),
    mapa,
    mapaLegenda: mapa ? nz(dist?.distributionMap?.legend) : null,
    historia: {
      descricao: limpaHtml(hist?.description),
      habitat: limpaHtml(hist?.habitatObservations),
      alimentacao: limpaHtml(hist?.foodHabit?.observations),
      interacoes: limpaHtml(hist?.interactionsWithOtherSpecies?.observations),
      reproducao: temRep ? { intervaloNascimento: nz(rep.birthInterval), gestacao: nz(rep.gestationTime), prole: nz(rep.offspringSize) } : null,
    },
    populacao: {
      tempoGeracional: nz(pop?.generationalTime),
      tendencia: nz(pop?.populationTrend),
      genetica: limpaHtml(pop?.geneticCharacteristics),
      observacoes: limpaHtml(pop?.populationObservations),
    },
    usos: limpaHtml(usos?.description),
    citacao: limpaHtml(header?.citation),
    autoria: nz(header?.authorship),
    buscadoEm: new Date().toISOString(),
  };
}
