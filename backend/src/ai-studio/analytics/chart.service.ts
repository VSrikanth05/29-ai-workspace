import { BadRequestException, Injectable } from '@nestjs/common';
import { AIOutputType } from '@prisma/client';
import { AiStudioService } from '../ai-studio.service';
import type { ChartRequestDto } from '../dto/tool-request.dto';
import { AnalyticsEngineService } from './analytics-engine.service';

@Injectable()
export class ChartService {
  constructor(
    private readonly studio: AiStudioService,
    private readonly engine: AnalyticsEngineService,
  ) {}
  async generate(userId: string, dto: ChartRequestDto) {
    const source = await this.studio.analyticsSource(
      userId,
      dto.workspaceId,
      dto.sourceId,
    );
    const report = this.engine.analyze(
      source.extractedText!,
      source.originalName,
    );
    const numeric = report.columns.filter((column) => column.type === 'number');
    const category = report.columns.find((column) => column.type !== 'number');
    const xKey =
      dto.xKey ??
      (dto.chartType === 'scatter' || dto.chartType === 'histogram'
        ? numeric[0]?.name
        : (category?.name ?? numeric[0]?.name));
    const yKey =
      dto.yKey ??
      (dto.chartType === 'histogram'
        ? xKey
        : (numeric.find((column) => column.name !== xKey)?.name ??
          numeric[0]?.name));
    if (
      !xKey ||
      !yKey ||
      !report.columns.some((column) => column.name === xKey) ||
      !report.columns.some((column) => column.name === yKey)
    )
      throw new BadRequestException(
        'Chart columns were not found in the selected source.',
      );
    let data = report.data.slice(0, 500);
    let renderedXKey = xKey;
    let renderedYKey = yKey;
    if (dto.chartType === 'histogram') {
      const values = data
        .map((row) => row[xKey])
        .filter((value): value is number => typeof value === 'number');
      if (!values.length)
        throw new BadRequestException('Histogram columns must be numeric.');
      const min = Math.min(...values);
      const max = Math.max(...values);
      const binCount = Math.min(
        10,
        Math.max(1, Math.ceil(Math.sqrt(values.length))),
      );
      const width = max === min ? 1 : (max - min) / binCount;
      data = Array.from({ length: binCount }, (_, index) => {
        const start = min + index * width;
        const end = index === binCount - 1 ? max : start + width;
        return {
          range: `${Number(start.toFixed(2))}–${Number(end.toFixed(2))}`,
          count: values.filter((value) =>
            index === binCount - 1
              ? value >= start && value <= end
              : value >= start && value < end,
          ).length,
        };
      });
      renderedXKey = 'range';
      renderedYKey = 'count';
    } else if (dto.chartType === 'pie') {
      const grouped = new Map<string, number>();
      data.forEach((row) => {
        const label = String(row[xKey] ?? 'Unknown');
        const value = row[yKey];
        if (typeof value === 'number')
          grouped.set(label, (grouped.get(label) ?? 0) + value);
      });
      data = [...grouped.entries()].map(([label, value]) => ({
        [xKey]: label,
        [yKey]: value,
      }));
    }
    const content = {
      format: 'chart',
      chartType: dto.chartType,
      title:
        dto.chartType === 'histogram'
          ? `Distribution of ${xKey}`
          : `${yKey} by ${xKey}`,
      xKey: renderedXKey,
      yKey: renderedYKey,
      data,
      csv: report.csv,
    };
    return this.studio.persistComputed(
      userId,
      { ...dto, sourceIds: [dto.sourceId] },
      AIOutputType.CHART,
      content.title,
      content,
      { sourceId: dto.sourceId, chartType: dto.chartType, xKey, yKey },
    );
  }
}
