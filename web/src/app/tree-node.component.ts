import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TreeStateNode } from './models';

@Component({
  selector: 'app-tree-node',
  imports: [CommonModule],
  template: `
    <div class="tree-node" [class.selected]="selectedId === node.id">
      <button
        *ngIf="node.type === 'folder'"
        type="button"
        class="toggle"
        (click)="toggle.emit(node)"
      >
        {{ node.expanded ? '▾' : '▸' }}
      </button>
      <span *ngIf="node.type === 'document'" class="toggle toggle-spacer">•</span>

      <button type="button" class="label" (click)="select.emit(node)">
        <span class="icon">{{ node.type === 'folder' ? '[ ]' : '[#]' }}</span>
        {{ node.name }}
      </button>
    </div>

    <div *ngIf="node.children?.length && node.expanded" class="children">
      <app-tree-node
        *ngFor="let child of node.children"
        [node]="child"
        [selectedId]="selectedId"
        (select)="select.emit($event)"
        (toggle)="toggle.emit($event)"
      />
    </div>
  `,
  styleUrl: './tree-node.component.css',
})
export class TreeNodeComponent {
  @Input({ required: true }) node!: TreeStateNode;
  @Input() selectedId: string | null = null;

  @Output() select = new EventEmitter<TreeStateNode>();
  @Output() toggle = new EventEmitter<TreeStateNode>();
}
