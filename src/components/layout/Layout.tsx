import { Outlet, NavLink } from 'react-router-dom';
import { Server, Share2 } from 'lucide-react';
import styles from '@/components/layout/Layout.module.css';

export default function Layout() {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Server size={22} color="var(--color-primary)" />
          <span>NDP Manager</span>
        </div>
        <nav className={styles.nav}>
          <NavLink
            to="/"
            end
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
          >
            <Server size={16} /> Routers
          </NavLink>
          <NavLink
            to="/topology"
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
          >
            <Share2 size={16} /> Topology
          </NavLink>
        </nav>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
