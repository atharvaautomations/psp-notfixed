import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        username: dto.username,
      },
    });

    if (existingUser) {
      throw new BadRequestException('Username already exists');
    }

    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException(
        'SUPER_ADMIN cannot be created from normal user creation'
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        name: dto.name,
        password: hashedPassword,
        role: dto.role,
      },
    });

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async setActive(id: number, isActive: boolean) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (existingUser.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('SUPER_ADMIN cannot be disabled');
    }

    return this.prisma.user.update({
      where: {
        id,
      },
      data: {
        isActive,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
      },
    });
  }
}
