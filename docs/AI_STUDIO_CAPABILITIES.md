# AI Studio capability audit

The frontend registry mirrors the backend routes audited on 2026-08-07.

| Capability | Backend route | Status |
|---|---|---|
| AI Chat | `POST /ai/chat` | Available |
| Explain | `POST /ai-studio/explain` | Available |
| Rewrite | `POST /ai-studio/rewrite` | Available |
| Summarize | `POST /ai-studio/summary` | Available |
| Translate | `POST /ai-studio/translate` | Available |
| Image Generation | `POST /media/generate` (`type=image`) | Available |
| Image Editing | — | Backend gap; shown as unavailable |
| Image Translation | `POST /ai-studio/image-translation` | Available |
| OCR | Internal Image Translation dependency only | Backend gap for standalone tool |
| PDF Translation | `POST /ai-studio/image-translation` with PDF upload | Available through shared pipeline |
| Audio Generation | `POST /media/generate` (`type=audio`) | Available |
| Speech-to-Text | — | Backend gap; shown as unavailable |
| Text-to-Speech | `POST /media/generate` (`type=audio`) | Available through shared endpoint |
| Video Generation | `POST /media/generate` (`type=video`) | Route available; provider configuration required |
| Mind Map | `POST /ai-studio/mind-map` | Available |
| Diagram Generator | `POST /ai-studio/diagram` | Available through the legacy diagram service |
| Presentation Generator | — | Backend gap; shown as unavailable |

Existing Key Points, Glossary, Flashcards, Quiz, Study Guide, Reports, Analytics, and Charts remain registered under Create, Visualize, or Utilities.
