'use client';

import { useRef } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { downloadText } from '../exports/download';
import type { ChartContent } from '../ai-studio-types';

const COLORS = ['#7c3aed', '#0891b2', '#059669', '#d97706', '#e11d48', '#2563eb'];

export function ChartViewer({ chart }: { chart: ChartContent }) {
  const container = useRef<HTMLDivElement>(null);
  const exportSvg = () => { const svg = container.current?.querySelector('svg'); if (svg) downloadText(`${chart.title}.svg`, new XMLSerializer().serializeToString(svg), 'image/svg+xml'); };
  const exportPng = () => { const svg = container.current?.querySelector('svg'); if (!svg) return; const source = new XMLSerializer().serializeToString(svg); const image = new Image(); const blob = new Blob([source], { type: 'image/svg+xml' }); const url = URL.createObjectURL(blob); image.onload = () => { const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 700; const context = canvas.getContext('2d'); if (context) { context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height); const link = document.createElement('a'); link.download = `${chart.title}.png`; link.href = canvas.toDataURL('image/png'); link.click(); } URL.revokeObjectURL(url); }; image.src = url; };
  const common = <><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey={chart.xKey} /><YAxis /><Tooltip /></>;
  const graph = chart.chartType === 'bar' ? <BarChart data={chart.data}>{common}<Bar dataKey={chart.yKey} fill={COLORS[0]} /></BarChart>
    : chart.chartType === 'line' ? <LineChart data={chart.data}>{common}<Line type="monotone" dataKey={chart.yKey} stroke={COLORS[0]} /></LineChart>
    : chart.chartType === 'area' ? <AreaChart data={chart.data}>{common}<Area type="monotone" dataKey={chart.yKey} fill={COLORS[0]} stroke={COLORS[0]} /></AreaChart>
    : chart.chartType === 'pie' ? <PieChart><Tooltip /><Pie data={chart.data} nameKey={chart.xKey} dataKey={chart.yKey} outerRadius={110}>{chart.data.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie></PieChart>
    : chart.chartType === 'scatter' ? <ScatterChart><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" dataKey={chart.xKey} name={chart.xKey} /><YAxis type="number" dataKey={chart.yKey} name={chart.yKey} /><Tooltip cursor={{ strokeDasharray: '3 3' }} /><Scatter data={chart.data} fill={COLORS[0]} /></ScatterChart>
    : <BarChart data={chart.data}>{common}<Bar dataKey={chart.yKey} fill={COLORS[4]} /></BarChart>;
  return <section aria-label="Chart viewer" className="space-y-3"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={exportSvg}>SVG</Button><Button size="sm" variant="outline" onClick={exportPng}>PNG</Button></div><div ref={container} className="h-80 w-full rounded-xl border border-border bg-white p-3" role="img" aria-label={`${chart.chartType} chart: ${chart.title}`}><ResponsiveContainer width="100%" height="100%">{graph}</ResponsiveContainer></div></section>;
}
