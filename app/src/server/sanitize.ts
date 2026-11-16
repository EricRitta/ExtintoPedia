// Sanitizador de HTML por lista branca (sem dependências). O HTML vem da SALVE-API (fonte confiável),
// mas é limpo mesmo assim: sem scripts, estilos, atributos, eventos nem links não-http.
const TAGS = new Set(["p", "br", "em", "i", "strong", "b", "u", "sub", "sup", "ul", "ol", "li", "a", "table", "thead", "tbody", "tr", "td", "th", "h4", "h5", "h6", "blockquote", "span"]);

export function limpaHtml(entrada: unknown): string | null {
  if (typeof entrada !== "string") return null;
  let s = entrada
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, "");
  s = s.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g, (_m, barra: string, tag: string, attrs: string) => {
    const t = tag.toLowerCase();
    if (!TAGS.has(t)) return "";
    if (barra) return t === "span" ? "" : `</${t}>`;
    if (t === "span") return "";
    if (t === "a") {
      const h = /href\s*=\s*"(https?:\/\/[^"]*)"/i.exec(attrs) ?? /href\s*=\s*'(https?:\/\/[^']*)'/i.exec(attrs);
      return h ? `<a href="${h[1].replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer">` : "<a>";
    }
    return t === "br" ? "<br>" : `<${t}>`;
  });
  s = s.replace(/&nbsp;/g, " ").replace(/<p>\s*(<br>)?\s*<\/p>/g, "").trim();
  return s.replace(/<[^>]+>/g, "").trim() === "" ? null : s;
}

export function textoSimples(entrada: unknown): string | null {
  if (typeof entrada !== "string") return null;
  const t = entrada.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
  return t || null;
}
