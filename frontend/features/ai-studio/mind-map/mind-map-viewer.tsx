'use client';
import { Background, Controls, ReactFlow, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { MindMapNode } from '../ai-studio-types';

export function mindMapElements(root: MindMapNode): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []; const edges: Edge[] = []; let row = 0;
  const visit = (node: MindMapNode, depth: number, parent?: string) => { nodes.push({ id: node.id, position: { x: depth * 220, y: row++ * 80 }, data: { label: node.label }, style: { borderRadius: 12, border: '1px solid var(--primary)', background: 'var(--panel)', color: 'var(--foreground)', width: 170, fontSize: 12 } }); if (parent) edges.push({ id: `${parent}-${node.id}`, source: parent, target: node.id }); node.children?.forEach((child) => visit(child, depth + 1, node.id)); };
  visit(root, 0); return { nodes, edges };
}
export function MindMapViewer({ root }: { root: MindMapNode }) {
  const elements = mindMapElements(root);
  return <div className="h-80 min-h-64 w-full overflow-hidden rounded-xl border border-border" aria-label="Interactive Mind Map"><ReactFlow nodes={elements.nodes} edges={elements.edges} fitView minZoom={0.2} maxZoom={2}><Background /><Controls showInteractive={false} /></ReactFlow></div>;
}
