import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { profileApi } from '@/api/profile';
import { ApiError, refreshSession } from '@/api/http';
import { authStore } from '@/stores/authStore';
import { useI18n } from '@/i18n';
import { canAccessAdmin, hasPermission } from '@/utils/permissions';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const { setLocale, t } = useI18n();
  const [state, setState] = useState({ status: 'loading', user: null });

  const adopt = useCallback(
    (user) => {
      setState({ status: 'authenticated', user });
      if (user?.preferredLanguage) setLocale(user.preferredLanguage);
    },
    [setLocale],
  );

  const reset = useCallback(() => {
    queryClient.clear();
    setState({ status: 'anonymous', user: null });
  }, [queryClient]);

  // Silent session restore through the httpOnly refresh cookie.
  useEffect(() => {
    let cancelled = false;
    if (!authStore.hasSessionHint()) {
      setState({ status: 'anonymous', user: null });
      return undefined;
    }
    refreshSession()
      .then((user) => {
        if (cancelled) return;
        if (canAccessAdmin(user)) adopt(user);
        else {
          authStore.clear();
          setState({ status: 'anonymous', user: null });
        }
      })
      .catch(() => {
        if (cancelled) return;
        authStore.clear();
        setState({ status: 'anonymous', user: null });
      });
    return () => {
      cancelled = true;
    };
  }, [adopt]);

  // Forced sign-out (refresh failed, account suspended…).
  useEffect(() => authStore.onCleared(() => setState((s) => (s.status === 'authenticated' ? { status: 'anonymous', user: null, expired: true } : s))), []);

  const login = useCallback(
    async ({ identifier, password }) => {
      const { data } = await authApi.login({ identifier, password });
      authStore.setAccessToken(data.tokens.accessToken);
      if (!canAccessAdmin(data.user)) {
        await authApi.logout().catch(() => {});
        authStore.clear();
        throw new ApiError({ status: 403, code: 'NOT_ADMIN', message: t('auth.notAdmin') });
      }
      adopt(data.user);
      return data.user;
    },
    [adopt, t],
  );

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    authStore.clear();
    reset();
  }, [reset]);

  const reloadUser = useCallback(async () => {
    const { data } = await authApi.me();
    setState((s) => ({ ...s, user: data }));
    return data;
  }, []);

  const changeLanguage = useCallback(
    async (locale) => {
      setLocale(locale);
      if (state.status === 'authenticated') {
        await profileApi.updateLanguage(locale).catch(() => {});
        setState((s) => (s.user ? { ...s, user: { ...s.user, preferredLanguage: locale } } : s));
        queryClient.invalidateQueries();
      }
    },
    [setLocale, state.status, queryClient],
  );

  const value = useMemo(
    () => ({
      status: state.status,
      user: state.user,
      sessionExpired: Boolean(state.expired),
      isAuthenticated: state.status === 'authenticated',
      can: (permission) => hasPermission(state.user, permission),
      canAny: (list) => list.some((p) => hasPermission(state.user, p)),
      login,
      logout,
      reloadUser,
      changeLanguage,
    }),
    [state, login, logout, reloadUser, changeLanguage],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
