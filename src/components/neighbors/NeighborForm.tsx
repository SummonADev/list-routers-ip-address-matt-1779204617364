import { useState } from 'react';
import { Neighbor, NDPState } from '@/types';
import styles from '@/components/neighbors/NeighborForm.module.css';

const NDP_STATES: NDPState[] = ['REACHABLE', 'STALE', 'DELAY', 'PROBE', 'INCOMPLETE'];

type NeighborFormProps = {
  initial?: Partial<Neighbor>;
  onSubmit: (data: Omit<Neighbor, 'id' | 'routerId'>) => void;
  onCancel: () => void;
  submitLabel?: string;
};

export default function NeighborForm({ initial, onSubmit, onCancel, submitLabel = 'Add' }: NeighborFormProps) {
  const [ipv6, setIpv6] = useState(initial?.ipv6Address ?? '');
  const [mac, setMac] = useState(initial?.macAddress ?? '');
  const [iface, setIface] = useState(initial?.interface ?? '');
  const [state, setState] = useState<NDPState>(initial?.state ?? 'REACHABLE');
  const [lastSeen, setLastSeen] = useState(initial?.lastSeen ?? new Date().toISOString());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!ipv6.trim()) errs.ipv6 = 'IPv6 address is required';
    if (!mac.trim()) errs.mac = 'MAC address is required';
    if (!iface.trim()) errs.iface = 'Interface is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      ipv6Address: ipv6.trim(),
      macAddress: mac.trim(),
      interface: iface.trim(),
      state,
      lastSeen: lastSeen || new Date().toISOString(),
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label}>IPv6 Address</label>
        <input className={styles.input} value={ipv6} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIpv6(e.target.value)} placeholder="fe80::1" />
        {errors.ipv6 && <span className={styles.error}>{errors.ipv6}</span>}
      </div>
      <div className={styles.field}>
        <label className={styles.label}>MAC Address</label>
        <input className={styles.input} value={mac} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMac(e.target.value)} placeholder="00:1A:2B:3C:4D:5E" />
        {errors.mac && <span className={styles.error}>{errors.mac}</span>}
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Interface</label>
          <input className={styles.input} value={iface} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIface(e.target.value)} placeholder="GigabitEthernet0/0" />
          {errors.iface && <span className={styles.error}>{errors.iface}</span>}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>NDP State</label>
          <select className={styles.select} value={state} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setState(e.target.value as NDPState)}>
            {NDP_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Last Seen (ISO)</label>
        <input className={styles.input} value={lastSeen} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastSeen(e.target.value)} placeholder="2024-03-15T10:30:00Z" />
      </div>
      <div className={styles.formActions}>
        <button type="button" className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.submitBtn}>{submitLabel}</button>
      </div>
    </form>
  );
}
