import { useEffect, useState } from "react";

/** Rodapé flutuante: só uma setinha embaixo, no centro; ao clicar, sobe a folha de informações. */
export function Rodape({ total }: { total: number | null }) {
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  return (
    <div className="rodape">
      {aberto && (
        <section className="rodape-folha" aria-label="Informações">
          <h2>Sobre o ExtintoPedia</h2>
          <ul>
            <li><b>Dados:</b> espécies extintas e ameaçadas de extinção do Brasil{total ? ` (${total.toLocaleString("pt-BR")})` : ""}, avaliadas pelo ICMBio no sistema <a href="https://salve.icmbio.gov.br" target="_blank" rel="noreferrer">SALVE</a>.</li>
            <li><b>Recorte:</b> aparecem apenas espécies extintas (EX, EW, RE) e ameaçadas (CR, EN, VU). As demais espécies avaliadas não estão incluídas.</li>
            <li><b>Estado × bioma:</b> o SALVE informa estados e biomas separadamente. O cruzamento mostrado aqui é aproximado: considera só os biomas que existem de fato em cada estado.</li>
            <li><b>Mapas:</b> malhas de estados e biomas do IBGE.</li>
            <li><b>Fotos:</b> ICMBio/SALVE e iNaturalist (licenças abertas). O crédito de cada foto aparece ao passar o mouse e na ficha.</li>
            <li><b>Como citar o SALVE:</b> ICMBio. Sistema de Avaliação do Risco de Extinção da Biodiversidade – SALVE. Disponível em: salve.icmbio.gov.br.</li>
            <li><a href="https://github.com/EricRitta/ExtintoPedia" target="_blank" rel="noreferrer">Código-fonte no GitHub</a></li>
          </ul>
        </section>
      )}
      <button className={`rodape-seta ${aberto ? "aberto" : ""}`} onClick={() => setAberto((a) => !a)} aria-label={aberto ? "Fechar informações" : "Abrir informações"} aria-expanded={aberto} title="Informações">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 15l6-6 6 6" /></svg>
      </button>
    </div>
  );
}
