import { useState } from 'react';
import { Router } from '@/types';
import styles from '@/components/routers/RouterForm.module.css';

type RouterFormProps = {
  initial?: Partial<Router>;
  onSubmit: (data: Omit<Router, 'id' | 'neighbors'>) => void;
  onCancel: () => void;
  submitLabel?: string;
};

export default function RouterForm({ initial, onSubmit, onCancel, submitLabel = 'Add Router' }: RouterFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [ipv4, setIpv4] = useState(initial?.ipv4Address ?? '');
  const [ipv6, setIpv6] = useState(initial?.ipv6Address ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [model, setModel] = useState(initial?.model ?? '');
  const [status, setStatus] = useState<Router['status']>(initial?.status ?? 'online');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!ipv4.trim()) errs.ipv4 = 'IPv4 address is required';
    if (!ipv6.trim()) errs.ipv6 = 'IPv6 address is required';
    if (!location.trim()) errs.location = 'Location is required';
    if (!model.trim()) errs.model = 'Model is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ name: name.trim(), ipv4Address: ipv4.trim(), ipv6Address: ipv6.trim(), location: location.trim(), model: model.trim(), status });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label}>Router Name</label>
        <input className={styles.input} value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="Core-Router-01" />
        {errors.name && <span className={styles.error}>{errors.name}</span>}
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>IPv4 Address</label>
          <input className={styles.input} value={ipv4} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIpv4(e.target.value)} placeholder="192.168.1.1" />
          {errors.ipv4 && <span className={styles.error}>{errors.ipv4}</span>}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>IPv6 Address (Link-Local)</label>
          <input className={styles.input} value={ipv6} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIpv6(e.target.value)} placeholder="fe80::1" />
          {errors.ipv6 && <span className={styles.error}>{errors.ipv6}</span>}
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Model</label>
          <input className={styles.input} value={model} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModel(e.target.value)} placeholder="Cisco ISR 4451" />
          {errors.model && <span className={styles.error}>{errors.model}</span>}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Location</label>
          <input className={styles.input} value={location} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocation(e.target.value)} placeholder="Data Center A" />
          {errors.location && <span className={styles.error}>{errors.location}</span>}
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Status</label>
        <select className={styles.select} value={status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value as Router['status'])}>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="degraded">Degraded</option>
        </select>
      </div>
      <div className={styles.formActions}>
        <button type="button" className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.submitBtn}>{submitLabel}</button>
      </div>
    </form>
  );
}
