import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';

export class JurisdictionPolicyRepository {
  async findActiveByCountry(countryCode: string) {
    return prisma.jurisdictionPolicy.findFirst({
      where: {
        countryCode: countryCode.toUpperCase(),
        isActive: true,
      },
      orderBy: { policyVersion: 'desc' },
      include: {
        country: true,
      },
    });
  }

  async findByCountryAndVersion(countryCode: string, version: number) {
    return prisma.jurisdictionPolicy.findUnique({
      where: {
        countryCode_policyVersion: {
          countryCode: countryCode.toUpperCase(),
          policyVersion: version,
        },
      },
      include: {
        country: true,
      },
    });
  }

  async findById(id: string) {
    return prisma.jurisdictionPolicy.findUnique({
      where: { id },
      include: {
        country: true,
      },
    });
  }

  async findAll() {
    return prisma.jurisdictionPolicy.findMany({
      include: {
        country: true,
        _count: {
          select: { organizations: true },
        },
      },
      orderBy: [{ countryCode: 'asc' }, { policyVersion: 'desc' }],
    });
  }

  async create(data: Prisma.JurisdictionPolicyCreateInput) {
    return prisma.jurisdictionPolicy.create({
      data,
      include: { country: true },
    });
  }

  async update(id: string, data: Prisma.JurisdictionPolicyUpdateInput) {
    return prisma.jurisdictionPolicy.update({
      where: { id },
      data,
      include: { country: true },
    });
  }

  async getLatestVersion(countryCode: string): Promise<number> {
    const latest = await prisma.jurisdictionPolicy.findFirst({
      where: { countryCode: countryCode.toUpperCase() },
      orderBy: { policyVersion: 'desc' },
      select: { policyVersion: true },
    });
    return latest?.policyVersion || 0;
  }
}

export const jurisdictionPolicyRepository = new JurisdictionPolicyRepository();
