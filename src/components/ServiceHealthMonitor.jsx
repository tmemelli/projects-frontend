import { useCallback, useEffect, useRef, useState } from "react";
import {
  BACKEND_SERVICES,
  HEALTH_CHECK_INTERVAL_MS,
  HEALTH_IDLE_TIMEOUT_MS,
  checkBackendService,
} from "../services/serviceWarmup";

const INITIAL_STATES = Object.fromEntries(
  BACKEND_SERVICES.map(({ id }) => [
    id,
    { status: "idle", detail: "Waiting for the first check.", checkedAt: null },
  ]),
);

const STATUS_LABELS = {
  idle: "Pending",
  checking: "Checking",
  waking: "Waking / slow",
  ready: "Ready",
  unverified: "Unverified",
  unavailable: "Unavailable",
  paused: "Paused",
};

function formatCountdown(nextCheckAt, now) {
  const remaining = Math.max(0, Math.ceil((nextCheckAt - now) / 1000));
  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatTime(timestamp) {
  if (!timestamp) return "Not checked yet";
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function ServiceHealthMonitor() {
  const [open, setOpen] = useState(false);
  const [services, setServices] = useState(INITIAL_STATES);
  const [checking, setChecking] = useState(false);
  const [monitoring, setMonitoring] = useState(true);
  const [nextCheckAt, setNextCheckAt] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const rootRef = useRef(null);
  const mountedRef = useRef(false);
  const activeControllerRef = useRef(null);
  const nextDueRef = useRef(0);
  const lastActivityRef = useRef(Date.now());

  const runCheck = useCallback(async (forceVerify = false) => {
    if (
      activeControllerRef.current ||
      document.visibilityState !== "visible" ||
      !navigator.onLine
    ) {
      return;
    }

    const controller = new AbortController();
    activeControllerRef.current = controller;
    setChecking(true);
    setNextCheckAt(null);
    setServices((previous) => Object.fromEntries(
      BACKEND_SERVICES.map(({ id }) => [
        id,
        { ...previous[id], status: "checking", detail: "Checking the health endpoint..." },
      ]),
    ));

    const slowTimer = setTimeout(() => {
      if (activeControllerRef.current !== controller || !mountedRef.current) return;
      setServices((previous) => Object.fromEntries(
        BACKEND_SERVICES.map(({ id }) => [
          id,
          previous[id].status === "checking"
            ? {
              ...previous[id],
              status: "waking",
              detail: "The response is slow; this service may be waking from sleep.",
            }
            : previous[id],
        ]),
      ));
    }, 8_000);

    try {
      await Promise.all(BACKEND_SERVICES.map(async (service) => {
        let result;
        try {
          result = await checkBackendService(service, {
            signal: controller.signal,
            forceVerify,
          });
        } catch {
          result = { status: "unavailable", detail: "Unexpected health check error." };
        }

        if (activeControllerRef.current !== controller || !mountedRef.current) return;
        setServices((previous) => ({
          ...previous,
          [service.id]: {
            ...result,
            checkedAt: result.status === "paused"
              ? previous[service.id].checkedAt
              : Date.now(),
          },
        }));
      }));
    } finally {
      clearTimeout(slowTimer);
      if (activeControllerRef.current !== controller || !mountedRef.current) return;

      activeControllerRef.current = null;
      setChecking(false);

      if (controller.signal.aborted) {
        nextDueRef.current = 0;
        setNextCheckAt(null);
        return;
      }

      const nextDue = Date.now() + HEALTH_CHECK_INTERVAL_MS;
      nextDueRef.current = nextDue;
      setNextCheckAt(nextDue);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const recordActivity = () => {
      lastActivityRef.current = Date.now();
      if (document.visibilityState === "visible" && navigator.onLine) {
        setMonitoring(true);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        activeControllerRef.current?.abort();
        setMonitoring(false);
      } else {
        recordActivity();
      }
    };

    const onOffline = () => {
      activeControllerRef.current?.abort();
      setMonitoring(false);
    };

    const onOnline = () => {
      recordActivity();
      nextDueRef.current = 0;
    };

    const tick = () => {
      if (document.visibilityState !== "visible") return;

      const currentTime = Date.now();
      setNow(currentTime);
      const isActive = navigator.onLine &&
        currentTime - lastActivityRef.current < HEALTH_IDLE_TIMEOUT_MS;
      setMonitoring(isActive);

      if (isActive && nextDueRef.current <= currentTime && !activeControllerRef.current) {
        void runCheck();
      }
    };

    window.addEventListener("pointerdown", recordActivity, { passive: true });
    window.addEventListener("keydown", recordActivity);
    window.addEventListener("scroll", recordActivity, { capture: true, passive: true });
    window.addEventListener("focus", recordActivity);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const intervalId = setInterval(tick, 1_000);
    // A deferred first check avoids duplicate warm-ups in React StrictMode.
    const initialId = setTimeout(tick, 0);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
      clearTimeout(initialId);
      activeControllerRef.current?.abort();
      activeControllerRef.current = null;
      window.removeEventListener("pointerdown", recordActivity);
      window.removeEventListener("keydown", recordActivity);
      window.removeEventListener("scroll", recordActivity, true);
      window.removeEventListener("focus", recordActivity);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [runCheck]);

  useEffect(() => {
    if (!open) return undefined;

    const onOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onOutsideClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onOutsideClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const statuses = BACKEND_SERVICES.map(({ id }) => services[id].status);
  const readyCount = statuses.filter((status) => status === "ready").length;
  const unavailableCount = statuses.filter((status) => status === "unavailable").length;
  const unverifiedCount = statuses.filter((status) => status === "unverified").length;
  const online = typeof navigator === "undefined" || navigator.onLine;

  let overall = "idle";
  let overallLabel = "Waiting for first check";
  if (!online) {
    overall = "paused";
    overallLabel = "Browser offline";
  } else if (!monitoring) {
    overall = "paused";
    overallLabel = "Monitoring paused";
  } else if (checking) {
    overall = "checking";
    overallLabel = "Checking services";
  } else if (readyCount === BACKEND_SERVICES.length) {
    overall = "ready";
    overallLabel = "All services ready";
  } else if (unavailableCount > 0) {
    overall = "unavailable";
    overallLabel = `${unavailableCount} service${unavailableCount > 1 ? "s" : ""} unavailable`;
  } else if (unverifiedCount > 0) {
    overall = "unverified";
    overallLabel = "Some services could not be verified";
  }

  const handleRefresh = () => {
    lastActivityRef.current = Date.now();
    setMonitoring(true);
    void runCheck(true);
  };

  return (
    <div className="service-health" ref={rootRef}>
      <button
        className="service-health__trigger"
        type="button"
        aria-label={`Backend services: ${overallLabel}`}
        aria-expanded={open}
        aria-controls="service-health-panel"
        onClick={() => setOpen((previous) => !previous)}
      >
        <span className={`service-health__dot service-health__dot--${overall}`} aria-hidden="true" />
        <span className="service-health__trigger-label">Services</span>
        {overall === "ready" && <span className="service-health__count">3/3</span>}
        <span className="service-health__chevron" aria-hidden="true">⌄</span>
      </button>

      {open && (
        <section
          className="service-health__panel"
          id="service-health-panel"
          role="region"
          aria-label="Backend services health"
        >
          <div className="service-health__heading">
            <div>
              <strong>Backend services</strong>
              <span>Live health monitoring</span>
            </div>
            <span className={`service-health__overall service-health__overall--${overall}`} aria-live="polite">
              {overallLabel}
            </span>
          </div>

          <div className="service-health__list">
            {BACKEND_SERVICES.map((service) => {
              const state = services[service.id];
              return (
                <div className="service-health__item" key={service.id}>
                  <div className="service-health__item-heading">
                    <strong>{service.name}</strong>
                    <span className={`service-health__state service-health__state--${state.status}`}>
                      <span className={`service-health__dot service-health__dot--${state.status}`} aria-hidden="true" />
                      {STATUS_LABELS[state.status]}
                    </span>
                  </div>
                  <p>{state.detail}</p>
                  <small>Last checked: {formatTime(state.checkedAt)}</small>
                </div>
              );
            })}
          </div>

          <div className="service-health__footer">
            <div>
              <span>Next health check</span>
              <strong className="service-health__timer">
                {!online
                  ? "Browser offline"
                  : !monitoring
                    ? "Paused while inactive"
                    : checking
                      ? "Checking now..."
                      : nextCheckAt
                        ? formatCountdown(nextCheckAt, now)
                        : "Starting..."}
              </strong>
            </div>
            <button
              className="service-health__refresh"
              type="button"
              onClick={handleRefresh}
              disabled={checking || !online}
            >
              ↻ Check now
            </button>
          </div>
          <p className="service-health__note">
            Checks run every 10 minutes while this tab is visible and active,
            and pause after 20 minutes without interaction. Unverified means
            the browser cannot read the response, not that the service is down.
          </p>
        </section>
      )}
    </div>
  );
}
