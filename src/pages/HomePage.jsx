import { Link } from "react-router-dom";

const projects = [
  {
    index: "01",
    title: "AI Job Matcher",
    description: "Resume-to-job compatibility analysis with profile enrichment, structured LLM evaluation, and evidence-based scoring.",
    tech: ["FastAPI", "LLM", "Structured Output", "Search Enrichment"],
    to: "/job-matcher",
    status: "Live",
  },
  {
    index: "02",
    title: "LLM Inference Service",
    description: "Resilient multi-provider inference with retries, fallback, rate limiting, concurrency control, and batch execution.",
    tech: ["FastAPI", "Groq", "Gemini", "Async", "Batch"],
    to: "/llm-inference",
    status: "Live",
  },
  {
    index: "03",
    title: "Document RAG",
    description: "A production-oriented retrieval pipeline for document ingestion, embeddings, vector search, context assembly, and grounded answers.",
    tech: ["PostgreSQL", "pgvector", "Embeddings", "RAG"],
    to: "/document-rag",
    status: "In development",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="home-hero">
        <div className="home-hero__grid">
          <div>
            <span className="eyebrow">AI Engineering · Production Projects</span>
            <h1>
              Systems that make AI useful.
              <span>Not just impressive.</span>
            </h1>
            <p className="home-hero__lead">
              A living collection of production-minded AI systems — from resilient LLM inference
              to candidate intelligence and retrieval-augmented generation.
            </p>
          </div>

          <aside className="home-hero__aside">
            <p>
              Independent backends, shared product language. Each project is deployed as its own
              service and presented through one consistent interface.
            </p>
            <div className="hero-metrics">
              <div className="hero-metric"><strong>02</strong><span>Live systems</span></div>
              <div className="hero-metric"><strong>01</strong><span>In development</span></div>
            </div>
          </aside>
        </div>
      </section>

      <section className="projects-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Selected systems</span>
            <h2>Explore the projects</h2>
          </div>
          <p>
            Open a project to interact with the real service. The interface is shared; the
            engineering behind each backend remains independent.
          </p>
        </div>

        <div className="project-list">
          {projects.map((project) => (
            <Link
              className={`project-card${project.status !== "Live" ? " project-card--disabled" : ""}`}
              key={project.title}
              to={project.to}
            >
              <span className="project-card__index">{project.index} · {project.status}</span>
              <div>
                <h3>{project.title}</h3>
                <p>{project.description}</p>
              </div>
              <div className="project-card__tech">
                {project.tech.map((item) => <span className="tech-pill" key={item}>{item}</span>)}
              </div>
              <span className="project-card__action" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
