import { AnalyticsEngineService } from './analytics-engine.service';

describe('AnalyticsEngineService', () => {
  const engine = new AnalyticsEngineService();
  it('profiles CSV quality, correlations, outliers, and trends', () => {
    const report = engine.analyze(
      'month,sales,cost\nJan,10,5\nFeb,20,10\nMar,30,15\nMar,30,15\nApr,,500',
      'sales.csv',
    );
    expect(report.rowCount).toBe(5);
    expect(report.missingValues).toBe(1);
    expect(report.duplicateRows).toEqual([5]);
    expect(
      report.columns.find((column) => column.name === 'sales'),
    ).toMatchObject({ type: 'number', mean: 22.5 });
    expect(report.correlations[0]?.coefficient).toBeGreaterThan(0);
    expect(report.outliers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ column: 'cost', value: 500 }),
      ]),
    );
    expect(
      report.trends.find((trend) => trend.column === 'sales')?.direction,
    ).toBe('increasing');
    expect(report.csv).toContain('month,sales,cost');
  });

  it('supports extracted XLSX sheet blocks', () => {
    const report = engine.analyze(
      '## Sheet: One\na,b\n1,2\n\n## Sheet: Two\nc,d\n3,4',
      'book.xlsx',
    );
    expect(report.sheetCount).toBe(2);
    expect(report.sheets.map((sheet) => sheet.name)).toEqual(['One', 'Two']);
  });
});
