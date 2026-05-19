import { useEffect, useRef, useState, useCallback } from 'react';
import { Router } from '@/types';
import styles from '@/components/topology/TopologyDiagram.module.css';
import { routerStatusColor } from '@/lib/utils';
import { Server, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

type Props = {
  routers: Router[];
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
  state: string;
};

const NODE_W = 160;
const NODE_H = 72;
const PADDING = 80;

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

// Force-directed layout seeded by cost
function computeLayout(routers: Router[], width: number, height: number): NodePos[] {
  if (routers.length === 0) return [];

  const cx = width / 2;
  const cy = height / 2;

  // Build adjacency with cost
  const costMap: Record<string, Record<string, number>> = {};
  routers.forEach(r => {
    costMap[r.id] = {};
    r.neighbors.forEach(n => {
      if (n.adjacentRouterId) {
        costMap[r.id][n.adjacentRouterId] = n.cost ?? 10;
      }
    });
  });

  // Initialise positions on a circle
  const angleStep = (2 * Math.PI) / routers.length;
  const radius = Math.min(width, height) * 0.32;
  const positions: Record<string, { x: number; y: number }> = {};
  routers.forEach((r, i) => {
    positions[r.id] = {
      x: cx + radius * Math.cos(i * angleStep - Math.PI / 2),
      y: cy + radius * Math.sin(i * angleStep - Math.PI / 2),
    };
  });

  // Run force-directed iterations
  const ITERATIONS = 200;
  const K = Math.sqrt((width * height) / routers.length) * 0.9; // spring length
  const REPULSION = K * K * 3.5;
  const ATTRACTION_DIVISOR = 120;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const disp: Record<string, { dx: number; dy: number }> = {};
    routers.forEach(r => { disp[r.id] = { dx: 0, dy: 0 }; });

    // Repulsion between all pairs
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

    // Attraction along edges (weighted by cost)
    routers.forEach(r => {
      r.neighbors.forEach(n => {
        const tid = n.adjacentRouterId;
        if (!tid || !positions[tid]) return;
        const cost = n.cost ?? 10;
        const dx = positions[r.id].x - positions[tid].x;
        const dy = positions[r.id].y - positions[tid].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        // Higher cost = longer ideal distance
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

    // Cooling factor
    const temp = Math.max(5, 40 * (1 - iter / ITERATIONS));

    routers.forEach(r => {
      const d = disp[r.id];
      const mag = Math.max(Math.sqrt(d.dx * d.dx + d.dy * d.dy), 0.001);
      const capped = Math.min(mag, temp);
      positions[r.id].x += (d.dx / mag) * capped;
      positions[r.id].y += (d.dy / mag) * capped;
      // Clamp to canvas
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
      });
    });
  });
  return edges;
}

export default function TopologyDiagram({ routers }: Props) {
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

  // Measure container
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

  // Recompute layout
  useEffect(() => {
    setPositions(computeLayout(routers, dims.width, dims.height));
    setEdges(buildEdges(routers));
  }, [routers, dims]);

  const getPos = useCallback((id: string) => positions.find(p => p.id === id), [positions]);

  // Pan handlers
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-node]')) return;
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
        <svg
          width={dims.width}
          height={dims.height}
          className={styles.svg}
        >
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
              const midX = (src.x + tgt.x) / 2;
              const midY = (src.y + tgt.y) / 2;
              const color = getEdgeColor(edge.state);
              const dash = getEdgeDash(edge.state);

              // Offset line endpoints to node border
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
                <g key={edgeKey}
                  onMouseEnter={e => {
                    setHoveredEdge(edgeKey);
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) setTooltip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      content: `Cost: ${edge.cost} | State: ${edge.state}`,
                    });
                  }}
                  onMouseLeave={() => { setHoveredEdge(null); setTooltip(null); }}
                >
                  {/* Hit area */}
                  <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="transparent"
                    strokeWidth={14}
                    style={{ cursor: 'pointer' }}
                  />
                  {/* Visible line */}
                  <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={color}
                    strokeWidth={isHovered ? 3 : 1.5}
                    strokeDasharray={dash}
                    opacity={isHovered ? 1 : 0.65}
                    filter={isHovered ? 'url(#glow)' : undefined}
                    markerEnd={`url(#arrow-${edge.state})`}
                  />
                  {/* Cost label */}
                  <rect
                    x={midX - 16} y={midY - 10}
                    width={32} height={18}
                    rx={4}
                    fill="#1a1d27"
                    stroke={color}
                    strokeWidth={0.8}
                    opacity={0.9}
                  />
                  <text
                    x={midX} y={midY + 4}
                    textAnchor="middle"
                    fill={color}
                    fontSize={10}
                    fontFamily="var(--font-mono)"
                    fontWeight={600}
                  >
                    {edge.cost}
                  </text>
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

              return (
                <g
                  key={router.id}
                  data-node
                  transform={`translate(${x},${y})`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => {
                    setHoveredNode(router.id);
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) setTooltip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      content: `${router.name}\n${router.ipv4Address} / ${router.ipv6Address}\n${router.model} · ${router.location}`,
                    });
                  }}
                  onMouseLeave={() => { setHoveredNode(null); setTooltip(null); }}
                >
                  {/* Node glow ring */}
                  {isHovered && (
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

                  {/* Node body */}
                  <rect
                    x={0} y={0}
                    width={NODE_W} height={NODE_H}
                    rx={10}
                    fill="#1a1d27"
                    stroke={statusColor}
                    strokeWidth={isHovered ? 2 : 1.5}
                  />

                  {/* Status bar */}
                  <rect
                    x={0} y={0}
                    width={4} height={NODE_H}
                    rx={2}
                    fill={statusColor}
                  />

                  {/* Icon background */}
                  <rect
                    x={12} y={14}
                    width={28} height={28}
                    rx={6}
                    fill={statusColor}
                    opacity={0.15}
                  />

                  {/* Server icon (drawn as SVG path approximation) */}
                  <text
                    x={26} y={33}
                    textAnchor="middle"
                    fontSize={16}
                    fill={statusColor}
                  >
                    ⬡
                  </text>

                  {/* Router name */}
                  <text
                    x={50} y={26}
                    fill="#e2e8f0"
                    fontSize={11}
                    fontWeight={700}
                    fontFamily="var(--font-sans)"
                  >
                    {router.name.length > 16 ? router.name.slice(0, 15) + '…' : router.name}
                  </text>

                  {/* IP address */}
                  <text
                    x={50} y={41}
                    fill="#8892a4"
                    fontSize={9.5}
                    fontFamily="var(--font-mono)"
                  >
                    {router.ipv4Address}
                  </text>

                  {/* Neighbor count */}
                  <text
                    x={50} y={56}
                    fill="#4a5070"
                    fontSize={9}
                    fontFamily="var(--font-sans)"
                  >
                    {router.neighbors.length} neighbor{router.neighbors.length !== 1 ? 's' : ''}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className={styles.tooltip}
            style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
          >
            {tooltip.content.split('\n').map((line, i) => (
              <div key={i} style={{ opacity: i === 0 ? 1 : 0.75, fontSize: i === 0 ? '0.82rem' : '0.75rem' }}>
                {line}
              </div>
            ))}
          </div>
        )}
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
