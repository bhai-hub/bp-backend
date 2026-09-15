import prisma from '../config/prisma';
import { OrgStatus, Prisma } from '@prisma/client';

export class OrganizationRepository {
  async create(data: Prisma.OrganizationCreateInput) {
    return prisma.organization.create({
      data,
      include: {
        bpAccount: true,
        country: true,
        jurisdictionPolicy: true,
      },
    });
  }

  async findById(id: string) {
    return prisma.organization.findUnique({
      where: { id },
      include: {
        bpAccount: true,
        country: true,
        jurisdictionPolicy: true,
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
          },
        },
        _count: {
          select: {
            employees: true,
            users: true,
            transactions: true,
          },
        },
      },
    });
  }

  async findBySlug(slug: string) {
    return prisma.organization.findUnique({
      where: { slug },
      include: {
        bpAccount: true,
        country: true,
        jurisdictionPolicy: true,
      },
    });
  }

  async findAll() {
    return prisma.organization.findMany({
      include: {
        bpAccount: true,
        country: true,
        jurisdictionPolicy: true,
        _count: {
          select: {
            employees: true,
            users: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: OrgStatus) {
    return prisma.organization.update({
      where: { id },
      data: { status },
      include: { bpAccount: true, country: true, jurisdictionPolicy: true },
    });
  }

  async updatePolicy(id: string, bpPolicy: any) {
    return prisma.organization.update({
      where: { id },
      data: { bpPolicy },
      include: { bpAccount: true, country: true, jurisdictionPolicy: true },
    });
  }

  async updateCountryAndJurisdiction(
    id: string,
    data: {
      countryCode: string;
      countryName: string;
      jurisdictionPolicyVersion: number;
      jurisdictionPolicyId: string | null;
    },
  ) {
    return prisma.organization.update({
      where: { id },
      data: {
        countryCode: data.countryCode,
        countryName: data.countryName,
        jurisdictionPolicyVersion: data.jurisdictionPolicyVersion,
        jurisdictionPolicyId: data.jurisdictionPolicyId,
      },
      include: {
        bpAccount: true,
        country: true,
        jurisdictionPolicy: true,
      },
    });
  }

  async count(status?: OrgStatus) {
    return prisma.organization.count({
      where: status ? { status } : undefined,
    });
  }
}

export const organizationRepository = new OrganizationRepository();
