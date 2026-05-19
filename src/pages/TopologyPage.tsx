import TopologyDiagram from '@/components/topology/TopologyDiagram';
import { useRouters } from '@/hooks/useRouters';
import styles from '@/pages/TopologyPage.module.css';

export default function TopologyPage() {
  const { routers, updateRouter } = useRouters();

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Network Topology</h1>
          <p className={styles.pageSubtitle}>
            Force-directed diagram arranged by NDP neighbor cost. Click a router node to edit its IP addresses or status.
          </p>
        </div>
      </div>
      <div className={styles.diagramWrap}>
        <TopologyDiagram routers={routers} onUpdateRouter={updateRouter} />
      </div>
    </div>
  );
}
