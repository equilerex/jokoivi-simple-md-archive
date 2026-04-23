import { IsOptional, IsUUID } from 'class-validator';

export class MoveDocumentDto {
  @IsOptional()
  @IsUUID()
  folderId!: string | null;
}
