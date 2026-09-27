import { NavLink, useLocation } from "react-router-dom";

const navItems = [
  { to: "/", label: "Overview", end: true },
  { to: "/job-matcher", label: "Job Matcher" },
  { to: "/llm-inference", label: "LLM Inference" },
  { to: "/document-rag", label: "Document RAG" },
];

export default function AppShell({ children }) {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className="app-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <header className="site-header">
        <div className="site-header__inner">
          <NavLink className="brand" to="/" aria-label="Thiago Memelli AI Engineering home">
            <span className="brand__mark" aria-hidden="true">TM</span>
            <span className="brand__copy">
              <strong>Thiago Memelli</strong>
              <span>AI Engineering</span>
            </span>
          </NavLink>

          <nav className="site-nav" aria-label="Main navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `site-nav__link${isActive ? " is-active" : ""}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="header-links">
            <a
              className="header-status"
              href="https://github.com/tmemelli"
              target="_blank"
              rel="noreferrer"
              aria-label="Open GitHub"
            >
              GitHub
              <span aria-hidden="true">↗</span>
            </a>

            <a
              className="header-status"
              href="https://www.linkedin.com/in/thiagomemelli/"
              target="_blank"
              rel="noreferrer"
              aria-label="Open LinkedIn"
            >
              LinkedIn
              <span aria-hidden="true">↗</span>
            </a>

            <a
              className="header-status"
              href="https://thiagomemelli.com.br"
              target="_blank"
              rel="noreferrer"
              aria-label="Open personal website"
            >
              Website
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </header>

      <main className={isHome ? "site-main site-main--home" : "site-main"}>{children}</main>

      <footer className="site-footer">
        <div className="site-footer__inner">
          <span>Thiago Memelli · AI Engineering Projects</span>
          <span>Independent services. One interface.</span>
        </div>
      </footer>
    </div>
  );
}
