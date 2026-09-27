import ProjectHero from "../components/ProjectHero";

export default function DocumentRagPage() {
  return (
    <>
      <ProjectHero
        eyebrow="Retrieval · Knowledge Systems"
        title="Document RAG"
        status="In development"
        description="The third module of this interface: document ingestion, embeddings, vector retrieval, contextual assembly, and grounded LLM answers."
      >
        <div className="hero-stack"><span>PostgreSQL</span><span>pgvector</span><span>Embeddings</span><span>RAG pipeline</span></div>
      </ProjectHero>
      <section className="panel empty-state">
        <div>
          <div className="empty-state__icon">RAG</div>
          <h2>Architecture reserved.</h2>
          <p>
            This route is already part of the shared product shell, but the interface will be implemented only after the Document RAG backend is completed and validated.
          </p>
        </div>
      </section>
    </>
  );
}
