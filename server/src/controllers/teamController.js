import { Team, Membership } from '../models/index.js';
import { sendSuccess } from '../utils/response.js';
import { NotFoundError, ValidationError, ConflictError } from '../errors/AppError.js';

export const listTeams = async (req, res, next) => {
  try {
    const teams = await Team.find({
      organizationId: req.tenant.organizationObjectId,
      status: 'active',
    }).populate({
      path: 'clinicianMembershipIds',
      populate: { path: 'userId', select: 'name email role' },
    });

    return sendSuccess(res, { teams });
  } catch (err) {
    next(err);
  }
};

export const createTeam = async (req, res, next) => {
  try {
    const { name, description, department, clinicianMembershipIds = [] } = req.body;

    const existingTeam = await Team.findOne({
      organizationId: req.tenant.organizationObjectId,
      name: name.trim(),
    });
    if (existingTeam) {
      throw new ConflictError(`A team with name '${name}' already exists in this organization.`);
    }

    // Validate that all assigned clinician memberships belong to this organization
    if (clinicianMembershipIds.length > 0) {
      const validMembers = await Membership.countDocuments({
        _id: { $in: clinicianMembershipIds },
        organizationId: req.tenant.organizationObjectId,
      });
      if (validMembers !== clinicianMembershipIds.length) {
        throw new ValidationError('One or more clinicians assigned to the team do not belong to this organization.');
      }
    }

    const team = await Team.create({
      organizationId: req.tenant.organizationObjectId,
      name: name.trim(),
      description,
      department: department || 'General Medicine',
      clinicianMembershipIds,
      status: 'active',
    });

    return sendSuccess(res, { team }, { statusCode: 201, message: 'Team created successfully.' });
  } catch (err) {
    next(err);
  }
};

export const getTeam = async (req, res, next) => {
  try {
    const team = await Team.findOne({
      _id: req.params.teamId,
      organizationId: req.tenant.organizationObjectId,
    }).populate({
      path: 'clinicianMembershipIds',
      populate: { path: 'userId', select: 'name email role' },
    });

    if (!team) {
      throw new NotFoundError('Team not found in this organization.');
    }

    return sendSuccess(res, { team });
  } catch (err) {
    next(err);
  }
};

export const updateTeam = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { name, description, department, clinicianMembershipIds, status } = req.body;

    const team = await Team.findOne({
      _id: teamId,
      organizationId: req.tenant.organizationObjectId,
    });

    if (!team) {
      throw new NotFoundError('Team not found in this organization.');
    }

    if (name) team.name = name.trim();
    if (description !== undefined) team.description = description;
    if (department !== undefined) team.department = department;
    if (status) team.status = status;

    if (clinicianMembershipIds) {
      const validMembers = await Membership.countDocuments({
        _id: { $in: clinicianMembershipIds },
        organizationId: req.tenant.organizationObjectId,
      });
      if (validMembers !== clinicianMembershipIds.length) {
        throw new ValidationError('One or more clinicians do not belong to this organization.');
      }
      team.clinicianMembershipIds = clinicianMembershipIds;
    }

    await team.save();
    return sendSuccess(res, { team }, { message: 'Team updated successfully.' });
  } catch (err) {
    next(err);
  }
};

export const deleteTeam = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findOne({
      _id: teamId,
      organizationId: req.tenant.organizationObjectId,
    });

    if (!team) {
      throw new NotFoundError('Team not found in this organization.');
    }

    team.status = 'archived';
    await team.save();

    return sendSuccess(res, { message: 'Team archived successfully.' });
  } catch (err) {
    next(err);
  }
};

export default {
  listTeams,
  createTeam,
  getTeam,
  updateTeam,
  deleteTeam,
};

