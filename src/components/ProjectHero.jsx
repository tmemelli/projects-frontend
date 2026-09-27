import { Link } from "react-router-dom";

export default function ProjectHero({ eyebrow, title, description, status = "Live", children }) {
  return (
    <section className="project-hero">
      <div className="project-hero__topline">
        <Link className="back-link" to="/">← All projects</Link>
        <span className={`status-badge ${status === "Live" ? "status-badge--live" : ""}`}>
          <span className="status-dot" />
          {status}
        </span>
      </div>
      <div className="project-hero__body">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {children ? <div className="project-hero__aside">{children}</div> : null}
      </div>
    </section>
  );
}
