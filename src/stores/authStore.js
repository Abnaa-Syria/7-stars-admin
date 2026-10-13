/**
 * Minimal auth token store. The access token lives only in memory; the refresh token is an
 * httpOnly cookie managed by the API (never readable from JavaScript). A non-sensitive flag in
 * localStorage only records that a session may exist, so the app knows to attempt a silent refresh.
 */
const SESSION_HINT_KEY = 'ss_admin_session';

let accessToken = null;
const listeners = new Set();

export const authStore = {
  getAccessToken: () => accessToken,

  setAccessToken(token) {
    accessToken = token;
    try {
      if (token) localStorage.setItem(SESSION_HINT_KEY, '1');
    } catch {
      /* storage unavailable */
    }
  },

  clear() {
    accessToken = null;
    try {
      localStorage.removeItem(SESSION_HINT_KEY);
    } catch {
      /* storage unavailable */
    }
    listeners.forEach((fn) => fn());
  },

  hasSessionHint() {
    try {
      return localStorage.getItem(SESSION_HINT_KEY) === '1';
    } catch {
      return false;
    }
  },

  /** Subscribe to forced sign-outs (refresh failure, revoked session). */
  onCleared(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
