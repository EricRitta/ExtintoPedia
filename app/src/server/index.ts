import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import postgres from "postgres";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { BiomaResumo, BrasilResumo, CategoriaCodigo, EspecieCard, EstadoDetalhe, EstadoResumo, PorCategoria } from "../shared/types.ts";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, "../../..");
const sql = postgres({ host: "localhost", port: 5433, user: "extinto", password: "extinto_dev", database: "extintopedia" });

const CATS: CategoriaCodigo[] = ["EX", "EW", "RE", "CR", "EN", "VU"];
const vazio = (): PorCategoria => ({ EX: 0, EW: 0, RE: 0, CR: 0, EN: 0, VU: 0 });
const soma = (c: PorCategoria) => CATS.reduce((a, k) => a + c[k], 0);

// ---- linhas -> cards ---------------------------------------------------------------------------
const CAMPOS_CARD = sql`
  s.id, s.nome_cientifico, s.nome_comum, s.categoria, g.nome AS grupo,
  i.fonte, i.autor, i.licenca, i.url_origem, i.arquivo_media, i.arquivo_thumb`;
const JOIN_CARD = sql`
  FROM especie s
  JOIN grupo g ON g.id = s.grupo_id
  JOIN categoria c ON c.codigo = s.categoria
  LEFT JOIN imagem i ON i.especie_id = s.id`;

function card(r: any): EspecieCard {
  return {
    id: r.id,
    nome: r.nome_comum ?? r.nome_cientifico,
    temNomePopular: !!r.nome_comum,
    cientifico: r.nome_cientifico,
    categoria: r.categoria,
    grupo: r.grupo,
    imagem: r.arquivo_media
      ? { media: `/img/${r.arquivo_media}`, thumb: `/img/${r.arquivo_thumb}`, autor: r.autor, licenca: r.licenca, fonte: r.fonte, origem: r.url_origem }
      : null,
  };
}

async function destaque(uf: string, biomaId: number): Promise<EspecieCard | null> {
  // aleatória, ameaçada (CR/EN/VU) e SEMPRE com foto
  const [r] = await sql`
    SELECT ${CAMPOS_CARD} ${JOIN_CARD}
    JOIN especie_estado_bioma x ON x.especie_id = s.id
    WHERE x.estado = ${uf} AND x.bioma_id = ${biomaId} AND c.ameacada AND i.especie_id IS NOT NULL AND s.nome_comum IS NOT NULL
    ORDER BY random() LIMIT 1`;
  return r ? card(r) : null;
}

// ---- API ---------------------------------------------------------------------------------------
const app = Fastify();

app.get("/api/estados", async (): Promise<EstadoResumo[]> => {
  const estados = await sql`SELECT sigla, nome, regiao FROM estado ORDER BY nome`;
  const cont = await sql`
    SELECT ee.estado, s.categoria, count(*)::int n FROM especie_estado ee JOIN especie s ON s.id = ee.especie_id GROUP BY 1, 2`;
  const mapa = new Map<string, PorCategoria>();
  for (const r of cont) {
    const m = mapa.get(r.estado) ?? vazio();
    m[r.categoria as CategoriaCodigo] = r.n;
    mapa.set(r.estado, m);
  }
  return estados.map((e) => {
    const pc = mapa.get(e.sigla) ?? vazio();
    return { uf: e.sigla, nome: e.nome, regiao: e.regiao, total: soma(pc), ameacadas: pc.CR + pc.EN + pc.VU, porCategoria: pc };
  });
});

app.get("/api/brasil", async (): Promise<BrasilResumo> => {
  const pc = vazio();
  for (const r of await sql`SELECT categoria, count(*)::int n FROM especie GROUP BY 1`) pc[r.categoria as CategoriaCodigo] = r.n;
  return { total: soma(pc), ameacadas: pc.CR + pc.EN + pc.VU, porCategoria: pc };
});

app.get<{ Params: { uf: string } }>("/api/estados/:uf", async (req, rep): Promise<EstadoDetalhe | void> => {
  const uf = req.params.uf.toUpperCase();
  const [e] = await sql`SELECT sigla, nome, regiao FROM estado WHERE sigla = ${uf}`;
  if (!e) return rep.code(404).send({ erro: "estado não encontrado" });

  const porCat = vazio();
  for (const r of await sql`SELECT s.categoria, count(*)::int n FROM especie_estado ee JOIN especie s ON s.id = ee.especie_id WHERE ee.estado = ${uf} GROUP BY 1`)
    porCat[r.categoria as CategoriaCodigo] = r.n;
  const porGrupo = (await sql`
    SELECT g.nome grupo, count(*)::int n FROM especie_estado ee JOIN especie s ON s.id = ee.especie_id JOIN grupo g ON g.id = s.grupo_id
    WHERE ee.estado = ${uf} GROUP BY 1 ORDER BY 2 DESC`) as unknown as { grupo: string; n: number }[];

  const bs = await sql`
    SELECT b.id, b.nome, s.categoria, count(*)::int n FROM especie_estado_bioma x
    JOIN bioma b ON b.id = x.bioma_id JOIN especie s ON s.id = x.especie_id WHERE x.estado = ${uf} GROUP BY 1, 2, 3`;
  const mapa = new Map<number, BiomaResumo>();
  for (const r of bs) {
    const b = mapa.get(r.id) ?? { id: r.id, nome: r.nome, total: 0, porCategoria: vazio(), destaque: null };
    b.porCategoria[r.categoria as CategoriaCodigo] = r.n;
    b.total += r.n;
    mapa.set(r.id, b);
  }
  const biomas = [...mapa.values()].sort((a, b) => b.total - a.total);
  await Promise.all(biomas.map(async (b) => (b.destaque = await destaque(uf, b.id))));
  return { uf, nome: e.nome, regiao: e.regiao, total: soma(porCat), ameacadas: porCat.CR + porCat.EN + porCat.VU, porCategoria: porCat, porGrupo, biomas };
});

app.get<{ Params: { uf: string; id: string } }>("/api/estados/:uf/biomas/:id/destaque", async (req) =>
  destaque(req.params.uf.toUpperCase(), Number(req.params.id)));

// Lista de espécies: Brasil (sem uf), estado (uf) ou bioma de um estado (uf + bioma). Cada espécie aparece uma vez.
app.get<{ Querystring: { uf?: string; bioma?: string; categoria?: string; grupo?: string; q?: string } }>(
  "/api/especies",
  async (req) => {
    const { uf, bioma, categoria, grupo, q } = req.query;
    const escopo = uf && bioma
      ? sql`AND s.id IN (SELECT especie_id FROM especie_estado_bioma WHERE estado = ${uf.toUpperCase()} AND bioma_id = ${Number(bioma)})`
      : uf
        ? sql`AND s.id IN (SELECT especie_id FROM especie_estado WHERE estado = ${uf.toUpperCase()})`
        : sql``;
    const rows = await sql`
      SELECT ${CAMPOS_CARD} ${JOIN_CARD}
      WHERE true ${escopo}
        ${categoria ? sql`AND s.categoria = ${categoria}` : sql``}
        ${grupo ? sql`AND g.nome = ${grupo}` : sql``}
        ${q ? sql`AND (s.nome_comum ILIKE ${"%" + q + "%"} OR s.nome_cientifico ILIKE ${"%" + q + "%"})` : sql``}
      ORDER BY (i.especie_id IS NULL), c.ordem, s.nome_cientifico`;
    return rows.map(card);
  });

// ---- estáticos ---------------------------------------------------------------------------------
await app.register(fastifyStatic, { root: path.join(raiz, "data/imagens"), prefix: "/img/", decorateReply: false, maxAge: "1d" });
const dist = path.resolve(aqui, "../../dist");
if (existsSync(dist)) await app.register(fastifyStatic, { root: dist, prefix: "/", decorateReply: false });

await app.listen({ port: 3001, host: "127.0.0.1" });
console.log("API em http://localhost:3001");
