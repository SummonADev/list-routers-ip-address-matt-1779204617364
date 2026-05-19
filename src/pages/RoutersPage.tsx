import { useState } from 'react';
import { Plus, Search, Wifi } from 'lucide-react';
import RouterCard from '@/components/routers/RouterCard';
import Modal from '@/components/ui/Modal';
import RouterForm from '@/components/routers/RouterForm';
import { useRouters } from '@/hooks/useRouters';
import { Router } from '@/types';
import styles from '@/pages/RoutersPage.module.css';

export default function RoutersPage() {
  const { routers, addRouter, updateRouter, deleteRouter } = useRouters();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Router | null>(null);

  const filtered = routers.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.ipv4Address.includes(search) ||
    r.ipv6Address.toLowerCase().includes(search.toLowerCase()) ||
    r.location.toLowerCase().includes(search.toLowerCase()) ||
    r.model.toLowerCase().includes(search.toLowerCase())
  );

  const onlineCount = routers.filter(r => r.status === 'online').length;
  const offlineCount = routers.filter(r => r.status === 'offline').length;
  const degradedCount = routers.filter(r => r.status === 'degraded').length;
  const totalNeighbors = routers.reduce((acc, r) => acc + r.neighbors.length, 0);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Router Inventory</h1>
          <p className={styles.pageSubtitle}>Manage routers and their NDP neighbor tables</p>
        </div>
        <button className={styles.addRouterBtn} onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add Router
        </button>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statVal}>{routers.length}</span>
          <span className={styles.statLabel}>Total Routers</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statVal} style={{ color: 'var(--color-success)' }}>{onlineCount}</span>
          <span className={styles.statLabel}>Online</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statVal} style={{ color: 'var(--color-warning)' }}>{degradedCount}</span>
          <span className={styles.statLabel}>Degraded</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statVal} style={{ color: 'var(--color-danger)' }}>{offlineCount}</span>
          <span className={styles.statLabel}>Offline</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statVal} style={{ color: 'var(--color-info)' }}>{totalNeighbors}</span>
          <span className={styles.statLabel}>NDP Neighbors</span>
        </div>
      </div>

      <div className={styles.searchRow}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search by name, IP, model, or location…"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <Wifi size={40} color="var(--color-border-hover)" />
          <p>No routers found.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(r => (
            <RouterCard
              key={r.id}
              router={r}
              onDelete={deleteRouter}
              onEdit={setEditTarget}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="Add New Router" onClose={() => setShowAdd(false)}>
          <RouterForm
            onSubmit={(data) => { addRouter(data); setShowAdd(false); }}
            onCancel={() => setShowAdd(false)}
          />
        </Modal>
      )}

      {editTarget && (
        <Modal title="Edit Router" onClose={() => setEditTarget(null)}>
          <RouterForm
            initial={editTarget}
            onSubmit={(data) => { updateRouter(editTarget.id, data); setEditTarget(null); }}
            onCancel={() => setEditTarget(null)}
            submitLabel="Save Changes"
          />
        </Modal>
      )}
    </div>
  );
}
