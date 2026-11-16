import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';

@Injectable()
export class IngredientService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateIngredientDto) {
    const { materialName } = data;

    const existing = await this.prisma.ingredient.findFirst({
      where: { materialName },
    });

    if (existing) {
      throw new BadRequestException(
        `Material "${materialName}" is already assigned to an ingredient.`
      );
    }

    if (data.type === 'OTHER' && !data.customType?.trim()) {
      throw new BadRequestException(
        'Custom ingredient type is required when ingredient type is Other.'
      );
    }

    return this.prisma.ingredient.create({
      data: {
        ...data,
        customType: data.type === 'OTHER' ? data.customType!.trim() : null,
      },
    });
  }

  async findAll() {
    return this.prisma.ingredient.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        bins: {
          select: {
            id: true,
            binNumber: true,
            minQuantity: true,
            maxQuantity: true,
            currentQuantity: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.ingredient.findUnique({ where: { id } });
  }

  async delete(id: number) {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id },
      include: {
        bins: true,
      },
    });

    if (!ingredient) {
      throw new NotFoundException('Ingredient not found.');
    }

    // 1. Ingredient is assigned to a bin
    if (ingredient.bins.length > 0) {
      throw new BadRequestException(
        `Cannot delete ${ingredient.name}. Remove its bin assignment first.`
      );
    }

    // 2. Ingredient is being used in a recipe
    const recipeUsage = await this.prisma.stepIngredient.count({
      where: {
        ingredientId: id,
      },
    });

    if (recipeUsage > 0) {
      throw new BadRequestException(
        `Cannot delete ${ingredient.name}. This ingredient is being used in a recipe.`
      );
    }

    // 3. Delete only when there are no dependencies
    return this.prisma.ingredient.delete({
      where: { id },
    });
  }
}
