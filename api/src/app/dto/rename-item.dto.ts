import { RenameItemRequest } from '@shared/models';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RenameItemDto implements RenameItemRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}
