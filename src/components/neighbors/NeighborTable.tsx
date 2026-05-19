import { useState } from 'react';
import { Trash2, Edit2, Plus } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Modal from '@/components/ui/Modal';
import NeighborForm from '@/components/neighbors/NeighborForm';
import styles from '@/components/neighbors/NeighborTable.module.css';
import { Neighbor } from '@/types';
import { formatDate } from '@/lib/utils';

type NeighborTableProps = {
  routerId: string;
  neighbors: Neighbor[];
  onAdd: (routerId: string, data: Omit<Neighbor, 'id' | 'routerId'>) => void;
  onDelete: (routerId: string, neighborId: string) => void;
  onUpdate: (routerId: string, neighborId: string, data: Partial<Omit<Neighbor, 'id' | 'routerId'>>) => void;
};

function ndpBadgeVariant(state: Neighbor['state']): 'success' | 'warning' | 'danger' | 'info' | 'accent' {
  switch (state) {
    case 'REACHABLE': return 'success';
    case 'STALE': return 'warning';
    case 'DELAY': return 'info';
    case 'PROBE': return 'accent';
    case 'INCOMPLETE': return 'danger';
    default: return 'info';
  }
}

export default function NeighborTable({ routerId, neighbors, onAdd, onDelete, onUpdate }: NeighborTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Neighbor | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className={styles.wrapper}>
      <div className={styles.tableHeader}>
        <h3 className={styles.tableTitle}>NDP Neighbors</h3>
        <button className={styles.addBtn} onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Add Neighbor
        </button>
      </div>

      {neighbors.length === 0 ? (
        <div className={styles.empty}>
          <span>No NDP neighbors discovered for this router.</span>
        </div>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>IPv6 Address</th>
                <th>MAC Address</th>
                <th>Interface</th>
                <th>NDP State</th>
                <th>Last Seen</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {neighbors.map(n => (
                <tr key={n.id} className={styles.row}>
                  <td><code className={styles.code}>{n.ipv6Address}</code></td>
                  <td><code className={styles.code}>{n.macAddress}</code></td>
                  <td><code className={styles.code}>{n.interface}</code></td>
                  <td><Badge variant={ndpBadgeVariant(n.state)}>{n.state}</Badge></td>
                  <td className={styles.dateCell}>{formatDate(n.lastSeen)}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <button className={styles.iconBtn} onClick={() => setEditTarget(n)} title="Edit">
                        <Edit2 size={13} />
                      </button>
                      <button className={styles.iconBtn} style={{ color: 'var(--color-danger)' }} onClick={() => setDeleteTarget(n.id)} title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          message="Remove this NDP neighbor entry?"
          onConfirm={() => { onDelete(routerId, deleteTarget); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {showAdd && (
        <Modal title="Add NDP Neighbor" onClose={() => setShowAdd(false)}>
          <NeighborForm
            onSubmit={(data) => { onAdd(routerId, data); setShowAdd(false); }}
            onCancel={() => setShowAdd(false)}
            submitLabel="Add Neighbor"
          />
        </Modal>
      )}

      {editTarget && (
        <Modal title="Edit NDP Neighbor" onClose={() => setEditTarget(null)}>
          <NeighborForm
            initial={editTarget}
            onSubmit={(data) => { onUpdate(routerId, editTarget.id, data); setEditTarget(null); }}
            onCancel={() => setEditTarget(null)}
            submitLabel="Save Changes"
          />
        </Modal>
      )}
    </div>
  );
}
