import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Server, MapPin, Cpu, Edit2 } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import RouterForm from '@/components/routers/RouterForm';
import NeighborTable from '@/components/neighbors/NeighborTable';
import { useRouters } from '@/hooks/useRouters';
import { Router } from '@/types';
import { routerStatusColor } from '@/lib/utils';
import styles from '@/pages/RouterDetailPage.module.css';

function statusVariant(status: Router['status']): 'success' | 'warning' | 'danger' {
  if (status === 'online') return 'success';
  if (status === 'degraded') return 'warning';
  return 'danger';
}

export default function RouterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { routers, updateRouter, addNeighbor, deleteNeighbor, updateNeighbor } = useRouters();
  const [editOpen, setEditOpen] = useState(false);

  const router = routers.find(r => r.id === id);

  if (!router) {
    return (
      <div className={styles.notFound}>
        <p>Router not found.</p>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> Back to Inventory
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> Back to Inventory
        </button>
        <button className={styles.editBtn} onClick={() => setEditOpen(true)}>
          <Edit2 size={14} /> Edit Router
        </button>
      </div>

      <div className={styles.detailCard}>
        <div className={styles.detailHeader}>
          <div className={styles.iconWrap} style={{ borderColor: routerStatusColor(router.status) }}>
            <Server size={28} color={routerStatusColor(router.status)} />
          </div>
          <div className={styles.headerInfo}>
            <h1 className={styles.routerName}>{router.name}</h1>
            <Badge variant={statusVariant(router.status)}>{router.status}</Badge>
          </div>
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>IPv4 Address</span>
            <code className={styles.infoCode}>{router.ipv4Address}</code>
          </div>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>IPv6 Link-Local</span>
            <code className={styles.infoCode}>{router.ipv6Address}</code>
          </div>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}><Cpu size={12} style={{ display: 'inline', marginRight: 4 }} />Model</span>
            <span className={styles.infoVal}>{router.model}</span>
          </div>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}><MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />Location</span>
            <span className={styles.infoVal}>{router.location}</span>
          </div>
        </div>
      </div>

      <NeighborTable
        routerId={router.id}
        neighbors={router.neighbors}
        onAdd={addNeighbor}
        onDelete={deleteNeighbor}
        onUpdate={updateNeighbor}
      />

      {editOpen && (
        <Modal title="Edit Router" onClose={() => setEditOpen(false)}>
          <RouterForm
            initial={router}
            onSubmit={(data) => { updateRouter(router.id, data); setEditOpen(false); }}
            onCancel={() => setEditOpen(false)}
            submitLabel="Save Changes"
          />
        </Modal>
      )}
    </div>
  );
}
