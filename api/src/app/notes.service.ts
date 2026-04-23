import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreateDocumentRequest,
  CreateFolderRequest,
  DocumentDetail,
  SearchResult,
  TreeNode,
} from '@shared/models';
import { Repository } from 'typeorm';
import { DocumentEntity } from './entities/document.entity';
import { FolderEntity } from './entities/folder.entity';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(FolderEntity)
    private readonly folderRepository: Repository<FolderEntity>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepository: Repository<DocumentEntity>,
  ) {}

  async getTree(): Promise<TreeNode[]> {
    const [folders, documents] = await Promise.all([
      this.folderRepository.find({ order: { name: 'ASC' } }),
      this.documentRepository.find({ order: { name: 'ASC' } }),
    ]);

    const nodes = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    for (const folder of folders) {
      nodes.set(folder.id, {
        id: folder.id,
        name: folder.name,
        type: 'folder',
        parentId: folder.parentId,
        children: [],
      });
    }

    for (const folderNode of nodes.values()) {
      if (folderNode.parentId && nodes.has(folderNode.parentId)) {
        nodes.get(folderNode.parentId)!.children!.push(folderNode);
      } else {
        roots.push(folderNode);
      }
    }

    for (const document of documents) {
      const node: TreeNode = {
        id: document.id,
        name: document.name,
        type: 'document',
        parentId: document.folderId,
      };

      if (document.folderId && nodes.has(document.folderId)) {
        nodes.get(document.folderId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    }

    this.sortTree(roots);
    return roots;
  }

  async getDocument(id: string): Promise<DocumentDetail> {
    const document = await this.documentRepository.findOneBy({ id });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return this.toDocumentDetail(document);
  }

  async createFolder(input: CreateFolderRequest): Promise<TreeNode> {
    const name = input.name.trim();
    await this.ensureParentFolderExists(input.parentId);
    await this.ensureFolderNameAvailable(input.parentId, name);
    await this.ensureFolderPathNameAvailable(input.parentId, name);

    const folder = this.folderRepository.create({
      name,
      parentId: input.parentId,
    });
    const saved = await this.folderRepository.save(folder);

    return {
      id: saved.id,
      name: saved.name,
      type: 'folder',
      parentId: saved.parentId,
      children: [],
    };
  }

  async createDocument(input: CreateDocumentRequest): Promise<DocumentDetail> {
    const name = input.name.trim();
    this.ensureMarkdownName(name);
    await this.ensureParentFolderExists(input.folderId);
    await this.ensureDocumentNameAvailable(input.folderId, name);
    await this.ensureDocumentPathNameAvailable(input.folderId, name);

    const document = this.documentRepository.create({
      name,
      folderId: input.folderId,
      content: input.content ?? '',
    });
    const saved = await this.documentRepository.save(document);

    return this.toDocumentDetail(saved);
  }

  async renameFolder(id: string, name: string): Promise<TreeNode> {
    const folder = await this.folderRepository.findOneBy({ id });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    const nextName = name.trim();
    await this.ensureFolderNameAvailable(folder.parentId, nextName, folder.id);
    await this.ensureFolderPathNameAvailable(folder.parentId, nextName, folder.id);
    folder.name = nextName;
    const saved = await this.folderRepository.save(folder);

    return {
      id: saved.id,
      name: saved.name,
      type: 'folder',
      parentId: saved.parentId,
      children: [],
    };
  }

  async renameDocument(id: string, name: string): Promise<DocumentDetail> {
    const document = await this.documentRepository.findOneBy({ id });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const nextName = name.trim();
    this.ensureMarkdownName(nextName);
    await this.ensureDocumentNameAvailable(document.folderId, nextName, document.id);
    await this.ensureDocumentPathNameAvailable(document.folderId, nextName, document.id);
    document.name = nextName;
    const saved = await this.documentRepository.save(document);

    return this.toDocumentDetail(saved);
  }

  async moveFolder(id: string, parentId: string | null): Promise<TreeNode> {
    const folder = await this.folderRepository.findOneBy({ id });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    if (parentId === id) {
      throw new BadRequestException('Cannot move a folder into itself');
    }

    await this.ensureParentFolderExists(parentId);

    if (parentId) {
      const descendantIds = await this.collectFolderIds(id);
      if (descendantIds.includes(parentId)) {
        throw new BadRequestException('Cannot move a folder into its own descendant');
      }
    }

    await this.ensureFolderNameAvailable(parentId, folder.name, folder.id);
    await this.ensureFolderPathNameAvailable(parentId, folder.name);

    folder.parentId = parentId;
    const saved = await this.folderRepository.save(folder);

    return {
      id: saved.id,
      name: saved.name,
      type: 'folder',
      parentId: saved.parentId,
      children: [],
    };
  }

  async moveDocument(id: string, folderId: string | null): Promise<DocumentDetail> {
    const document = await this.documentRepository.findOneBy({ id });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    await this.ensureParentFolderExists(folderId);
    await this.ensureDocumentNameAvailable(folderId, document.name, document.id);
    await this.ensureDocumentPathNameAvailable(folderId, document.name);

    document.folderId = folderId;
    const saved = await this.documentRepository.save(document);

    return this.toDocumentDetail(saved);
  }

  async updateDocument(id: string, content: string): Promise<DocumentDetail> {
    const document = await this.documentRepository.findOneBy({ id });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    document.content = content;
    const saved = await this.documentRepository.save(document);
    return this.toDocumentDetail(saved);
  }

  async deleteDocument(id: string): Promise<void> {
    const result = await this.documentRepository.delete({ id });
    if (!result.affected) {
      throw new NotFoundException('Document not found');
    }
  }

  async deleteFolder(id: string): Promise<void> {
    const folder = await this.folderRepository.findOneBy({ id });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    const folderIds = await this.collectFolderIds(id);
    await this.documentRepository
      .createQueryBuilder()
      .delete()
      .where('folderId IN (:...folderIds)', { folderIds })
      .execute();

    await this.folderRepository
      .createQueryBuilder()
      .delete()
      .where('id IN (:...folderIds)', { folderIds })
      .execute();
  }

  async search(query: string): Promise<SearchResult[]> {
    const term = query.trim();
    if (!term) {
      return [];
    }

    const [folders, documents] = await Promise.all([
      this.folderRepository
        .createQueryBuilder('folder')
        .where('LOWER(folder.name) LIKE LOWER(:query)', { query: `%${term}%` })
        .orderBy('folder.name', 'ASC')
        .limit(10)
        .getMany(),
      this.documentRepository
        .createQueryBuilder('document')
        .where('LOWER(document.name) LIKE LOWER(:query)', { query: `%${term}%` })
        .orWhere('LOWER(document.content) LIKE LOWER(:query)', { query: `%${term}%` })
        .orderBy('document.updatedAt', 'DESC')
        .limit(10)
        .getMany(),
    ]);

    return [
      ...folders.map<SearchResult>((folder) => ({
        id: folder.id,
        name: folder.name,
        type: 'folder',
        parentId: folder.parentId,
      })),
      ...documents.map<SearchResult>((document) => ({
        id: document.id,
        name: document.name,
        type: 'document',
        parentId: document.folderId,
        snippet: this.createSnippet(document.content, term),
      })),
    ];
  }

  private async ensureParentFolderExists(parentId: string | null): Promise<void> {
    if (!parentId) {
      return;
    }

    const folder = await this.folderRepository.findOneBy({ id: parentId });
    if (!folder) {
      throw new NotFoundException('Parent folder not found');
    }
  }

  private async ensureFolderNameAvailable(
    parentId: string | null,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.findFolderByParentAndName(parentId, name);
    if (existing && existing.id !== excludeId) {
      throw new BadRequestException('A folder with this name already exists here');
    }
  }

  private async ensureDocumentNameAvailable(
    folderId: string | null,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.findDocumentByFolderAndName(folderId, name);
    if (existing && existing.id !== excludeId) {
      throw new BadRequestException('A document with this name already exists here');
    }
  }

  private ensureMarkdownName(name: string): void {
    if (!/\.md$/i.test(name)) {
      throw new BadRequestException('Document name must end with .md');
    }
  }

  private async ensureFolderPathNameAvailable(
    parentId: string | null,
    name: string,
    excludeDocumentId?: string,
  ): Promise<void> {
    const existingDocument = await this.findDocumentByFolderAndName(parentId, `${name}.md`);
    if (existingDocument && existingDocument.id !== excludeDocumentId) {
      throw new BadRequestException(
        'A document with the same path name already exists here',
      );
    }
  }

  private async ensureDocumentPathNameAvailable(
    folderId: string | null,
    name: string,
    excludeFolderId?: string,
  ): Promise<void> {
    const existingFolder = await this.findFolderByParentAndName(
      folderId,
      this.toDocumentPathSegment(name),
    );
    if (existingFolder && existingFolder.id !== excludeFolderId) {
      throw new BadRequestException(
        'A folder with the same path name already exists here',
      );
    }
  }

  private async collectFolderIds(rootId: string): Promise<string[]> {
    const folders = await this.folderRepository.find();
    const childrenByParent = new Map<string | null, string[]>();

    for (const folder of folders) {
      const ids = childrenByParent.get(folder.parentId) ?? [];
      ids.push(folder.id);
      childrenByParent.set(folder.parentId, ids);
    }

    const pending = [rootId];
    const result: string[] = [];

    while (pending.length > 0) {
      const current = pending.shift()!;
      result.push(current);
      pending.push(...(childrenByParent.get(current) ?? []));
    }

    return result;
  }

  private async findFolderByParentAndName(
    parentId: string | null,
    name: string,
  ): Promise<FolderEntity | null> {
    const query = this.folderRepository
      .createQueryBuilder('folder')
      .where('folder.name = :name', { name });

    if (parentId === null) {
      query.andWhere('folder.parentId IS NULL');
    } else {
      query.andWhere('folder.parentId = :parentId', { parentId });
    }

    return query.getOne();
  }

  private async findDocumentByFolderAndName(
    folderId: string | null,
    name: string,
  ): Promise<DocumentEntity | null> {
    const query = this.documentRepository
      .createQueryBuilder('document')
      .where('document.name = :name', { name });

    if (folderId === null) {
      query.andWhere('document.folderId IS NULL');
    } else {
      query.andWhere('document.folderId = :folderId', { folderId });
    }

    return query.getOne();
  }

  private toDocumentDetail(document: DocumentEntity): DocumentDetail {
    return {
      id: document.id,
      name: document.name,
      folderId: document.folderId,
      content: document.content,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    };
  }

  private createSnippet(content: string, query: string): string | undefined {
    const index = content.toLowerCase().indexOf(query.toLowerCase());
    if (index < 0) {
      return undefined;
    }

    const start = Math.max(0, index - 30);
    const end = Math.min(content.length, index + query.length + 50);
    return content.slice(start, end).replace(/\s+/g, ' ').trim();
  }

  private toDocumentPathSegment(name: string): string {
    return name.replace(/\.md$/i, '');
  }

  private sortTree(nodes: TreeNode[]): void {
    nodes.sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === 'folder' ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    });

    for (const node of nodes) {
      if (node.children) {
        this.sortTree(node.children);
      }
    }
  }
}
