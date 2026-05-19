import { NDPState } from '@/types';

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function ndpStateColor(state: NDPState): string {
  switch (state) {
    case 'REACHABLE': return 'var(--color-success)';
    case 'STALE': return 'var(--color-warning)';
    case 'DELAY': return 'var(--color-info)';
    case 'PROBE': return 'var(--color-accent)';
    case 'INCOMPLETE': return 'var(--color-danger)';
    default: return 'var(--color-text-muted)';
  }
}

export function routerStatusColor(status: 'online' | 'offline' | 'degraded'): string {
  switch (status) {
    case 'online': return 'var(--color-success)';
    case 'offline': return 'var(--color-danger)';
    case 'degraded': return 'var(--color-warning)';
    default: return 'var(--color-text-muted)';
  }
}
