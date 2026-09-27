import { useEffect, useMemo, useState } from "react";
import ProjectHero from "../components/ProjectHero";
import { Field } from "../components/Field";
import { matchCandidate } from "../services/jobMatcherApi";

const ACCEPTED_EXTENSIONS = ["pdf", "docx", "odt", "rtf", "fodt"];

function ResultList({ title, items, tone = "" }) {
  if (!items?.length) return null;
  return (
    <div className="list-card">
      <h3>{title}</h3>
      <ul className={`clean-list${tone ? ` clean-list--${tone}` : ""}`}>
        {items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}
      </ul>
    </div>
  );
}

function IdentityLinks({ identity }) {
  const links = [
    ["GitHub", identity?.github_url],
    ["LinkedIn", identity?.linkedin_url],
    ["Website", identity?.website_url],
  ].filter(([, url]) => Boolean(url));

  if (!links.length) return null;
  return (
    <div className="identity-links">
      {links.map(([label, url]) => (
        <a className="identity-link" href={url} key={label} target="_blank" rel="noreferrer">{label} ↗</a>
      ))}
    </div>
  );
}

function formatMilliseconds(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  if (numericValue >= 1000) {
    return `${(numericValue / 1000).toFixed(2)} s`;
  }

  return `${numericValue.toFixed(2)} ms`;
}

function metadataValue(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

function formatReportDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function sanitizeDocumentTitlePart(value) {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

export default function JobMatcherPage() {
  const [companyName, setCompanyName] = useState("");
  const [language, setLanguage] = useState("auto");
  const [jobDescription, setJobDescription] = useState("");
  const [resume, setResume] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!loading) return;

    requestAnimationFrame(() => {
      document.getElementById("analysis-progress")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [loading]);

  const fileLabel = useMemo(() => {
    if (!resume) return "PDF, DOCX, ODT, RTF or FODT";
    const size = resume.size < 1024 * 1024
      ? `${Math.max(1, Math.round(resume.size / 1024))} KB`
      : `${(resume.size / (1024 * 1024)).toFixed(1)} MB`;
    return `${resume.name} · ${size}`;
  }, [resume]);

  function validateFile(file) {
    if (!file) return "Please select a resume.";
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) return "Unsupported resume format. Use PDF, DOCX, ODT, RTF or FODT.";
    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setResult(null);

    const fileError = validateFile(resume);
    if (!companyName.trim()) return setError("Please enter the company name.");
    if (fileError) return setError(fileError);
    if (!jobDescription.trim()) return setError("Please paste the job description.");

    setLoading(true);
    try {
      const response = await matchCandidate({
        companyName: companyName.trim(),
        jobDescription: jobDescription.trim(),
        responseLanguage: language,
        resume,
      });
      setResult(response);
      requestAnimationFrame(() => document.getElementById("match-results")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (requestError) {
      setError(requestError.message || "The analysis could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setCompanyName("");
    setLanguage("auto");
    setJobDescription("");
    setResume(null);
    setResult(null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const data = result?.data;
  const analysis = data?.analysis;
  const metadata = result?.metadata;

  const reportGeneratedAt = useMemo(
    () => (result ? new Date() : null),
    [result]
  );

  function exportPdf() {
    if (!result) return;

    const previousTitle = document.title;

    const candidate =
      sanitizeDocumentTitlePart(data?.identity?.full_name) || "Candidate";

    const company =
      sanitizeDocumentTitlePart(data?.company_name) || "Company";

    document.title = `AI Job Matcher - ${candidate} - ${company}`;

    const restoreTitle = () => {
      document.title = previousTitle;
    };

    window.addEventListener("afterprint", restoreTitle, { once: true });

    window.print();
  }

  return (
    <>
      <ProjectHero
        eyebrow="Applied AI · Candidate Intelligence"
        title="AI Job Matcher"
        description="Compare a resume against a real job opportunity using structured LLM analysis, profile enrichment, and evidence-based compatibility evaluation."
      >
        <div className="hero-stack">
          <span>Resume parsing</span><span>Profile enrichment</span>
          <span>Structured output</span><span>Evidence scoring</span>
        </div>
      </ProjectHero>

      <div className="workspace">
        <section id="job-matcher-form" className="panel panel--form">
          <div className="panel__header">
            <div><h2>Evaluate a candidate</h2><p>Upload the resume and paste the complete job description.</p></div>
            <span className="tech-pill">Real API</span>
          </div>
          <div className="panel__body">
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <Field label="Company">
                  <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={120} placeholder="Example: OpenAI" />
                </Field>
                <Field label="Analysis language">
                  <select className="select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                    <option value="auto">Automatic</option>
                    <option value="en">English</option>
                    <option value="pt-BR">Português</option>
                  </select>
                </Field>
              </div>

              <Field label="Resume" hint={resume ? "Ready to analyze" : "Required"}>
                <div className="dropzone">
                  <input
                    type="file"
                    accept=".pdf,.docx,.odt,.rtf,.fodt"
                    onChange={(event) => { setResume(event.target.files?.[0] || null); setError(""); }}
                  />
                  <span className="dropzone__icon" aria-hidden="true">↑</span>
                  <div><strong>{resume ? "Resume selected" : "Choose a resume"}</strong><span>{fileLabel}</span></div>
                </div>
              </Field>

              <Field label="Job description" hint={`${jobDescription.length.toLocaleString()} characters`}>
                <textarea className="textarea" rows={11} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the complete job description here..." spellCheck={false}/>
              </Field>

              {error ? <div className="form-error" role="alert">{error}</div> : null}

              <div className="actions">
                {(companyName || jobDescription || resume) && !loading ? <button className="button button--ghost" type="button" onClick={resetForm}>Clear</button> : null}
                <button className="button button--primary" type="submit" disabled={loading}>
                  {loading ? <><span className="loader" /> Analyzing candidate</> : <>Analyze compatibility <span aria-hidden="true">→</span></>}
                </button>
              </div>
            </form>
          </div>
        </section>

        {loading ? (
          <section
            id="analysis-progress"
            className="analysis-progress panel"
            aria-live="polite"
          >
            <div className="analysis-progress__orbit" aria-hidden="true">
              <span />
            </div>

            <div>
              <span className="eyebrow">Analysis in progress</span>
              <h2>Evaluating candidate compatibility</h2>

              <p>
                The service is reading the resume, enriching available candidate
                information, and comparing the evidence with the job requirements.
                This can take a few seconds.
              </p>
            </div>
          </section>
        ) : null}

        {result ? (
          <section id="match-results" className="workspace">
            <header className="print-report-header" aria-hidden="true">
              <div>
                <span className="print-brand">AI Job Matcher</span>
                <h1>Candidate Compatibility Report</h1>
              </div>

              <div className="print-report-meta">
                <span>Generated</span>
                <strong>
                  {reportGeneratedAt
                    ? formatReportDate(reportGeneratedAt)
                    : "—"}
                </strong>
              </div>
            </header>

            <section className="print-candidate-card">
              <div className="print-candidate-summary">
                <span className="print-section-kicker">Candidate</span>

                <h2>
                  {data?.identity?.full_name || "Candidate"}
                </h2>

                <p className="print-candidate-context">
                  Company: {data?.company_name || "—"}
                  {resume?.name ? ` · ${resume.name}` : ""}
                </p>

                <IdentityLinks identity={data?.identity} />
              </div>

              <div className="print-score-ring">
                <strong>{analysis?.compatibility_score ?? 0}%</strong>
                <span>Match score</span>
              </div>
            </section>

            <section className="print-summary-card">
              <span className="print-section-kicker">
                Compatibility Analysis
              </span>

              <h2>Summary</h2>

              <p>{analysis?.summary}</p>
            </section>

            <div className="result-grid">
              <div className="panel score-card">
                <div>
                  <span className="eyebrow">Compatibility</span>
                  <div className="score-ring" style={{ "--score": analysis?.compatibility_score || 0 }}>
                    <div><strong>{analysis?.compatibility_score ?? 0}</strong><span>/ 100</span></div>
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel__body result-summary">
                  <span className="eyebrow">Candidate analysis</span>
                  <h2>{data?.identity?.full_name || "Candidate"}</h2>
                  <p>{analysis?.summary}</p>
                  <IdentityLinks identity={data?.identity} />
                  <div className="meta-row">
                    <div className="meta-stat"><span>Company</span><strong>{data?.company_name || "—"}</strong></div>
                    <div className="meta-stat"><span>Provider</span><strong>{metadata?.processedProvider || "—"}</strong></div>
                    <div className="meta-stat"><span>Model</span><strong>{metadata?.processedModel || "—"}</strong></div>
                    <div className="meta-stat"><span>Latency</span><strong>{metadata?.requestDurationMs ? `${metadata.requestDurationMs} ms` : "—"}</strong></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="result-columns result-insights">
              <ResultList
                title="Strengths"
                items={analysis?.strengths}
                tone="success"
              />

              <ResultList
                title="Gaps"
                items={analysis?.gaps}
                tone="danger"
              />
            </div>

            <div className="result-columns result-requirements">
              <ResultList
                title="Matched requirements"
                items={analysis?.matched_requirements}
                tone="success"
              />

              <ResultList
                title="Unverified requirements"
                items={analysis?.unverified_requirements}
                tone="warning"
              />
            </div>

            {analysis?.interview_questions?.length ? (
              <section className="interview-section">
                <div className="interview-heading">
                  <div>
                    <span className="eyebrow">Interview preparation</span>
                    <h2>Suggested questions</h2>
                  </div>

                  <p>
                    Use these questions to investigate gaps, depth, and practical
                    experience during an interview.
                  </p>
                </div>

                <div className="interview-list">
                  {analysis.interview_questions.map((item, index) => (
                    <article
                      className="interview-item"
                      key={`${item.question}-${index}`}
                    >
                      <div className="interview-item__header">
                        <div className="interview-summary-copy">
                          <strong>Question {index + 1}</strong>
                          <span>{item.question}</span>
                        </div>

                        <span className="difficulty-pill">
                          {item.difficulty || "Unspecified"}
                        </span>
                      </div>

                      <div className="interview-body">
                        <div className="answer-topic">
                          <span>Expected answer topic</span>
                          <p>
                            {item.expected_answer_topic ||
                              "No expected answer topic reported."}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="print-report-footer" aria-hidden="true">
              <span>Generated by AI Job Matcher</span>
              <span>thiagomemelli.com.br</span>
            </div>

            <section className="panel technical-details">
              <div className="technical-details__header">
                <div>
                  <span className="eyebrow">Execution</span>
                  <h3>Technical details</h3>
                </div>

                <span>Provider, model, tokens and latency</span>
              </div>

              <dl className="metadata-grid">
                <div>
                  <dt>Requested provider</dt>
                  <dd>{metadataValue(metadata?.requestedProvider)}</dd>
                </div>

                <div>
                  <dt>Requested model</dt>
                  <dd>{metadataValue(metadata?.requestedModel)}</dd>
                </div>

                <div>
                  <dt>Executed provider</dt>
                  <dd>{metadataValue(metadata?.processedProvider)}</dd>
                </div>

                <div>
                  <dt>Executed model</dt>
                  <dd>{metadataValue(metadata?.processedModel)}</dd>
                </div>

                <div>
                  <dt>Prompt tokens</dt>
                  <dd>{metadataValue(metadata?.promptTokens)}</dd>
                </div>

                <div>
                  <dt>Completion tokens</dt>
                  <dd>{metadataValue(metadata?.completionTokens)}</dd>
                </div>

                <div>
                  <dt>Total tokens</dt>
                  <dd>{metadataValue(metadata?.totalTokens)}</dd>
                </div>

                <div>
                  <dt>LLM latency</dt>
                  <dd>{formatMilliseconds(metadata?.llmLatencyMs)}</dd>
                </div>

                <div>
                  <dt>Request duration</dt>
                  <dd>{formatMilliseconds(metadata?.requestDurationMs)}</dd>
                </div>

                <div>
                  <dt>LLM request ID</dt>
                  <dd>{metadataValue(metadata?.llmRequestId)}</dd>
                </div>

                <div className="metadata-wide">
                  <dt>HTTP request ID</dt>
                  <dd>{metadataValue(metadata?.requestId)}</dd>
                </div>
              </dl>
            </section>

            <div className="actions result-actions">
              <button
                className="button button--secondary"
                type="button"
                onClick={exportPdf}
              >
                Export PDF
              </button>

              <button
                className="button button--primary"
                type="button"
                onClick={resetForm}
              >
                New analysis
              </button>

              <button
                className="button button--secondary"
                type="button"
                onClick={() =>
                  document.getElementById("job-matcher-form")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
                }
              >
                Back to form
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
