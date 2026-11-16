import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { StepType, RecipeStepBatchType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

@Injectable()
export class RecipeService {
  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------------------------
  // CREATE - new recipe (version 1)
  // --------------------------------------------------
  async create(dto: CreateRecipeDto) {
    const existing = await this.prisma.recipe.findFirst({
      where: { recipeCode: dto.recipeCode },
    });
    if (existing) {
      throw new BadRequestException(`Recipe ${dto.recipeCode} already exists.`);
    }

    const allIngredientCodes = dto.steps.flatMap((s) =>
      s.ingredients.map((i) => i.ingredientCode)
    );
    const uniqueCodes = [...new Set(allIngredientCodes)];

    // ✅ Validate: no duplicate ingredient within the same step
    for (const step of dto.steps) {
      const stepIngredientCodes = step.ingredients.map(
        (i) => i.ingredientCode
      );
      const stepUniqueCodes = [...new Set(stepIngredientCodes)];
      if (stepUniqueCodes.length !== stepIngredientCodes.length) {
        throw new BadRequestException(
          `Step ${step.sequenceNumber} contains duplicate ingredients. Each ingredient can only be selected once per step.`
        );
      }
    }

    const foundIngredients = await this.prisma.ingredient.findMany({
      where: { ingredientCode: { in: uniqueCodes } },
      select: { id: true, ingredientCode: true },
    });

    const ingredientMap = new Map(
      foundIngredients.map((ing) => [ing.ingredientCode, ing.id])
    );

    const missingCodes = uniqueCodes.filter(
      (code) => !ingredientMap.has(code)
    );
    if (missingCodes.length > 0) {
      throw new BadRequestException(
        `The following ingredients were not found: ${missingCodes.join(', ')}`
      );
    }

    const stepsCreateData = dto.steps.map((s) => ({
      stepType: s.stepType as StepType,
      batchType: s.batchType as RecipeStepBatchType,
      sequenceNumber: s.sequenceNumber,
      timerSeconds: s.timerSeconds,
      ingredients: {
        create: s.ingredients.map((i) => ({
          ingredientId: ingredientMap.get(i.ingredientCode) as number,
          quantity: i.quantity,
          tolerance: i.tolerance,
          unit: i.unit,
        })),
      },
    }));

    return this.prisma.recipe.create({
      data: {
        recipeCode: dto.recipeCode,
        name: dto.name,
        description: dto.description,
        workflow: dto.workflow,
        version: 1,
        steps: {
          create: stepsCreateData,
        },
      },
      include: {
        steps: {
          include: {
            ingredients: { include: { ingredient: true } },
          },
        },
      },
    });
  }

  // --------------------------------------------------
  // FIND ALL - latest non-deleted version per recipe
  // --------------------------------------------------
  async findAll() {
    const recipes = await this.prisma.recipe.findMany({
      where: { deletedAt: null },
      include: {
        steps: {
          include: {
            ingredients: { include: { ingredient: true } },
          },
        },
      },
      orderBy: [{ recipeCode: 'asc' }, { version: 'desc' }],
    });

    const latestByCode = new Map<string, (typeof recipes)[number]>();
    for (const recipe of recipes) {
      if (!latestByCode.has(recipe.recipeCode)) {
        latestByCode.set(recipe.recipeCode, recipe);
      }
    }

    return Array.from(latestByCode.values());
  }

  // --------------------------------------------------
  // GET ALL VERSIONS of a recipe (for version dropdown)
  // --------------------------------------------------
  async getRecipeVersions(recipeCode: string) {
    const recipe = await this.prisma.recipe.findFirst({
      where: { recipeCode, deletedAt: null },
      orderBy: { version: 'asc' },
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe ${recipeCode} not found.`);
    }

    const rootId = recipe.parentRecipeId ?? recipe.id;

    const versions = await this.prisma.recipe.findMany({
      where: {
        OR: [{ id: rootId }, { parentRecipeId: rootId }],
        deletedAt: null,
      },
      include: {
        steps: {
          include: {
            ingredients: { include: { ingredient: true } },
          },
        },
      },
      orderBy: { version: 'desc' },
    });

    return versions;
  }

  // --------------------------------------------------
  // FIND ONE by id
  // --------------------------------------------------
  async findOne(id: number) {
    return this.prisma.recipe.findUnique({
      where: { id },
      include: {
        steps: {
          include: {
            ingredients: { include: { ingredient: true } },
          },
        },
      },
    });
  }

  // --------------------------------------------------
  // UPDATE - edit latest version, save as new version
  // --------------------------------------------------
  async updateRecipe(id: number, dto: UpdateRecipeDto, newVersion: number) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: {
        steps: {
          include: {
            ingredients: { include: { ingredient: true } },
          },
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe ${id} not found.`);
    }

    // Only latest version can be edited
    const latestVersion = await this.prisma.recipe.findFirst({
      where: {
        recipeCode: recipe.recipeCode,
        deletedAt: null,
      },
      orderBy: { version: 'desc' },
    });

    if (!latestVersion || latestVersion.id !== id) {
      throw new BadRequestException(
        'Only the latest recipe version can be edited.'
      );
    }

    if (!Number.isInteger(newVersion) || newVersion <= latestVersion.version) {
      throw new BadRequestException(
        `New version must be greater than the current latest version (${latestVersion.version}).`
      );
    }

    // Check version doesn't conflict
    const versionExists = await this.prisma.recipe.findFirst({
      where: {
        recipeCode: recipe.recipeCode,
        version: newVersion,
      },
    });
    if (versionExists) {
      throw new BadRequestException(
        `Version ${newVersion} already exists for recipe ${recipe.recipeCode}.`
      );
    }

    // Validate ingredients
    const allIngredientCodes = dto.steps.flatMap((s) =>
      s.ingredients.map((i) => i.ingredientCode)
    );
    const uniqueCodes = [...new Set(allIngredientCodes)];

    for (const step of dto.steps) {
      const stepIngredientCodes = step.ingredients.map(
        (i) => i.ingredientCode
      );
      const stepUniqueCodes = [...new Set(stepIngredientCodes)];
      if (stepUniqueCodes.length !== stepIngredientCodes.length) {
        throw new BadRequestException(
          `Step ${step.sequenceNumber} contains duplicate ingredients.`
        );
      }
    }

    const foundIngredients = await this.prisma.ingredient.findMany({
      where: { ingredientCode: { in: uniqueCodes } },
      select: { id: true, ingredientCode: true },
    });

    const ingredientMap = new Map(
      foundIngredients.map((ing) => [ing.ingredientCode, ing.id])
    );

    const missingCodes = uniqueCodes.filter(
      (code) => !ingredientMap.has(code)
    );
    if (missingCodes.length > 0) {
      throw new BadRequestException(
        `The following ingredients were not found: ${missingCodes.join(', ')}`
      );
    }

    const stepsCreateData = dto.steps.map((s) => ({
      stepType: s.stepType as StepType,
      batchType: s.batchType as RecipeStepBatchType,
      sequenceNumber: s.sequenceNumber,
      timerSeconds: s.timerSeconds,
      ingredients: {
        create: s.ingredients.map((i) => ({
          ingredientId: ingredientMap.get(i.ingredientCode) as number,
          quantity: i.quantity,
          tolerance: i.tolerance,
          unit: i.unit,
        })),
      },
    }));

    const rootId = recipe.parentRecipeId ?? recipe.id;

    return this.prisma.recipe.create({
      data: {
        recipeCode: recipe.recipeCode,
        name: recipe.name,
        description: recipe.description,
        workflow: recipe.workflow,
        version: newVersion,
        parentRecipeId: rootId,
        steps: {
          create: stepsCreateData,
        },
      },
      include: {
        steps: {
          include: {
            ingredients: { include: { ingredient: true } },
          },
        },
      },
    });
  }

  // --------------------------------------------------
  // SOFT DELETE - move to recycle bin
  // --------------------------------------------------
  async softDelete(id: number) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe ${id} not found.`);
    }

    if (recipe.deletedAt) {
      throw new BadRequestException(
        `Recipe ${recipe.recipeCode} is already deleted.`
      );
    }

    const executionCount = await this.prisma.execution.count({
      where: { recipeId: id },
    });

    if (executionCount > 0) {
      throw new BadRequestException(
        `Cannot delete recipe ${recipe.recipeCode}. This recipe has already been used in an execution.`
      );
    }

    return this.prisma.recipe.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // --------------------------------------------------
  // RESTORE - from recycle bin
  // --------------------------------------------------
  async restore(id: number) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe ${id} not found.`);
    }

    if (recipe.permanentlyDeletedAt) {
      throw new BadRequestException(
        `Recipe ${recipe.recipeCode} has been permanently deleted and cannot be restored.`
      );
    }

    if (!recipe.deletedAt) {
      throw new BadRequestException(
        `Recipe ${recipe.recipeCode} is not deleted.`
      );
    }

    return this.prisma.recipe.update({
      where: { id },
      data: { deletedAt: null, isActive: true },
    });
  }

  // --------------------------------------------------
  // PERMANENT DELETE - soft delete permanently (keep record)
  // --------------------------------------------------
  async permanentDelete(id: number) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe ${id} not found.`);
    }

    if (!recipe.deletedAt) {
      throw new BadRequestException(
        `Recipe ${recipe.recipeCode} is not in the recycle bin.`
      );
    }

    // Mark as permanently deleted. The row is retained so any historical
    // execution/version references stay valid, but it is hidden from the bin.
    return this.prisma.recipe.update({
      where: { id },
      data: { permanentlyDeletedAt: new Date(), isActive: false },
    });
  }

  // --------------------------------------------------
  // GET RECYCLE BIN - soft-deleted recipes
  // --------------------------------------------------
  async getRecycleBin() {
    return this.prisma.recipe.findMany({
      where: { deletedAt: { not: null }, permanentlyDeletedAt: null },
      include: {
        steps: {
          include: {
            ingredients: { include: { ingredient: true } },
          },
        },
      },
      orderBy: { deletedAt: 'desc' },
    });
  }

  // --------------------------------------------------
  // DELETE (legacy) - now soft deletes
  // --------------------------------------------------
  async delete(id: number) {
    return this.softDelete(id);
  }
}
