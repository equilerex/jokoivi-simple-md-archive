import { UpdateDocumentRequest } from '@shared/models';
import { IsString } from 'class-validator';

export class UpdateDocumentDto implements UpdateDocumentRequest {
  @IsString()
  content!: string;
}
