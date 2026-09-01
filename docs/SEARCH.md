# Global search

`GET /search` accepts `workspaceId`, `query`, and optional `tagId`. The backend
validates workspace membership before concurrently searching sources,
conversations, AI outputs, active collections, and active tags. Each group is
bounded and ordered by useful recency where available.

Results include segmented highlight data rather than HTML, preventing markup
injection. The search overlay renders those segments with semantic `mark`
elements. Recent terms are stored locally per browser (maximum six); no search
history is sent to the database. Arrow keys change the active option, Enter
opens it, and Escape closes the overlay and restores focus.
