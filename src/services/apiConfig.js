const cleanBaseUrl = (url) => String(url || "").replace(/\/+$/, "");

export const API_CONFIG = {
  jobMatcher: cleanBaseUrl(
    import.meta.env.VITE_JOB_MATCHER_API_URL || "https://ai-job-matcher-api-ti7r.onrender.com",
  ),
  llmInference: cleanBaseUrl(
    import.meta.env.VITE_LLM_INFERENCE_API_URL || "https://llm-inference-service-g4os.onrender.com",
  ),
  documentRag: cleanBaseUrl(
    import.meta.env.VITE_DOCUMENT_RAG_API_URL || "https://document-rag-service.onrender.com",
  ),
};
