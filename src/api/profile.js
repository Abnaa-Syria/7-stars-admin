import { request } from './http';

export const profileApi = {
  get: () => request({ method: 'get', url: '/profile' }),
  update: (body) => request({ method: 'patch', url: '/profile', data: body }),
  updateLanguage: (preferredLanguage) => request({ method: 'patch', url: '/profile/language', data: { preferredLanguage } }),
  getPreferences: () => request({ method: 'get', url: '/profile/preferences' }),
  updatePreferences: (body) => request({ method: 'patch', url: '/profile/preferences', data: body }),
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request({ method: 'post', url: '/profile/avatar', data: form });
  },
  removeAvatar: () => request({ method: 'delete', url: '/profile/avatar' }),
  sessions: () => request({ method: 'get', url: '/profile/sessions' }),
  revokeSession: (id) => request({ method: 'delete', url: `/profile/sessions/${id}` }),
};
