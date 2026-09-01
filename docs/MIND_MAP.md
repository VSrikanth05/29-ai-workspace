# Mind Map

Mind Map is the Milestone 4 replacement for the previous Diagram experience.
New generation uses `POST /ai-studio/mind-map` and stores bounded hierarchical
JSON:

```json
{"id":"root","label":"Main topic","children":[{"id":"child","label":"Concept"}]}
```

The backend validates JSON structure, label sizes, maximum depth (8), and maximum
node count (150) before persistence. Invalid provider output is rejected rather
than stored.

The frontend converts the hierarchy into React Flow nodes and edges. React Flow
provides pan, zoom, and Fit View controls. SVG export serializes a portable vector
tree with escaped labels; PNG export rasterizes that SVG in the browser. JSON and
Markdown hierarchy exports use the standard AIOutput export API.

The legacy `/documents/:id/diagram` API and `DocumentDiagram` records remain for
backward compatibility, but all new UI and documentation use “Mind Map.”
