export type ItemType = 'folder' | 'document';

export interface TreeNode {
  id: string;
  name: string;
  type: ItemType;
  parentId: string | null;
  children?: TreeNode[];
}

export interface DocumentDetail {
  id: string;
  name: string;
  folderId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  id: string;
  name: string;
  type: ItemType;
  parentId: string | null;
  snippet?: string;
}

export interface CreateFolderRequest {
  name: string;
  parentId: string | null;
}

export interface CreateDocumentRequest {
  name: string;
  folderId: string | null;
  content?: string;
}

export interface RenameItemRequest {
  name: string;
}

export interface MoveFolderRequest {
  parentId: string | null;
}

export interface MoveDocumentRequest {
  folderId: string | null;
}

export interface UpdateDocumentRequest {
  content: string;
}
