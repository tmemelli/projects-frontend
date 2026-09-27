import { useMemo, useState } from "react";
import ProjectHero from "../components/ProjectHero";
import { Field } from "../components/Field";
import { runBatchInference, runInference } from "../services/llmInferenceApi";

const MODELS = {
  groq: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"],
  gemini: ["gemini-3.1-flash-lite"],
};

const emptyRequest = () => ({ provider: "", model: "", system_prompt: "", prompt: "", temperature: 0.7, max_tokens: 500 });

function ProviderFields({ request, onChange }) {
  const models = MODELS[request.provider] || [];
  return (
    <>
      <div className="form-grid">
        <Field label="Provider">
          <select className="select" value={request.provider} onChange={(e) => onChange({ ...request, provider: e.target.value, model: "" })}>
            <option value="">Select a provider</option>
            <option value="groq">Groq</option>
            <option value="gemini">Gemini</option>
          </select>
        </Field>
        <Field label="Model">
          <select className="select" value={request.model} disabled={!request.provider} onChange={(e) => onChange({ ...request, model: e.target.value })}>
            <option value="">{request.provider ? "Select a model" : "Select a provider first"}</option>
            {models.map((model) => <option key={model} value={model}>{model}</option>)}
          </select>
        </Field>
      </div>
      <Field label="System prompt" hint="Optional">
        <textarea className="textarea" style={{ minHeight: 96 }} maxLength={2000} value={request.system_prompt} onChange={(e) => onChange({ ...request, system_prompt: e.target.value })} placeholder="Define behavior, role, or constraints..." spellCheck={false} />
      </Field>
      <Field label="Prompt" hint={`${request.prompt.length} / 2000`}>
        <textarea className="textarea" maxLength={2000} value={request.prompt} onChange={(e) => onChange({ ...request, prompt: e.target.value })} placeholder="What should the model do?" spellCheck={false} />
      </Field>
      <div className="form-grid">
        <Field label="Temperature" hint="0.0 – 2.0">
          <input className="input" type="number" min="0" max="2" step="0.1" value={request.temperature} onChange={(e) => onChange({ ...request, temperature: Number(e.target.value) })} />
        </Field>
        <Field label="Max tokens" hint="1 – 500">
          <input className="input" type="number" min="1" max="500" step="1" value={request.max_tokens} onChange={(e) => onChange({ ...request, max_tokens: Number(e.target.value) })} />
        </Field>
      </div>
    </>
  );
}

function normalizePayload(request) {
  const payload = {
    provider: request.provider,
    model: request.model,
    prompt: request.prompt.trim(),
    temperature: Number(request.temperature),
    max_tokens: Number(request.max_tokens),
  };
  if (request.system_prompt.trim()) payload.system_prompt = request.system_prompt.trim();
  return payload;
}

function validateRequest(request, prefix = "") {
  if (!request.provider) return `${prefix}Please select a provider.`;
  if (!request.model) return `${prefix}Please select a model.`;
  if (!request.prompt.trim()) return `${prefix}Please enter a prompt.`;
  if (request.temperature < 0 || request.temperature > 2) return `${prefix}Temperature must be between 0 and 2.`;
  if (!Number.isInteger(request.max_tokens) || request.max_tokens < 1 || request.max_tokens > 500) return `${prefix}Max tokens must be an integer between 1 and 500.`;
  return "";
}

export default function LlmInferencePage() {
  const [mode, setMode] = useState("single");
  const [singleRequest, setSingleRequest] = useState(emptyRequest());
  const [singleResult, setSingleResult] = useState(null);
  const [batchRequests, setBatchRequests] = useState([emptyRequest()]);
  const [batchResult, setBatchResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canAdd = batchRequests.length < 5;
  const title = useMemo(() => mode === "single" ? "Single inference" : "Batch inference", [mode]);

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
  }

  async function submitSingle(event) {
    event.preventDefault();

    const validationError = validateRequest(singleRequest);
    if (validationError) return setError(validationError);

    const payload = normalizePayload(singleRequest);

    setError("");
    setLoading(true);
    setSingleResult(null);

    try {
      const response = await runInference(payload);

      setSingleResult({
        request: payload,
        response,
      });
    } catch (requestError) {
      setError(requestError.message || "Inference failed.");
    } finally {
      setLoading(false);
    }
  }

  async function submitBatch(event) {
    event.preventDefault();

    for (let index = 0; index < batchRequests.length; index += 1) {
      const validationError = validateRequest(
        batchRequests[index],
        `Request ${index + 1}: `
      );

      if (validationError) {
        return setError(validationError);
      }
    }

    const requests = batchRequests.map(normalizePayload);

    setError("");
    setLoading(true);
    setBatchResult(null);

    try {
      const response = await runBatchInference(requests);

      setBatchResult({
        requests,
        response,
      });
    } catch (requestError) {
      setError(requestError.message || "Batch inference failed.");
    } finally {
      setLoading(false);
    }
  }

  function updateBatch(index, request) {
    setBatchRequests((current) => current.map((item, itemIndex) => itemIndex === index ? request : item));
  }

  return (
    <>
      <ProjectHero
        eyebrow="AI Infrastructure · Inference"
        title="LLM Inference Service"
        description="Run resilient inference through multiple providers with fallback, retries, concurrency controls, rate limiting, and batch execution."
      >
        <div className="hero-stack"><span>Multi-provider</span><span>Fallback</span><span>Async batch</span><span>Rate limiting</span></div>
      </ProjectHero>

      <div className="workspace">
        <section className="panel panel--form">
          <div className="panel__header">
            <div><h2>{title}</h2><p>{mode === "single" ? "Inspect one inference request end to end." : "Execute up to five independent requests concurrently."}</p></div>
            <div className="tabs" role="tablist">
              <button className={`tab${mode === "single" ? " is-active" : ""}`} type="button" onClick={() => switchMode("single")}>Single</button>
              <button className={`tab${mode === "batch" ? " is-active" : ""}`} type="button" onClick={() => switchMode("batch")}>Batch</button>
            </div>
          </div>

          {mode === "single" ? (
            <div className="panel__body">
              <form onSubmit={submitSingle}>
                <ProviderFields request={singleRequest} onChange={(next) => { setSingleRequest(next); setError(""); }} />
                {error ? <div className="form-error" role="alert">{error}</div> : null}
                <div className="actions">
                  <button className="button button--primary" type="submit" disabled={loading}>{loading ? <><span className="loader" /> Running…</> : <>Run inference <span>→</span></>}</button>
                </div>
              </form>
            </div>
          ) : (
            <div className="panel__body">
              <form onSubmit={submitBatch}>
                {batchRequests.map((request, index) => (
                  <div className="batch-card" key={index}>
                    <div className="batch-card__header"><h3>Request {index + 1}</h3>{index > 0 ? <button className="batch-remove" type="button" onClick={() => setBatchRequests((current) => current.filter((_, i) => i !== index))}>Remove</button> : null}</div>
                    <ProviderFields request={request} onChange={(next) => { updateBatch(index, next); setError(""); }} />
                  </div>
                ))}
                <div className="batch-toolbar"><span>{batchRequests.length} / 5 requests</span>{canAdd ? <button className="button button--secondary" type="button" onClick={() => setBatchRequests((current) => [...current, emptyRequest()])}>+ Add request</button> : null}</div>
                {error ? <div className="form-error" role="alert">{error}</div> : null}
                <div className="actions"><button className="button button--primary" type="submit" disabled={loading}>{loading ? <><span className="loader" /> Running batch…</> : <>Run batch <span>→</span></>}</button></div>
              </form>
            </div>
          )}
        </section>

        {mode === "single" && singleResult ? (
          <section className="panel">
            <div className="panel__header">
              <div>
                <h2>Inference result</h2>
                <p>The response returned by the real inference service.</p>
              </div>

              <span className="status-badge status-badge--live">
                <span className="status-dot" />
                Completed
              </span>
            </div>

            <div className="panel__body">
              <div className="response-box">
                {singleResult.response.content}
              </div>

              <div className="meta-row">
                <div className="meta-stat">
                  <span>Requested Provider</span>
                  <strong>{singleResult.request.provider}</strong>
                </div>

                <div className="meta-stat">
                  <span>Requested Model</span>
                  <strong>{singleResult.request.model}</strong>
                </div>

                <div className="meta-stat">
                  <span>Executed Provider</span>
                  <strong>{singleResult.response.provider}</strong>
                </div>

                <div className="meta-stat">
                  <span>Executed Model</span>
                  <strong>{singleResult.response.model}</strong>
                </div>
              </div>

              <div className="meta-row">
                <div className="meta-stat">
                  <span>Prompt tokens</span>
                  <strong>{singleResult.response.prompt_tokens}</strong>
                </div>

                <div className="meta-stat">
                  <span>Completion tokens</span>
                  <strong>{singleResult.response.completion_tokens}</strong>
                </div>

                <div className="meta-stat">
                  <span>Latency</span>
                  <strong>
                    {Number(singleResult.response.latency_ms).toFixed(2)} ms
                  </strong>
                </div>

                <div className="meta-stat">
                  <span>Request ID</span>
                  <strong className="request-id">
                    {singleResult.response.request_id}
                  </strong>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {mode === "batch" && batchResult ? (
          <section className="panel">
            <div className="panel__header">
              <div>
                <h2>Batch result</h2>
                <p>Concurrent execution summary and per-request responses.</p>
              </div>

              <span
                className={`status-badge ${
                  batchResult.response.failure_count === 0
                    ? "status-badge--live"
                    : ""
                }`}
              >
                <span className="status-dot" />
                {batchResult.response.failure_count === 0
                  ? "Completed"
                  : "Completed with failures"}
              </span>
            </div>

            <div className="panel__body">
              <div className="batch-summary">
                <div className="batch-stat">
                  <span>Total</span>
                  <strong>{batchResult.response.total}</strong>
                </div>

                <div className="batch-stat">
                  <span>Success</span>
                  <strong>{batchResult.response.success_count}</strong>
                </div>

                <div className="batch-stat">
                  <span>Failures</span>
                  <strong>{batchResult.response.failure_count}</strong>
                </div>

                <div className="batch-stat">
                  <span>Elapsed</span>
                  <strong>
                    {Number(batchResult.response.elapsed_ms).toFixed(2)} ms
                  </strong>
                </div>
              </div>

              <div className="batch-result-list">
                {batchResult.response.results?.map((item, index) => {
                  const requested = batchResult.requests[index];

                  return (
                    <article
                      className="batch-result-card"
                      key={`${item.request_id}-${index}`}
                    >
                      <div className="batch-result-card__header">
                        <h3>Request {index + 1}</h3>

                        <span
                          className={`request-status ${
                            item.success
                              ? "request-status--success"
                              : "request-status--failure"
                          }`}
                        >
                          {item.success ? "Success" : "Failed"}
                        </span>
                      </div>

                      <div className="batch-result-metadata">
                        <div className="batch-result-meta">
                          <span>Requested Provider</span>
                          <strong>{requested.provider}</strong>
                        </div>

                        <div className="batch-result-meta">
                          <span>Requested Model</span>
                          <strong>{requested.model}</strong>
                        </div>

                        {item.success && item.response ? (
                          <>
                            <div className="batch-result-meta">
                              <span>Executed Provider</span>
                              <strong>{item.response.provider}</strong>
                            </div>

                            <div className="batch-result-meta">
                              <span>Executed Model</span>
                              <strong>{item.response.model}</strong>
                            </div>

                            <div className="batch-result-meta">
                              <span>Prompt tokens</span>
                              <strong>{item.response.prompt_tokens}</strong>
                            </div>

                            <div className="batch-result-meta">
                              <span>Completion tokens</span>
                              <strong>{item.response.completion_tokens}</strong>
                            </div>

                            <div className="batch-result-meta">
                              <span>Latency</span>
                              <strong>
                                {Number(item.response.latency_ms).toFixed(2)} ms
                              </strong>
                            </div>
                          </>
                        ) : null}

                        <div className="batch-result-meta">
                          <span>Request ID</span>
                          <strong className="request-id">
                            {item.request_id}
                          </strong>
                        </div>
                      </div>

                      <div className="request-context">
                        <div>
                          <span>System prompt</span>
                          <pre>
                            {requested.system_prompt || "Not provided"}
                          </pre>
                        </div>

                        <div>
                          <span>Prompt</span>
                          <pre>{requested.prompt}</pre>
                        </div>
                      </div>

                      <div className="response-box response-box--batch">
                        {item.success && item.response
                          ? item.response.content
                          : `${item.error_type || "InferenceError"}: ${
                              item.error_message || "The request failed."
                            }`}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
