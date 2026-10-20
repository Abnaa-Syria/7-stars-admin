import { request, cleanParams } from './http';

const list = (url) => (params) => request({ method: 'get', url, params: cleanParams(params) });

/** Account endpoints share a shape across users / teachers / students. */
function accountsApi(base) {
  return {
    list: list(base),
    get: (id) => request({ method: 'get', url: `${base}/${id}` }),
    create: (body) => request({ method: 'post', url: base, data: body }),
    update: (id, body) => request({ method: 'patch', url: `${base}/${id}`, data: body }),
    suspend: (id, body) => request({ method: 'post', url: `${base}/${id}/suspend`, data: body || {} }),
    block: (id, body) => request({ method: 'post', url: `${base}/${id}/block`, data: body || {} }),
    reactivate: (id, body) => request({ method: 'post', url: `${base}/${id}/reactivate`, data: body || {} }),
  };
}

export const dashboardApi = {
  get: () => request({ method: 'get', url: '/admin/dashboard' }),
};

export const usersApi = {
  ...accountsApi('/admin/users'),
  remove: (id, body) => request({ method: 'delete', url: `/admin/users/${id}`, data: body || {} }),
  sessions: (id) => request({ method: 'get', url: `/admin/users/${id}/sessions` }),
  revokeSessions: (id) => request({ method: 'post', url: `/admin/users/${id}/revoke-sessions` }),
};

export const teachersApi = {
  ...accountsApi('/admin/teachers'),
  verify: (id, body) => request({ method: 'post', url: `/admin/teachers/${id}/verify`, data: body || {} }),
  reject: (id, body) => request({ method: 'post', url: `/admin/teachers/${id}/reject-verification`, data: body }),
  revoke: (id, body) => request({ method: 'post', url: `/admin/teachers/${id}/revoke-verification`, data: body || {} }),
};

export const studentsApi = accountsApi('/admin/students');

export const rolesApi = {
  list: list('/admin/roles'),
  get: (id) => request({ method: 'get', url: `/admin/roles/${id}` }),
  create: (body) => request({ method: 'post', url: '/admin/roles', data: body }),
  update: (id, body) => request({ method: 'patch', url: `/admin/roles/${id}`, data: body }),
  remove: (id) => request({ method: 'delete', url: `/admin/roles/${id}` }),
  replacePermissions: (id, permissionIds) => request({ method: 'put', url: `/admin/roles/${id}/permissions`, data: { permissionIds } }),
};

export const permissionsApi = {
  list: () => request({ method: 'get', url: '/admin/permissions' }),
};

export const mediaApi = {
  list: list('/admin/media'),
  get: (id) => request({ method: 'get', url: `/admin/media/${id}` }),
  upload: ({ file, category, visibility }, onUploadProgress) => {
    const form = new FormData();
    form.append('category', category);
    form.append('visibility', visibility);
    form.append('file', file);
    return request({ method: 'post', url: '/admin/media', data: form, onUploadProgress });
  },
  remove: (id) => request({ method: 'delete', url: `/admin/media/${id}` }),
};

export const settingsApi = {
  list: () => request({ method: 'get', url: '/admin/settings' }),
  getGroup: (group) => request({ method: 'get', url: `/admin/settings/${group}` }),
  updateGroup: (group, values) => request({ method: 'patch', url: `/admin/settings/${group}`, data: values }),
  public: () => request({ method: 'get', url: '/settings/public' }),
};

export const auditApi = {
  list: list('/admin/audit-logs'),
  get: (id) => request({ method: 'get', url: `/admin/audit-logs/${id}` }),
};

export const coursesApi = {
  list: list('/admin/courses'),
  get: (id) => request({ method: 'get', url: `/admin/courses/${id}` }),
  create: (body) => request({ method: 'post', url: '/admin/courses', data: body }),
  update: (id, body) => request({ method: 'patch', url: `/admin/courses/${id}`, data: body }),
  remove: (id) => request({ method: 'delete', url: `/admin/courses/${id}` }),
  publishValidation: (id) => request({ method: 'get', url: `/admin/courses/${id}/publish-validation` }),
  publish: (id) => request({ method: 'post', url: `/admin/courses/${id}/publish` }),
  suspend: (id) => request({ method: 'post', url: `/admin/courses/${id}/suspend` }),
  unsuspend: (id) => request({ method: 'post', url: `/admin/courses/${id}/unsuspend` }),
  archive: (id) => request({ method: 'post', url: `/admin/courses/${id}/archive` }),
  restore: (id) => request({ method: 'post', url: `/admin/courses/${id}/restore` }),
  getCode: (id) => request({ method: 'get', url: `/admin/courses/${id}/code` }),
  regenerateCode: (id) => request({ method: 'post', url: `/admin/courses/${id}/code/regenerate` }),
  revokeCode: (id) => request({ method: 'post', url: `/admin/courses/${id}/code/revoke` }),
  studentProgress: (courseId, studentId) => request({ method: 'get', url: `/admin/courses/${courseId}/students/${studentId}` }),
  performance: (id) => request({ method: 'get', url: `/admin/courses/${id}/performance` }),
  reportsStudents: (id) => request({ method: 'get', url: `/admin/courses/${id}/reports/students` }),
  reportsQuizzes: (id) => request({ method: 'get', url: `/admin/courses/${id}/reports/quizzes` }),
  leaderboard: (id) => request({ method: 'get', url: `/admin/courses/${id}/leaderboard` }),
  createModule: (courseId, body) => request({ method: 'post', url: `/admin/courses/${courseId}/modules`, data: body }),
  updateModule: (courseId, moduleId, body) => request({ method: 'patch', url: `/admin/courses/${courseId}/modules/${moduleId}`, data: body }),
  removeModule: (courseId, moduleId) => request({ method: 'delete', url: `/admin/courses/${courseId}/modules/${moduleId}` }),
  reorderModules: (courseId, items) => request({ method: 'patch', url: `/admin/courses/${courseId}/modules/reorder`, data: { items } }),
  createLesson: (moduleId, body) => request({ method: 'post', url: `/admin/modules/${moduleId}/lessons`, data: body }),
  getLesson: (lessonId) => request({ method: 'get', url: `/admin/lessons/${lessonId}` }),
  updateLesson: (lessonId, body) => request({ method: 'patch', url: `/admin/lessons/${lessonId}`, data: body }),
  removeLesson: (lessonId) => request({ method: 'delete', url: `/admin/lessons/${lessonId}` }),
  reorderLessons: (moduleId, items) => request({ method: 'patch', url: `/admin/modules/${moduleId}/lessons/reorder`, data: { items } }),
  createResource: (lessonId, body) => request({ method: 'post', url: `/admin/lessons/${lessonId}/resources`, data: body }),
  updateResource: (lessonId, resourceId, body) => request({ method: 'patch', url: `/admin/lessons/${lessonId}/resources/${resourceId}`, data: body }),
  removeResource: (lessonId, resourceId) => request({ method: 'delete', url: `/admin/lessons/${lessonId}/resources/${resourceId}` }),
  reorderResources: (lessonId, items) => request({ method: 'patch', url: `/admin/lessons/${lessonId}/resources/reorder`, data: { items } }),
};

export const categoriesApi = {
  list: list('/admin/course-categories'),
  get: (id) => request({ method: 'get', url: `/admin/course-categories/${id}` }),
  create: (body) => request({ method: 'post', url: '/admin/course-categories', data: body }),
  update: (id, body) => request({ method: 'patch', url: `/admin/course-categories/${id}`, data: body }),
  remove: (id) => request({ method: 'delete', url: `/admin/course-categories/${id}` }),
  activate: (id) => request({ method: 'post', url: `/admin/course-categories/${id}/activate` }),
  deactivate: (id) => request({ method: 'post', url: `/admin/course-categories/${id}/deactivate` }),
  reorder: (items) => request({ method: 'patch', url: '/admin/course-categories/reorder', data: { items } }),
};

export const enrollmentsApi = {
  list: list('/admin/enrollments'),
  get: (id) => request({ method: 'get', url: `/admin/enrollments/${id}` }),
  create: (body) => request({ method: 'post', url: '/admin/enrollments', data: body }),
  block: (id) => request({ method: 'post', url: `/admin/enrollments/${id}/block` }),
  reactivate: (id) => request({ method: 'post', url: `/admin/enrollments/${id}/reactivate` }),
  cancel: (id) => request({ method: 'post', url: `/admin/enrollments/${id}/cancel` }),
};

export const joinRequestsApi = {
  list: list('/admin/join-requests'),
  get: (id) => request({ method: 'get', url: `/admin/join-requests/${id}` }),
  approve: (id) => request({ method: 'post', url: `/admin/join-requests/${id}/approve` }),
  decline: (id, body) => request({ method: 'post', url: `/admin/join-requests/${id}/decline`, data: body || {} }),
};

export const teacherFollowersApi = {
  list: list('/admin/teacher-followers'),
  remove: (id) => request({ method: 'delete', url: `/admin/teacher-followers/${id}` }),
};

export const quizzesApi = {
  list: list('/admin/quizzes'),
  get: (id) => request({ method: 'get', url: `/admin/quizzes/${id}` }),
  create: (body) => request({ method: 'post', url: '/admin/quizzes', data: body }),
  update: (id, body) => request({ method: 'patch', url: `/admin/quizzes/${id}`, data: body }),
  remove: (id) => request({ method: 'delete', url: `/admin/quizzes/${id}` }),
  publishValidation: (id) => request({ method: 'get', url: `/admin/quizzes/${id}/publish-validation` }),
  publish: (id) => request({ method: 'post', url: `/admin/quizzes/${id}/publish` }),
  archive: (id) => request({ method: 'post', url: `/admin/quizzes/${id}/archive` }),
  restore: (id) => request({ method: 'post', url: `/admin/quizzes/${id}/restore` }),
  suspend: (id) => request({ method: 'post', url: `/admin/quizzes/${id}/suspend` }),
  unsuspend: (id) => request({ method: 'post', url: `/admin/quizzes/${id}/unsuspend` }),
  performance: (id) => request({ method: 'get', url: `/admin/quizzes/${id}/performance` }),
  listQuestions: (id) => request({ method: 'get', url: `/admin/quizzes/${id}/questions` }),
  createQuestion: (id, body) => request({ method: 'post', url: `/admin/quizzes/${id}/questions`, data: body }),
  reorderQuestions: (id, items) => request({ method: 'patch', url: `/admin/quizzes/${id}/questions/reorder`, data: { items } }),
  updateQuestion: (questionId, body) => request({ method: 'patch', url: `/admin/questions/${questionId}`, data: body }),
  removeQuestion: (questionId) => request({ method: 'delete', url: `/admin/questions/${questionId}` }),
};

export const quizAttemptsApi = {
  list: list('/admin/quiz-attempts'),
  get: (id) => request({ method: 'get', url: `/admin/quiz-attempts/${id}` }),
  gradeAnswer: (attemptId, answerId, body) =>
    request({ method: 'post', url: `/admin/quiz-attempts/${attemptId}/answers/${answerId}/grade`, data: body }),
};

export const achievementsApi = {
  list: list('/admin/achievements'),
  get: (id) => request({ method: 'get', url: `/admin/achievements/${id}` }),
  create: (body) => request({ method: 'post', url: '/admin/achievements', data: body }),
  update: (id, body) => request({ method: 'patch', url: `/admin/achievements/${id}`, data: body }),
  remove: (id) => request({ method: 'delete', url: `/admin/achievements/${id}` }),
};

export const starMilestonesApi = {
  list: () => request({ method: 'get', url: '/admin/star-milestones' }),
  create: (body) => request({ method: 'post', url: '/admin/star-milestones', data: body }),
  update: (id, body) => request({ method: 'patch', url: `/admin/star-milestones/${id}`, data: body }),
};

export const experienceLevelsApi = {
  list: () => request({ method: 'get', url: '/admin/experience-levels' }),
  create: (body) => request({ method: 'post', url: '/admin/experience-levels', data: body }),
  update: (id, body) => request({ method: 'patch', url: `/admin/experience-levels/${id}`, data: body }),
  remove: (id) => request({ method: 'delete', url: `/admin/experience-levels/${id}` }),
};

export const gamificationRulesApi = {
  list: () => request({ method: 'get', url: '/admin/gamification-rules' }),
  update: (id, body) => request({ method: 'patch', url: `/admin/gamification-rules/${id}`, data: body }),
};

export const pointsLedgerApi = {
  list: list('/admin/points-transactions'),
  adjust: (body) => request({ method: 'post', url: '/admin/points-transactions/adjust', data: body }),
};

export const xpLedgerApi = {
  list: list('/admin/xp-transactions'),
  adjust: (body) => request({ method: 'post', url: '/admin/xp-transactions/adjust', data: body }),
};

export const leaderboardsApi = {
  allTime: () => request({ method: 'get', url: '/admin/leaderboards/all-time' }),
  weekly: () => request({ method: 'get', url: '/admin/leaderboards/weekly' }),
  course: (courseId) => request({ method: 'get', url: `/admin/leaderboards/courses/${courseId}` }),
};

export const plansApi = {
  list: list('/admin/plans'),
  get: (id) => request({ method: 'get', url: `/admin/plans/${id}` }),
  create: (body) => request({ method: 'post', url: '/admin/plans', data: body }),
  update: (id, body) => request({ method: 'patch', url: `/admin/plans/${id}`, data: body }),
  archive: (id) => request({ method: 'post', url: `/admin/plans/${id}/archive` }),
  activate: (id) => request({ method: 'post', url: `/admin/plans/${id}/activate` }),
  deactivate: (id) => request({ method: 'post', url: `/admin/plans/${id}/deactivate` }),
  entitlements: (id) => request({ method: 'get', url: `/admin/plans/${id}/entitlements` }),
  replaceEntitlements: (id, entitlements) => request({ method: 'put', url: `/admin/plans/${id}/entitlements`, data: { entitlements } }),
};

export const planPricesApi = {
  list: (planId) => request({ method: 'get', url: `/admin/plans/${planId}/prices` }),
  create: (planId, body) => request({ method: 'post', url: `/admin/plans/${planId}/prices`, data: body }),
  update: (priceId, body) => request({ method: 'patch', url: `/admin/plan-prices/${priceId}`, data: body }),
  activate: (priceId) => request({ method: 'post', url: `/admin/plan-prices/${priceId}/activate` }),
  deactivate: (priceId) => request({ method: 'post', url: `/admin/plan-prices/${priceId}/deactivate` }),
};

export const subscriptionsApi = {
  list: list('/admin/subscriptions'),
  get: (id) => request({ method: 'get', url: `/admin/subscriptions/${id}` }),
  grant: (body) => request({ method: 'post', url: '/admin/subscriptions/grant', data: body }),
  cancel: (id, body) => request({ method: 'post', url: `/admin/subscriptions/${id}/cancel`, data: body || {} }),
  resume: (id) => request({ method: 'post', url: `/admin/subscriptions/${id}/resume` }),
  reconcile: (id) => request({ method: 'post', url: `/admin/subscriptions/${id}/reconcile` }),
};

export const paymentsApi = {
  list: list('/admin/payments'),
  get: (id) => request({ method: 'get', url: `/admin/payments/${id}` }),
};

export const invoicesApi = {
  list: list('/admin/invoices'),
  get: (id) => request({ method: 'get', url: `/admin/invoices/${id}` }),
};

export const couponsApi = {
  list: list('/admin/coupons'),
  get: (id) => request({ method: 'get', url: `/admin/coupons/${id}` }),
  create: (body) => request({ method: 'post', url: '/admin/coupons', data: body }),
  update: (id, body) => request({ method: 'patch', url: `/admin/coupons/${id}`, data: body }),
  activate: (id) => request({ method: 'post', url: `/admin/coupons/${id}/activate` }),
  deactivate: (id) => request({ method: 'post', url: `/admin/coupons/${id}/deactivate` }),
};

export const refundsApi = {
  list: list('/admin/refunds'),
  get: (id) => request({ method: 'get', url: `/admin/refunds/${id}` }),
  create: (body) => request({ method: 'post', url: '/admin/refunds', data: body }),
};

export const webhooksApi = {
  list: list('/admin/payment-webhooks'),
  get: (id) => request({ method: 'get', url: `/admin/payment-webhooks/${id}` }),
  retry: (id) => request({ method: 'post', url: `/admin/payment-webhooks/${id}/retry` }),
};

export const broadcastsApi = {
  list: list('/admin/broadcasts'),
  get: (id) => request({ method: 'get', url: `/admin/broadcasts/${id}` }),
  create: (body) => request({ method: 'post', url: '/admin/broadcasts', data: body }),
  update: (id, body) => request({ method: 'patch', url: `/admin/broadcasts/${id}`, data: body }),
  send: (id, body) => request({ method: 'post', url: `/admin/broadcasts/${id}/send`, data: body || { confirm: true } }),
  cancel: (id) => request({ method: 'post', url: `/admin/broadcasts/${id}/cancel` }),
  previewTarget: (id) => request({ method: 'get', url: `/admin/broadcasts/${id}/preview-target` }),
};

export const deliveriesApi = {
  list: list('/admin/notification-deliveries'),
  get: (id) => request({ method: 'get', url: `/admin/notification-deliveries/${id}` }),
};

export const devicesApi = {
  list: list('/admin/devices'),
  get: (id) => request({ method: 'get', url: `/admin/devices/${id}` }),
  revoke: (id) => request({ method: 'post', url: `/admin/devices/${id}/revoke` }),
};

export const featureFlagsApi = {
  list: () => request({ method: 'get', url: '/admin/feature-flags' }),
  update: (id, body) => request({ method: 'patch', url: `/admin/feature-flags/${id}`, data: body }),
};

export const billingDashboardApi = {
  get: (params) => request({ method: 'get', url: '/admin/billing/dashboard', params: cleanParams(params) }),
};

export const supportNotesApi = {
  list: list('/admin/support-notes'),
  create: (body) => request({ method: 'post', url: '/admin/support-notes', data: body }),
  update: (id, body) => request({ method: 'patch', url: `/admin/support-notes/${id}`, data: body }),
};


