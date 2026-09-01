import { BadRequestException, Injectable } from '@nestjs/common';

export type DataRow = Record<string, string | number | null>;

@Injectable()
export class AnalyticsEngineService {
  analyze(text: string, filename: string) {
    const sheets = this.parseSheets(text, filename);
    const primary = sheets[0];
    if (!primary?.rows.length)
      throw new BadRequestException('The selected file contains no data rows.');
    const columns = primary.headers.map((name) =>
      this.profile(name, primary.rows),
    );
    const duplicates = this.duplicates(primary.rows);
    const correlations = this.correlations(columns, primary.rows);
    const distributions = columns.map((column) =>
      this.distribution(column, primary.rows),
    );
    const outliers = columns.flatMap((column) =>
      this.outliers(column, primary.rows),
    );
    const trends = columns.flatMap((column) =>
      this.trend(column, primary.rows),
    );
    const suggestedCharts = this.suggest(columns);
    const missing = columns.reduce((sum, column) => sum + column.missing, 0);
    return {
      format: 'analytics',
      filename,
      summary: `${primary.rows.length} rows across ${columns.length} columns. ${missing} missing values and ${duplicates.length} duplicate rows were detected.`,
      sheetCount: sheets.length,
      sheets: sheets.map((sheet) => ({
        name: sheet.name,
        rowCount: sheet.rows.length,
      })),
      rowCount: primary.rows.length,
      columns,
      missingValues: missing,
      duplicateRows: duplicates,
      correlations,
      distributions,
      outliers,
      trends,
      suggestedCharts,
      data: primary.rows.slice(0, 1000),
      csv: this.toCsv(primary.headers, primary.rows),
    };
  }

  private parseSheets(text: string, filename: string) {
    const blocks = text.includes('## Sheet:')
      ? text.split(/(?=## Sheet:)/g).filter((part) => part.trim())
      : [text];
    return blocks.map((block, index) => {
      const lines = block.replace(/^## Sheet:\s*([^\r\n]+)[\r\n]+/, '').trim();
      const name =
        block.match(/^## Sheet:\s*([^\r\n]+)/)?.[1]?.trim() ??
        (index ? `Sheet ${index + 1}` : filename);
      const matrix = this.parseCsv(lines);
      const headers = (matrix.shift() ?? []).map(
        (header, column) => header.trim() || `Column ${column + 1}`,
      );
      const rows = matrix
        .filter((row) => row.some((cell) => cell.trim()))
        .map((row) =>
          Object.fromEntries(
            headers.map((header, column) => [
              header,
              this.value(row[column] ?? ''),
            ]),
          ),
        );
      return { name, headers, rows };
    });
  }

  private parseCsv(value: string) {
    const rows: string[][] = [];
    let row: string[] = [],
      cell = '',
      quoted = false;
    for (let index = 0; index < value.length; index += 1) {
      const character = value[index];
      if (character === '"' && quoted && value[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = !quoted;
      else if (character === ',' && !quoted) {
        row.push(cell);
        cell = '';
      } else if ((character === '\n' || character === '\r') && !quoted) {
        if (character === '\r' && value[index + 1] === '\n') index += 1;
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else cell += character;
    }
    if (cell.length || row.length) {
      row.push(cell);
      rows.push(row);
    }
    return rows;
  }

  private value(raw: string): string | number | null {
    const value = raw.trim();
    if (!value) return null;
    const number = Number(value.replace(/,/g, ''));
    return Number.isFinite(number) &&
      /^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(value.replace(/,/g, ''))
      ? number
      : value;
  }

  private profile(name: string, rows: DataRow[]) {
    const values = rows
      .map((row) => row[name])
      .filter((value) => value !== null);
    const numeric = values.filter(
      (value): value is number => typeof value === 'number',
    );
    const dateValues = values.filter(
      (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value)),
    );
    const type =
      numeric.length === values.length && values.length
        ? 'number'
        : dateValues.length === values.length && values.length
          ? 'date'
          : 'text';
    const sorted = [...numeric].sort((a, b) => a - b);
    const mean = numeric.length
      ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length
      : null;
    const median = sorted.length
      ? (sorted[Math.floor((sorted.length - 1) / 2)] +
          sorted[Math.ceil((sorted.length - 1) / 2)]) /
        2
      : null;
    return {
      name,
      type,
      count: values.length,
      missing: rows.length - values.length,
      unique: new Set(values.map(String)).size,
      min: sorted[0] ?? null,
      max: sorted.at(-1) ?? null,
      mean,
      median,
    };
  }

  private duplicates(rows: DataRow[]) {
    const seen = new Set<string>();
    const result: number[] = [];
    rows.forEach((row, index) => {
      const key = JSON.stringify(row);
      if (seen.has(key)) result.push(index + 2);
      else seen.add(key);
    });
    return result;
  }

  private correlations(
    columns: ReturnType<AnalyticsEngineService['profile']>[],
    rows: DataRow[],
  ) {
    const numeric = columns.filter((column) => column.type === 'number');
    const result: { x: string; y: string; coefficient: number }[] = [];
    for (let left = 0; left < numeric.length; left += 1)
      for (let right = left + 1; right < numeric.length; right += 1) {
        const pairs = rows
          .map((row) => [row[numeric[left].name], row[numeric[right].name]])
          .filter((pair): pair is [number, number] =>
            pair.every((value) => typeof value === 'number'),
          );
        if (pairs.length < 2) continue;
        const mx = pairs.reduce((sum, pair) => sum + pair[0], 0) / pairs.length;
        const my = pairs.reduce((sum, pair) => sum + pair[1], 0) / pairs.length;
        const numerator = pairs.reduce(
          (sum, pair) => sum + (pair[0] - mx) * (pair[1] - my),
          0,
        );
        const denominator = Math.sqrt(
          pairs.reduce((sum, pair) => sum + (pair[0] - mx) ** 2, 0) *
            pairs.reduce((sum, pair) => sum + (pair[1] - my) ** 2, 0),
        );
        result.push({
          x: numeric[left].name,
          y: numeric[right].name,
          coefficient: denominator
            ? Number((numerator / denominator).toFixed(4))
            : 0,
        });
      }
    return result;
  }

  private distribution(
    column: ReturnType<AnalyticsEngineService['profile']>,
    rows: DataRow[],
  ) {
    const counts = new Map<string, number>();
    rows.forEach((row) => {
      const value = row[column.name];
      if (value !== null)
        counts.set(String(value), (counts.get(String(value)) ?? 0) + 1);
    });
    return {
      column: column.name,
      values: [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([value, count]) => ({ value, count })),
    };
  }

  private outliers(
    column: ReturnType<AnalyticsEngineService['profile']>,
    rows: DataRow[],
  ) {
    if (column.type !== 'number') return [];
    const values = rows
      .map((row) => row[column.name])
      .filter((value): value is number => typeof value === 'number')
      .sort((a, b) => a - b);
    if (values.length < 4) return [];
    const q1 = values[Math.floor(values.length * 0.25)],
      q3 = values[Math.floor(values.length * 0.75)],
      range = q3 - q1;
    return rows.flatMap((row, index) =>
      typeof row[column.name] === 'number' &&
      ((row[column.name] as number) < q1 - 1.5 * range ||
        (row[column.name] as number) > q3 + 1.5 * range)
        ? [
            {
              column: column.name,
              row: index + 2,
              value: row[column.name] as number,
            },
          ]
        : [],
    );
  }

  private trend(
    column: ReturnType<AnalyticsEngineService['profile']>,
    rows: DataRow[],
  ) {
    if (column.type !== 'number') return [];
    const values = rows
      .map((row) => row[column.name])
      .filter((value): value is number => typeof value === 'number');
    if (values.length < 3) return [];
    const first =
      values.slice(0, Math.ceil(values.length / 3)).reduce((a, b) => a + b, 0) /
      Math.ceil(values.length / 3);
    const lastValues = values.slice(-Math.ceil(values.length / 3));
    const last = lastValues.reduce((a, b) => a + b, 0) / lastValues.length;
    const delta = first === 0 ? last : (last - first) / Math.abs(first);
    return [
      {
        column: column.name,
        direction:
          Math.abs(delta) < 0.02
            ? 'stable'
            : delta > 0
              ? 'increasing'
              : 'decreasing',
        change: Number(delta.toFixed(4)),
      },
    ];
  }

  private suggest(columns: ReturnType<AnalyticsEngineService['profile']>[]) {
    const category = columns.find((column) => column.type !== 'number');
    const numbers = columns.filter((column) => column.type === 'number');
    const suggestions: {
      type: string;
      xKey: string;
      yKey: string;
      reason: string;
    }[] = [];
    if (category && numbers[0])
      suggestions.push({
        type: category.type === 'date' ? 'line' : 'bar',
        xKey: category.name,
        yKey: numbers[0].name,
        reason: 'Compare a numeric measure across categories.',
      });
    if (numbers[0])
      suggestions.push({
        type: 'histogram',
        xKey: numbers[0].name,
        yKey: numbers[0].name,
        reason: 'Inspect the numeric distribution.',
      });
    if (numbers[1])
      suggestions.push({
        type: 'scatter',
        xKey: numbers[0].name,
        yKey: numbers[1].name,
        reason: 'Inspect the relationship between numeric columns.',
      });
    return suggestions;
  }

  private toCsv(headers: string[], rows: DataRow[]) {
    const escape = (value: unknown) => {
      const text =
        value === null || value === undefined
          ? ''
          : typeof value === 'string' ||
              typeof value === 'number' ||
              typeof value === 'boolean'
            ? String(value)
            : JSON.stringify(value);
      return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    return [
      headers.map(escape).join(','),
      ...rows.map((row) =>
        headers.map((header) => escape(row[header])).join(','),
      ),
    ].join('\r\n');
  }
}
