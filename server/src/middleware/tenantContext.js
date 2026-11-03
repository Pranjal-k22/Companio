import mongoose from 'mongoose';
import { Membership, Organization } from '../models/index.js';
import { AuthenticationError, AuthorizationError, NotFoundError } from '../errors/AppError.js';
import logger from '../utils/logger.js';

/**
 * Tenant Context Middleware
 * Enforces multi-tenant organization isolation for all scoped requests.
 * 
 * Verifies that the authenticated user holds an ACTIVE membership in the requested organization.
 * Attaches verified context to `req.tenant`.
 * 
 * An organization ID supplied in headers, query, or body is NEVER trusted without
 * verifying the authenticated user's database membership record.
 */
export async function tenantContext(req, res, next) {
  try {
    // 1. Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return next(new AuthenticationError('Authentication required before establishing organization context.'));
    }

    const userId = req.user.id;

    // 2. Identify requested organization from header or fallback parameters
    let requestedOrgId =
      req.headers['x-organization-id'] ||
      req.query?.organizationId ||
      req.body?.organizationId;

    let targetOrgObjectId = null;

    if (requestedOrgId) {
      if (typeof requestedOrgId === 'string' && requestedOrgId.trim()) {
        const cleanId = requestedOrgId.trim();
        if (mongoose.Types.ObjectId.isValid(cleanId)) {
          targetOrgObjectId = new mongoose.Types.ObjectId(cleanId);
        } else {
          // Check by slug
          const orgBySlug = await Organization.findOne({ slug: cleanId.toLowerCase() });
          if (orgBySlug) {
            targetOrgObjectId = orgBySlug._id;
          } else {
            return next(new NotFoundError('The specified organization was not found.'));
          }
        }
      }
    }

    // 3. If no organization specified in request, lookup user's active membership
    let membership = null;
    if (targetOrgObjectId) {
      membership = await Membership.findOne({
        organizationId: targetOrgObjectId,
        userId: new mongoose.Types.ObjectId(userId),
      });
    } else {
      // Find default / active membership for user
      membership = await Membership.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        status: 'active',
      }).sort({ updatedAt: -1 });

      if (membership) {
        targetOrgObjectId = membership.organizationId;
      }
    }

    // 4. Verify membership existence
    if (!membership) {
      // If user requested a specific organization they do not belong to
      if (targetOrgObjectId) {
        logger.warn('[Tenant Context Denied] User attempted access to unauthorized organization', {
          userId,
          targetOrgId: targetOrgObjectId.toString(),
          requestId: req.id,
        });
        return next(new AuthorizationError('You are not a member of the requested organization.'));
      }

      // User has zero organization memberships
      return next(
        new AuthorizationError('No active organization membership found for this user account.')
      );
    }

    // 5. Verify membership status
    if (membership.status === 'suspended') {
      return next(new AuthorizationError('Your membership in this organization has been suspended.'));
    }
    if (membership.status !== 'active') {
      return next(new AuthorizationError(`Membership is not active (status: ${membership.status}).`));
    }

    // 6. Verify organization active status
    const organization = await Organization.findById(membership.organizationId);
    if (!organization) {
      return next(new NotFoundError('The organization associated with your membership could not be found.'));
    }

    if (organization.status === 'suspended') {
      return next(new AuthorizationError('This organization has been suspended by system administration.'));
    }
    if (organization.status === 'inactive') {
      return next(new AuthorizationError('This organization is currently inactive.'));
    }

    // 7. Attach verified, tamper-proof tenant context
    req.tenant = {
      organizationId: organization._id.toString(),
      organizationObjectId: organization._id,
      membershipId: membership._id.toString(),
      role: membership.role,
      permissions: membership.permissions || [],
      teamIds: (membership.teamIds || []).map((t) => t.toString()),
      organization: {
        id: organization._id.toString(),
        name: organization.name,
        slug: organization.slug,
        timezone: organization.timezone,
      },
    };

    // Set correlation response header
    res.setHeader('X-Organization-Id', organization._id.toString());

    next();
  } catch (err) {
    next(err);
  }
}

export default tenantContext;

