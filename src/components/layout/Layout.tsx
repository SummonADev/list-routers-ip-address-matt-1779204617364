import { Outlet } from 'react-router-dom';
import Header from '@/components/layout/Header';
import styles from '@/components/layout/Layout.module.css';

export default function Layout() {
  return (
    <div className={styles.root}>
      <Header />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
