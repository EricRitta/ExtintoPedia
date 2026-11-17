/** Barra superior: logo (arara + nome, como no exemplo) + hambúrguer que abre/fecha o painel lateral. */
function Logo() {
  return (
    <span className="logo">
      <img className="logo-arara" src="/logo.png" alt="" width="56" height="64" />
      <span className="logo-nome"><span>EXTINTO</span>PÉDIA</span>
    </span>
  );
}

export function BarraTopo({ painelAberto, onAlternar }: { painelAberto: boolean; onAlternar: () => void }) {
  return (
    <header className="barra-topo">
      <h1 className="marca" aria-label="ExtintoPedia">
        <Logo />
      </h1>
      <button className="hamburguer" onClick={onAlternar} aria-label={painelAberto ? "Fechar painel" : "Abrir painel"} aria-expanded={painelAberto} title={painelAberto ? "Fechar painel" : "Abrir painel"}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          {painelAberto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
    </header>
  );
}
