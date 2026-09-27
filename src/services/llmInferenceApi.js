import { API_CONFIG } from "./apiConfig";

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json().catch(() => null) : null;
  if (response.ok) return data;

  const detail = data?.detail;
  if (typeof detail === "string") throw new Error(detail);
  if (Array.isArray(detail)) throw new Error(detail.map((item) => item?.msg || "Invalid request.").join(" "));
  throw new Error(`Request failed with status ${response.status}.`);
}

export async function runInference(payload) {
  let response;
  try {
    response = await fetch(`${API_CONFIG.llmInference}/v1/inference`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Could not connect to the LLM Inference API.");
  }
  return parseResponse(response);
}

export async function runBatchInference(requests) {
  let response;
  try {
    response = await fetch(`${API_CONFIG.llmInference}/v1/inference/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
    });
  } catch {
    throw new Error("Could not connect to the LLM Inference API.");
  }
  return parseResponse(response);
}
