/**
 * Probe a public health endpoint without confusing an opaque response with success.
 *
 * A readable 2xx CORS response is the only evidence for "ready". When CORS is
 * blocked, a best-effort no-cors request still warms the backend, but its HTTP
 * status cannot be inspected and must be reported as "unverified".
 */
export async function probeHealthEndpoint(
  url,
  {
    signal,
    preferOpaque = false,
    timeoutMs = 90_000,
    fetchImpl = fetch,
  } = {},
) {
  if (signal?.aborted) {
    return { status: "paused", detail: "Check interrupted." };
  }

  const controller = new AbortController();
  let timedOut = false;
  const abortFromParent = () => controller.abort();
  signal?.addEventListener("abort", abortFromParent, { once: true });

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const request = (mode) => fetchImpl(url, {
    method: "GET",
    mode,
    cache: "no-store",
    signal: controller.signal,
  });

  try {
    if (!preferOpaque) {
      try {
        const response = await request("cors");
        if (!response.ok) {
          return {
            status: "unavailable",
            detail: `Health endpoint returned HTTP ${response.status}.`,
          };
        }

        return { status: "ready", detail: `Health endpoint returned HTTP ${response.status}.` };
      } catch {
        if (signal?.aborted) {
          return { status: "paused", detail: "Check interrupted." };
        }
        if (timedOut) {
          return { status: "unavailable", detail: "Health check timed out." };
        }
        // Network errors and CORS failures are indistinguishable to fetch.
        // Fall back to an opaque request without claiming the service is healthy.
      }
    }

    try {
      await request("no-cors");
      return {
        status: "unverified",
        detail: "Warm-up request sent; the browser cannot verify its HTTP response.",
      };
    } catch {
      if (signal?.aborted) {
        return { status: "paused", detail: "Check interrupted." };
      }
      if (timedOut) {
        return { status: "unavailable", detail: "Health check timed out." };
      }
      return { status: "unavailable", detail: "Health endpoint could not be reached." };
    }
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortFromParent);
  }
}
