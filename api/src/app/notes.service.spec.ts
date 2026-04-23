import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from './entities/document.entity';
import { FolderEntity } from './entities/folder.entity';
import { NotesService } from './notes.service';

describe('NotesService', () => {
  let service: NotesService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [FolderEntity, DocumentEntity],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([FolderEntity, DocumentEntity]),
      ],
      providers: [NotesService],
    }).compile();

    service = moduleRef.get(NotesService);
  });

  it('creates and updates a markdown document', async () => {
    const folder = await service.createFolder({ name: 'guides', parentId: null });
    const document = await service.createDocument({
      name: 'intro.md',
      folderId: folder.id,
      content: '# Hello',
    });

    const updated = await service.updateDocument(document.id, '# Updated');

    expect(updated.content).toBe('# Updated');
    expect(updated.folderId).toBe(folder.id);
  });

  it('searches document content', async () => {
    await service.createDocument({
      name: 'searchable.md',
      folderId: null,
      content: 'Find this exact phrase in the saved note.',
    });

    const results = await service.search('exact phrase');

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      name: 'searchable.md',
      type: 'document',
    });
  });

  it('deletes folder subtrees recursively', async () => {
    const parent = await service.createFolder({ name: 'parent', parentId: null });
    const child = await service.createFolder({ name: 'child', parentId: parent.id });
    await service.createDocument({
      name: 'nested.md',
      folderId: child.id,
      content: 'nested',
    });

    await service.deleteFolder(parent.id);

    await expect(service.getTree()).resolves.toEqual([]);
  });
});
