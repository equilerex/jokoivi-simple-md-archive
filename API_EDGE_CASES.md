# API Edge Cases

This document tracks the important edge cases for the current API and frontend path model.

The app uses:

- path-based Angular routes under `/notes/...`
- folder path segments by exact folder name
- document path segments by markdown filename without the `.md` suffix

That makes name handling, rename behavior, delete behavior, and future move behavior especially important.

## 1. Naming Rules

To keep path routing deterministic, the system should enforce:

- folder names cannot contain `/`
- document names cannot contain `/`
- document names must end with `.md`
- empty names are rejected after trimming

Within the same parent folder, all of these must be blocked:

- duplicate folder names
- duplicate document names
- folder `foo` if document `foo.md` exists
- document `foo.md` if folder `foo` exists

Optional policy to define explicitly:

- whether sibling uniqueness is case-sensitive or case-insensitive

## 2. Create Folder

Expected behavior:

- create under the active folder, or root if no folder is active
- return the created folder id and parent metadata
- reload tree after success
- select the new folder
- update the URL to the new folder path

Important edge cases:

- parent folder does not exist
- duplicate folder name in same parent
- document with conflicting path name already exists
- invalid characters in folder name

## 3. Create Document

Expected behavior:

- append `.md` automatically if missing
- create under the active folder, or root if no folder is active
- reload tree after success
- open the new document
- update the URL using the document name without `.md`

Important edge cases:

- parent folder does not exist
- duplicate document name in same parent
- folder with conflicting path name already exists
- invalid characters in document name
- blank value after trimming

## 4. Rename Folder

Expected behavior:

- keep same folder id
- reload tree after success
- recompute path from folder id
- replace current URL with the new folder path

Important edge cases:

- duplicate folder name in same parent
- conflicting document path name in same parent
- invalid path-breaking characters
- descendant paths change implicitly when an ancestor folder is renamed

## 5. Rename Document

Expected behavior:

- keep same document id
- reload tree after success
- reopen document by id
- replace current URL with the new document path

Important edge cases:

- renamed value does not end with `.md`
- duplicate document name in same parent
- conflicting folder path name in same parent
- extension casing changes without affecting URL

## 6. Delete Document

Recommended behavior:

- delete by id
- if deleted document is currently open:
  - clear editor state
  - select parent folder if it exists
  - update URL to parent folder path
- if deleted document is unrelated to current selection:
  - keep current route and selection if still valid

Current implementation is more aggressive and falls back to root/default.

## 7. Delete Folder

Recommended behavior:

- delete subtree recursively
- if deleted folder is selected:
  - select its parent folder if it exists
  - otherwise fall back to default/root
- if current selection is inside the deleted subtree:
  - fall back to nearest surviving parent or default/root
- if deleted folder is unrelated:
  - keep current selection and URL unchanged

Current implementation resets to root/default after selected deletes.

## 8. Open by Path

Expected behavior:

- load tree from API first
- resolve path segment by segment
- every intermediate segment must resolve to a folder
- final segment may resolve to:
  - a folder by exact folder name
  - a document by `segment + '.md'`

Important edge cases:

- path not found
- stale path after rename or delete
- encoded characters
- case differences
- path-breaking names

## 9. Refresh Behavior

Expected behavior:

- refresh on folder path reloads tree and reselects folder
- refresh on document path reloads tree, resolves path, then loads document
- `/notes` resolves to the default folder
- default folder is auto-created if missing

Important edge cases:

- API unavailable during refresh
- stale route after another session renamed or deleted the target
- partial tree load or route resolution mismatch

## 10. Search

Expected behavior:

- backend returns matching folders and documents
- frontend filters the visible tree using matches and ancestor folders
- URL does not change just because search is active
- selecting an item from the filtered tree still updates the route normally

Important edge cases:

- active selection hidden by search filter
- ancestor chain incomplete
- clearing search should restore full tree without losing current selection

## 11. Move Document

Not implemented yet.

When implemented, backend must:

- update `folderId`
- verify target folder exists
- block duplicate document names in target folder
- block conflicting folder path names in target folder

Frontend should:

- reload tree after move
- keep the same document selected if it was active
- regenerate the URL from the document id and new tree position
- leave unrelated current selection unchanged

## 12. Move Folder

Not implemented yet.

When implemented, backend must:

- update `parentId`
- block moving a folder into itself
- block moving a folder into its own descendant
- block duplicate sibling folder names
- block conflicting document path names in the target parent

Frontend should:

- reload tree after move
- keep the moved folder selected if it was active
- regenerate the route from the new path
- if current selection is inside the moved subtree, preserve that node by id and regenerate its descendant path

## 13. Default Folder

Current intended behavior:

- `/notes` should open `A bucket`
- if `A bucket` does not exist, create it automatically

Important edge cases:

- `A bucket` create failure
- conflict with path rules should be impossible if naming rules are enforced
- default folder creation should happen only for the default landing path, not for arbitrary missing routes

## 14. Path Generation Rules

The path system should always preserve these rules:

- folders use exact folder names
- documents use exact filename without `.md`
- path segments are URL-encoded on navigation
- path segments are decoded on resolution

This must stay correct after:

- create
- rename
- delete fallback
- future move operations

## 15. Hardening Priorities

Recommended next hardening steps:

1. Add backend validation that folder and document names cannot contain `/`.
2. Improve delete fallback logic to select the nearest surviving parent instead of always resetting to root/default.
3. Define move semantics before introducing move endpoints.
4. Decide whether path uniqueness should be case-sensitive or case-insensitive.
5. Define not-found behavior for stale URLs after rename/delete in another session.
