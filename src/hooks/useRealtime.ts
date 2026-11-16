"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getApiBaseUrl } from "@/lib/api";

export type RealtimeStatus = "live" | "polling" | "paused" | "demo" | "connecting";

interface UseRealtimeOptions {
  /** Called when the BE pushes an event over SSE. */
  onEvent?: (payload: unknown) => void;
  /** Called on every poll tick (fallback mode). */
  onPoll: () => void;
  /** Poll interval in ms when SSE is unavailable. Default 5000. */
  pollIntervalMs?: number;
  /** True when the page is in demo mode (BE unreachable) — no SSE attempt. */
  demo?: boolean;
  enabled?: boolean;
}

/**
 * Realtime: primary SSE (`GET {API}/events/stream`, EventSource), fallback
 * to polling every 5s (paused while the tab is hidden), plus manual refresh
 * via the onPoll caller. Returns the visible connection status.
 */
export function useRealtime({
  onEvent,
  onPoll,
  pollIntervalMs = 5000,
  demo = false,
  enabled = true,
}: UseRealtimeOptions) {
  const [status, setStatus] = useState<RealtimeStatus>(demo ? "demo" : "connecting");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const pollRef = useRef(onPoll);
  const eventRef = useRef(onEvent);
  pollRef.current = onPoll;
  eventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;
    if (demo) {
      setStatus("demo");
      return;
    }
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let sseFailed = false;
    const liveRef = { current: false };

    const startPolling = () => {
      if (pollTimer) return;
      setStatus(document.hidden ? "paused" : "polling");
      pollTimer = setInterval(() => {
        if (document.hidden) {
          setStatus("paused");
          return;
        }
        setStatus("polling");
        pollRef.current();
        setLastUpdate(new Date());
      }, pollIntervalMs);
    };

    const onVisibility = () => {
      if (document.hidden) setStatus("paused");
      else if (sseFailed) setStatus("polling");
    };
    document.addEventListener("visibilitychange", onVisibility);

    try {
      es = new EventSource(`${getApiBaseUrl()}/events/stream`);
      es.onopen = () => {
        sseFailed = false;
        liveRef.current = true;
        setStatus("live");
      };
      es.onmessage = (e) => {
        setStatus("live");
        setLastUpdate(new Date());
        try {
          eventRef.current?.(JSON.parse(e.data));
        } catch {
          eventRef.current?.(e.data);
        }
      };
      es.onerror = () => {
        // EventSource auto-retries; after the first error, start polling as
        // fallback so data still refreshes without a reload.
        if (!sseFailed) {
          sseFailed = true;
          startPolling();
        }
      };
    } catch {
      startPolling();
    }

    // If SSE never opens within 6s, fall back to polling.
    const fallbackTimer = setTimeout(() => {
      if (!liveRef.current) startPolling();
    }, 6000);

    return () => {
      clearTimeout(fallbackTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      es?.close();
      if (pollTimer) clearInterval(pollTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, enabled, pollIntervalMs]);

  const refresh = useCallback(() => {
    onPoll();
    setLastUpdate(new Date());
  }, [onPoll]);

  return { status, lastUpdate, refresh };
}
