import { API_CONFIG } from "./apiConfig";
import { probeHealthEndpoint } from "./healthProbe";

export const HEALTH_CHECK_INTERVAL_MS = 10 * 60 * 1000;
export const HEALTH_IDLE_TIMEOUT_MS = 20 * 60 * 1000;

export const BACKEND_SERVICES = [
  { id: "jobMatcher", name: "AI Job Matcher", url: `${API_CONFIG.jobMatcher}/health` },
  { id: "llmInference", name: "LLM Inference", url: `${API_CONFIG.llmInference}/health` },
  { id: "documentRag", name: "Document RAG", url: `${API_CONFIG.documentRag}/health` },
];

// Avoid issuing two requests every ten minutes when a backend does not allow
// browser-readable CORS responses. Manual refresh retries CORS verification.
const opaqueOnlyServices = new Set();

export async function checkBackendService(service, { signal, forceVerify = false } = {}) {
  const result = await probeHealthEndpoint(service.url, {
    signal,
    preferOpaque: opaqueOnlyServices.has(service.id) && !forceVerify,
  });

  if (result.status === "unverified") {
    opaqueOnlyServices.add(service.id);
  } else if (result.status === "ready") {
    opaqueOnlyServices.delete(service.id);
  }

  return result;
}
