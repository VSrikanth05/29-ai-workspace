# Reports

`POST /ai-studio/report` supports `executive`, `detailed`, and `bullet` styles.
Every generated Markdown report includes:

- Executive Summary
- Findings
- Action Items
- Conclusions

Reports are grounded through selected sources and the existing RAG pipeline,
saved as `REPORT` outputs, and exportable as Markdown or JSON. The output metadata
contains a `pdfExport: hook-only` marker. This is the approved PDF export hook;
binary PDF generation remains deferred.
