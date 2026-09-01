# Document analytics

Analytics accepts one processed CSV or XLSX source and reuses ingestion output.
CSV is parsed directly; XLSX sheet markers are split into individual sheets.

The primary sheet produces row/column counts, inferred types, missing and unique
counts, min/max/mean/median, duplicate rows, Pearson correlations, distributions,
IQR outliers, directional trends, and suggested charts. Up to 1,000 rows and a
CSV snapshot are stored with the report for reopening and export.

Calculations are deterministic. Unsupported files, missing extracted data, and
unauthorized sources are rejected before computation.
