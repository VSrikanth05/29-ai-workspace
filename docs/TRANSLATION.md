# Translation

`POST /ai-studio/translate` supports two modes:

- selected-text translation when `text` is present;
- document translation from selected `sourceIds` otherwise.

`targetLanguage` is required and `sourceLanguage` is optional. The Workspace UI
stores the last target language per workspace. Prompts instruct the provider to
preserve Markdown headings, lists, tables, emphasis, paragraph boundaries,
citations, names, and numbers. Preservation is best effort because providers
return text rather than native document binaries.

Translations are saved as `TRANSLATION` outputs with mode and language metadata.
They can be reopened, regenerated, or exported as Markdown/JSON.
