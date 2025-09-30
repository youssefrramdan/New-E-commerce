import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import ApiError from "../utils/apiError.js";

// Generate JWT Token
const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE_TIME || "30d",
  });

/**
 * @desc    User Signup
 * @route   POST /api/v1/auth/signup
 * @access  Public
 */
const signup = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, phone } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ phone });
  if (existingUser) {
    return next(
      new ApiError("User with this phone number already exists", 400)
    );
  }

  // Create new user
  const user = await User.create({
    firstName,
    lastName,
    phone,
  });

  // Generate OTP
  const otp = user.generateOTP();
  await user.save();

  // In a real application, you would send the OTP via SMS
  // For now, we'll return it in the response (remove this in production)
  res.status(201).json({
    message: "success",
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      },
      // Remove this in production - OTP should be sent via SMS
      otp: otp,
    },
  });
});

/**
 * @desc    User Login
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res, next) => {
  const { phone, otp } = req.body;

  // Check if phone and OTP are provided
  if (!phone || !otp) {
    return next(new ApiError("Please provide phone number and OTP", 400));
  }

  // Find user by phone
  const user = await User.findOne({ phone });
  if (!user) {
    return next(new ApiError("Invalid phone number or OTP", 401));
  }

  // Check if OTP is correct
  const isOTPValid = await user.compareOTP(otp);
  if (!isOTPValid) {
    return next(new ApiError("Invalid phone number or OTP", 401));
  }

  await user.save();

  // Generate JWT token
  const token = generateToken({ userId: user._id });

  // Set cookie
  const cookieOptions = {
    expires: new Date(
      Date.now() +
        (process.env.JWT_COOKIE_EXPIRE_TIME || 30) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  res.cookie("jwt", token, cookieOptions);

  res.status(200).json({
    message: "success",
    token,
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
      },
    },
  });
});

/*
   ?? In a real application, you would send the OTP via SMS

// @desc    Resend OTP
// @route   POST /api/v1/auth/resend-otp
// @access  Public
export const resendOTP = asyncHandler(async (req, res, next) => {
  const { phone } = req.body;

  if (!phone) {
    return next(new ApiError("Please provide phone number", 400));
  }

  // Find user by phone
  const user = await User.findOne({ phone });
  if (!user) {
    return next(new ApiError("User not found", 404));
  }

  // Generate new OTP
  const otp = user.generateOTP();
  await user.save();

  res.status(200).json({
    message: "success",
    // Remove this in production
    otp: otp,
  });
});
 */

/**
 * @desc    User Logout
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  res.cookie("jwt", "", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    message: "success",
  });
});

/**
 * @desc    Protect Routes
 * @route   Middleware
 * @access  Private
 */
const protectedRoutes = asyncHandler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(
      new ApiError(
        "You are not logged in. Please log in to access this route",
        401
      )
    );
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const currentUser = await User.findById(decoded.userId);

  if (!currentUser) {
    return next(
      new ApiError("The user belonging to this token no longer exists", 401)
    );
  }

  if (currentUser.passwordChangedAt) {
    const passChangedTimestamp = parseInt(
      currentUser.passwordChangedAt.getTime() / 1000,
      10
    );
    if (passChangedTimestamp > decoded.iat) {
      return next(
        new ApiError("User recently changed password. Please login again.", 401)
      );
    }
  }

  req.user = currentUser;
  next();
});

/**
 * @desc    Allow Access to Specific Roles
 */
const allowTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };

export { signup, login, logout, protectedRoutes, allowTo };
