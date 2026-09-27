import { API_CONFIG } from "./apiConfig";

function getErrorMessage(response, data) {
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail)) return data.detail.map((item) => item?.msg || "Invalid request.").join(" ");
  if (typeof data?.detail?.message === "string") return data.detail.message;
  if (typeof data?.message === "string") return data.message;
  return `Request failed with status ${response.status}.`;
}

export async function matchCandidate({ companyName, jobDescription, responseLanguage, resume }) {
  const formData = new FormData();
  formData.append("company_name", companyName);
  formData.append("job_description", jobDescription);
  formData.append("response_language", responseLanguage);
  formData.append("resume", resume);

  let response;
  try {
    response = await fetch(`${API_CONFIG.jobMatcher}/api/v1/match`, { method: "POST", body: formData });
  } catch {
    throw new Error("Could not connect to the AI Job Matcher API.");
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json().catch(() => null) : null;

  if (!response.ok) throw new Error(getErrorMessage(response, data));
  if (!data || typeof data !== "object") throw new Error("The API returned an invalid response.");

  return {
    data,
    metadata: {
      requestedProvider: response.headers.get("X-LLM-Requested-Provider"),
      requestedModel: response.headers.get("X-LLM-Requested-Model"),
      processedProvider: response.headers.get("X-LLM-Processed-Provider"),
      processedModel: response.headers.get("X-LLM-Processed-Model"),
      llmRequestId: response.headers.get("X-LLM-Request-ID"),
      promptTokens: response.headers.get("X-LLM-Prompt-Tokens"),
      completionTokens: response.headers.get("X-LLM-Completion-Tokens"),
      totalTokens: response.headers.get("X-LLM-Total-Tokens"),
      llmLatencyMs: response.headers.get("X-LLM-Latency-Ms"),
      requestDurationMs: response.headers.get("X-Request-Duration-Ms"),
      requestId: response.headers.get("X-Request-ID"),
    },
  };
}
