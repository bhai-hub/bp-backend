import { countryRepository } from '../repositories/country.repository';
import { jurisdictionPolicyRepository } from '../repositories/jurisdictionPolicy.repository';
import { organizationRepository } from '../repositories/organization.repository';
import { auditRepository } from '../repositories/audit.repository';
import { AppError } from '../middleware/errorHandler';
import { JurisdictionPolicy } from '@prisma/client';

export type FeatureType =
  | 'LEADERBOARD'
  | 'PUBLIC_PROFILE'
  | 'PORTABILITY'
  | 'REDEMPTION'
  | 'AUTOMATED_DECISION';

export interface ControlledDefaultPolicy {
  id: string;
  countryCode: string;
  policyVersion: number;
  isActive: boolean;
  status: string;
  leaderboardEnabled: boolean;
  publicProfileEnabled: boolean;
  portabilityEnabled: boolean;
  redemptionEnabled: boolean;
  nonCashRedemptionOnly: boolean;
  automatedDecisionEnabled: boolean;
  humanReviewRequired: boolean;
  consentRequired: boolean;
  dataLocationPolicy: string;
  retentionPolicy: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  country?: any;
}

export class JurisdictionPolicyService {
  /**
   * Validates that a country exists and is currently active.
   */
  async validateOrganizationJurisdiction(countryCode: string) {
    if (!countryCode) {
      throw new AppError('Country code is required', 400);
    }

    const country = await countryRepository.findByCode(countryCode.toUpperCase());
    if (!country) {
      throw new AppError(`Invalid country code "${countryCode}". Must be a valid reference country.`, 400);
    }

    if (!country.isActive) {
      throw new AppError(`Country "${country.name}" (${country.code}) is inactive for new organizations.`, 400);
    }

    return country;
  }

  /**
   * Resolves the active policy for a country code.
   * If country has no configured policy, generates a controlled DEFAULT_REVIEW_REQUIRED fallback.
   */
  async resolvePolicy(countryCode: string): Promise<JurisdictionPolicy | ControlledDefaultPolicy> {
    const code = countryCode.toUpperCase();
    const policy = await jurisdictionPolicyRepository.findActiveByCountry(code);

    if (policy) {
      return policy;
    }

    // Controlled conservative fallback for unconfigured jurisdictions
    const country = await countryRepository.findByCode(code);
    return {
      id: `default-${code.toLowerCase()}`,
      countryCode: code,
      policyVersion: 1,
      isActive: true,
      status: 'DEFAULT_REVIEW_REQUIRED',
      leaderboardEnabled: false,
      publicProfileEnabled: false,
      portabilityEnabled: false,
      redemptionEnabled: false,
      nonCashRedemptionOnly: true,
      automatedDecisionEnabled: false,
      humanReviewRequired: true,
      consentRequired: true,
      dataLocationPolicy: 'STANDARD',
      retentionPolicy: 'STANDARD',
      description: `Unconfigured Jurisdiction (${country?.name || code}): Jurisdiction policy requires review before sensitive features can be enabled.`,
      createdAt: new Date(),
      updatedAt: new Date(),
      country: country || { code, name: code, isActive: true },
    };
  }

  /**
   * Returns active policy for a country code, or null if not yet defined.
   */
  async getActivePolicy(countryCode: string) {
    return jurisdictionPolicyRepository.findActiveByCountry(countryCode.toUpperCase());
  }

  /**
   * Retrieves the resolved policy directly for an organization.
   */
  async getPolicyForOrganization(organizationId: string): Promise<JurisdictionPolicy | ControlledDefaultPolicy> {
    const org = await organizationRepository.findById(organizationId);
    if (!org) {
      throw new AppError('Organization not found', 404);
    }

    // If organization already has an associated policy version, fetch it
    if (org.countryCode && org.jurisdictionPolicyVersion) {
      const specificPolicy = await jurisdictionPolicyRepository.findByCountryAndVersion(
        org.countryCode,
        org.jurisdictionPolicyVersion,
      );
      if (specificPolicy) {
        return specificPolicy;
      }
    }

    // Fallback to active policy resolution
    return this.resolvePolicy(org.countryCode);
  }

  /**
   * Checks whether a specific feature is enabled for an organization under its active jurisdiction policy.
   */
  async getFeaturePolicy(
    organizationId: string,
    feature: FeatureType,
  ): Promise<{ allowed: boolean; reason?: string; policy: JurisdictionPolicy | ControlledDefaultPolicy }> {
    const policy = await this.getPolicyForOrganization(organizationId);

    let allowed = false;
    let featureName = '';

    switch (feature) {
      case 'LEADERBOARD':
        allowed = policy.leaderboardEnabled;
        featureName = 'Public & organizational leaderboards';
        break;
      case 'PUBLIC_PROFILE':
        allowed = policy.publicProfileEnabled;
        featureName = 'Public employee profiles';
        break;
      case 'PORTABILITY':
        allowed = policy.portabilityEnabled;
        featureName = 'Cross-organization points portability';
        break;
      case 'REDEMPTION':
        allowed = policy.redemptionEnabled;
        featureName = 'Points redemption';
        break;
      case 'AUTOMATED_DECISION':
        allowed = policy.automatedDecisionEnabled;
        featureName = 'Automated recognition decisions';
        break;
      default:
        allowed = false;
    }

    if (!allowed) {
      const reason =
        policy.status === 'DEFAULT_REVIEW_REQUIRED'
          ? `Feature "${featureName}" is restricted because the organization's jurisdiction policy requires administrative review.`
          : `Feature "${featureName}" is disabled by the configured jurisdiction policy for ${policy.countryCode} (v${policy.policyVersion}).`;

      return { allowed: false, reason, policy };
    }

    return { allowed: true, policy };
  }

  /**
   * Updates an existing policy or creates a new policy version. Audited.
   */
  async updatePolicy(
    id: string,
    updates: {
      leaderboardEnabled?: boolean;
      publicProfileEnabled?: boolean;
      portabilityEnabled?: boolean;
      redemptionEnabled?: boolean;
      nonCashRedemptionOnly?: boolean;
      automatedDecisionEnabled?: boolean;
      humanReviewRequired?: boolean;
      consentRequired?: boolean;
      dataLocationPolicy?: string;
      retentionPolicy?: string;
      description?: string;
      status?: string;
      reason?: string;
    },
    adminUserId: string,
  ) {
    const existing = await jurisdictionPolicyRepository.findById(id);
    if (!existing) {
      throw new AppError('Jurisdiction policy not found', 404);
    }

    const { reason, ...policyFields } = updates;

    const updated = await jurisdictionPolicyRepository.update(id, policyFields);

    await auditRepository.log({
      action: 'JURISDICTION_POLICY_UPDATED',
      organizationId: null,
      userId: adminUserId,
      details: {
        policyId: id,
        countryCode: existing.countryCode,
        policyVersion: existing.policyVersion,
        previousValues: existing,
        newValues: updated,
        reason: reason || 'Super Admin manual policy configuration',
      },
    });

    return updated;
  }

  /**
   * Changes an organization's country, resolves new policy, and preserves historical reference. Audited.
   */
  async changeOrganizationCountry(
    organizationId: string,
    newCountryCode: string,
    adminUserId: string,
    reason?: string,
  ) {
    const org = await organizationRepository.findById(organizationId);
    if (!org) {
      throw new AppError('Organization not found', 404);
    }

    // 1. Validate new country
    const newCountry = await this.validateOrganizationJurisdiction(newCountryCode);

    if (org.countryCode === newCountry.code) {
      return org; // No change
    }

    // 2. Resolve new jurisdiction policy
    const newPolicy = await this.resolvePolicy(newCountry.code);

    const oldCountryCode = org.countryCode;
    const oldPolicyVersion = org.jurisdictionPolicyVersion;
    const oldPolicyId = org.jurisdictionPolicyId;

    // 3. Update organization with new country and policy
    const updated = await organizationRepository.updateCountryAndJurisdiction(organizationId, {
      countryCode: newCountry.code,
      countryName: newCountry.name,
      jurisdictionPolicyVersion: newPolicy.policyVersion,
      jurisdictionPolicyId: newPolicy.id.startsWith('default-') ? null : newPolicy.id,
    });

    // 4. Create comprehensive audit trail
    await auditRepository.log({
      action: 'ORGANIZATION_COUNTRY_CHANGED',
      organizationId,
      userId: adminUserId,
      details: {
        previousCountryCode: oldCountryCode,
        previousCountryName: org.countryName,
        previousPolicyVersion: oldPolicyVersion,
        previousPolicyId: oldPolicyId,
        newCountryCode: newCountry.code,
        newCountryName: newCountry.name,
        newPolicyVersion: newPolicy.policyVersion,
        newPolicyStatus: newPolicy.status,
        reason: reason || 'Super Admin updated organization operating jurisdiction',
      },
    });

    return updated;
  }
}

export const jurisdictionPolicyService = new JurisdictionPolicyService();
