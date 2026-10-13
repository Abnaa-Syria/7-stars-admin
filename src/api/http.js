import axios from 'axios';
import { authStore } from '@/stores/authStore';
import { getLocale, translate } from '@/i18n';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1').replace(/\/$/, '');

/** Normalized API error used throughout the UI. */
export class ApiError extends Error {
  constructor({ status = 0, code = 'NETWORK_ERROR', message, errors = [], requestId } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.requestId = requestId;
  }

  /** `{ field: message }` map for form integration. */
  get fieldErrors() {
    return Object.fromEntries((this.errors || []).filter((e) => e.field && e.field !== '_').map((e) => [e.field, e.message]));
  }
}

export const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30_000,
  headers: { 'X-Auth-Transport': 'cookie' },
});

http.interceptors.request.use((config) => {
  const token = authStore.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['Accept-Language'] = getLocale();
  return config;
});

// ── Silent refresh (single-flight) ──
let refreshPromise = null;

export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true, headers: { 'X-Auth-Transport': 'cookie', 'Accept-Language': getLocale() } })
      .then((res) => {
        const { user, tokens } = res.data.data;
        authStore.setAccessToken(tokens.accessToken);
        return user;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'];
const SESSION_ENDING_CODES = ['ACCOUNT_SUSPENDED', 'ACCOUNT_BLOCKED', 'ACCOUNT_NOT_ACTIVE'];

function toApiError(error) {
  if (error instanceof ApiError) return error;
  const res = error.response;
  if (!res) return new ApiError({ message: translate(getLocale(), 'errors.network') });
  const body = res.data || {};
  return new ApiError({
    status: res.status,
    code: body.code || 'UNKNOWN_ERROR',
    message: body.message || translate(getLocale(), 'errors.generic'),
    errors: body.errors || [],
    requestId: body.requestId,
  });
}

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const isAuthPath = NO_REFRESH_PATHS.some((p) => original.url?.startsWith(p));

    if (status === 401 && !original._retried && !isAuthPath) {
      original._retried = true;
      try {
        await refreshSession();
        return http(original);
      } catch {
        authStore.clear();
        return Promise.reject(toApiError(error));
      }
    }

    if (status === 403 && SESSION_ENDING_CODES.includes(code)) authStore.clear();
    return Promise.reject(toApiError(error));
  },
);

/** Unwraps the `{ success, message, data, meta }` envelope. */
export async function request(config) {
  const res = await http(config);
  return { data: res.data.data, meta: res.data.meta || {}, message: res.data.message };
}

/** Removes empty values so URLs stay clean and the API sees only real filters. */
export function cleanParams(params = {}) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length)));
}
