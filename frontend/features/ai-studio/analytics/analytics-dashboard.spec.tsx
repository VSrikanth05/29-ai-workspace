import { render, screen } from '@testing-library/react';
import { AnalyticsDashboard } from './analytics-dashboard';

describe('AnalyticsDashboard', () => {
  it('renders statistics, quality, and trend panels', () => {
    render(<AnalyticsDashboard report={{ format: 'analytics', filename: 'sales.csv', summary: '3 rows across 2 columns.', rowCount: 3, sheetCount: 1, sheets: [{ name: 'sales.csv', rowCount: 3 }], columns: [{ name: 'sales', type: 'number', count: 3, missing: 0, unique: 3, min: 1, max: 3, mean: 2, median: 2 }], missingValues: 0, duplicateRows: [], correlations: [], distributions: [], outliers: [], trends: [{ column: 'sales', direction: 'increasing', change: 1 }], suggestedCharts: [], data: [] }} />);
    expect(screen.getByText('Column statistics')).toBeInTheDocument();
    expect(screen.getByText('increasing')).toBeInTheDocument();
    expect(screen.getByText('Data quality')).toBeInTheDocument();
  });
});
