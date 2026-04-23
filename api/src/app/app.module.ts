import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'node:path';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { DocumentEntity } from './entities/document.entity';
import { FolderEntity } from './entities/folder.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: join(process.cwd(), 'data', 'notes.sqlite'),
      entities: [FolderEntity, DocumentEntity],
      synchronize: true,
      autoLoadEntities: true,
    }),
    TypeOrmModule.forFeature([FolderEntity, DocumentEntity]),
  ],
  controllers: [AuthController, NotesController],
  providers: [AuthGuard, AuthService, NotesService],
})
export class AppModule {}
