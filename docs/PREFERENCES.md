# Workspace preferences

One `WorkspacePreference` row is associated with each workspace. Defaults are
created lazily on first read. Supported values are default provider/model,
language, `light|dark|system` theme, `markdown|json|csv` export format,
streaming, and autosave.

Members may read settings; editors and owners may update them. Preferences are
never stored in the global profile, so switching workspaces also switches the
effective configuration. The Output Library uses the default export format;
AI consumers can use provider/model and streaming defaults without changing
existing request contracts.
