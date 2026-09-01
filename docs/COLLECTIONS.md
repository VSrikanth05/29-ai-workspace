# Collections, tags, and favorites

Collections belong to one workspace and form a self-referencing tree through
`parentId`. `position` preserves sibling ordering. The service rejects cross-
workspace parents, self-parenting, and descendant cycles. Deleting a collection
soft-deletes its complete subtree.

`CollectionItem`, `TagAssignment`, and `Favorite` each reference exactly one of
`Document` or `AIOutput`. PostgreSQL check constraints enforce this invariant.
Unique indexes make assign/toggle requests idempotent. Sources and outputs may
belong to multiple collections and have multiple tags.

Viewer roles can list resources. Editor or owner roles are required to create,
rename, move, assign, unassign, or delete. The Collections screen supports tree
drag/drop and empty states; source and Output Library cards expose favorite and
sharing quick actions.
