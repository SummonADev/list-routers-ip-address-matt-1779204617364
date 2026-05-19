import { Network } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from '@/components/layout/Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <Network size={24} color="var(--color-primary)" />
          <span className={styles.brandText}>NDP Router Discovery</span>
        </Link>
        <span className={styles.subtitle}>Neighbor Discovery Protocol — Router Management</span>
      </div>
    </header>
  );
}
