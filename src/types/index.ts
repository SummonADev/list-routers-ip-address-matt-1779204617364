export type NDPState = 'REACHABLE' | 'STALE' | 'DELAY' | 'PROBE' | 'INCOMPLETE';

export type Neighbor = {
  id: string;
  routerId: string;
  ipv6Address: string;
  macAddress: string;
  interface: string;
  state: NDPState;
  lastSeen: string;
};

export type Router = {
  id: string;
  name: string;
  ipv4Address: string;
  ipv6Address: string;
  location: string;
  model: string;
  status: 'online' | 'offline' | 'degraded';
  neighbors: Neighbor[];
};
