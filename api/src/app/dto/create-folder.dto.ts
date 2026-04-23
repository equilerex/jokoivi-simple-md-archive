import { CreateFolderRequest } from '@shared/models';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFolderDto implements CreateFolderRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  parentId!: string | null;
}
