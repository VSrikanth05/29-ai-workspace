# AI Studio

Milestone 4 replaces the placeholder tool catalog with 11 approved tools:

- Understand: AI Chat, Explain, Rewrite, Simplify, Ask Anything.
- Learn: Summary, Key Points, Glossary.
- Visualize: Mind Map.
- Language: Translate.
- Create: Report Generator.

AI Chat and Ask Anything move focus to the existing conversation panel. Explain,
Rewrite, and Simplify reuse that same persistent conversation engine. The six
approved durable result types are saved to `AIOutput`, shown in workspace output
history, reopenable, regeneratable, and exportable.

All tools share authentication, workspace authorization, selected-source
validation, provider/model selection, conversation memory, usage tracking, and
the existing RAG pipeline through the Milestone 3 AI Gateway. Full selected
source text is included up to a bounded context size, while RAG continues to
provide grounding and citations.

The Studio panel includes tool cards, configuration forms, selected-text input,
provider/model selection, progress, result viewing, saved state, regeneration,
exports, history, and accessible loading/error/empty states. It remains inside
the existing responsive Workspace shell.
