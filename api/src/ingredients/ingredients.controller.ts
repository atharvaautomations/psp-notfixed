import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { UserRole } from '@prisma/client';

import { IngredientService } from './ingredients.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('ingredients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STORES, UserRole.RUBBER_TECHNOLOGIST)
export class IngredientController {
  constructor(private readonly ingredientService: IngredientService) {}

  @Post()
  create(@Body() dto: CreateIngredientDto) {
    return this.ingredientService.create(dto);
  }

  @Get()
  findAll() {
    return this.ingredientService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ingredientService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ingredientService.delete(id);
  }
}
