import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';

import { UserRole } from '@prisma/client';

import { RecipeService } from './recipe.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('recipes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.RUBBER_TECHNOLOGIST)
export class RecipeController {
  constructor(private readonly recipeService: RecipeService) {}

  @Post()
  create(@Body() dto: CreateRecipeDto) {
    return this.recipeService.create(dto);
  }

  @Get()
  findAll() {
    return this.recipeService.findAll();
  }

  @Get('recycle-bin')
  getRecycleBin() {
    return this.recipeService.getRecycleBin();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.recipeService.findOne(id);
  }

  @Get(':code/versions')
  getRecipeVersions(@Param('code') code: string) {
    return this.recipeService.getRecipeVersions(code);
  }

  @Put(':id/version')
  updateRecipe(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRecipeDto,
    @Query('version') version?: string
  ) {
    const newVersion = version ? parseInt(version, 10) : undefined;
    if (!newVersion || Number.isNaN(newVersion)) {
      throw new BadRequestException('Version query parameter is required.');
    }
    return this.recipeService.updateRecipe(id, dto, newVersion);
  }

  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.recipeService.restore(id);
  }

  @Post(':id/permanent-delete')
  permanentDelete(@Param('id', ParseIntPipe) id: number) {
    return this.recipeService.permanentDelete(id);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.recipeService.delete(id);
  }
}
