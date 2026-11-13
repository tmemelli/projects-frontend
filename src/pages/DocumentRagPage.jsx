import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  DocumentRagApiError,
  clearDocumentRagAccessToken,
  deleteDocumentRagAccount,
  deleteDocumentRagDocument,
  deleteDocumentRagDocuments,
  getDocumentRagAccessToken,
  getDocumentRagUser,
  listDocumentRagDocuments,
  loginDocumentRagUser,
  queryDocumentRag,
  registerDocumentRagUser,
  setDocumentRagAccessToken,
  uploadDocumentRagDocument,
} from "../services/documentRagApi";
import "../styles/document-rag.css";

const ACCEPTED_EXTENSIONS = ["pdf", "docx", "odt", "rtf", "fodt"];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatNumber(value, digits = 3) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return number.toFixed(digits);
}

function getExtension(fileName = "") {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts.at(-1) : "";
}

function statusLabel(status) {
  const labels = {
    pending: "Pending",
    processing: "Processing",
    ready: "Ready",
    failed: "Failed",
  };

  return labels[status] || status || "Unknown";
}

function PasswordField({ value, onChange, autoComplete, placeholder = "Enter your password" }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="rag-password-field">
      <input
        className="input"
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        minLength={8}
        maxLength={128}
        required
      />
      <button
        className="rag-password-toggle"
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

function Modal({ title, description, children, onClose, actions, danger = false }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="rag-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`rag-modal${danger ? " rag-modal--danger" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rag-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="rag-modal__header">
          <div>
            <h2 id="rag-modal-title">{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button className="rag-icon-button" type="button" onClick={onClose} aria-label="Close dialog">×</button>
        </div>
        <div className="rag-modal__body">{children}</div>
        {actions ? <div className="rag-modal__actions">{actions}</div> : null}
      </section>
    </div>
  );
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function switchMode(nextMode) {
    setMode(nextMode);
    setPassword("");
    setConfirmation("");
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (mode === "signup" && password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const result = mode === "signin"
        ? await loginDocumentRagUser({ email: email.trim(), password })
        : await registerDocumentRagUser({ email: email.trim(), password });

      setDocumentRagAccessToken(result.access_token);
      await onAuthenticated(result.user);
    } catch (requestError) {
      setError(requestError.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rag-auth-page">
      <div className="rag-auth-topline">
        <Link className="back-link rag-auth-back" to="/">
          ← All projects
        </Link>

        <span className="status-badge status-badge--live">
          <span className="status-dot" />
          Live
        </span>
      </div>

      <div className="rag-auth-layout">
        <section className="rag-auth-intro">
          <span className="eyebrow">Retrieval · Knowledge Systems</span>
          <h1>Document RAG</h1>
          <p className="rag-auth-lead">
            Build a private knowledge workspace, choose exactly which documents belong to each question, and inspect the evidence behind every grounded answer.
          </p>

          <div className="rag-auth-capabilities" aria-label="Document RAG capabilities">
            <article>
              <span>01</span>
              <strong>Private knowledge base</strong>
              <p>Upload and manage your own indexed documents.</p>
            </article>
            <article>
              <span>02</span>
              <strong>Scoped retrieval</strong>
              <p>Select the documents that may participate in each answer.</p>
            </article>
            <article>
              <span>03</span>
              <strong>Inspectable evidence</strong>
              <p>Review sources, retrieval hits and context assembly.</p>
            </article>
          </div>

          <div className="rag-auth-tech">
            <span>PostgreSQL</span>
            <span>pgvector</span>
            <span>Qwen embeddings</span>
            <span>RAG pipeline</span>
          </div>
        </section>

        <section className="panel rag-auth-card">
          <div className="rag-auth-card__heading">
            <div className="rag-auth-mark">RAG</div>
            <div>
              <span className="rag-auth-kicker">Secure workspace</span>
              <h2>{mode === "signin" ? "Welcome back" : "Create your account"}</h2>
              <p>
                {mode === "signin"
                  ? "Sign in to access your documents and grounded AI answers."
                  : "Create a workspace with your email and a password."}
              </p>
            </div>
          </div>

          <form className="rag-auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span className="field__label">Email</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="field">
              <span className="field__label">Password</span>
              <PasswordField
                value={password}
                onChange={setPassword}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </label>

            {mode === "signup" ? (
              <label className="field">
                <span className="field__label">Confirm password</span>
                <PasswordField
                  value={confirmation}
                  onChange={setConfirmation}
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                />
              </label>
            ) : null}

            {error ? <div className="form-error" role="alert">{error}</div> : null}

            <button className="button button--primary rag-auth-submit" type="submit" disabled={loading}>
              {loading ? <><span className="loader" /> {mode === "signin" ? "Signing in…" : "Creating account…"}</> : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="rag-auth-switch">
            <span>{mode === "signin" ? "Don't have an account?" : "Already have an account?"}</span>
            <button type="button" onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}>
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </div>

          <p className="rag-auth-security">Your password is sent only to the Document RAG API over HTTPS in production. The browser does not persist it.</p>
        </section>
      </div>
    </div>
  );
}

function DocumentRow({ document, selected, onToggle, onDelete }) {
  const selectable = document.status === "ready";

  return (
    <article className={`rag-document-row${selected ? " is-selected" : ""}${!selectable ? " is-disabled" : ""}`}>
      <label className="rag-document-select">
        <input
          type="checkbox"
          checked={selected}
          disabled={!selectable}
          onChange={() => onToggle(document.id)}
          aria-label={`Use ${document.title} in RAG queries`}
        />
        <span className="rag-document-check" aria-hidden="true" />
      </label>

      <div className="rag-document-icon" aria-hidden="true">DOC</div>

      <div className="rag-document-copy">
        <strong title={document.title}>{document.title}</strong>
        <span title={document.file_name || "Uploaded document"}>{document.file_name || "Uploaded document"}</span>
        <div className="rag-document-meta">
          <span className={`rag-status rag-status--${document.status}`}>{statusLabel(document.status)}</span>
          <span>{formatDate(document.updated_at || document.created_at)}</span>
        </div>
      </div>

      <button
        className="rag-document-delete"
        type="button"
        onClick={() => onDelete(document)}
        aria-label={`Delete ${document.title}`}
        title="Delete document"
      >
        ×
      </button>
    </article>
  );
}

function KnowledgeBase({
  documents,
  selectedIds,
  onToggle,
  onSelectAll,
  onUpload,
  onDelete,
  onBulkDelete,
  loading,
}) {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();

  const readyDocuments = documents.filter((document) => document.status === "ready");
  const selectedReadyCount = readyDocuments.filter((document) => selectedIds.has(document.id)).length;
  const allReadySelected = readyDocuments.length > 0 && selectedReadyCount === readyDocuments.length;

  const filteredDocuments = normalizedSearch
    ? documents.filter((document) => `${document.title} ${document.file_name || ""}`.toLowerCase().includes(normalizedSearch))
    : documents;

  return (
    <aside className="panel rag-knowledge-panel">
      <div className="rag-panel-heading">
        <div>
          <span className="rag-section-kicker">Knowledge base</span>
          <h2>Documents</h2>
        </div>
        <span className="rag-count-badge">{documents.length}</span>
      </div>

      <button className="button button--primary rag-upload-button" type="button" onClick={onUpload}>
        <span aria-hidden="true">＋</span> Upload documents
      </button>

      <label className="rag-search-field">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search documents…"
          aria-label="Search documents"
        />
      </label>

      <div className="rag-document-toolbar">
        <button type="button" disabled={!readyDocuments.length} onClick={() => onSelectAll(!allReadySelected)}>
          {allReadySelected ? "Clear selection" : "Select all ready"}
        </button>
        <span>{selectedReadyCount} selected</span>
      </div>

      <div className="rag-document-list" aria-live="polite">
        {loading ? (
          <div className="rag-small-empty"><span className="loader rag-loader-light" /> Loading documents…</div>
        ) : filteredDocuments.length ? (
          filteredDocuments.map((document) => (
            <DocumentRow
              key={document.id}
              document={document}
              selected={selectedIds.has(document.id)}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))
        ) : documents.length ? (
          <div className="rag-small-empty">No documents match your search.</div>
        ) : (
          <div className="rag-small-empty rag-small-empty--documents">
            <strong>Your knowledge base is empty.</strong>
            <span>Upload your first document to start asking grounded questions.</span>
          </div>
        )}
      </div>

      <div className="rag-knowledge-footer">
        <div>
          <strong>
            {readyDocuments.length} - {readyDocuments.length === 1 ? "Document" : "Documents"}
          </strong>
          <span>ready for retrieval</span>
        </div>
        <button
          className="rag-danger-link"
          type="button"
          disabled={!selectedReadyCount}
          onClick={onBulkDelete}
        >
          Delete selected
        </button>
      </div>
    </aside>
  );
}

function SelectedDocumentChips({ documents, selectedIds, onRemove }) {
  const selectedDocuments = documents.filter((document) => selectedIds.has(document.id));

  if (!selectedDocuments.length) {
    return <span className="rag-no-selection">No documents selected</span>;
  }

  return (
    <div className="rag-selected-chips">
      {selectedDocuments.map((document) => (
        <button key={document.id} type="button" onClick={() => onRemove(document.id)} title={`Remove ${document.title}`}>
          <span>{document.title}</span>
          <b aria-hidden="true">×</b>
        </button>
      ))}
    </div>
  );
}

function ConversationTurn({ turn, onInspect }) {
  return (
    <article className="rag-turn">
      <div className="rag-message rag-message--user">
        <div className="rag-message__avatar">YOU</div>
        <div>
          <span className="rag-message__author">You</span>
          <p>{turn.question}</p>
          <div className="rag-message__scope">
            {turn.documentTitles.map((title) => <span key={title}>{title}</span>)}
          </div>
        </div>
      </div>

      <div className="rag-message rag-message--assistant">
        <div className="rag-message__avatar rag-message__avatar--rag">RAG</div>
        <div className="rag-message__content">
          <div className="rag-message__heading">
            <span className="rag-message__author">Document RAG</span>
            {turn.status === "complete" ? <span className="rag-answer-state">Grounded answer</span> : null}
          </div>

          {turn.status === "loading" ? (
            <div className="rag-answer-loading"><span className="loader rag-loader-light" /> Retrieving evidence and generating an answer…</div>
          ) : null}

          {turn.status === "error" ? <div className="form-error rag-inline-error">{turn.error}</div> : null}

          {turn.status === "complete" ? (
            <>
              <p className="rag-answer-copy">{turn.response.answer}</p>
              <div className="rag-answer-footer">
                <div className="rag-answer-sources">
                  {(turn.response.sources || []).slice(0, 3).map((source, index) => (
                    <span key={`${source}-${index}`}>{source}</span>
                  ))}
                  {(turn.response.sources || []).length > 3 ? <span>+{turn.response.sources.length - 3} more</span> : null}
                </div>
                <button type="button" onClick={() => onInspect(turn.response)}>View evidence →</button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function RetrievalSettings({ settings, onChange }) {
  return (
    <div className="rag-retrieval-settings">
      <label>
        <span>Answer language</span>
        <select value={settings.language} onChange={(event) => onChange({ ...settings, language: event.target.value })}>
          <option value="pt-BR">Português (BR)</option>
          <option value="en">English</option>
        </select>
      </label>
      <label>
        <span>Top K</span>
        <select value={settings.limit} onChange={(event) => onChange({ ...settings, limit: Number(event.target.value) })}>
          {[3, 5, 8, 10, 15, 20].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label>
        <span>Neighbor window</span>
        <select value={settings.neighborWindow} onChange={(event) => onChange({ ...settings, neighborWindow: Number(event.target.value) })}>
          {[0, 1, 2, 3].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label className="rag-toggle-setting">
        <span>
          <strong>Query transformation</strong>
          <small>Generate alternate retrieval queries and fuse results.</small>
        </span>
        <input
          type="checkbox"
          checked={settings.transformQuery}
          onChange={(event) => onChange({ ...settings, transformQuery: event.target.checked })}
        />
      </label>
    </div>
  );
}

function ChatWorkspace({ documents, selectedIds, onRemoveDocument, turns, setTurns, onEvidence, onUnauthorized }) {
  const [question, setQuestion] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const questionRef = useRef(null);
  const previousSelectedCountRef = useRef(selectedIds.size);

  const [settings, setSettings] = useState({
    language: "pt-BR",
    limit: 5,
    neighborWindow: 1,
    transformQuery: false,
  });

  const selectedDocuments = documents.filter((document) => selectedIds.has(document.id) && document.status === "ready");
  const loading = turns.some((turn) => turn.status === "loading");
  const canAsk = question.trim() && selectedDocuments.length > 0 && !loading;

  useEffect(() => {
    const previousCount = previousSelectedCountRef.current;
    const currentCount = selectedIds.size;

    if (currentCount > previousCount) {
      requestAnimationFrame(() => {
        questionRef.current?.focus();
      });
    }

    previousSelectedCountRef.current = currentCount;
  }, [selectedIds]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canAsk) return;

    const text = question.trim();
    const turnId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const documentIds = selectedDocuments.map((document) => document.id);
    const documentTitles = selectedDocuments.map((document) => document.title);

    setQuestion("");
    setTurns((current) => [
      ...current,
      {
        id: turnId,
        question: text,
        documentTitles,
        status: "loading",
        response: null,
        error: "",
      },
    ]);

    try {
      const response = await queryDocumentRag({
        documentIds,
        query: text,
        language: settings.language,
        limit: settings.limit,
        neighborWindow: settings.neighborWindow,
        transformQuery: settings.transformQuery,
      });

      setTurns((current) => current.map((turn) => (
        turn.id === turnId ? { ...turn, status: "complete", response } : turn
      )));
      onEvidence(response);
    } catch (requestError) {
      if (requestError instanceof DocumentRagApiError && requestError.status === 401) {
        onUnauthorized();
        return;
      }

      setTurns((current) => current.map((turn) => (
        turn.id === turnId
          ? { ...turn, status: "error", error: requestError.message || "The RAG request failed." }
          : turn
      )));
    }
  }

  return (
    <section className="panel rag-chat-panel">
      <div className="rag-chat-header">
        <div>
          <span className="rag-section-kicker">Ask your documents</span>
          <h2>Grounded conversation</h2>
        </div>
        {turns.length ? <button type="button" onClick={() => setTurns([])}>Clear conversation</button> : null}
      </div>

      <div className="rag-query-scope">
        <div className="rag-query-scope__label">
          <span className="rag-live-dot" />
          Using {selectedDocuments.length} {selectedDocuments.length === 1 ? "document" : "documents"}
        </div>
        <SelectedDocumentChips documents={documents} selectedIds={selectedIds} onRemove={onRemoveDocument} />
      </div>

      <div className="rag-conversation" aria-live="polite">
        {turns.length ? (
          turns.map((turn) => <ConversationTurn key={turn.id} turn={turn} onInspect={onEvidence} />)
        ) : selectedDocuments.length ? (
          <div className="rag-conversation-empty">
            <div className="rag-orbit-mark"><span>RAG</span></div>
            <h3>Your retrieval workspace is ready.</h3>
            <p>Ask a question and the model will answer only with evidence retrieved from the documents you selected.</p>
          </div>
        ) : (
          <div className="rag-conversation-empty">
            <div className="rag-orbit-mark"><span>＋</span></div>
            <h3>Select your retrieval scope.</h3>
            <p>Choose at least one ready document from the knowledge base. Only selected documents will participate in the next question.</p>
          </div>
        )}
      </div>

      <div className="rag-composer-wrap">
        <button
          className={`rag-settings-toggle${settingsOpen ? " is-active" : ""}`}
          type="button"
          onClick={() => setSettingsOpen((current) => !current)}
          aria-expanded={settingsOpen}
        >
          Retrieval settings <span>{settingsOpen ? "↑" : "↓"}</span>
        </button>

        {settingsOpen ? <RetrievalSettings settings={settings} onChange={setSettings} /> : null}

        <form className="rag-composer" onSubmit={handleSubmit}>
          <textarea
            ref={questionRef}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={selectedDocuments.length ? "Ask a question grounded in the selected documents…" : "Select at least one ready document to start asking questions…"}
            spellCheck={false}
            disabled={!selectedDocuments.length || loading}
            maxLength={4000}
            rows={3}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (canAsk) handleSubmit(event);
              }
            }}
          />
          <div className="rag-composer-footer">
            <span>{question.length.toLocaleString()} / 4,000 · Enter to send · Shift+Enter for a new line</span>
            <button type="submit" disabled={!canAsk} aria-label="Send question">
              {loading ? <span className="loader" /> : "↑"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function EvidencePanel({ evidence }) {
  return (
    <aside className="panel rag-evidence-panel">
      <div className="rag-panel-heading">
        <div>
          <span className="rag-section-kicker">Evidence</span>
          <h2>Answer trace</h2>
        </div>
        {evidence ? <span className="rag-count-badge">{evidence.sources?.length || 0}</span> : null}
      </div>

      {!evidence ? (
        <div className="rag-evidence-empty">
          <div>TRACE</div>
          <strong>No answer selected yet.</strong>
          <p>After a RAG response, this panel exposes the sources and retrieval path behind it.</p>
        </div>
      ) : (
        <div className="rag-evidence-content">
          <section>
            <div className="rag-evidence-section-title">
              <h3>Sources</h3>
              <span>{evidence.sources?.length || 0}</span>
            </div>
            <div className="rag-source-list">
              {evidence.sources?.length ? evidence.sources.map((source, index) => (
                <article key={`${source}-${index}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{source}</p>
                </article>
              )) : <p className="rag-muted-copy">No source labels were returned.</p>}
            </div>
          </section>

          <section>
            <div className="rag-evidence-section-title">
              <h3>Retrieval</h3>
              <span>{evidence.retrieval_strategy}</span>
            </div>
            <div className="rag-evidence-stats">
              <div><span>Queries</span><strong>{evidence.retrieval_queries?.length || 0}</strong></div>
              <div><span>Hits</span><strong>{evidence.retrieval_hits?.length || 0}</strong></div>
              <div><span>Context</span><strong>{evidence.context_chunks_count ?? 0}</strong></div>
              <div><span>Budget</span><strong>{evidence.context_characters?.toLocaleString?.() || evidence.context_characters || 0}</strong></div>
            </div>
          </section>

          {evidence.retrieval_queries?.length ? (
            <details className="rag-evidence-details">
              <summary>Retrieval queries <span>{evidence.retrieval_queries.length}</span></summary>
              <ol>
                {evidence.retrieval_queries.map((query, index) => <li key={`${query}-${index}`}>{query}</li>)}
              </ol>
            </details>
          ) : null}

          {evidence.retrieval_hits?.length ? (
            <details className="rag-evidence-details">
              <summary>Ranked hits <span>{evidence.retrieval_hits.length}</span></summary>
              <div className="rag-hit-list">
                {evidence.retrieval_hits.map((hit, index) => (
                  <article key={`${hit.document_id}-${hit.chunk_index}-${index}`}>
                    <div>
                      <strong>#{index + 1} · {hit.document_title}</strong>
                      <span>Chunk {hit.chunk_index}</span>
                    </div>
                    <div className="rag-hit-score">
                      <span>similarity</span>
                      <strong>{formatNumber(hit.best_similarity)}</strong>
                    </div>
                  </article>
                ))}
              </div>
            </details>
          ) : null}

          {evidence.context_chunks?.length ? (
            <details className="rag-evidence-details">
              <summary>Context assembly <span>{evidence.context_chunks.length}</span></summary>
              <div className="rag-context-list">
                {evidence.context_chunks.map((chunk, index) => (
                  <article key={`${chunk.document_id}-${chunk.chunk_index}-${index}`}>
                    <div>
                      <strong>{chunk.document_title}</strong>
                      <span>Chunk {chunk.chunk_index}</span>
                    </div>
                    <em>{chunk.role}</em>
                  </article>
                ))}
              </div>
            </details>
          ) : null}

          <div className="rag-context-budget">
            <div>
              <span>Context budget</span>
              <strong>{(evidence.context_characters || 0).toLocaleString()} / {(evidence.max_context_characters || 0).toLocaleString()} chars</strong>
            </div>
            <div className="rag-context-budget__bar">
              <span style={{ width: `${Math.min(100, ((evidence.context_characters || 0) / Math.max(1, evidence.max_context_characters || 1)) * 100)}%` }} />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function UploadModal({ onClose, onUploaded, onUnauthorized }) {
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  function acceptFiles(fileList) {
    const nextFiles = Array.from(fileList || []);
    const rejected = [];
    const accepted = [];

    nextFiles.forEach((file) => {
      const extension = getExtension(file.name);

      if (!ACCEPTED_EXTENSIONS.includes(extension)) {
        rejected.push(`${file.name}: unsupported file type`);
      } else if (file.size > MAX_UPLOAD_BYTES) {
        rejected.push(`${file.name}: exceeds the 10 MB limit`);
      } else if (file.size === 0) {
        rejected.push(`${file.name}: file is empty`);
      } else {
        accepted.push(file);
      }
    });

    setFiles(accepted);
    setError(rejected.join(" · "));
    if (accepted.length !== 1) setTitle("");
  }

  async function handleUpload() {
    if (!files.length || uploading) return;

    setUploading(true);
    setError("");

    const uploaded = [];
    const failures = [];

    for (const file of files) {
      try {
        const document = await uploadDocumentRagDocument({
          file,
          title: files.length === 1 ? title : "",
        });
        uploaded.push(document);
      } catch (requestError) {
        if (requestError instanceof DocumentRagApiError && requestError.status === 401) {
          onUnauthorized();
          return;
        }
        failures.push(`${file.name}: ${requestError.message || "upload failed"}`);
      }
    }

    setUploading(false);

    await onUploaded(uploaded);

    if (failures.length) {
      const uploadedNames = new Set(uploaded.map((document) => document.file_name));
      setFiles((current) => current.filter((file) => !uploadedNames.has(file.name)));
      setError(failures.join(" · "));
      return;
    }

    onClose();
  }

  return (
    <Modal
      title="Upload documents"
      description="Add documents to your private knowledge base. Each file is extracted, chunked and embedded before it becomes available for retrieval."
      onClose={uploading ? () => {} : onClose}
      actions={(
        <>
          <button className="button button--secondary" type="button" onClick={onClose} disabled={uploading}>Cancel</button>
          <button className="button button--primary" type="button" onClick={handleUpload} disabled={!files.length || uploading}>
            {uploading ? <><span className="loader" /> Ingesting…</> : <>Upload {files.length > 1 ? `${files.length} documents` : "document"} →</>}
          </button>
        </>
      )}
    >
      <label
        className="rag-upload-dropzone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          acceptFiles(event.dataTransfer.files);
        }}
      >
        <input type="file" multiple accept=".pdf,.docx,.odt,.rtf,.fodt" onChange={(event) => acceptFiles(event.target.files)} />
        <div className="rag-upload-dropzone__icon">↑</div>
        <div>
          <strong>Drop documents here or browse files</strong>
          <span>PDF · DOCX · ODT · RTF · FODT · up to 10 MB each</span>
        </div>
      </label>

      {files.length ? (
        <div className="rag-upload-file-list">
          {files.map((file) => (
            <article key={`${file.name}-${file.lastModified}`}>
              <div>
                <strong>{file.name}</strong>
                <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <button type="button" disabled={uploading} onClick={() => setFiles((current) => current.filter((item) => item !== file))}>×</button>
            </article>
          ))}
        </div>
      ) : null}

      {files.length === 1 ? (
        <label className="field rag-upload-title">
          <span className="field__label-row">
            <span className="field__label">Document title</span>
            <span className="field__hint">Optional</span>
          </span>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Defaults to the file name" maxLength={255} />
        </label>
      ) : null}

      {error ? <div className="form-error" role="alert">{error}</div> : null}
    </Modal>
  );
}

function DeleteDocumentsModal({ target, onClose, onConfirm, deleting }) {
  const count = target.ids.length;

  return (
    <Modal
      title={count === 1 ? "Delete document?" : `Delete ${count} documents?`}
      description="This permanently removes the selected document data and indexed retrieval content from your workspace."
      onClose={deleting ? () => {} : onClose}
      danger
      actions={(
        <>
          <button className="button button--secondary" type="button" onClick={onClose} disabled={deleting}>Cancel</button>
          <button className="button rag-danger-button" type="button" onClick={onConfirm} disabled={deleting}>
            {deleting ? <><span className="loader rag-loader-light" /> Deleting…</> : count === 1 ? "Delete document" : "Delete documents"}
          </button>
        </>
      )}
    >
      <div className="rag-delete-summary">
        <span>Permanent action</span>
        <strong>{target.label}</strong>
        <p>This action cannot be undone.</p>
      </div>
    </Modal>
  );
}

function DeleteAccountModal({ user, onClose, onDeleted, onUnauthorized }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!password || deleting) return;
    setDeleting(true);
    setError("");

    try {
      await deleteDocumentRagAccount(password);
      onDeleted();
    } catch (requestError) {
      if (requestError instanceof DocumentRagApiError && requestError.status === 401) {
        onUnauthorized();
        return;
      }
      setError(requestError.message || "Account deletion failed.");
      setDeleting(false);
    }
  }

  return (
    <Modal
      title="Delete account"
      description="This permanently removes your account and all documents associated with it."
      onClose={deleting ? () => {} : onClose}
      danger
      actions={(
        <>
          <button className="button button--secondary" type="button" onClick={onClose} disabled={deleting}>Cancel</button>
          <button className="button rag-danger-button" type="button" onClick={handleDelete} disabled={!password || deleting}>
            {deleting ? <><span className="loader rag-loader-light" /> Deleting account…</> : "Delete my account"}
          </button>
        </>
      )}
    >
      <div className="rag-account-danger-copy">
        <span>Account</span>
        <strong>{user.email}</strong>
        <p>Enter your current password to confirm this permanent action.</p>
      </div>
      <label className="field">
        <span className="field__label">Current password</span>
        <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />
      </label>
      {error ? <div className="form-error" role="alert">{error}</div> : null}
    </Modal>
  );
}

function Workspace({ user, onSignOut }) {
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [turns, setTurns] = useState([]);
  const [evidence, setEvidence] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingDocuments, setDeletingDocuments] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const questionRef = useRef(null);

  async function refreshDocuments() {
    setDocumentsLoading(true);

    try {
      const nextDocuments = await listDocumentRagDocuments();
      setDocuments(nextDocuments || []);
      setSelectedIds((current) => {
        const availableReadyIds = new Set((nextDocuments || []).filter((document) => document.status === "ready").map((document) => document.id));
        return new Set([...current].filter((id) => availableReadyIds.has(id)));
      });
      return nextDocuments || [];
    } catch (requestError) {
      if (requestError instanceof DocumentRagApiError && requestError.status === 401) {
        onSignOut();
        return [];
      }
      setDeleteError(requestError.message || "Could not load documents.");
      return [];
    } finally {
      setDocumentsLoading(false);
    }
  }

  useEffect(() => {
    refreshDocuments();
  }, []);

  useEffect(() => {
    if (!accountMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target)
      ) {
        setAccountMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  function toggleDocument(documentId) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(documentId)) next.delete(documentId);
      else next.add(documentId);
      return next;
    });
  }

  function selectAllReady(shouldSelect) {
    setSelectedIds(() => shouldSelect
      ? new Set(documents.filter((document) => document.status === "ready").map((document) => document.id))
      : new Set());
  }

  function requestDelete(document) {
    setDeleteError("");
    setDeleteTarget({ ids: [document.id], label: document.title });
  }

  function requestBulkDelete() {
    const ids = [...selectedIds];
    const labels = documents.filter((document) => selectedIds.has(document.id)).map((document) => document.title);
    if (!ids.length) return;
    setDeleteError("");
    setDeleteTarget({ ids, label: labels.join(", ") });
  }

  async function confirmDelete() {
    if (!deleteTarget || deletingDocuments) return;
    setDeletingDocuments(true);
    setDeleteError("");

    try {
      if (deleteTarget.ids.length === 1) {
        await deleteDocumentRagDocument(deleteTarget.ids[0]);
      } else {
        await deleteDocumentRagDocuments(deleteTarget.ids);
      }

      const deletedIds = new Set(deleteTarget.ids);
      setSelectedIds((current) => new Set([...current].filter((id) => !deletedIds.has(id))));
      setDeleteTarget(null);
      await refreshDocuments();
    } catch (requestError) {
      if (requestError instanceof DocumentRagApiError && requestError.status === 401) {
        onSignOut();
        return;
      }
      setDeleteError(requestError.message || "Document deletion failed.");
    } finally {
      setDeletingDocuments(false);
    }
  }

  async function handleUploaded(uploaded) {
    const nextDocuments = await refreshDocuments();
    const uploadedIds = new Set(uploaded.map((document) => document.id));
    const readyUploadedIds = nextDocuments.filter((document) => uploadedIds.has(document.id) && document.status === "ready").map((document) => document.id);

    setSelectedIds((current) => new Set([...current, ...readyUploadedIds]));
  }

  return (
    <div className="rag-workspace-page">
      <div className="rag-workspace-topbar">
        <div>
          <Link className="back-link" to="/">← All projects</Link>
          <div className="rag-workspace-title-row">
            <div>
              <span className="rag-section-kicker">Document RAG · Workspace</span>
              <h1>Knowledge workspace</h1>
            </div>
            <span className="rag-workspace-live"><span className="rag-live-dot" /> Live · Authenticated</span>
          </div>
        </div>

        <div
          className="rag-account-menu-wrap"
          ref={accountMenuRef}
        >
          <button className="rag-account-trigger" type="button" onClick={() => setAccountMenuOpen((current) => !current)}>
            <span className="rag-account-avatar">{user.email.slice(0, 1).toUpperCase()}</span>
            <span><strong>{user.email}</strong><small>Private workspace</small></span>
            <b aria-hidden="true">⌄</b>
          </button>
          {accountMenuOpen ? (
            <div className="rag-account-menu">
              <div><span>Signed in as</span><strong>{user.email}</strong></div>
              <button type="button" onClick={onSignOut}>Sign out</button>
              <hr />
              <button className="is-danger" type="button" onClick={() => { setAccountMenuOpen(false); setDeleteAccountOpen(true); }}>Delete account</button>
            </div>
          ) : null}
        </div>
      </div>

      {deleteError ? <div className="form-error rag-workspace-alert" role="alert">{deleteError}</div> : null}

      <div className="rag-workspace-grid">
        <KnowledgeBase
          documents={documents}
          selectedIds={selectedIds}
          onToggle={toggleDocument}
          onSelectAll={selectAllReady}
          onUpload={() => setUploadOpen(true)}
          onDelete={requestDelete}
          onBulkDelete={requestBulkDelete}
          loading={documentsLoading}
        />

        <ChatWorkspace
          documents={documents}
          selectedIds={selectedIds}
          onRemoveDocument={toggleDocument}
          turns={turns}
          setTurns={setTurns}
          onEvidence={setEvidence}
          onUnauthorized={onSignOut}
        />

        <EvidencePanel evidence={evidence} />
      </div>

      {uploadOpen ? <UploadModal onClose={() => setUploadOpen(false)} onUploaded={handleUploaded} onUnauthorized={onSignOut} /> : null}
      {deleteTarget ? <DeleteDocumentsModal target={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} deleting={deletingDocuments} /> : null}
      {deleteAccountOpen ? <DeleteAccountModal user={user} onClose={() => setDeleteAccountOpen(false)} onDeleted={onSignOut} onUnauthorized={onSignOut} /> : null}
    </div>
  );
}

export default function DocumentRagPage() {
  const [authState, setAuthState] = useState("checking");
  const [user, setUser] = useState(null);

  function signOut() {
    clearDocumentRagAccessToken();
    setUser(null);
    setAuthState("signedOut");
  }

  async function completeAuthentication(authenticatedUser = null) {
    try {
      const currentUser = authenticatedUser || await getDocumentRagUser();
      setUser(currentUser);
      setAuthState("signedIn");
    } catch {
      signOut();
    }
  }

  useEffect(() => {
    const token = getDocumentRagAccessToken();

    if (!token) {
      setAuthState("signedOut");
      return;
    }

    let cancelled = false;

    getDocumentRagUser()
      .then((currentUser) => {
        if (cancelled) return;
        setUser(currentUser);
        setAuthState("signedIn");
      })
      .catch(() => {
        if (cancelled) return;
        clearDocumentRagAccessToken();
        setUser(null);
        setAuthState("signedOut");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (authState === "checking") {
    return (
      <div className="rag-auth-loading">
        <span className="loader rag-loader-light" />
        <span>Restoring secure workspace…</span>
      </div>
    );
  }

  if (authState !== "signedIn" || !user) {
    return <AuthScreen onAuthenticated={completeAuthentication} />;
  }

  return <Workspace user={user} onSignOut={signOut} />;
}
