# Charts

Chart outputs support bar, line, pie, scatter, histogram, and area. The backend
validates the CSV/XLSX source, chooses columns when axes are omitted, and saves a
provider-independent chart type, title, axes, data, and CSV snapshot.

The frontend renders definitions with Recharts in a responsive container. SVG
export serializes the rendered SVG; PNG export draws it to a white 1200×700
canvas. JSON, Markdown, and CSV use the shared output export API.
