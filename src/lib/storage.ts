import { Router } from '@/types';
import { initialRouters } from '@/lib/mockData';

const STORAGE_KEY = 'ndp_routers';

export function loadRouters(): Router[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as Router[];
    }
  } catch {
    // ignore parse errors
  }
  return initialRouters;
}

export function saveRouters(routers: Router[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(routers));
  } catch {
    // ignore storage errors
  }
}
