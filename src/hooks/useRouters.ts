import { useState, useCallback } from 'react';
import { Router, Neighbor } from '@/types';
import { loadRouters, saveRouters } from '@/lib/storage';
import { generateId } from '@/lib/utils';

export function useRouters() {
  const [routers, setRouters] = useState<Router[]>(() => loadRouters());

  const persist = useCallback((updated: Router[]) => {
    setRouters(updated);
    saveRouters(updated);
  }, []);

  const addRouter = useCallback((data: Omit<Router, 'id' | 'neighbors'>) => {
    const newRouter: Router = { ...data, id: generateId(), neighbors: [] };
    persist([...routers, newRouter]);
  }, [routers, persist]);

  const updateRouter = useCallback((id: string, data: Partial<Omit<Router, 'id' | 'neighbors'>>) => {
    persist(routers.map(r => r.id === id ? { ...r, ...data } : r));
  }, [routers, persist]);

  const deleteRouter = useCallback((id: string) => {
    persist(routers.filter(r => r.id !== id));
  }, [routers, persist]);

  const addNeighbor = useCallback((routerId: string, data: Omit<Neighbor, 'id' | 'routerId'>) => {
    const newNeighbor: Neighbor = { ...data, id: generateId(), routerId };
    persist(routers.map(r =>
      r.id === routerId ? { ...r, neighbors: [...r.neighbors, newNeighbor] } : r
    ));
  }, [routers, persist]);

  const deleteNeighbor = useCallback((routerId: string, neighborId: string) => {
    persist(routers.map(r =>
      r.id === routerId
        ? { ...r, neighbors: r.neighbors.filter(n => n.id !== neighborId) }
        : r
    ));
  }, [routers, persist]);

  const updateNeighbor = useCallback((routerId: string, neighborId: string, data: Partial<Omit<Neighbor, 'id' | 'routerId'>>) => {
    persist(routers.map(r =>
      r.id === routerId
        ? { ...r, neighbors: r.neighbors.map(n => n.id === neighborId ? { ...n, ...data } : n) }
        : r
    ));
  }, [routers, persist]);

  return { routers, addRouter, updateRouter, deleteRouter, addNeighbor, deleteNeighbor, updateNeighbor };
}
