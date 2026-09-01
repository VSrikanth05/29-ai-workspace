# Prompt orchestration

`PromptEngineService` owns AI-Core application instructions. Prompt version
`ai-core-v1` composes workspace identity, selected-source names, grounding
expectations, and citation behavior. Controllers and frontend components do not
contain system prompts or provider formatting.

The Context Builder combines:

- authenticated workspace context;
- selected source IDs validated against that workspace;
- ordered messages from the current conversation only;
- the current user message;
- versioned system instructions;
- retrieved context and citations from the existing RAG pipeline.

Conversation memory remains bounded by the existing RAG limits (12 recent
messages and 12,000 characters). Provider-specific serialization belongs only in
provider adapters. A future prompt revision must introduce a new version string,
tests, and migration/compatibility notes; do not edit an active version silently.
