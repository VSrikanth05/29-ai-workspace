import type { MindMapNode } from '../ai-studio-types';

const escapeXml = (value: string) => value.replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character] ?? character);

export function mindMapToSvg(root: MindMapNode): string {
  const nodes: { node: MindMapNode; depth: number; row: number; parent?: string }[] = [];
  let row = 0;
  const visit = (node: MindMapNode, depth: number, parent?: string) => { const current = row++; nodes.push({ node, depth, row: current, parent }); node.children?.forEach((child) => visit(child, depth + 1, node.id)); };
  visit(root, 0);
  const width = Math.max(640, (Math.max(...nodes.map((item) => item.depth)) + 1) * 240);
  const height = Math.max(320, nodes.length * 76);
  const position = new Map(nodes.map((item) => [item.node.id, { x: 30 + item.depth * 220, y: 30 + item.row * 70 }]));
  const edges = nodes.flatMap((item) => { const from = item.parent ? position.get(item.parent) : undefined; const to = position.get(item.node.id); return from && to ? [`<path d="M ${from.x + 160} ${from.y + 22} C ${from.x + 190} ${from.y + 22}, ${to.x - 30} ${to.y + 22}, ${to.x} ${to.y + 22}" fill="none" stroke="#8b8ca7" stroke-width="2"/>`] : []; }).join('');
  const boxes = nodes.map((item) => { const point = position.get(item.node.id)!; return `<g><rect x="${point.x}" y="${point.y}" width="160" height="44" rx="10" fill="#f4f1ff" stroke="#7657d6"/><text x="${point.x + 12}" y="${point.y + 27}" font-family="sans-serif" font-size="13" fill="#252236">${escapeXml(item.node.label.slice(0, 24))}</text></g>`; }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/>${edges}${boxes}</svg>`;
}

export function downloadText(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

export async function downloadMindMapPng(root: MindMapNode, filename: string) {
  const svg = mindMapToSvg(root); const image = new Image(); const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Mind Map image export failed')); image.src = url; });
  const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight; canvas.getContext('2d')?.drawImage(image, 0, 0); URL.revokeObjectURL(url);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('PNG export failed')), 'image/png'));
  const pngUrl = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = pngUrl; anchor.download = filename; anchor.click(); URL.revokeObjectURL(pngUrl);
}
