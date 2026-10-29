import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { ActiveMembership } from '../../common/types/active-membership.type';
import type { CreateLabelDto } from './dto/create-label.dto';

@Injectable()
export class LabelsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(membership: ActiveMembership, dto: CreateLabelDto) {
    const existing = await this.prisma.label.findUnique({
      where: { organizationId_name: { organizationId: membership.organizationId, name: dto.name } },
    });
    if (existing) throw new ConflictException(`Label "${dto.name}" already exists`);
    return this.prisma.label.create({
      data: { organizationId: membership.organizationId, name: dto.name, color: dto.color },
    });
  }

  async list(organizationId: string) {
    return this.prisma.label.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async update(membership: ActiveMembership, labelId: string, dto: Partial<CreateLabelDto>) {
    const label = await this.prisma.label.findFirst({
      where: { id: labelId, organizationId: membership.organizationId },
    });
    if (!label) throw new NotFoundException('Label not found');
    return this.prisma.label.update({
      where: { id: labelId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
    });
  }

  async delete(membership: ActiveMembership, labelId: string): Promise<void> {
    const label = await this.prisma.label.findFirst({
      where: { id: labelId, organizationId: membership.organizationId },
    });
    if (!label) throw new NotFoundException('Label not found');
    await this.prisma.label.delete({ where: { id: labelId } });
  }
}
