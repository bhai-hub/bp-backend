import prisma from '../config/prisma';

export class CountryRepository {
  async findAllActive() {
    return prisma.country.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAll() {
    return prisma.country.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findByCode(code: string) {
    return prisma.country.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        policies: {
          orderBy: { policyVersion: 'desc' },
        },
      },
    });
  }

  async create(data: { code: string; name: string; isActive?: boolean }) {
    return prisma.country.create({
      data: {
        code: data.code.toUpperCase(),
        name: data.name,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  async update(code: string, data: { name?: string; isActive?: boolean }) {
    return prisma.country.update({
      where: { code: code.toUpperCase() },
      data,
    });
  }
}

export const countryRepository = new CountryRepository();
