import {
  Award,
  Bell,
  BookOpen,
  CreditCard,
  FileClock,
  Flag,
  FolderTree,
  GraduationCap,
  Handshake,
  Images,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  Receipt,
  RefreshCw,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Ticket,
  Trophy,
  UserPlus,
  UserRound,
  Users,
  Wallet,
  Webhook,
} from 'lucide-react';
import { P } from '@/utils/permissions';

/** Sidebar structure. Items are hidden when the admin lacks the required permission. */
export const NAV_SECTIONS = [
  {
    id: 'overview',
    label: 'nav.overview',
    items: [{ to: '/dashboard', label: 'nav.dashboard', icon: LayoutDashboard, permission: P.DASHBOARD_READ }],
  },
  {
    id: 'accounts',
    label: 'nav.accounts',
    items: [
      { to: '/users', label: 'nav.users', icon: Users, permission: P.USERS_READ },
      { to: '/teachers', label: 'nav.teachers', icon: UserRound, permission: P.TEACHERS_READ },
      { to: '/students', label: 'nav.students', icon: GraduationCap, permission: P.STUDENTS_READ },
    ],
  },
  {
    id: 'education',
    label: 'nav.education',
    items: [
      { to: '/courses', label: 'nav.courses', icon: BookOpen, permission: P.COURSES_READ },
      { to: '/categories', label: 'nav.categories', icon: FolderTree, permission: P.COURSE_CATEGORIES_READ },
      { to: '/enrollments', label: 'nav.enrollments', icon: Handshake, permission: P.ENROLLMENTS_READ },
      { to: '/join-requests', label: 'nav.joinRequests', icon: UserPlus, permission: P.JOIN_REQUESTS_READ },
      { to: '/teacher-followers', label: 'nav.teacherFollowers', icon: Users, permission: P.TEACHER_FOLLOWERS_READ },
      { to: '/quizzes', label: 'nav.quizzes', icon: Trophy, permission: P.QUIZZES_READ },
      { to: '/quiz-attempts', label: 'nav.quizAttempts', icon: FileClock, permission: P.QUIZ_ATTEMPTS_READ },
    ],
  },
  {
    id: 'gamification',
    label: 'nav.gamification',
    items: [
      { to: '/achievements', label: 'nav.achievements', icon: Award, permission: P.ACHIEVEMENTS_READ },
      { to: '/stars', label: 'nav.stars', icon: Star, permission: P.STARS_READ },
      { to: '/levels', label: 'nav.levels', icon: Sparkles, permission: P.LEVELS_READ },
      { to: '/gamification-rules', label: 'nav.rules', icon: Settings, permission: P.GAMIFICATION_READ },
      { to: '/points-ledger', label: 'nav.pointsLedger', icon: Trophy, permission: P.POINTS_READ },
      { to: '/xp-ledger', label: 'nav.xpLedger', icon: Sparkles, permission: P.XP_READ },
      { to: '/leaderboards', label: 'nav.leaderboards', icon: Trophy, permission: P.LEADERBOARDS_READ },
    ],
  },
  {
    id: 'billing',
    label: 'nav.billing',
    items: [
      { to: '/billing', label: 'nav.billingDashboard', icon: LayoutDashboard, permission: P.BILLING_ANALYTICS_READ },
      { to: '/plans', label: 'nav.plans', icon: CreditCard, permission: P.PLANS_READ },
      { to: '/subscriptions', label: 'nav.subscriptions', icon: Wallet, permission: P.SUBSCRIPTIONS_READ },
      { to: '/payments', label: 'nav.payments', icon: Receipt, permission: P.PAYMENTS_READ },
      { to: '/invoices', label: 'nav.invoices', icon: FileClock, permission: P.INVOICES_READ },
      { to: '/coupons', label: 'nav.coupons', icon: Ticket, permission: P.COUPONS_READ },
      { to: '/refunds', label: 'nav.refunds', icon: RefreshCw, permission: P.REFUNDS_READ },
      { to: '/webhooks', label: 'nav.webhooks', icon: Webhook, permission: P.WEBHOOKS_READ },
    ],
  },
  {
    id: 'communication',
    label: 'nav.communication',
    items: [
      { to: '/broadcasts', label: 'nav.broadcasts', icon: Megaphone, permission: P.NOTIFICATIONS_BROADCAST },
      { to: '/deliveries', label: 'nav.deliveries', icon: Bell, permission: P.NOTIFICATION_DELIVERIES_READ },
      { to: '/devices', label: 'nav.devices', icon: Smartphone, permission: P.DEVICES_READ },
    ],
  },
  {
    id: 'system',
    label: 'nav.system',
    items: [
      { to: '/roles', label: 'nav.rolesPermissions', icon: ShieldCheck, permission: P.ROLES_READ },
      { to: '/permissions', label: 'nav.permissions', icon: KeyRound, permission: P.PERMISSIONS_READ },
      { to: '/media', label: 'nav.media', icon: Images, permission: P.MEDIA_READ },
      { to: '/settings', label: 'nav.settings', icon: Settings, permission: P.SETTINGS_READ },
      { to: '/feature-flags', label: 'nav.featureFlags', icon: Flag, permission: P.FEATURE_FLAGS_READ },
      { to: '/audit-logs', label: 'nav.auditLogs', icon: FileClock, permission: P.AUDIT_READ },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);
