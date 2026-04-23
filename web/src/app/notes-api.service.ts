import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  CreateDocumentRequest,
  CreateFolderRequest,
  DocumentDetail,
  MoveDocumentRequest,
  MoveFolderRequest,
  RenameItemRequest,
  SearchResult,
  TreeNode,
  UpdateDocumentRequest,
} from '@shared/models';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/notes`;

  getTree(): Observable<TreeNode[]> {
    return this.http.get<TreeNode[]>(`${this.baseUrl}/tree`);
  }

  getDocument(id: string): Observable<DocumentDetail> {
    return this.http.get<DocumentDetail>(`${this.baseUrl}/documents/${id}`);
  }

  createFolder(payload: CreateFolderRequest): Observable<TreeNode> {
    return this.http.post<TreeNode>(`${this.baseUrl}/folders`, payload);
  }

  createDocument(payload: CreateDocumentRequest): Observable<DocumentDetail> {
    return this.http.post<DocumentDetail>(`${this.baseUrl}/documents`, payload);
  }

  renameFolder(id: string, payload: RenameItemRequest): Observable<TreeNode> {
    return this.http.patch<TreeNode>(`${this.baseUrl}/folders/${id}`, payload);
  }

  renameDocument(
    id: string,
    payload: RenameItemRequest,
  ): Observable<DocumentDetail> {
    return this.http.patch<DocumentDetail>(
      `${this.baseUrl}/documents/${id}/rename`,
      payload,
    );
  }

  moveFolder(id: string, payload: MoveFolderRequest): Observable<TreeNode> {
    return this.http.patch<TreeNode>(`${this.baseUrl}/folders/${id}/move`, payload);
  }

  moveDocument(
    id: string,
    payload: MoveDocumentRequest,
  ): Observable<DocumentDetail> {
    return this.http.patch<DocumentDetail>(`${this.baseUrl}/documents/${id}/move`, payload);
  }

  updateDocument(
    id: string,
    payload: UpdateDocumentRequest,
  ): Observable<DocumentDetail> {
    return this.http.patch<DocumentDetail>(`${this.baseUrl}/documents/${id}`, payload);
  }

  deleteFolder(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/folders/${id}`);
  }

  deleteDocument(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/documents/${id}`);
  }

  search(query: string): Observable<SearchResult[]> {
    const params = new HttpParams().set('query', query);
    return this.http.get<SearchResult[]>(`${this.baseUrl}/search`, { params });
  }
}
