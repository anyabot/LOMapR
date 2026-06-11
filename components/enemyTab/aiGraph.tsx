import { useMemo } from 'react';
import ReactFlow, {
  Background, Controls, MarkerType, Position,
  Node, Edge, BaseEdge, EdgeProps, EdgeLabelRenderer,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from '@dagrejs/dagre';
import { AIGraph } from '@/interfaces/ai';

const NODE_W = 190;
const NODE_H = 52;
const YES = '#7bc47f';
const NO = '#e0707a';
const PLAIN = '#6b7280';

// render a node's text, styling "--- AND/OR ---" separators as their own line
function renderLabel(text: string) {
  const lines = text.split('\n');
  return (
    <div>
      {lines.map((ln, i) => {
        const sep = /^---\s*(AND|OR)\s*---$/.exec(ln);
        if (sep) {
          return (
            <div key={i} style={{ color: '#ffb454', fontWeight: 700, fontSize: 9, letterSpacing: 1, margin: '1px 0' }}>
              {sep[1]}
            </div>
          );
        }
        return <div key={i}>{ln}</div>;
      })}
    </div>
  );
}

// estimate node height from its text (rough wrap at ~26 chars/line + separators)
function nodeHeight(text: string): number {
  const parts = text.split('\n');
  let lines = 0;
  for (const p of parts) lines += /^---/.test(p) ? 1 : Math.max(1, Math.ceil(p.length / 26));
  return Math.max(NODE_H, 14 + lines * 15);
}

// Custom edge that follows dagre's routed waypoints (avoids overlapping nodes).
function RoutedEdge({ id, data, style, markerEnd, label, labelStyle }: EdgeProps) {
  const pts: { x: number; y: number }[] = data?.points || [];
  if (pts.length < 2) return null;
  // smooth-ish polyline through the waypoints
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x},${pts[i].y}`;
  const mid = pts[Math.floor(pts.length / 2)];
  return (
    <>
      <BaseEdge id={id} path={d} style={style} markerEnd={markerEnd} />
      {label ? (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%,-50%) translate(${mid.x}px,${mid.y}px)`,
              fontSize: 10, fontWeight: 700, padding: '0 3px', borderRadius: 3,
              background: '#0f1115', ...(labelStyle as object),
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

const edgeTypes = { routed: RoutedEdge };

function layout(graph: AIGraph): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'TB',
    nodesep: 42,     // gap between nodes in a rank
    ranksep: 70,     // gap between ranks (rows)
    edgesep: 24,     // gap between parallel edges
    marginx: 12,
    marginy: 12,
    ranker: 'tight-tree',
  });

  graph.nodes.forEach((n) =>
    g.setNode(String(n.id), { width: NODE_W, height: nodeHeight(n.text) }));
  graph.edges.forEach((e, i) =>
    g.setEdge(String(e.from), String(e.to), {}, `e${i}`));
  dagre.layout(g);

  const nodes: Node[] = graph.nodes.map((n) => {
    const p = g.node(String(n.id));
    const h = nodeHeight(n.text);
    const isCond = n.kind === 'cond';
    return {
      id: String(n.id),
      position: { x: p.x - NODE_W / 2, y: p.y - h / 2 },
      data: { label: renderLabel(n.text) },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      style: {
        width: NODE_W,
        minHeight: h,
        fontSize: 11,
        lineHeight: 1.25,
        padding: 6,
        borderRadius: isCond ? 14 : 6,
        background: isCond ? '#2c313c' : '#1f5c54',
        color: '#e8eaed',
        border: `1px solid ${isCond ? '#5e81ac' : '#3fb6a5'}`,
        textAlign: 'center' as const,
        whiteSpace: 'normal' as const,
      },
    };
  });

  const edges: Edge[] = graph.edges.map((e, i) => {
    const color = e.label === 'yes' ? YES : e.label === 'no' ? NO : PLAIN;
    const ge = g.edge(String(e.from), String(e.to), `e${i}`);
    return {
      id: `e${i}`,
      source: String(e.from),
      target: String(e.to),
      type: 'routed',
      label: e.label || undefined,
      data: { points: ge?.points ?? [] },
      style: { stroke: color, strokeWidth: 1.6, fill: 'none' },
      labelStyle: { color },
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
    };
  });

  return { nodes, edges };
}

export default function AIGraphView({ graph }: { graph: AIGraph }) {
  const { nodes, edges } = useMemo(() => layout(graph), [graph]);

  return (
    <div style={{ width: '100%', height: 440, background: '#0f1115', borderRadius: 8 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#2c313c" gap={18} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
