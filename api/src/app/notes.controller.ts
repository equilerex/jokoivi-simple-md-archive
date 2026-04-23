import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { MoveDocumentDto } from './dto/move-document.dto';
import { MoveFolderDto } from './dto/move-folder.dto';
import { RenameItemDto } from './dto/rename-item.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { NotesService } from './notes.service';

@Controller('notes')
@UseGuards(AuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get('tree')
  getTree() {
    return this.notesService.getTree();
  }

  @Get('search')
  search(@Query('query') query = '') {
    return this.notesService.search(query);
  }

  @Get('documents/:id')
  getDocument(@Param('id') id: string) {
    return this.notesService.getDocument(id);
  }

  @Post('folders')
  createFolder(
    @Body(new ValidationPipe({ whitelist: true })) body: CreateFolderDto,
  ) {
    return this.notesService.createFolder(body);
  }

  @Post('documents')
  createDocument(
    @Body(new ValidationPipe({ whitelist: true })) body: CreateDocumentDto,
  ) {
    return this.notesService.createDocument(body);
  }

  @Patch('folders/:id')
  renameFolder(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true })) body: RenameItemDto,
  ) {
    return this.notesService.renameFolder(id, body.name);
  }

  @Patch('folders/:id/move')
  moveFolder(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true })) body: MoveFolderDto,
  ) {
    return this.notesService.moveFolder(id, body.parentId ?? null);
  }

  @Patch('documents/:id/rename')
  renameDocument(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true })) body: RenameItemDto,
  ) {
    return this.notesService.renameDocument(id, body.name);
  }

  @Patch('documents/:id/move')
  moveDocument(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true })) body: MoveDocumentDto,
  ) {
    return this.notesService.moveDocument(id, body.folderId ?? null);
  }

  @Patch('documents/:id')
  updateDocument(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true })) body: UpdateDocumentDto,
  ) {
    return this.notesService.updateDocument(id, body.content);
  }

  @Delete('folders/:id')
  deleteFolder(@Param('id') id: string) {
    return this.notesService.deleteFolder(id);
  }

  @Delete('documents/:id')
  deleteDocument(@Param('id') id: string) {
    return this.notesService.deleteDocument(id);
  }
}
