import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PageLoader } from '@/components/ui';
import { GuestRoute, ProtectedRoute, RequirePermission } from '@/routes/guards';
import AdminLayout from '@/layouts/AdminLayout';
import AuthLayout from '@/layouts/AuthLayout';
import ForbiddenPage from '@/pages/system/ForbiddenPage';
import { P } from '@/utils/permissions';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));

const UsersListPage = lazy(() => import('@/pages/users/UsersListPage'));
const UserCreatePage = lazy(() => import('@/pages/users/UserCreatePage'));
const UserDetailPage = lazy(() => import('@/pages/users/UserDetailPage'));
const UserEditPage = lazy(() => import('@/pages/users/UserEditPage'));

const TeachersListPage = lazy(() => import('@/pages/teachers/TeachersListPage'));
const TeacherCreatePage = lazy(() => import('@/pages/teachers/TeacherCreatePage'));
const TeacherDetailPage = lazy(() => import('@/pages/teachers/TeacherDetailPage'));
const TeacherEditPage = lazy(() => import('@/pages/teachers/TeacherEditPage'));

const StudentsListPage = lazy(() => import('@/pages/students/StudentsListPage'));
const StudentCreatePage = lazy(() => import('@/pages/students/StudentCreatePage'));
const StudentDetailPage = lazy(() => import('@/pages/students/StudentDetailPage'));
const StudentEditPage = lazy(() => import('@/pages/students/StudentEditPage'));

const RolesListPage = lazy(() => import('@/pages/roles/RolesListPage'));
const RoleFormPage = lazy(() => import('@/pages/roles/RoleFormPage'));
const RoleDetailPage = lazy(() => import('@/pages/roles/RoleDetailPage'));
const PermissionsPage = lazy(() => import('@/pages/roles/PermissionsPage'));

const MediaPage = lazy(() => import('@/pages/media/MediaPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const AuditLogsPage = lazy(() => import('@/pages/audit/AuditLogsPage'));
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'));
const NotFoundPage = lazy(() => import('@/pages/system/NotFoundPage'));

const CoursesListPage = lazy(() => import('@/pages/courses/CoursesListPage'));
const CourseDetailPage = lazy(() => import('@/pages/courses/CourseDetailPage'));
const CategoriesPage = lazy(() => import('@/pages/categories/CategoriesPage'));
const EnrollmentsPage = lazy(() => import('@/pages/enrollments/EnrollmentsPage'));
const JoinRequestsPage = lazy(() => import('@/pages/joinRequests/JoinRequestsPage'));
const TeacherFollowersPage = lazy(() => import('@/pages/followers/TeacherFollowersPage'));
const QuizzesListPage = lazy(() => import('@/pages/quizzes/QuizzesListPage'));
const QuizDetailPage = lazy(() => import('@/pages/quizzes/QuizDetailPage'));
const QuizAttemptsPage = lazy(() => import('@/pages/quizAttempts/QuizAttemptsPage'));
const AchievementsPageLazy = lazy(() => import('@/pages/gamification/GamificationPages').then((m) => ({ default: m.AchievementsPage })));
const StarsPageLazy = lazy(() => import('@/pages/gamification/GamificationPages').then((m) => ({ default: m.StarsPage })));
const LevelsPageLazy = lazy(() => import('@/pages/gamification/GamificationPages').then((m) => ({ default: m.LevelsPage })));
const RulesPageLazy = lazy(() => import('@/pages/gamification/GamificationPages').then((m) => ({ default: m.RulesPage })));
const PointsPageLazy = lazy(() => import('@/pages/gamification/GamificationPages').then((m) => ({ default: m.PointsLedgerPage })));
const XpPageLazy = lazy(() => import('@/pages/gamification/GamificationPages').then((m) => ({ default: m.XpLedgerPage })));
const LeaderboardsPageLazy = lazy(() => import('@/pages/gamification/GamificationPages').then((m) => ({ default: m.LeaderboardsPage })));

const PlansListPage = lazy(() => import('@/pages/billing/PlansListPage'));
const PlanDetailPage = lazy(() => import('@/pages/billing/PlanDetailPage'));
const BillingDashboardPageLazy = lazy(() => import('@/pages/billing/BillingPages').then((m) => ({ default: m.BillingDashboardPage })));
const SubscriptionsPageLazy = lazy(() => import('@/pages/billing/BillingPages').then((m) => ({ default: m.SubscriptionsPage })));
const PaymentsPageLazy = lazy(() => import('@/pages/billing/BillingPages').then((m) => ({ default: m.PaymentsPage })));
const InvoicesPageLazy = lazy(() => import('@/pages/billing/BillingPages').then((m) => ({ default: m.InvoicesPage })));
const CouponsPageLazy = lazy(() => import('@/pages/billing/BillingPages').then((m) => ({ default: m.CouponsPage })));
const RefundsPageLazy = lazy(() => import('@/pages/billing/BillingPages').then((m) => ({ default: m.RefundsPage })));
const WebhooksPageLazy = lazy(() => import('@/pages/billing/BillingPages').then((m) => ({ default: m.WebhooksPage })));
const BroadcastsPageLazy = lazy(() => import('@/pages/communication/CommunicationPages').then((m) => ({ default: m.BroadcastsPage })));
const DeliveriesPageLazy = lazy(() => import('@/pages/communication/CommunicationPages').then((m) => ({ default: m.DeliveriesPage })));
const DevicesPageLazy = lazy(() => import('@/pages/communication/CommunicationPages').then((m) => ({ default: m.DevicesPage })));
const FeatureFlagsPage = lazy(() => import('@/pages/system/FeatureFlagsPage'));

const guard = (permission, element) => <RequirePermission permission={permission}>{element}</RequirePermission>;

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={guard(P.DASHBOARD_READ, <DashboardPage />)} />

            <Route path="/users" element={guard(P.USERS_READ, <UsersListPage />)} />
            <Route path="/users/create" element={guard(P.USERS_CREATE, <UserCreatePage />)} />
            <Route path="/users/:id" element={guard(P.USERS_READ, <UserDetailPage />)} />
            <Route path="/users/:id/edit" element={guard(P.USERS_UPDATE, <UserEditPage />)} />

            <Route path="/teachers" element={guard(P.TEACHERS_READ, <TeachersListPage />)} />
            <Route path="/teachers/create" element={guard(P.TEACHERS_CREATE, <TeacherCreatePage />)} />
            <Route path="/teachers/:id" element={guard(P.TEACHERS_READ, <TeacherDetailPage />)} />
            <Route path="/teachers/:id/edit" element={guard(P.TEACHERS_UPDATE, <TeacherEditPage />)} />

            <Route path="/students" element={guard(P.STUDENTS_READ, <StudentsListPage />)} />
            <Route path="/students/create" element={guard(P.STUDENTS_CREATE, <StudentCreatePage />)} />
            <Route path="/students/:id" element={guard(P.STUDENTS_READ, <StudentDetailPage />)} />
            <Route path="/students/:id/edit" element={guard(P.STUDENTS_UPDATE, <StudentEditPage />)} />

            <Route path="/courses" element={guard(P.COURSES_READ, <CoursesListPage />)} />
            <Route path="/courses/:id" element={guard(P.COURSES_READ, <CourseDetailPage />)} />
            <Route path="/categories" element={guard(P.COURSE_CATEGORIES_READ, <CategoriesPage />)} />
            <Route path="/enrollments" element={guard(P.ENROLLMENTS_READ, <EnrollmentsPage />)} />
            <Route path="/join-requests" element={guard(P.JOIN_REQUESTS_READ, <JoinRequestsPage />)} />
            <Route path="/teacher-followers" element={guard(P.TEACHER_FOLLOWERS_READ, <TeacherFollowersPage />)} />

            <Route path="/quizzes" element={guard(P.QUIZZES_READ, <QuizzesListPage />)} />
            <Route path="/quizzes/:id" element={guard(P.QUIZZES_READ, <QuizDetailPage />)} />
            <Route path="/quiz-attempts" element={guard(P.QUIZ_ATTEMPTS_READ, <QuizAttemptsPage />)} />

            <Route path="/achievements" element={guard(P.ACHIEVEMENTS_READ, <AchievementsPageLazy />)} />
            <Route path="/stars" element={guard(P.STARS_READ, <StarsPageLazy />)} />
            <Route path="/levels" element={guard(P.LEVELS_READ, <LevelsPageLazy />)} />
            <Route path="/gamification-rules" element={guard(P.GAMIFICATION_READ, <RulesPageLazy />)} />
            <Route path="/points-ledger" element={guard(P.POINTS_READ, <PointsPageLazy />)} />
            <Route path="/xp-ledger" element={guard(P.XP_READ, <XpPageLazy />)} />
            <Route path="/leaderboards" element={guard(P.LEADERBOARDS_READ, <LeaderboardsPageLazy />)} />

            <Route path="/billing" element={guard(P.BILLING_ANALYTICS_READ, <BillingDashboardPageLazy />)} />
            <Route path="/plans" element={guard(P.PLANS_READ, <PlansListPage />)} />
            <Route path="/plans/:id" element={guard(P.PLANS_READ, <PlanDetailPage />)} />
            <Route path="/subscriptions" element={guard(P.SUBSCRIPTIONS_READ, <SubscriptionsPageLazy />)} />
            <Route path="/payments" element={guard(P.PAYMENTS_READ, <PaymentsPageLazy />)} />
            <Route path="/invoices" element={guard(P.INVOICES_READ, <InvoicesPageLazy />)} />
            <Route path="/coupons" element={guard(P.COUPONS_READ, <CouponsPageLazy />)} />
            <Route path="/refunds" element={guard(P.REFUNDS_READ, <RefundsPageLazy />)} />
            <Route path="/webhooks" element={guard(P.WEBHOOKS_READ, <WebhooksPageLazy />)} />

            <Route path="/broadcasts" element={guard(P.NOTIFICATIONS_BROADCAST, <BroadcastsPageLazy />)} />
            <Route path="/deliveries" element={guard(P.NOTIFICATION_DELIVERIES_READ, <DeliveriesPageLazy />)} />
            <Route path="/devices" element={guard(P.DEVICES_READ, <DevicesPageLazy />)} />

            <Route path="/roles" element={guard(P.ROLES_READ, <RolesListPage />)} />
            <Route path="/roles/create" element={guard(P.ROLES_CREATE, <RoleFormPage />)} />
            <Route path="/roles/:id" element={guard(P.ROLES_READ, <RoleDetailPage />)} />
            <Route path="/roles/:id/edit" element={guard(P.ROLES_UPDATE, <RoleFormPage />)} />
            <Route path="/permissions" element={guard(P.PERMISSIONS_READ, <PermissionsPage />)} />

            <Route path="/media" element={guard(P.MEDIA_READ, <MediaPage />)} />
            <Route path="/settings" element={<Navigate to="/settings/general" replace />} />
            <Route path="/settings/:group" element={guard(P.SETTINGS_READ, <SettingsPage />)} />
            <Route path="/feature-flags" element={guard(P.FEATURE_FLAGS_READ, <FeatureFlagsPage />)} />
            <Route path="/audit-logs" element={guard(P.AUDIT_READ, <AuditLogsPage />)} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/forbidden" element={<ForbiddenPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}


