import { request } from './http';

export const authApi = {
  login: (body) => request({ method: 'post', url: '/auth/login', data: { ...body, platform: 'web-admin', deviceName: navigator.userAgent.slice(0, 120) } }),
  logout: () => request({ method: 'post', url: '/auth/logout' }),
  logoutAll: () => request({ method: 'post', url: '/auth/logout-all' }),
  me: () => request({ method: 'get', url: '/auth/me' }),
  forgotPassword: (email) => request({ method: 'post', url: '/auth/forgot-password', data: { email } }),
  resetPassword: (body) => request({ method: 'post', url: '/auth/reset-password', data: body }),
  changePassword: (body) => request({ method: 'post', url: '/auth/change-password', data: body }),
};
