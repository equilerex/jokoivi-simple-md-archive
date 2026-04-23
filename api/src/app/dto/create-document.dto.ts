import { CreateDocumentRequest } from '@shared/models';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateDocumentDto implements CreateDocumentRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(/\.md$/i, { message: 'Document name must end with .md' })
  name!: string;

  @IsOptional()
  @IsString()
  folderId!: string | null;

  @IsOptional()
  @IsString()
  content?: string;
}
