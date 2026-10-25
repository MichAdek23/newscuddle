/**
 * NewsCuddle Institutional Telemetry & Interaction Analytics
 * Streams high-resolution user interactions, search behaviors, and dwell times
 * to the backend data collection warehouse.
 */
import { telemetryApi } from './api';

// Generate or retrieve persistent session ID
export function getSessionId() {
  try {
    let sId = sessionStorage.getItem('newscuddle_session_id');
    if (!sId) {
      sId = 'ses_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      sessionStorage.setItem('newscuddle_session_id', sId);
    }
    return sId;
  } catch (_) {
    return 'ses_ephemeral_' + Date.now().toString(36);
  }
}

// Client device telemetry
export function getDeviceMetadata() {
  const ua = navigator.userAgent || '';
  let browser = 'Unknown';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';

  return {
    platform: navigator.platform || 'Unknown',
    browser,
    isMobile: /Mobi|Android|iPhone|iPad/i.test(ua),
  };
}

class TelemetryService {
  constructor() {
    this.sessionId = getSessionId();
    this.device = getDeviceMetadata();
    this.queue = [];
    this.flushTimer = null;
    this.initHeartbeat();
  }

  track(eventType, metadata = {}, elementId = '') {
    const event = {
      eventType,
      sessionId: this.sessionId,
      path: window.location.pathname || '/',
      elementId,
      metadata,
      device: this.device,
    };

    // Immediately dispatch high priority search/click events or queue
    if (['query_submit', 'trending_click', 'recent_search_click', 'search_focus'].includes(eventType)) {
      telemetryApi.recordEvent(event).catch(() => {});
    } else {
      this.queue.push(event);
      if (this.queue.length >= 5) {
        this.flush();
      } else if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => this.flush(), 3000);
      }
    }
  }

  flush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.queue.length === 0) return;

    const eventsToSend = [...this.queue];
    this.queue = [];

    telemetryApi.recordBatch(eventsToSend).catch(() => {});
  }

  initHeartbeat() {
    if (typeof window === 'undefined') return;
    // Send dwell ping every 60 seconds
    setInterval(() => {
      this.track('dwell_ping', {
        visible: !document.hidden,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      });
    }, 60000);
  }
}

export const telemetry = new TelemetryService();
export default telemetry;
