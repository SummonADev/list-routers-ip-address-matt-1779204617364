import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Server, MapPin, Cpu, Trash2, Edit2, ChevronRight } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import styles from '@/components/routers/RouterCard.module.css';
import { Router } from '@/types';
import { routerStatusColor } from '@/lib/utils';

type RouterCardProps = {
  router: Router;
  onDelete: (id: string) => void;
  onEdit: (router: Router) => void;
};

function statusVariant(status: Router['status']): 'success' | 'warning' | 'danger' {
  if (status === 'online') return 'success';
  if (status === 'degraded') return 'warning';
  return 'danger';
}

export default function RouterCard({ router, onDelete, onEdit }: RouterCardProps) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <div className={styles.card}>
        <div className={styles.topRow}>
          <div className={styles.iconWrap} style={{ borderColor: routerStatusColor(router.status) }}>
            <Server size={22} color={routerStatusColor(router.status)} />
          </div>
          <div className={styles.nameGroup}>
            <span className={styles.name}>{router.name}</span>
            <Badge variant={statusVariant(router.status)}>{router.status}</Badge>
          </div>
          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={() => onEdit(router)} title="Edit router">
              <Edit2 size={15} />
            </button>
            <button className={styles.actionBtn} onClick={() => setConfirmDelete(true)} title="Delete router" style={{ color: 'var(--color-danger)' }}>
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>IPv4</span>
            <code className={styles.infoValue}>{router.ipv4Address}</code>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>IPv6 (Link-Local)</span>
            <code className={styles.infoValue}>{router.ipv6Address}</code>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}><Cpu size={12} style={{ display: 'inline', marginRight: 4 }} />Model</span>
            <span className={styles.infoValue}>{router.model}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}><MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />Location</span>
            <span className={styles.infoValue}>{router.location}</span>
          </div>
        </div>

        <div className={styles.footer}>
          <span className={styles.neighborCount}>
            {router.neighbors.length} NDP neighbor{router.neighbors.length !== 1 ? 's' : ''}
          </span>
          <button className={styles.detailBtn} onClick={() => navigate(`/router/${router.id}`)}>
            View Details <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          message={`Delete router "${router.name}"? This action cannot be undone.`}
          onConfirm={() => { onDelete(router.id); setConfirmDelete(false); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
