import { organizationRepository } from '../repositories/organization.repository';
import { auditRepository } from '../repositories/audit.repository';
import { jurisdictionPolicyService } from './jurisdictionPolicy.service';
import { AppError } from '../middleware/errorHandler';
import { OrgStatus } from '@prisma/client';

export class OrganizationService {
  async createOrganization(
    data: {
      name: string;
      legalName: string;
      slug?: string;
      email: string;
      phone: string;
      countryCode: string; // Required ISO code
      timezone?: string;
      currency?: string;
      status?: OrgStatus;
      bpPolicy?: any;
    },
    adminUserId?: string,
  ) {
    // 1. Mandatory country validation
    if (!data.countryCode) {
      throw new AppError('Country is required to determine organizational jurisdiction', 400);
    }

    const country = await jurisdictionPolicyService.validateOrganizationJurisdiction(data.countryCode);

    // 2. Resolve active jurisdiction policy
    const policy = await jurisdictionPolicyService.resolvePolicy(country.code);

    const slug =
      data.slug ||
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const existing = await organizationRepository.findBySlug(slug);
    if (existing) {
      throw new AppError(`Organization with slug "${slug}" already exists`, 409);
    }

    const defaultPolicy = data.bpPolicy || {
      monthlyEmployeeCap: 5000,
      rewardTaxDeductible: true,
      allowManagerDiscretionaryCredit: true,
      welcomeBonusBP: 1000,
    };

    // 3. Create organization with associated jurisdiction policy
    const org = await organizationRepository.create({
      name: data.name,
      legalName: data.legalName,
      slug,
      email: data.email,
      phone: data.phone,
      country: {
        connect: { code: country.code },
      },
      countryName: country.name,
      jurisdictionPolicyVersion: policy.policyVersion,
      ...(policy.id && !policy.id.startsWith('default-')
        ? { jurisdictionPolicy: { connect: { id: policy.id } } }
        : {}),
      timezone: data.timezone || 'UTC',
      currency: data.currency || (country.code === 'IN' ? 'INR' : 'USD'),
      status: data.status || 'ACTIVE',
      bpPolicy: defaultPolicy,
      bpAccount: {
        create: {
          purchasedBP: 0,
          allocatedBP: 0,
          availableBP: 0,
        },
      },
    });

    // 4. Audit organization creation with jurisdiction metadata
    await auditRepository.log({
      action: 'ORGANIZATION_CREATED',
      organizationId: org.id,
      userId: adminUserId,
      details: {
        name: org.name,
        slug: org.slug,
        countryCode: country.code,
        countryName: country.name,
        jurisdictionPolicyVersion: policy.policyVersion,
        jurisdictionPolicyStatus: policy.status,
      },
    });

    return org;
  }

  async getAllOrganizations() {
    return organizationRepository.findAll();
  }

  async getOrganizationById(id: string) {
    const org = await organizationRepository.findById(id);
    if (!org) {
      throw new AppError('Organization not found', 404);
    }
    return org;
  }

  async updateStatus(id: string, status: OrgStatus, adminUserId?: string) {
    const org = await organizationRepository.findById(id);
    if (!org) {
      throw new AppError('Organization not found', 404);
    }

    const updated = await organizationRepository.updateStatus(id, status);

    await auditRepository.log({
      action: 'ORGANIZATION_STATUS_UPDATED',
      organizationId: id,
      userId: adminUserId,
      details: { previousStatus: org.status, newStatus: status },
    });

    return updated;
  }

  async updatePolicy(id: string, bpPolicy: any, adminUserId?: string) {
    const org = await organizationRepository.findById(id);
    if (!org) {
      throw new AppError('Organization not found', 404);
    }

    const updated = await organizationRepository.updatePolicy(id, bpPolicy);

    await auditRepository.log({
      action: 'ORGANIZATION_POLICY_UPDATED',
      organizationId: id,
      userId: adminUserId,
      details: bpPolicy,
    });

    return updated;
  }

  async changeCountry(
    id: string,
    newCountryCode: string,
    adminUserId: string,
    reason?: string,
  ) {
    return jurisdictionPolicyService.changeOrganizationCountry(
      id,
      newCountryCode,
      adminUserId,
      reason,
    );
  }
}

export const organizationService = new OrganizationService();
