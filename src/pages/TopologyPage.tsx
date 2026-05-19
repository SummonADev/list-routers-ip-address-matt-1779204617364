import { useRouters } from '@/hooks/useRouters';
import TopologyDiagram from '@/components/topology/TopologyDiagram';
import styles from '@/pages/TopologyPage.module.css';
import { Share2 } from 'lucide-react';

export default function TopologyPage() {
  const { routers } = useRouters();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Network Topology</h1>
          <p className={styles.subtitle}>
            Routers positioned by NDP adjacency cost — lines show direct neighbor links
          </p>
        </div>
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: 'var(--color-success)' }} />
            Online
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: 'var(--color-warning)' }} />
            Degraded
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: 'var(--color-danger)' }} />
            Offline
          </div>
          <div className={styles.legendItem}>
            <Share2 size={13} style={{ color: 'var(--color-text-muted)' }} />
            NDP adjacency
          </div>
        </div>
      </div>
      <TopologyDiagram routers={routers} />
    </div>
  );
}
