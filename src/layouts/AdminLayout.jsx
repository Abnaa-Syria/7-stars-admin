import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { ChevronDown, LogOut, Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, UserRound } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { Avatar, Button, DropdownMenu } from '@/components/ui';
import { BrandMark, LanguageSwitch, ThemeSwitch } from '@/components/brand/BrandMark';
import { PoweredBy } from '@/components/brand/PoweredBy';
import { ALL_NAV_ITEMS, NAV_SECTIONS } from './navigation';

const COLLAPSE_KEY = 'ss_admin_sidebar_collapsed';

function Sidebar({ onNavigate }) {
  const { t } = useI18n();
  const { can } = useAuth();
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="row" style={{ gap: 8, minWidth: 0 }}>
          <BrandMark variant="wide" />
        </span>
        <span className="brand-admin-pill">{t('common.adminBadge')}</span>
      </div>
      <nav className="sidebar__nav">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((item) => can(item.permission));
          if (!items.length) return null;
          return (
            <div key={section.id} className="nav__section">
              <div className="nav__section-label">{t(section.label)}</div>
              {items.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => clsx('nav__link', isActive && 'nav__link--active')} onClick={onNavigate} title={t(item.label)}>
                  <item.icon size={19} />
                  <span className="nav__label">{t(item.label)}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function Header({ onToggleSidebar, onToggleMobile, collapsed }) {
  const { t, locale } = useI18n();
  const { user, logout, changeLanguage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const current = ALL_NAV_ITEMS.find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));
  const primaryRole = user?.isSuperAdmin ? t('roles.system.super-admin') : user?.roles?.[0] ? (user.roles[0].isSystem ? t(`roles.system.${user.roles[0].slug}`, null, user.roles[0].name) : user.roles[0].name) : '';
  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <header className="header">
      <Button variant="ghost" size="sm" icon={MenuIcon} className="mobile-only" onClick={onToggleMobile} aria-label={t('common.toggleSidebar')} />
      <Button variant="ghost" size="sm" icon={CollapseIcon} className="desktop-only flip-rtl" onClick={onToggleSidebar} aria-label={t('common.toggleSidebar')} />
      <span className="header__title">{current ? t(current.label) : t('common.adminPanel')}</span>
      <span className="header__spacer" />
      <form
        className="header-search desktop-only"
        onSubmit={(e) => {
          e.preventDefault();
          const q = new FormData(e.currentTarget).get('q');
          if (q) navigate(`/users?search=${encodeURIComponent(String(q))}`);
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3-3" />
        </svg>
        <input name="q" placeholder={t('dashboard.searchAdmin')} />
        <kbd>Ctrl+K</kbd>
      </form>
      <ThemeSwitch />
      <LanguageSwitch value={locale} onChange={changeLanguage} />
      <DropdownMenu
        trigger={(open, toggle) => (
          <button type="button" className="user-chip" onClick={toggle} aria-haspopup="menu" aria-expanded={open}>
            <Avatar src={user?.avatar?.url} name={user?.fullName} size={32} />
            <span className="desktop-only" style={{ textAlign: 'start' }}>
              <span className="user-chip__name truncate" style={{ display: 'block' }}>
                {user?.fullName}
              </span>
              <span className="user-chip__role" style={{ display: 'block' }}>
                {primaryRole}
              </span>
            </span>
            <ChevronDown size={15} className="muted" />
          </button>
        )}
        items={[
          { label: t('nav.profile'), icon: UserRound, onClick: () => navigate('/profile') },
          'divider',
          {
            label: t('common.logout'),
            icon: LogOut,
            danger: true,
            onClick: async () => {
              await logout();
              navigate('/login', { replace: true });
            },
          },
        ]}
      />
    </header>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  }, [collapsed]);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const shellClass = useMemo(() => clsx('shell', collapsed && 'shell--collapsed', mobileOpen && 'shell--mobile-open'), [collapsed, mobileOpen]);

  return (
    <div className={shellClass}>
      <Sidebar onNavigate={() => setMobileOpen(false)} />
      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}
      <div className="main">
        <Header collapsed={collapsed} onToggleSidebar={() => setCollapsed((v) => !v)} onToggleMobile={() => setMobileOpen((v) => !v)} />
        <main className="content">
          <Outlet />
        </main>
        <PoweredBy />
      </div>
    </div>
  );
}
