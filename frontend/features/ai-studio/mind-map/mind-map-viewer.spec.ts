import { mindMapToSvg } from '../exports/download';
import { mindMapElements } from './mind-map-viewer';

const root = { id: 'root', label: 'Research & Design', children: [{ id: 'child', label: 'Evidence', children: [{ id: 'leaf', label: 'Finding' }] }] };
describe('Mind Map', () => {
  it('creates React Flow nodes and hierarchical edges', () => {
    const result = mindMapElements(root);
    expect(result.nodes).toHaveLength(3);
    expect(result.edges.map((edge) => [edge.source, edge.target])).toEqual([['root', 'child'], ['child', 'leaf']]);
  });
  it('exports portable escaped SVG', () => {
    const svg = mindMapToSvg(root);
    expect(svg).toContain('<svg');
    expect(svg).toContain('Research &amp; Design');
    expect(svg).toContain('<path');
  });
});
