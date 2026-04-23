import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, UrlSegment } from '@angular/router';
import { DocumentDetail } from '@shared/models';
import { finalize } from 'rxjs';
import { AuthService } from './auth.service';
import { AppViewModel, TreeStateNode } from './models';
import { NotesApiService } from './notes-api.service';
import { NotesTreeStore } from './notes-tree.store';
import { TreeNodeComponent } from './tree-node.component';

@Component({
  imports: [CommonModule, FormsModule, TreeNodeComponent],
  selector: 'app-notes-page',
  templateUrl: './notes-page.component.html',
  styleUrl: './notes-page.component.css',
})
export class NotesPageComponent implements OnInit {
  private static readonly defaultFolderName = 'A bucket';
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(NotesApiService);
  private readonly authService = inject(AuthService);
  protected readonly treeStore = inject(NotesTreeStore);

  protected readonly vm: AppViewModel = {
    saving: false,
    searchQuery: '',
    error: null,
  };

  protected readonly selectedDocument = signal<DocumentDetail | null>(null);
  protected readonly documentLoading = signal(false);
  protected readonly draftContent = signal('');

  ngOnInit(): void {
    this.route.url.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((segments) => {
      if (!this.authService.isAuthenticated()) {
        return;
      }

      const pathSegments = this.toPathSegments(segments);
      this.treeStore.loadTree(() => this.resolveRouteSegments(pathSegments));
    });
  }

  protected toggleFolder(nodeId: string): void {
    this.treeStore.toggleFolder(nodeId);
  }

  protected selectedNodeId(): string | null {
    return this.treeStore.selectedNodeId();
  }

  protected handleNodeSelection(node: TreeStateNode): void {
    this.navigateToNode(node.id, false);
  }

  protected createFolder(): void {
    const name = window.prompt('Folder name');
    if (!name?.trim()) {
      return;
    }

    this.api.createFolder({ name, parentId: this.treeStore.activeFolderId() }).subscribe({
      next: (folder) => this.treeStore.loadTree(() => this.navigateToNode(folder.id, false)),
      error: (error) => this.setError(error),
    });
  }

  protected createDocument(): void {
    const name = window.prompt('Document name (.md)');
    const normalizedName = this.normalizeDocumentName(name);
    if (!normalizedName) {
      return;
    }

    this.api
      .createDocument({
        name: normalizedName,
        folderId: this.treeStore.activeFolderId(),
        content: '',
      })
      .subscribe({
        next: (document) =>
          this.treeStore.loadTree(() => this.navigateToNode(document.id, false)),
        error: (error) => this.setError(error),
      });
  }

  protected renameSelected(): void {
    const current = this.treeStore.findNodeById(this.selectedNodeId());
    if (!current) {
      return;
    }

    const nextName = window.prompt('New name', current.name);
    if (!nextName?.trim()) {
      return;
    }

    if (current.type === 'folder') {
      this.api.renameFolder(current.id, { name: nextName }).subscribe({
        next: () => this.treeStore.loadTree(() => this.navigateToNode(current.id, true)),
        error: (error: unknown) => this.setError(error),
      });
      return;
    }

    this.api.renameDocument(current.id, { name: nextName }).subscribe({
      next: () => this.treeStore.loadTree(() => this.navigateToNode(current.id, true)),
      error: (error: unknown) => this.setError(error),
    });
  }

  protected moveSelected(): void {
    const current = this.treeStore.findNodeById(this.selectedNodeId());
    if (!current) {
      return;
    }

    const destinationInput = window.prompt(
      'Move to folder path. Use "/" or leave blank for root.',
      current.parentId ? this.getParentPath(current.id) ?? '' : '/',
    );
    if (destinationInput === null) {
      return;
    }

    const destinationFolder = this.resolveDestinationFolder(destinationInput);
    if (destinationFolder === undefined) {
      this.vm.error = 'Destination folder not found';
      return;
    }

    this.vm.error = null;
    if (current.type === 'folder') {
      this.api
        .moveFolder(current.id, { parentId: destinationFolder?.id ?? null })
        .subscribe({
          next: () => this.treeStore.loadTree(() => this.navigateToNode(current.id, true)),
          error: (error: unknown) => this.setError(error),
        });
      return;
    }

    this.api
      .moveDocument(current.id, { folderId: destinationFolder?.id ?? null })
      .subscribe({
        next: () => this.treeStore.loadTree(() => this.navigateToNode(current.id, true)),
        error: (error: unknown) => this.setError(error),
      });
  }

  protected deleteSelected(): void {
    const current = this.treeStore.findNodeById(this.selectedNodeId());
    if (!current) {
      return;
    }

    const confirmed = window.confirm(
      current.type === 'folder'
        ? `Delete folder "${current.name}" and all nested content?`
        : `Delete document "${current.name}"?`,
    );
    if (!confirmed) {
      return;
    }

    const onDelete = (): void => {
      if (current.type === 'document' && this.selectedDocument()?.id === current.id) {
        this.selectedDocument.set(null);
        this.draftContent.set('');
      }

      this.treeStore.reset();
      void this.router.navigateByUrl('/', { replaceUrl: true });
    };

    if (current.type === 'folder') {
      this.api.deleteFolder(current.id).subscribe({
        next: () => onDelete(),
        error: (error: unknown) => this.setError(error),
      });
      return;
    }

    this.api.deleteDocument(current.id).subscribe({
      next: () => onDelete(),
      error: (error: unknown) => this.setError(error),
    });
  }

  protected saveDocument(): void {
    const selectedDocument = this.selectedDocument();
    if (!selectedDocument) {
      return;
    }

    this.vm.saving = true;
    this.api
      .updateDocument(selectedDocument.id, { content: this.draftContent() })
      .pipe(finalize(() => (this.vm.saving = false)))
      .subscribe({
        next: (document) => {
          this.selectedDocument.set(document);
          this.draftContent.set(document.content);
        },
        error: (error) => this.setError(error),
      });
  }

  protected runSearch(): void {
    const query = this.vm.searchQuery.trim();
    if (!query) {
      this.treeStore.setSearchResults([]);
      return;
    }

    this.api.search(query).subscribe({
      next: (results) => {
        this.treeStore.setSearchResults(results);
      },
      error: (error) => this.setError(error),
    });
  }

  protected isDirty(): boolean {
    return this.selectedDocument()?.content !== this.draftContent();
  }

  protected logout(): void {
    this.authService.logout();
    this.treeStore.reset();
    this.selectedDocument.set(null);
    this.documentLoading.set(false);
    this.draftContent.set('');
    this.vm.searchQuery = '';
    this.vm.error = null;
  }

  private resolveRouteSegments(segments: string[]): void {
    if (segments.length === 0) {
      this.openDefaultFolder();
      return;
    }

    const resolvedNode = this.resolveNodeByPath(segments, this.treeStore.tree());
    if (!resolvedNode) {
      this.vm.error = 'Path not found';
      return;
    }

    this.vm.error = null;
    if (resolvedNode.type === 'folder') {
      this.selectFolder(resolvedNode);
      return;
    }

    this.openDocument(resolvedNode.id);
  }

  private openDefaultFolder(): void {
    const defaultFolder = this.resolveNodeByPath(
      [NotesPageComponent.defaultFolderName],
      this.treeStore.tree(),
    );
    if (defaultFolder?.type === 'folder') {
      this.selectFolder(defaultFolder);
      void this.router.navigate(['notes', this.toPathSegment(defaultFolder)], {
        replaceUrl: true,
      });
      return;
    }

    this.api
      .createFolder({ name: NotesPageComponent.defaultFolderName, parentId: null })
      .subscribe({
        next: () => this.treeStore.loadTree(() => this.openDefaultFolder()),
        error: (error) => this.setError(error),
      });
  }

  private selectFolder(node: TreeStateNode): void {
    this.treeStore.setSelectedNodeId(node.id);
    this.treeStore.setActiveFolderId(node.id);
    this.treeStore.expandParents(node.parentId);
    if (!node.expanded) {
      this.treeStore.toggleFolder(node.id);
    }
    this.selectedDocument.set(null);
    this.draftContent.set('');
  }

  private openDocument(id: string): void {
    this.documentLoading.set(true);
    this.api
      .getDocument(id)
      .pipe(finalize(() => this.documentLoading.set(false)))
      .subscribe({
        next: (document) => {
          this.selectedDocument.set(document);
          this.draftContent.set(document.content);
          this.treeStore.setActiveFolderId(document.folderId);
          this.treeStore.setSelectedNodeId(document.id);
          this.treeStore.expandParents(document.folderId);
        },
        error: (error) => this.setError(error),
      });
  }

  private navigateToNode(nodeId: string, replaceUrl: boolean): void {
    const pathSegments = this.findPathSegmentsByNodeId(nodeId, this.treeStore.tree());
    if (!pathSegments) {
      return;
    }

    void this.router.navigate(['notes', ...pathSegments], { replaceUrl });
  }

  private toPathSegments(segments: UrlSegment[]): string[] {
    return segments.slice(1).map((segment) => decodeURIComponent(segment.path));
  }

  private resolveNodeByPath(
    segments: string[],
    nodes: TreeStateNode[],
  ): TreeStateNode | null {
    let currentNodes = nodes;
    let currentNode: TreeStateNode | null = null;

    for (const [index, segment] of segments.entries()) {
      const isLast = index === segments.length - 1;
      const nextNode = currentNodes.find((node) => {
        if (node.type === 'folder') {
          return node.name === segment;
        }

        return isLast && this.toDocumentPathSegment(node.name) === segment;
      });
      if (!nextNode) {
        return null;
      }

      if (!isLast && nextNode.type !== 'folder') {
        return null;
      }

      currentNode = nextNode;
      currentNodes = nextNode.children ?? [];
    }

    return currentNode;
  }

  private resolveDestinationFolder(destination: string): TreeStateNode | null | undefined {
    const trimmed = destination.trim();
    if (!trimmed || trimmed === '/') {
      return null;
    }

    const normalizedSegments = trimmed
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);
    const resolvedNode = this.resolveNodeByPath(normalizedSegments, this.treeStore.tree());
    if (!resolvedNode || resolvedNode.type !== 'folder') {
      return undefined;
    }

    return resolvedNode;
  }

  private findPathSegmentsByNodeId(
    nodeId: string,
    nodes: TreeStateNode[],
    trail: string[] = [],
  ): string[] | null {
    for (const node of nodes) {
      const nextTrail = [...trail, this.toPathSegment(node)];
      if (node.id === nodeId) {
        return nextTrail;
      }

      if (node.children?.length) {
        const match = this.findPathSegmentsByNodeId(nodeId, node.children, nextTrail);
        if (match) {
          return match;
        }
      }
    }

    return null;
  }

  private getParentPath(nodeId: string): string | null {
    const segments = this.findPathSegmentsByNodeId(nodeId, this.treeStore.tree());
    if (!segments || segments.length <= 1) {
      return '/';
    }

    return segments.slice(0, -1).join('/');
  }

  private setError(error: unknown): void {
    this.vm.error = this.getErrorMessage(error);
  }

  private normalizeDocumentName(name: string | null): string | null {
    const trimmedName = name?.trim();
    if (!trimmedName) {
      return null;
    }

    return trimmedName.toLowerCase().endsWith('.md') ? trimmedName : `${trimmedName}.md`;
  }

  private toPathSegment(node: TreeStateNode): string {
    return node.type === 'document' ? this.toDocumentPathSegment(node.name) : node.name;
  }

  private toDocumentPathSegment(name: string): string {
    return name.replace(/\.md$/i, '');
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message =
        (error.error as { message?: string | string[] } | null)?.message ?? error.message;
      return Array.isArray(message) ? message.join(', ') : message;
    }

    return 'Unexpected error';
  }
}
