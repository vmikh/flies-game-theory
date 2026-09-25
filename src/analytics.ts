import type posthog from 'posthog-js';

const key = import.meta.env.VITE_POSTHOG_KEY?.trim();
const host = import.meta.env.VITE_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';
let client: typeof posthog | null = null;
const pending: { event: Event; properties?: Record<string, string | number | boolean> }[] = [];

export function initAnalytics() {
  if (!key) return;
  void import('posthog-js').then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: host,
      defaults: '2026-05-30',
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      disable_session_recording: true,
      person_profiles: 'identified_only',
    });
    client = posthog;
    for (const { event, properties } of pending) client.capture(event, properties);
    pending.length = 0;
  });
}

type Event =
  | 'simulation_started' | 'simulation_played' | 'simulation_paused' | 'simulation_finished'
  | 'fly_focused' | 'fly_unfocused' | 'parameters_opened' | 'about_opened' | 'language_changed';

export function track(event: Event, properties?: Record<string, string | number | boolean>) {
  if (!key) return;
  if (client) client.capture(event, properties);
  else pending.push({ event, properties });
}
