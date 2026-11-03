import mongoose from 'mongoose';
import { Organization, Membership, Invitation, Team } from '../models/index.js';
import { sendSuccess } from '../utils/response.js';
import {
  ValidationError,
  ConflictError,
  NotFoundError,
  AuthorizationError,
} from '../errors/AppError.js';
import { DEFAULT_ROLE_PERMISSIONS } from '../constants/permissions.js';

export const createOrganization = async (req, res, next) => {
  try {
    const { name, slug, legalName, organizationType, contactEmail, contactPhone, address, timezone } =
      req.body;

    const existingSlug = await Organization.findOne({ slug: slug.toLowerCase().trim() });
    if (existingSlug) {
      throw new ConflictError(`An organization with the identifier '${slug}' already exists.`);
    }

    const organization = await Organization.create({
      name,
      slug: slug.toLowerCase().trim(),
      legalName: legalName || name,
      organizationType: organizationType || 'clinic',
      contactEmail: contactEmail || req.user.email,
      contactPhone,
      address,
      timezone: timezone || 'America/New_York',
      status: 'active',
    });

    // Caller automatically becomes the ORG_OWNER
    const membership = await Membership.create({
      organizationId: organization._id,
      userId: req.user.id,
      role: 'ORG_OWNER',
      status: 'active',
      permissions: DEFAULT_ROLE_PERMISSIONS.ORG_OWNER,
      joinedAt: new Date(),
    });

    return sendSuccess(
      res,
      {
        organization: organization.toSafeJSON(),
        membership: {
          id: membership._id.toString(),
          role: membership.role,
          status: membership.status,
        },
      },
      { statusCode: 201, message: 'Organization created successfully.' }
    );
  } catch (err) {
    next(err);
  }
};

export const listUserOrganizations = async (req, res, next) => {
  try {
    const memberships = await Membership.find({
      userId: new mongoose.Types.ObjectId(req.user.id),
      status: 'active',
    }).populate('organizationId');

    const organizations = memberships
      .filter((m) => m.organizationId && m.organizationId.status === 'active')
      .map((m) => ({
        id: m.organizationId._id.toString(),
        name: m.organizationId.name,
        slug: m.organizationId.slug,
        role: m.role,
        permissions: m.permissions,
        membershipId: m._id.toString(),
        joinedAt: m.joinedAt,
      }));

    return sendSuccess(res, { organizations });
  } catch (err) {
    next(err);
  }
};

export const getOrganization = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.tenant.organizationObjectId);
    if (!org) {
      throw new NotFoundError('Organization not found.');
    }
    return sendSuccess(res, { organization: org.toSafeJSON() });
  } catch (err) {
    next(err);
  }
};

export const updateOrganization = async (req, res, next) => {
  try {
    const org = await Organization.findByIdAndUpdate(
      req.tenant.organizationObjectId,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!org) {
      throw new NotFoundError('Organization not found.');
    }
    return sendSuccess(res, { organization: org.toSafeJSON() }, { message: 'Organization updated.' });
  } catch (err) {
    next(err);
  }
};

export const listMembers = async (req, res, next) => {
  try {
    const members = await Membership.find({
      organizationId: req.tenant.organizationObjectId,
    })
      .populate('userId', 'name email role phone clinicName')
      .populate('teamIds', 'name department')
      .sort({ createdAt: -1 });

    const formatted = members.map((m) => ({
      id: m._id.toString(),
      userId: m.userId?._id?.toString(),
      name: m.userId?.name || 'Unknown User',
      email: m.userId?.email || '',
      role: m.role,
      status: m.status,
      permissions: m.permissions,
      teams: (m.teamIds || []).map((t) => ({ id: t._id, name: t.name })),
      joinedAt: m.joinedAt,
    }));

    return sendSuccess(res, { members: formatted });
  } catch (err) {
    next(err);
  }
};

export const createInvitation = async (req, res, next) => {
  try {
    const { email, proposedRole } = req.body;

    // Check if target is already a member
    const existingMembership = await Membership.findOne({
      organizationId: req.tenant.organizationObjectId,
      userId: { $in: await mongoose.model('User').find({ email }).distinct('_id') },
    });

    if (existingMembership) {
      throw new ConflictError(`User ${email} is already a member of this organization.`);
    }

    const { invitation, rawToken } = await Invitation.generateInvitation({
      organizationId: req.tenant.organizationObjectId,
      email,
      proposedRole,
      invitedBy: req.user.id,
    });

    return sendSuccess(
      res,
      {
        invitation: {
          id: invitation._id.toString(),
          email: invitation.email,
          proposedRole: invitation.proposedRole,
          expiresAt: invitation.expiresAt,
          status: invitation.status,
        },
        token: rawToken, // For direct integration testing or mock emailing
      },
      { statusCode: 201, message: `Invitation dispatched to ${email}.` }
    );
  } catch (err) {
    next(err);
  }
};

export const acceptInvitation = async (req, res, next) => {
  try {
    const { token } = req.body;
    const invitation = await Invitation.verifyByRawToken(token);

    if (!invitation) {
      throw new ValidationError('Invalid, expired, or already used invitation token.');
    }

    // Upsert membership for the authenticated user
    let membership = await Membership.findOne({
      organizationId: invitation.organizationId,
      userId: req.user.id,
    });

    if (membership) {
      membership.role = invitation.proposedRole;
      membership.status = 'active';
      membership.permissions = DEFAULT_ROLE_PERMISSIONS[invitation.proposedRole] || [];
      await membership.save();
    } else {
      membership = await Membership.create({
        organizationId: invitation.organizationId,
        userId: req.user.id,
        role: invitation.proposedRole,
        status: 'active',
        permissions: DEFAULT_ROLE_PERMISSIONS[invitation.proposedRole] || [],
        invitedBy: invitation.invitedBy,
        joinedAt: new Date(),
      });
    }

    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    await invitation.save();

    return sendSuccess(res, {
      message: 'Invitation accepted successfully.',
      organizationId: invitation.organizationId.toString(),
      membershipId: membership._id.toString(),
      role: membership.role,
    });
  } catch (err) {
    next(err);
  }
};

export const updateMember = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const { role, status, teamIds } = req.body;

    const membership = await Membership.findOne({
      _id: memberId,
      organizationId: req.tenant.organizationObjectId,
    });

    if (!membership) {
      throw new NotFoundError('Member record not found in this organization.');
    }

    // Prevent demoting the last ORG_OWNER
    if (membership.role === 'ORG_OWNER' && role && role !== 'ORG_OWNER') {
      const ownerCount = await Membership.countDocuments({
        organizationId: req.tenant.organizationObjectId,
        role: 'ORG_OWNER',
        status: 'active',
      });
      if (ownerCount <= 1) {
        throw new ValidationError('Cannot demote the sole remaining Organization Owner.');
      }
    }

    if (role) {
      membership.role = role;
      membership.permissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
    }
    if (status) membership.status = status;
    if (teamIds) membership.teamIds = teamIds;

    await membership.save();

    return sendSuccess(res, { membership });
  } catch (err) {
    next(err);
  }
};

export const removeMember = async (req, res, next) => {
  try {
    const { memberId } = req.params;

    const membership = await Membership.findOne({
      _id: memberId,
      organizationId: req.tenant.organizationObjectId,
    });

    if (!membership) {
      throw new NotFoundError('Member not found in this organization.');
    }

    if (membership.role === 'ORG_OWNER') {
      const ownerCount = await Membership.countDocuments({
        organizationId: req.tenant.organizationObjectId,
        role: 'ORG_OWNER',
        status: 'active',
      });
      if (ownerCount <= 1) {
        throw new ValidationError('Cannot remove the sole remaining Organization Owner.');
      }
    }

    await Membership.deleteOne({ _id: memberId });
    return sendSuccess(res, { message: 'Member successfully removed.' });
  } catch (err) {
    next(err);
  }
};

export const switchActiveOrganization = async (req, res, next) => {
  try {
    const { organizationId } = req.body;

    let targetOrg = null;
    if (mongoose.Types.ObjectId.isValid(organizationId)) {
      targetOrg = await Organization.findById(organizationId);
    } else {
      targetOrg = await Organization.findOne({ slug: organizationId.toLowerCase().trim() });
    }

    if (!targetOrg) {
      throw new NotFoundError('Target organization not found.');
    }

    const membership = await Membership.findOne({
      organizationId: targetOrg._id,
      userId: req.user.id,
      status: 'active',
    });

    if (!membership) {
      throw new AuthorizationError('You are not an active member of the requested organization.');
    }

    return sendSuccess(res, {
      activeOrganization: targetOrg.toSafeJSON(),
      membership: {
        id: membership._id.toString(),
        role: membership.role,
        permissions: membership.permissions,
      },
    }, { message: `Active organization switched to ${targetOrg.name}.` });
  } catch (err) {
    next(err);
  }
};

export default {
  createOrganization,
  listUserOrganizations,
  getOrganization,
  updateOrganization,
  listMembers,
  createInvitation,
  acceptInvitation,
  updateMember,
  removeMember,
  switchActiveOrganization,
};
