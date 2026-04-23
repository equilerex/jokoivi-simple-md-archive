import { TreeNode } from '@shared/models';

export interface TreeStateNode extends TreeNode {
  expanded?: boolean;
  children?: TreeStateNode[];
}

export interface AppViewModel {
  saving: boolean;
  searchQuery: string;
  error: string | null;
}
