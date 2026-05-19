import { useEffect, useRef, useState, useCallback } from 'react';
import { Router, Neighbor, NDPState } from '@/types';
import styles from '@/components/topology/TopologyDiagram.module.css';
import { routerStatusColor } from '@/lib/utils';
import { Server, ZoomIn, ZoomOut, Maximize2, RefreshCw } from 'lucide-react';

type Props = {
  routers: Router[];
  onUpdateRouter?: (id: string, data: Partial<Omit<Router, 'id' | 'neighbors'>>) => void;
  onUpdateNeighbor?: (routerId: string, neighborId: string, data: Partial<Omit<Neighbor, 'id' | 'routerId'>>) => void;
};

type NodePos = {
  id: string;
  x: number;
  y: number;
};

type Edge = {
  sourceId: string;
  targetId: string;
  cost: number;
  state: NDPState;
  neighborId: string; // which neighbor entry owns this edge (source side)
  sourceRouterId: string;
};

type InlineEdit = {
  routerId: string;
  field: 'ipv4Address' | 'ipv6Address' | 'status';
  value: string;
} | null;

type EdgeEdit = {
  edgeKey: string;
  field: 'cost' | 'state';
  value: string;
  neighborId: string;
  sourceRouterId: string;
} | null;

type EdgePopup = {
  edgeKey: string;
  x: number;
  y: number;
  neighborId: string;
  sourceRouterId: string;
  cost: number;
  state: NDPState;
} | null;

const NODE_W = 160;
const NODE_H = 86;
const PADDING = 80;

const NDP_STATES: NDPState[] = ['REACHABLE', 'STALE', 'DELAY', 'PROBE', 'INCOMPLETE'];
const STATUS_OPTIONS: Router['status'][] = ['online', 'offline', 'degraded'];

function getEdgeColor(state: string): string {
  switch (state) {
    case 'REACHABLE': return '#34d399';
    case 'STALE': return '#fbbf24';
    case 'DELAY': return '#60a5fa';
    case 'PROBE': return '#a78bfa';
    case 'INCOMPLETE': return '#f87171';
    default: return '#4a5070';
  }
}

function getEdgeDash(state: string): string {
  switch (state) {
    case 'STALE': return '6,4';
    case 'DELAY': return '3,3';
    case 'PROBE': return '8,3,2,3';
    case 'INCOMPLETE': return '2,4';
    default: return 'none';
  }
}

function computeLayout(routers: Router[], width: number, height: number): NodePos[] {
  if (routers.length === 0) return [];

  const cx = width / 2;
  const cy = height / 2;

  const angleStep = (2 * Math.PI) / routers.length;
  const radius = Math.min(width, height) * 0.32;
  const positions: Record<string, { x: number; y: number }> = {};
  routers.forEach((r, i) => {
    positions[r.id] = {
      x: cx + radius * Math.cos(i * angleStep - Math.PI / 2),
      y: cy + radius * Math.sin(i * angleStep - Math.PI / 2),
    };
  });

  const ITERATIONS = 200;
  const K = Math.sqrt((width * height) / routers.length) * 0.9;
  const REPULSION = K * K * 3.5;
  const ATTRACTION_DIVISOR = 120;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const disp: Record<string, { dx: number; dy: number }> = {};
    routers.forEach(r => { disp[r.id] = { dx: 0, dy: 0 }; });

    for (let a = 0; a < routers.length; a++) {
      for (let b = a + 1; b < routers.length; b++) {
        const ra = routers[a];
        const rb = routers[b];
        const dx = positions[ra.id].x - positions[rb.id].x;
        const dy = positions[ra.id].y - positions[rb.id].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = REPULSION / dist;
        const nx = (dx / dist) * force;
        const ny = (dy / dist) * force;
        disp[ra.id].dx += nx;
        disp[ra.id].dy += ny;
        disp[rb.id].dx -= nx;
        disp[rb.id].dy -= ny;
      }
    }

    routers.forEach(r => {
      r.neighbors.forEach(n => {
        const tid = n.adjacentRouterId;
        if (!tid || !positions[tid]) return;
        const cost = n.cost ?? 10;
        const dx = positions[r.id].x - positions[tid].x;
        const dy = positions[r.id].y - positions[tid].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const idealDist = Math.min(cost * ATTRACTION_DIVISOR, Math.min(width, height) * 0.55);
        const force = (dist - idealDist) * 0.04;
        const nx = (dx / dist) * force;
        const ny = (dy / dist) * force;
        disp[r.id].dx -= nx;
        disp[r.id].dy -= ny;
        disp[tid].dx += nx;
        disp[tid].dy += ny;
      });
    });

    const temp = Math.max(5, 40 * (1 - iter / ITERATIONS));

    routers.forEach(r => {
      const d = disp[r.id];
      const mag = Math.max(Math.sqrt(d.dx * d.dx + d.dy * d.dy), 0.001);
      const capped = Math.min(mag, temp);
      positions[r.id].x += (d.dx / mag) * capped;
      positions[r.id].y += (d.dy / mag) * capped;
      positions[r.id].x = Math.max(PADDING + NODE_W / 2, Math.min(width - PADDING - NODE_W / 2, positions[r.id].x));
      positions[r.id].y = Math.max(PADDING + NODE_H / 2, Math.min(height - PADDING - NODE_H / 2, positions[r.id].y));
    });
  }

  return routers.map(r => ({ id: r.id, x: positions[r.id].x, y: positions[r.id].y }));
}

function buildEdges(routers: Router[]): Edge[] {
  const seen = new Set<string>();
  const edges: Edge[] = [];
  routers.forEach(r => {
    r.neighbors.forEach(n => {
      if (!n.adjacentRouterId) return;
      const key = [r.id, n.adjacentRouterId].sort().join('--');
      if (seen.has(key)) return;
      seen.add(key);
      edges.push({
        sourceId: r.id,
        targetId: n.adjacentRouterId,
        cost: n.cost ?? 10,
        state: n.state,
        neighborId: n.id,
        sourceRouterId: r.id,
      });
    });
  });
  return edges;
}

function randomStatus(): Router['status'] {
  const statuses: Router['status'][] = ['online', 'online', 'online', 'degraded', 'offline'];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

function randomNDPState(): NDPState {
  const states: NDPState[] = ['REACHABLE', 'REACHABLE', 'REACHABLE', 'STALE', 'DELAY', 'PROBE', 'INCOMPLETE'];
  return states[Math.floor(Math.random() * states.length)];
}

export default function TopologyDiagram({ routers, onUpdateRouter, onUpdateNeighbor }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 900, height: 600 });
  const [positions, setPositions] = useState<NodePos[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const [inlineEdit, setInlineEdit] = useState<InlineEdit>(null);
  const [editPopup, setEditPopup] = useState<{ routerId: string; x: number; y: number } | null>(null);
  const [edgeEdit, setEdgeEdit] = useState<EdgeEdit>(null);
  const [edgePopup, setEdgePopup] = useState<EdgePopup>(null);
  const [refreshing, setRefreshing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const edgeInputRef = useRef<HTMLInputElement>(null);
  const edgeSelectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDims({ width: Math.max(width, 400), height: Math.max(height, 300) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    setPositions(computeLayout(routers, dims.width, dims.height));
    setEdges(buildEdges(routers));
  }, [routers, dims]);

  useEffect(() => {
    if (inlineEdit?.field === 'status') {
      selectRef.current?.focus();
    } else if (inlineEdit) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [inlineEdit]);

  useEffect(() => {
    if (edgeEdit?.field === 'state') {
      edgeSelectRef.current?.focus();
    } else if (edgeEdit?.field === 'cost') {
      edgeInputRef.current?.focus();
      edgeInputRef.current?.select();
    }
  }, [edgeEdit]);

  const getPos = useCallback((id: string) => positions.find(p => p.id === id), [positions]);

  const commitEdit = useCallback(() => {
    if (!inlineEdit || !onUpdateRouter) { setInlineEdit(null); setEditPopup(null); return; }
    const val = inlineEdit.value.trim();
    if (val) {
      onUpdateRouter(inlineEdit.routerId, { [inlineEdit.field]: val });
    }
    setInlineEdit(null);
    setEditPopup(null);
  }, [inlineEdit, onUpdateRouter]);

  const cancelEdit = useCallback(() => {
    setInlineEdit(null);
    setEditPopup(null);
  }, []);

  const commitEdgeEdit = useCallback(() => {
    if (!edgeEdit || !onUpdateNeighbor) { setEdgeEdit(null); return; }
    const val = edgeEdit.value.trim();
    if (val) {
      if (edgeEdit.field === 'cost') {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed > 0) {
          onUpdateNeighbor(edgeEdit.sourceRouterId, edgeEdit.neighborId, { cost: parsed });
        }
      } else {
        onUpdateNeighbor(edgeEdit.sourceRouterId, edgeEdit.neighborId, { state: val as NDPState });
      }
    }
    setEdgeEdit(null);
  }, [edgeEdit, onUpdateNeighbor]);

  const cancelEdgeEdit = useCallback(() => {
    setEdgeEdit(null);
  }, []);

  const openEditPopup = (routerId: string, nodeScreenX: number, nodeScreenY: number) => {
    setEditPopup({ routerId, x: nodeScreenX, y: nodeScreenY });
    setEdgePopup(null);
    setTooltip(null);
    setHoveredNode(null);
  };

  const startInlineEdit = (routerId: string, field: 'ipv4Address' | 'ipv6Address' | 'status', currentValue: string) => {
    setInlineEdit({ routerId, field, value: currentValue });
  };

  const openEdgePopup = (edge: Edge, screenX: number, screenY: number) => {
    const key = [edge.sourceId, edge.targetId].sort().join('--');
    setEdgePopup({
      edgeKey: key,
      x: screenX,
      y: screenY,
      neighborId: edge.neighborId,
      sourceRouterId: edge.sourceRouterId,
      cost: edge.cost,
      state: edge.state,
    });
    setEditPopup(null);
    setTooltip(null);
    setEdgeEdit(null);
  };

  const startEdgeEdit = (field: 'cost' | 'state', currentValue: string) => {
    if (!edgePopup) return;
    setEdgeEdit({
      edgeKey: edgePopup.edgeKey,
      field,
      value: currentValue,
      neighborId: edgePopup.neighborId,
      sourceRouterId: edgePopup.sourceRouterId,
    });
  };

  const handleForceRefresh = useCallback(() => {
    if (!onUpdateRouter || !onUpdateNeighbor) return;
    setRefreshing(true);

    routers.forEach(router => {
      onUpdateRouter(router.id, { status: randomStatus() });
      router.neighbors.forEach(neighbor => {
        if (neighbor.adjacentRouterId) {
          onUpdateNeighbor(router.id, neighbor.id, {
            state: randomNDPState(),
            lastSeen: new Date().toISOString(),
          });
        }
      });
    });

    setTimeout(() => setRefreshing(false), 800);
  }, [routers, onUpdateRouter, onUpdateNeighbor]);

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-node]')) return;
    if (editPopup) { setEditPopup(null); setInlineEdit(null); }
    if (edgePopup) { setEdgePopup(null); setEdgeEdit(null); }
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const onMouseUp = () => setDragging(false);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(3, Math.max(0.3, z - e.deltaY * 0.001)));
  };

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const svgToScreen = (svgX: number, svgY: number) => ({
    x: svgX * zoom + pan.x,
    y: svgY * zoom + pan.y,
  });

  return (
    <div className={styles.wrapper}>
      <div className={styles.controls}>
        <button className={styles.ctrlBtn} onClick={() => setZoom(z => Math.min(3, z + 0.15))} title="Zoom in">
          <ZoomIn size={16} />
        </button>
        <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
        <button className={styles.ctrlBtn} onClick={() => setZoom(z => Math.max(0.3, z - 0.15))} title="Zoom out">
          <ZoomOut size={16} />
        </button>
        <button className={styles.ctrlBtn} onClick={resetView} title="Reset view">
          <Maximize2 size={16} />
        </button>

        <div className={styles.controlsDivider} />

        {(onUpdateRouter && onUpdateNeighbor) && (
          <button
            className={`${styles.refreshBtn} ${refreshing ? styles.refreshBtnSpin : ''}`}
            onClick={handleForceRefresh}
            disabled={refreshing}
            title="Force refresh all router and link statuses"
          >
            <RefreshCw size={14} className={refreshing ? styles.spinIcon : ''} />
            <span>{refreshing ? 'Refreshing…' : 'Force Status Refresh'}</span>
          </button>
        )}

        {onUpdateRouter && (
          <span className={styles.editHint}>Click a node or link to edit</span>
        )}
      </div>

      <div
        ref={containerRef}
        className={styles.canvas}
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        <svg width={dims.width} height={dims.height} className={styles.svg}>
          <defs>
            {['REACHABLE','STALE','DELAY','PROBE','INCOMPLETE'].map(state => (
              <marker
                key={state}
                id={`arrow-${state}`}
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L0,6 L8,3 z" fill={getEdgeColor(state)} />
              </marker>
            ))}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {edges.map(edge => {
              const src = getPos(edge.sourceId);
              const tgt = getPos(edge.targetId);
              if (!src || !tgt) return null;
              const edgeKey = [edge.sourceId, edge.targetId].sort().join('--');
              const isHovered = hoveredEdge === edgeKey;
              const isEdgePopupOpen = edgePopup?.edgeKey === edgeKey;
              const midX = (src.x + tgt.x) / 2;
              const midY = (src.y + tgt.y) / 2;
              const color = getEdgeColor(edge.state);
              const dash = getEdgeDash(edge.state);

              const dx = tgt.x - src.x;
              const dy = tgt.y - src.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const ux = dx / dist;
              const uy = dy / dist;
              const halfW = NODE_W / 2 + 4;
              const halfH = NODE_H / 2 + 4;
              const tScale = Math.min(halfW / Math.abs(ux || 0.001), halfH / Math.abs(uy || 0.001));
              const x1 = src.x + ux * tScale;
              const y1 = src.y + uy * tScale;
              const x2 = tgt.x - ux * tScale;
              const y2 = tgt.y - uy * tScale;

              return (
                <g
                  key={edgeKey}
                  style={{ cursor: onUpdateNeighbor ? 'pointer' : 'default' }}
                  onMouseEnter={e => {
                    setHoveredEdge(edgeKey);
                    if (!edgePopup) {
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (rect) setTooltip({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        content: `Cost: ${edge.cost} | State: ${edge.state}\nClick to edit`,
                      });
                    }
                  }}
                  onMouseLeave={() => { setHoveredEdge(null); setTooltip(null); }}
                  onClick={e => {
                    if (!onUpdateNeighbor) return;
                    e.stopPropagation();
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    openEdgePopup(edge, e.clientX - rect.left, e.clientY - rect.top);
                  }}
                >
                  {/* Wide transparent hit area */}
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={18} />
                  <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={color}
                    strokeWidth={isHovered || isEdgePopupOpen ? 3 : 1.5}
                    strokeDasharray={dash}
                    opacity={isHovered || isEdgePopupOpen ? 1 : 0.65}
                    filter={isHovered || isEdgePopupOpen ? 'url(#glow)' : undefined}
                    markerEnd={`url(#arrow-${edge.state})`}
                  />
                  {/* Cost badge */}
                  <rect
                    x={midX - 18} y={midY - 11}
                    width={36} height={22}
                    rx={5}
                    fill="#1a1d27"
                    stroke={isEdgePopupOpen ? '#60a5fa' : color}
                    strokeWidth={isEdgePopupOpen ? 1.5 : 0.8}
                    opacity={0.95}
                  />
                  <text
                    x={midX} y={midY - 1}
                    textAnchor="middle"
                    fill={color}
                    fontSize={10}
                    fontFamily="var(--font-mono)"
                    fontWeight={700}
                  >
                    {edge.cost}
                  </text>
                  <text
                    x={midX} y={midY + 9}
                    textAnchor="middle"
                    fill={color}
                    fontSize={7}
                    fontFamily="var(--font-mono)"
                    opacity={0.75}
                  >
                    {edge.state.slice(0, 4)}
                  </text>
                  {/* Edit hint on hover */}
                  {isHovered && !isEdgePopupOpen && onUpdateNeighbor && (
                    <text
                      x={midX} y={midY - 16}
                      textAnchor="middle"
                      fill="#60a5fa"
                      fontSize={7.5}
                      fontFamily="var(--font-sans)"
                      fontStyle="italic"
                    >
                      click to edit
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {positions.map(pos => {
              const router = routers.find(r => r.id === pos.id);
              if (!router) return null;
              const statusColor = routerStatusColor(router.status);
              const isHovered = hoveredNode === router.id;
              const x = pos.x - NODE_W / 2;
              const y = pos.y - NODE_H / 2;
              const isEditTarget = editPopup?.routerId === router.id;

              return (
                <g
                  key={router.id}
                  data-node
                  transform={`translate(${x},${y})`}
                  style={{ cursor: onUpdateRouter ? 'pointer' : 'default' }}
                  onMouseEnter={e => {
                    if (editPopup || edgePopup) return;
                    setHoveredNode(router.id);
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) setTooltip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      content: `${router.name}\n${router.ipv4Address} / ${router.ipv6Address}\n${router.model} · ${router.location}`,
                    });
                  }}
                  onMouseLeave={() => { setHoveredNode(null); setTooltip(null); }}
                  onClick={() => {
                    if (!onUpdateRouter) return;
                    const screen = svgToScreen(pos.x, pos.y);
                    openEditPopup(router.id, screen.x, screen.y);
                  }}
                >
                  {(isHovered || isEditTarget) && (
                    <rect
                      x={-4} y={-4}
                      width={NODE_W + 8} height={NODE_H + 8}
                      rx={14}
                      fill="none"
                      stroke={statusColor}
                      strokeWidth={2}
                      opacity={0.5}
                      filter="url(#glow)"
                    />
                  )}
                  <rect
                    x={0} y={0}
                    width={NODE_W} height={NODE_H}
                    rx={10}
                    fill="#1a1d27"
                    stroke={isEditTarget ? '#60a5fa' : statusColor}
                    strokeWidth={isHovered || isEditTarget ? 2 : 1.5}
                  />
                  <rect x={0} y={0} width={4} height={NODE_H} rx={2} fill={statusColor} />
                  <rect x={12} y={14} width={28} height={28} rx={6} fill={statusColor} opacity={0.15} />
                  <text x={26} y={33} textAnchor="middle" fontSize={16} fill={statusColor}>⬡</text>
                  <text x={50} y={24} fill="#e2e8f0" fontSize={11} fontWeight={700} fontFamily="var(--font-sans)">
                    {router.name.length > 16 ? router.name.slice(0, 15) + '…' : router.name}
                  </text>
                  <text x={50} y={39} fill="#8892a4" fontSize={9.5} fontFamily="var(--font-mono)">
                    {router.ipv4Address}
                  </text>
                  <text x={50} y={53} fill="#6370a4" fontSize={9} fontFamily="var(--font-mono)">
                    {router.ipv6Address.length > 18 ? router.ipv6Address.slice(0, 17) + '…' : router.ipv6Address}
                  </text>
                  <text x={50} y={68} fill="#4a5070" fontSize={9} fontFamily="var(--font-sans)">
                    {router.neighbors.length} neighbor{router.neighbors.length !== 1 ? 's' : ''}
                  </text>
                  {onUpdateRouter && isHovered && !isEditTarget && (
                    <text x={NODE_W - 8} y={14} textAnchor="end" fill="#60a5fa" fontSize={8.5} fontFamily="var(--font-sans)" fontStyle="italic">
                      click to edit
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Tooltip */}
        {tooltip && !editPopup && !edgePopup && (
          <div className={styles.tooltip} style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}>
            {tooltip.content.split('\n').map((line, i) => (
              <div key={i} style={{ opacity: i === 0 ? 1 : 0.75, fontSize: i === 0 ? '0.82rem' : '0.75rem' }}>
                {line}
              </div>
            ))}
          </div>
        )}

        {/* Node Edit Popup */}
        {editPopup && onUpdateRouter && (() => {
          const router = routers.find(r => r.id === editPopup.routerId);
          if (!router) return null;
          const statusColor = routerStatusColor(router.status);
          const popupW = 230;
          const popupLeft = Math.min(Math.max(editPopup.x - popupW / 2, 8), dims.width - popupW - 8);
          const popupTop = Math.max(editPopup.y - NODE_H * zoom / 2 - 200, 8);

          return (
            <div
              className={styles.editPopup}
              style={{ left: popupLeft, top: popupTop, width: popupW }}
              data-node
              onClick={e => e.stopPropagation()}
            >
              <div className={styles.editPopupHeader}>
                <span className={styles.editPopupTitle}>{router.name}</span>
                <button className={styles.editPopupClose} onClick={cancelEdit}>✕</button>
              </div>

              {/* IPv4 */}
              <div className={styles.editPopupField}>
                <label className={styles.editPopupLabel}>IPv4 Address</label>
                {inlineEdit?.routerId === router.id && inlineEdit.field === 'ipv4Address' ? (
                  <div className={styles.editInputRow}>
                    <input
                      ref={inputRef}
                      className={styles.editInput}
                      value={inlineEdit.value}
                      onChange={e => setInlineEdit(prev => prev ? { ...prev, value: e.target.value } : null)}
                      onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
                      placeholder="e.g. 192.168.1.1"
                    />
                    <button className={styles.editSaveBtn} onClick={commitEdit}>✓</button>
                    <button className={styles.editCancelBtn} onClick={() => setInlineEdit(null)}>✕</button>
                  </div>
                ) : (
                  <div className={styles.editValueRow} onClick={() => startInlineEdit(router.id, 'ipv4Address', router.ipv4Address)} title="Click to edit">
                    <code className={styles.editValueCode}>{router.ipv4Address}</code>
                    <span className={styles.editPencil}>✎</span>
                  </div>
                )}
              </div>

              {/* IPv6 */}
              <div className={styles.editPopupField}>
                <label className={styles.editPopupLabel}>IPv6 Address</label>
                {inlineEdit?.routerId === router.id && inlineEdit.field === 'ipv6Address' ? (
                  <div className={styles.editInputRow}>
                    <input
                      ref={inputRef}
                      className={styles.editInput}
                      value={inlineEdit.value}
                      onChange={e => setInlineEdit(prev => prev ? { ...prev, value: e.target.value } : null)}
                      onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
                      placeholder="e.g. fe80::1"
                    />
                    <button className={styles.editSaveBtn} onClick={commitEdit}>✓</button>
                    <button className={styles.editCancelBtn} onClick={() => setInlineEdit(null)}>✕</button>
                  </div>
                ) : (
                  <div className={styles.editValueRow} onClick={() => startInlineEdit(router.id, 'ipv6Address', router.ipv6Address)} title="Click to edit">
                    <code className={styles.editValueCode}>{router.ipv6Address}</code>
                    <span className={styles.editPencil}>✎</span>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className={styles.editPopupField}>
                <label className={styles.editPopupLabel}>Status</label>
                {inlineEdit?.routerId === router.id && inlineEdit.field === 'status' ? (
                  <div className={styles.editInputRow}>
                    <select
                      ref={selectRef}
                      className={styles.editSelect}
                      value={inlineEdit.value}
                      onChange={e => setInlineEdit(prev => prev ? { ...prev, value: e.target.value } : null)}
                      onKeyDown={e => { if (e.key === 'Escape') cancelEdit(); }}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                    <button className={styles.editSaveBtn} onClick={commitEdit}>✓</button>
                    <button className={styles.editCancelBtn} onClick={() => setInlineEdit(null)}>✕</button>
                  </div>
                ) : (
                  <div className={styles.editValueRow} onClick={() => startInlineEdit(router.id, 'status', router.status)} title="Click to edit">
                    <span className={styles.editStatusDot} style={{ background: statusColor }} />
                    <span className={styles.editStatusText} style={{ color: statusColor }}>
                      {router.status.charAt(0).toUpperCase() + router.status.slice(1)}
                    </span>
                    <span className={styles.editPencil}>✎</span>
                  </div>
                )}
              </div>

              <button className={styles.editPopupDone} onClick={cancelEdit}>Done</button>
            </div>
          );
        })()}

        {/* Edge Edit Popup */}
        {edgePopup && onUpdateNeighbor && (() => {
          const edge = edges.find(e => [e.sourceId, e.targetId].sort().join('--') === edgePopup.edgeKey);
          if (!edge) return null;
          const color = getEdgeColor(edgePopup.state);
          const popupW = 220;
          const popupLeft = Math.min(Math.max(edgePopup.x - popupW / 2, 8), dims.width - popupW - 8);
          const popupTop = Math.min(Math.max(edgePopup.y - 160, 8), dims.height - 180);
          const srcRouter = routers.find(r => r.id === edge.sourceId);
          const tgtRouter = routers.find(r => r.id === edge.targetId);

          return (
            <div
              className={styles.editPopup}
              style={{ left: popupLeft, top: popupTop, width: popupW }}
              data-node
              onClick={e => e.stopPropagation()}
            >
              <div className={styles.editPopupHeader}>
                <span className={styles.editPopupTitle} style={{ fontSize: '0.78rem' }}>
                  {srcRouter?.name ?? edge.sourceId}
                  <span style={{ color: 'var(--color-text-muted)', margin: '0 4px' }}>↔</span>
                  {tgtRouter?.name ?? edge.targetId}
                </span>
                <button className={styles.editPopupClose} onClick={() => { setEdgePopup(null); setEdgeEdit(null); }}>✕</button>
              </div>

              <div className={styles.edgeBadgeRow}>
                <span className={styles.edgeBadge} style={{ borderColor: color, color }}>
                  {edgePopup.state}
                </span>
              </div>

              {/* Cost */}
              <div className={styles.editPopupField}>
                <label className={styles.editPopupLabel}>Link Cost</label>
                {edgeEdit?.edgeKey === edgePopup.edgeKey && edgeEdit.field === 'cost' ? (
                  <div className={styles.editInputRow}>
                    <input
                      ref={edgeInputRef}
                      className={styles.editInput}
                      type="number"
                      min={1}
                      value={edgeEdit.value}
                      onChange={e => setEdgeEdit(prev => prev ? { ...prev, value: e.target.value } : null)}
                      onKeyDown={e => { if (e.key === 'Enter') commitEdgeEdit(); if (e.key === 'Escape') cancelEdgeEdit(); }}
                      placeholder="e.g. 10"
                    />
                    <button className={styles.editSaveBtn} onClick={commitEdgeEdit}>✓</button>
                    <button className={styles.editCancelBtn} onClick={cancelEdgeEdit}>✕</button>
                  </div>
                ) : (
                  <div className={styles.editValueRow} onClick={() => startEdgeEdit('cost', String(edgePopup.cost))} title="Click to edit">
                    <code className={styles.editValueCode}>{edgePopup.cost}</code>
                    <span className={styles.editPencil}>✎</span>
                  </div>
                )}
              </div>

              {/* State */}
              <div className={styles.editPopupField}>
                <label className={styles.editPopupLabel}>Link State (NDP)</label>
                {edgeEdit?.edgeKey === edgePopup.edgeKey && edgeEdit.field === 'state' ? (
                  <div className={styles.editInputRow}>
                    <select
                      ref={edgeSelectRef}
                      className={styles.editSelect}
                      value={edgeEdit.value}
                      onChange={e => setEdgeEdit(prev => prev ? { ...prev, value: e.target.value } : null)}
                      onKeyDown={e => { if (e.key === 'Escape') cancelEdgeEdit(); }}
                    >
                      {NDP_STATES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button className={styles.editSaveBtn} onClick={commitEdgeEdit}>✓</button>
                    <button className={styles.editCancelBtn} onClick={cancelEdgeEdit}>✕</button>
                  </div>
                ) : (
                  <div className={styles.editValueRow} onClick={() => startEdgeEdit('state', edgePopup.state)} title="Click to edit">
                    <span className={styles.editStatusDot} style={{ background: color }} />
                    <span className={styles.editStatusText} style={{ color, fontSize: '0.8rem' }}>{edgePopup.state}</span>
                    <span className={styles.editPencil}>✎</span>
                  </div>
                )}
              </div>

              <button className={styles.editPopupDone} onClick={() => { setEdgePopup(null); setEdgeEdit(null); }}>Done</button>
            </div>
          );
        })()}
      </div>

      {routers.length === 0 && (
        <div className={styles.empty}>
          <Server size={40} color="var(--color-border-hover)" />
          <p>No routers to display. Add routers and define adjacencies to see the topology.</p>
        </div>
      )}
    </div>
  );
}
