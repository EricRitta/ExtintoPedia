/** Barra superior: espaço da logo (trocar o <Logo/> pela imagem final) + hambúrguer que abre/fecha o painel lateral. */
function Logo() {
  return (
    <span className="logo" aria-hidden="true">
      <svg viewBox="0 0 32 32" width="32" height="32">
        <rect width="32" height="32" rx="8" fill="#23221f" />
        <path d="M9 22c2-7 6-11 14-12-1 8-5 12-12 13l-2 3" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function BarraTopo({ painelAberto, onAlternar }: { painelAberto: boolean; onAlternar: () => void }) {
  return (
    <header className="barra-topo">
      <div className="marca">
        <Logo />
        <div>
          <b>ExtintoPedia</b>
          <small>Espécies ameaçadas e extintas do Brasil</small>
        </div>
      </div>
      <button className="hamburguer" onClick={onAlternar} aria-label={painelAberto ? "Fechar painel" : "Abrir painel"} aria-expanded={painelAberto} title={painelAberto ? "Fechar painel" : "Abrir painel"}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          {painelAberto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
    </header>
  );
}
