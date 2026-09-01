import { render, screen } from '@testing-library/react';
import { ChartViewer } from './chart-viewer';

describe('ChartViewer', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: class { observe() {} unobserve() {} disconnect() {} } });
  });
  it.each(['bar', 'line', 'pie', 'scatter', 'histogram', 'area'] as const)('renders responsive %s charts with image exports', (chartType) => {
    render(<ChartViewer chart={{ format: 'chart', chartType, title: 'Sales', xKey: 'month', yKey: 'sales', data: [{ month: 'Jan', sales: 10 }, { month: 'Feb', sales: 20 }] }} />);
    expect(screen.getByRole('img', { name: `${chartType} chart: Sales` })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PNG' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SVG' })).toBeInTheDocument();
  });
});
