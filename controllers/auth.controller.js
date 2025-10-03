import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import ApiError from "../utils/apiError.js";

// Generate JWT Token
const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE_TIME || "30d",
  });

//  Admin creates users with a code.

/**
 * @desc    User Login (phone + code)
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res, next) => {
  const { code } = req.body;

  if (!code) {
    return next(new ApiError("Please provide code", 400));
  }

  // Find user by code
  const user = await User.findOne({ code });

  if (user.code !== code) {
    return next(new ApiError("Invalid code", 401));
  }

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

  if (currentUser.otpChangedAt) {
    const otpChangedTimestamp = parseInt(
      currentUser.otpChangedAt.getTime() / 1000,
      10
    );
    if (otpChangedTimestamp > decoded.iat) {
      return next(
        new ApiError("User recently changed code. Please login again.", 401)
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
/**
 * @desc    Admin Login (email + password)
 * @route   POST /api/v1/auth/admin/login
 * @access  Public
 */
const   adminLogin = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ApiError("Please provide email and password", 400));
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || user.role !== "admin") {
    return next(new ApiError("Invalid credentials", 401));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new ApiError("Invalid credentials", 401));
  }

  const token = generateToken({ userId: user._id });

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
        email: user.email,
        role: user.role,
      },
    },
  });
});

export { login, logout, protectedRoutes, allowTo, adminLogin };
