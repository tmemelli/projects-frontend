import { API_CONFIG } from "./apiConfig";

const TOKEN_STORAGE_KEY = "document-rag-access-token";

export class DocumentRagApiError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = "DocumentRagApiError";
    this.status = status;
  }
}

export function getDocumentRagAccessToken() {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY) || "";
}

export function setDocumentRagAccessToken(token) {
  if (token) {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    return;
  }

  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function clearDocumentRagAccessToken() {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

async function parsePayload(response) {
  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json().catch(() => null);
}

function getErrorMessage(response, data) {
  const detail = data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg || "Invalid request.")
      .join(" ");
  }

  if (typeof detail?.message === "string") return detail.message;
  if (typeof data?.message === "string") return data.message;

  if (response.status === 401) return "Your session is no longer valid. Please sign in again.";
  if (response.status === 403) return "You do not have permission to perform this action.";
  if (response.status === 429) return "Too many requests. Please try again shortly.";

  return `Request failed with status ${response.status}.`;
}

async function request(path, options = {}) {
  const { auth = false, headers, ...fetchOptions } = options;
  const token = auth ? getDocumentRagAccessToken() : "";
  const requestHeaders = new Headers(headers || {});

  if (auth && !token) {
    throw new DocumentRagApiError("You must be signed in to continue.", 401);
  }

  if (auth) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  let response;

  try {
    response = await fetch(`${API_CONFIG.documentRag}${path}`, {
      ...fetchOptions,
      headers: requestHeaders,
    });
  } catch {
    throw new DocumentRagApiError("Could not connect to the Document RAG API.");
  }

  const data = await parsePayload(response);

  if (!response.ok) {
    throw new DocumentRagApiError(getErrorMessage(response, data), response.status);
  }

  return data;
}

async function jsonRequest(path, { method = "GET", body, auth = false } = {}) {
  const headers = new Headers();

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  return request(path, {
    method,
    auth,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function registerDocumentRagUser({ email, password }) {
  return jsonRequest("/v1/auth/register", {
    method: "POST",
    body: { email, password },
  });
}

export function loginDocumentRagUser({ email, password }) {
  return jsonRequest("/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function getDocumentRagUser() {
  return jsonRequest("/v1/auth/me", { auth: true });
}

export function listDocumentRagDocuments() {
  return jsonRequest("/v1/documents", { auth: true });
}

export function uploadDocumentRagDocument({ file, title = "" }) {
  const formData = new FormData();
  formData.append("file", file);

  if (title.trim()) {
    formData.append("title", title.trim());
  }

  return request("/v1/documents/upload", {
    method: "POST",
    auth: true,
    body: formData,
  });
}

export function deleteDocumentRagDocument(documentId) {
  return request(`/v1/documents/${documentId}`, {
    method: "DELETE",
    auth: true,
  });
}

export function deleteDocumentRagDocuments(documentIds) {
  return jsonRequest("/v1/documents/bulk-delete", {
    method: "POST",
    auth: true,
    body: { document_ids: documentIds },
  });
}

export function queryDocumentRag({
  documentIds,
  query,
  language = "pt-BR",
  limit = 5,
  neighborWindow = 1,
  transformQuery = false,
}) {
  return jsonRequest("/v1/rag/query", {
    method: "POST",
    auth: true,
    body: {
      document_ids: documentIds,
      query,
      language,
      limit,
      neighbor_window: neighborWindow,
      transform_query: transformQuery,
    },
  });
}

export function deleteDocumentRagAccount(password) {
  return jsonRequest("/v1/account/delete", {
    method: "POST",
    auth: true,
    body: { password },
  });
}
