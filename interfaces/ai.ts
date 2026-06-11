// Enemy AI as a flowchart graph, parsed from the AI Lua decision tree.
export interface AINode {
  id: number;
  kind: 'cond' | 'action' | 'merge';
  text: string;
}

export interface AIEdge {
  from: number;
  to: number;
  label: string;   // 'yes' | 'no' | ''
}

export interface AIGraph {
  nodes: AINode[];
  edges: AIEdge[];
  root: number | null;
}
