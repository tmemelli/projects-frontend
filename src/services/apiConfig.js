const cleanBaseUrl = (url) => String(url || "").replace(/\/+$/, "");

export const API_CONFIG = {
  jobMatcher: cleanBaseUrl(
    import.meta.env.VITE_JOB_MATCHER_API_URL || "https://matcher-api.thiagomemelli.com.br",
  ),
  llmInference: cleanBaseUrl(
    import.meta.env.VITE_LLM_INFERENCE_API_URL || "https://api.thiagomemelli.com.br",
  ),
};
