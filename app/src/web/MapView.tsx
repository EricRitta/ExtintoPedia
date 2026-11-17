import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import type { GeoJSONSource, Map as MLMap } from "maplibre-gl";
import type { EstadoResumo } from "../shared/types.ts";
import { COR_BIOMA } from "./constantes.ts";

interface Props {
  estados: EstadoResumo[];
  uf: string | null;
  biomaId: number | null;
  painelAberto: boolean;
  onEstado: (uf: string | null) => void;
  onBioma: (id: number | null) => void;
}

type Pos = [number, number];
function bbox(fc: GeoJSON.FeatureCollection): [Pos, Pos] {
  let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
  const walk = (c: any): void => {
    if (typeof c[0] === "number") { x0 = Math.min(x0, c[0]); x1 = Math.max(x1, c[0]); y0 = Math.min(y0, c[1]); y1 = Math.max(y1, c[1]); }
    else c.forEach(walk);
  };
  fc.features.forEach((f) => walk((f.geometry as any).coordinates));
  return [[x0, y0], [x1, y1]];
}

maplibregl.setWorkerUrl(workerUrl);

// reserva espaço para o painel (só se estiver aberto): à direita no desktop, embaixo (45%) no celular
const margem = (m: MLMap | null, painelAberto: boolean, extra = 20) => {
  const h = m?.getContainer().clientHeight ?? window.innerHeight;
  const cel = window.innerWidth <= 900;
  if (!painelAberto) return { top: extra, bottom: extra, left: extra, right: extra };
  return cel
    ? { top: extra, left: extra, right: extra, bottom: Math.round(h * 0.45) + extra }
    : { top: extra, bottom: extra, left: extra, right: 440 + (extra > 20 ? 20 : 0) };
};

const BRASIL: [Pos, Pos] = [[-74, -34], [-34, 5.5]];
const VAZIO: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

export function MapView({ estados, uf, biomaId, painelAberto, onEstado, onBioma }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapa = useRef<MLMap | null>(null);
  const pronto = useRef(false);
  const geoEstados = useRef<GeoJSON.FeatureCollection | null>(null);
  const cb = useRef({ onEstado, onBioma, uf, painelAberto });
  cb.current = { onEstado, onBioma, uf, painelAberto };
  // último alvo do enquadramento (para reenquadrar quando o painel abre/fecha)
  const alvo = useRef<{ bounds: [Pos, Pos]; extra: number }>({ bounds: [[-74, -34], [-34, 5.5]], extra: 20 });

  // cria o mapa uma vez (sem mapa-base: só os polígonos do IBGE)
  useEffect(() => {
    const m = new maplibregl.Map({
      container: el.current!,
      style: { version: 8, sources: {}, layers: [{ id: "fundo", type: "background", paint: { "background-color": "#cfe3ee" } }] },
      bounds: BRASIL,
      fitBoundsOptions: { padding: margem(null, cb.current.painelAberto) },
      attributionControl: false, // créditos ficam no rodapé (Rodape.tsx)
      dragRotate: false,
    });
    mapa.current = m;
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 });

    m.on("load", async () => {
      geoEstados.current = await (await fetch("/geo/estados.geojson")).json();
      m.addSource("estados", { type: "geojson", data: geoEstados.current! });
      m.addSource("biomas", { type: "geojson", data: VAZIO });
      m.addLayer({
        id: "estados-fill", type: "fill", source: "estados",
        paint: {
          "fill-color": ["interpolate", ["linear"], ["coalesce", ["get", "total"], 0], 0, "#f8fbf6", 40, "#c3dcbc", 120, "#67955f", 250, "#3c6a45", 400, "#12402b"],
          "fill-opacity": 0.9,
        },
      });
      m.addLayer({ id: "estados-line", type: "line", source: "estados", paint: { "line-color": "#ffffff", "line-width": 1 } });
      m.addLayer({
        id: "biomas-fill", type: "fill", source: "biomas",
        paint: {
          "fill-color": ["match", ["get", "bioma"], ...Object.entries(COR_BIOMA).flat(), "#9e9e9e"] as unknown as string,
          "fill-opacity": 0.85,
        },
      });
      m.addLayer({ id: "biomas-line", type: "line", source: "biomas", paint: { "line-color": "#ffffff", "line-width": 1.2 } });
      m.addLayer({ id: "biomas-sel", type: "line", source: "biomas", filter: ["==", ["get", "bioma_id"], -1], paint: { "line-color": "#111", "line-width": 3 } });
      m.addLayer({ id: "estado-sel", type: "line", source: "estados", filter: ["==", ["get", "uf"], ""], paint: { "line-color": "#111", "line-width": 2 } });
      pronto.current = true;
      m.fire("pronto" as any);
    });

    const dica = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }, html: (p: any) => string) => {
      const f = e.features?.[0];
      if (!f) return;
      m.getCanvas().style.cursor = "pointer";
      popup.setLngLat(e.lngLat).setHTML(html(f.properties)).addTo(m);
    };
    m.on("mousemove", "estados-fill", (e) => { if (!cb.current.uf) dica(e, (p) => `<b>${p.nome}</b><br>${p.total ?? 0} espécies ameaçadas ou extintas`); });
    m.on("mousemove", "biomas-fill", (e) => dica(e, (p) => `<b>${p.bioma}</b>`));
    for (const l of ["estados-fill", "biomas-fill"]) m.on("mouseleave", l, () => { m.getCanvas().style.cursor = ""; popup.remove(); });

    m.on("click", (e) => {
      const bio = m.queryRenderedFeatures(e.point, { layers: ["biomas-fill"] })[0];
      if (bio) return cb.current.onBioma(Number(bio.properties!.bioma_id));
      const est = m.queryRenderedFeatures(e.point, { layers: ["estados-fill"] })[0];
      if (est) return cb.current.onEstado(est.properties!.uf);
      cb.current.onEstado(null);
    });
    return () => m.remove();
  }, []);

  const quandoPronto = (fn: (m: MLMap) => void) => {
    const m = mapa.current!;
    if (pronto.current) fn(m); else m.once("pronto" as any, () => fn(m));
  };

  // injeta os totais nas feições dos estados (colore o mapa)
  useEffect(() => {
    if (!estados.length) return;
    quandoPronto((m) => {
      const por = new Map(estados.map((e) => [e.uf, e]));
      const fc = geoEstados.current!;
      for (const f of fc.features) f.properties = { ...f.properties, total: por.get(f.properties!.uf)?.total ?? 0 };
      (m.getSource("estados") as GeoJSONSource).setData(fc);
    });
  }, [estados]);

  // estado selecionado: carrega os biomas recortados e dá zoom
  useEffect(() => {
    quandoPronto(async (m) => {
      m.setFilter("estado-sel", ["==", ["get", "uf"], uf ?? ""]);
      m.setPaintProperty("estados-fill", "fill-opacity", uf ? ["case", ["==", ["get", "uf"], uf], 0.5, 0.35] : 0.9);
      if (!uf) {
        (m.getSource("biomas") as GeoJSONSource).setData(VAZIO);
        alvo.current = { bounds: BRASIL, extra: 20 };
        m.fitBounds(BRASIL, { padding: margem(m, cb.current.painelAberto), duration: 700 });
        return;
      }
      const fc: GeoJSON.FeatureCollection = await (await fetch(`/geo/biomas_${uf}.geojson`)).json();
      if (cb.current.uf !== uf) return;
      (m.getSource("biomas") as GeoJSONSource).setData(fc);
      const est = geoEstados.current!.features.filter((f) => f.properties!.uf === uf);
      alvo.current = { bounds: bbox({ type: "FeatureCollection", features: est }), extra: 40 };
      m.fitBounds(alvo.current.bounds, { padding: margem(m, cb.current.painelAberto, 40), duration: 800 });
    });
  }, [uf]);

  // painel abriu/fechou: reenquadra o alvo atual com a nova margem
  useEffect(() => {
    quandoPronto((m) => m.fitBounds(alvo.current.bounds, { padding: margem(m, painelAberto, alvo.current.extra), duration: 450 }));
  }, [painelAberto]);

  useEffect(() => {
    quandoPronto((m) => m.setFilter("biomas-sel", ["==", ["get", "bioma_id"], biomaId ?? -1]));
  }, [biomaId]);

  return <div ref={el} className="mapa" />;
}
