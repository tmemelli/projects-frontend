import { API_CONFIG } from "./apiConfig";

const HEALTH_ENDPOINTS = [
  `${API_CONFIG.documentRag}/health`,
  `${API_CONFIG.llmInference}/health`,
  `${API_CONFIG.jobMatcher}/health`,
];

export function warmUpBackendServices() {
  for (const url of HEALTH_ENDPOINTS) {
    void fetch(url, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
    }).catch(() => {
      // Best-effort warm-up only. Page rendering must never depend on it.
    });
  }
}
