import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateIngredientDto {
  @IsString()
  @IsNotEmpty()
  ingredientCode!: string;

  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsString()
  @IsOptional()
  customType?: string;

  @IsString()
  @IsNotEmpty()
  materialName!: string;
}
