import { Request, Response, NextFunction } from 'express';
import { jurisdictionPolicyService, FeatureType } from '../services/jurisdictionPolicy.service';
import { auditRepository } from '../repositories/audit.repository';

export const requireJurisdictionFeature = (feature: FeatureType) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Resolve organizationId from user token, params, or query
      const organizationId =
        req.user?.organizationId ||
        req.params.organizationId ||
        req.params.id ||
        (req.query.organizationId as string);

      if (!organizationId) {
        res.status(400).json({
          success: false,
          message: 'Organization context is required to evaluate jurisdiction policy',
        });
        return;
      }

      // 2. Query jurisdiction policy feature rule
      const evaluation = await jurisdictionPolicyService.getFeaturePolicy(
        organizationId,
        feature,
      );

      if (!evaluation.allowed) {
        // 3. Log audit of denied feature access
        await auditRepository.log({
          action: 'JURISDICTION_FEATURE_ACCESS_DENIED',
          organizationId,
          userId: req.user?.userId || null,
          details: {
            feature,
            path: req.originalUrl,
            method: req.method,
            reason: evaluation.reason,
            policyCountryCode: evaluation.policy.countryCode,
            policyVersion: evaluation.policy.policyVersion,
          },
          ipAddress: req.ip || req.socket.remoteAddress,
        });

        // 4. Return clean 403 response
        res.status(403).json({
          success: false,
          code: 'FEATURE_DISABLED_BY_JURISDICTION',
          message:
            evaluation.reason ||
            "This feature is not available for the organization's current jurisdiction policy.",
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
