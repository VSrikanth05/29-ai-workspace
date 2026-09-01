import { IsString, Length, Matches } from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  @Length(1, 80)
  @Matches(/\S/, { message: 'Workspace name cannot be blank' })
  name!: string;
}
