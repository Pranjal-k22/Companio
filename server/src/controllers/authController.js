import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Patient } from '../models/index.js';
import { sendSuccess } from '../utils/response.js';
import logger from '../utils/logger.js';
import {
  ValidationError,
  AuthenticationError,
  ConflictError,
  NotFoundError,
} from '../errors/AppError.js';

const generateToken = (user) => {
  const jwtSecret = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_change_in_production';
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    jwtSecret,
    { expiresIn: '7d' }
  );
};

/**
 * @route   POST /api/v1/auth/register (or /api/auth/register)
 * @desc    Register a new user (Patient, Clinician, or Admin)
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'PATIENT', age, contact } = req.body;

    if (!name || !email || !password) {
      throw new ValidationError('Name, email, and password are required fields.');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError('A user account with this email already exists.');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
    });

    // If role is PATIENT, automatically create corresponding Patient document if not exists
    let patientDoc = null;
    if (role === 'PATIENT') {
      patientDoc = await Patient.create({
        userId: newUser._id,
        name: newUser.name,
        age: age || 65,
        contact: { email: newUser.email, phone: contact?.phone || '' },
      });
    }

    const token = generateToken(newUser);

    const userData = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      patientId: patientDoc ? patientDoc._id : null,
    };

    return sendSuccess(
      res,
      { token, user: userData },
      { statusCode: 201, message: 'User registered successfully.' }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/login (or /api/auth/login)
 * @desc    Authenticate user & get JWT token
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('Please provide email and password.');
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AuthenticationError('Invalid email or password credentials.');
    }

    // Match password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AuthenticationError('Invalid email or password credentials.');
    }

    // Check if patient profile linked
    let patientId = null;
    if (user.role === 'PATIENT') {
      const patient = await Patient.findOne({ userId: user._id });
      if (patient) patientId = patient._id;
    }

    const token = generateToken(user);

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      patientId,
    };

    return sendSuccess(
      res,
      { token, user: userData },
      { statusCode: 200, message: 'Login successful.' }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/auth/me (or /api/auth/me)
 * @desc    Get current authenticated user profile
 * @access  Private (JWT required)
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      throw new NotFoundError('User profile not found.');
    }

    let patientProfile = null;
    if (user.role === 'PATIENT') {
      patientProfile = await Patient.findOne({ userId: user._id });
    }

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || patientProfile?.contact?.phone || '',
      clinicName: user.clinicName || '',
      preferences: user.preferences || {
        voiceSpeed: 'normal',
        notificationsEnabled: true,
        redFlagSMS: true,
        dailyDigest: true,
      },
      patientProfile,
    };

    return sendSuccess(res, { user: userData });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/v1/auth/profile (or /api/auth/profile)
 * @desc    Update current authenticated user profile & preferences
 * @access  Private (JWT required)
 */
export const updateProfile = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      clinicName,
      preferences,
      emergencyContact,
      baselineMetrics,
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (clinicName !== undefined) user.clinicName = clinicName.trim();
    if (preferences) {
      user.preferences = {
        ...user.preferences,
        ...preferences,
      };
    }

    await user.save();

    let patientProfile = null;
    if (user.role === 'PATIENT') {
      const updateData = {};
      if (name) updateData.name = name.trim();
      if (phone !== undefined) {
        updateData['contact.phone'] = phone.trim();
      }
      if (emergencyContact) {
        updateData.emergencyContact = emergencyContact;
      }
      if (baselineMetrics) {
        updateData.baselineMetrics = baselineMetrics;
      }

      patientProfile = await Patient.findOneAndUpdate(
        { userId: user._id },
        { $set: updateData },
        { new: true }
      );
    }

    const updatedUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      clinicName: user.clinicName,
      preferences: user.preferences,
      patientProfile,
    };

    return sendSuccess(res, { user: updatedUser }, { message: 'Profile updated successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/forgot-password (or /api/auth/forgot-password)
 * @desc    Request time-limited, single-use password reset token via email/SMS
 * @access  Public (Rate-limited via authRateLimiter)
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ValidationError('Email address is required.');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // GENERIC RESPONSE DEFENSE: Never disclose whether the account exists (Prevents User Enumeration)
    const genericResponse = {
      message: 'If an account with that email exists, password reset instructions have been sent.',
    };

    if (!user) {
      logger.info(`[Auth:ForgotPassword] Reset requested for non-existent email: ${normalizedEmail}`);
      return sendSuccess(res, genericResponse);
    }

    // 1. Generate 32-byte cryptographically secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // 2. Compute SHA-256 hash to store in DB (Never store plaintext token)
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // 3. Set expiry to 15 minutes from now
    const resetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    user.passwordResetTokenHash = resetTokenHash;
    user.passwordResetExpiresAt = resetExpiresAt;
    await user.save();

    logger.info(`[Auth:ForgotPassword] Password reset token generated for user ${user._id} (${user.email}). Expires in 15m.`);

    // In dev / test mode, surface the raw token for automated testing
    const isDevOrTest = process.env.NODE_ENV !== 'production';

    return sendSuccess(
      res,
      {
        ...genericResponse,
        ...(isDevOrTest ? { resetToken, expiresAt: resetExpiresAt.toISOString() } : {}),
      },
      { statusCode: 200 }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/reset-password (or /api/auth/reset-password)
 * @desc    Reset password using single-use cryptographically verified reset token
 * @access  Public (Rate-limited via authRateLimiter)
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw new ValidationError('Both reset token and new password are required.');
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      throw new ValidationError('New password must be at least 8 characters long.');
    }

    // 1. Hash incoming token with SHA-256 to compare with database hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 2. Find user with valid, non-expired token
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      logger.warn('[Auth:ResetPassword] Attempted reset with invalid or expired token.');
      throw new ValidationError('Password reset token is invalid or has expired.');
    }

    // 3. Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // 4. Update password and invalidate token (SINGLE-USE BURN / REPLAY PROTECTION)
    user.passwordHash = passwordHash;
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;

    // 5. Invalidate existing sessions: tokens issued before this timestamp will be rejected
    user.passwordChangedAt = new Date();
    await user.save();

    logger.info(`[Auth:ResetPassword] Password successfully reset for user ${user._id} (${user.email}). Prior sessions invalidated.`);

    return sendSuccess(
      res,
      { message: 'Password has been successfully reset. Please log in with your new credentials.' },
      { statusCode: 200 }
    );
  } catch (error) {
    next(error);
  }
};
