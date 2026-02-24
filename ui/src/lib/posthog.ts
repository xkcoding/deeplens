import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.POSTHOG_KEY;
const API_HOST = "https://us.i.posthog.com";
const ENV = import.meta.env.DEV ? "development" : "production";

let initialized = false;

export function initPostHog(): void {
  if (initialized || !POSTHOG_KEY) return;

  posthog.init(POSTHOG_KEY, {
    api_host: API_HOST,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: true,
    persistence: "localStorage",
    disable_session_recording: true,
  });

  // Register env as a super property — attached to every event automatically
  posthog.register({ env: ENV, app: "desktop" });

  initialized = true;
}

export function capture(event: string, properties?: Record<string, unknown>): void {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function capturePageView(viewName: string): void {
  capture("$pageview", { view_name: viewName });
}
