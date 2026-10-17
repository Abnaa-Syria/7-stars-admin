import { studentsApi, teachersApi, usersApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { P } from '@/utils/permissions';

/**
 * Users, teachers and students share the same account model (teacherId/studentId are User ids).
 * Each kind configures its API client, routes, translations and permissions.
 */
export const ACCOUNT_KINDS = {
  user: {
    kind: 'user',
    api: usersApi,
    base: '/users',
    ns: 'users',
    listKey: queryKeys.users,
    detailKey: queryKeys.user,
    perms: { read: P.USERS_READ, create: P.USERS_CREATE, update: P.USERS_UPDATE, status: P.USERS_STATUS },
  },
  teacher: {
    kind: 'teacher',
    api: teachersApi,
    base: '/teachers',
    ns: 'teachers',
    listKey: queryKeys.teachers,
    detailKey: queryKeys.teacher,
    perms: { read: P.TEACHERS_READ, create: P.TEACHERS_CREATE, update: P.TEACHERS_UPDATE, status: P.TEACHERS_STATUS, verify: P.TEACHERS_VERIFY },
  },
  student: {
    kind: 'student',
    api: studentsApi,
    base: '/students',
    ns: 'students',
    listKey: queryKeys.students,
    detailKey: queryKeys.student,
    perms: { read: P.STUDENTS_READ, create: P.STUDENTS_CREATE, update: P.STUDENTS_UPDATE, status: P.STUDENTS_STATUS },
  },
};

export const USER_STATUSES = ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'BLOCKED', 'DELETED'];
export const VERIFICATION_STATUSES = ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'];
export const LANGUAGES = ['ar', 'en'];

export const TEACHER_PROFILE_KEYS = [
  'displayName', 'displayNameEn', 'headline', 'headlineEn', 'biography', 'biographyEn', 'specialization', 'specializationEn',
  'yearsOfExperience', 'institution', 'institutionEn', 'publicProfileSlug', 'isPublic',
];
export const STUDENT_PROFILE_KEYS = ['displayName', 'bio', 'institution', 'gradeLevel', 'birthDate'];

export const isSuperAdminAccount = (account) => Boolean(account?.roles?.some((r) => r.slug === 'super-admin'));

export function roleLabel(t, role) {
  if (!role) return '';
  return role.isSystem ? t(`roles.system.${role.slug}`, null, role.name) : role.name;
}

export function cleanNullable(values, keys) {
  const out = {};
  for (const key of keys) {
    const v = values[key];
    out[key] = v === '' || v === undefined ? null : v;
  }
  return out;
}
