import asyncHandler from "express-async-handler";
import User from "../models/user.model.js";
import ApiError from "../utils/apiError.js";
import ApiFeatures from "../utils/apiFeatures.js";

/**
 * @desc    Get all users
 * @route   GET /api/v1/users
 * @access  Private (Admin only)
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const features = new ApiFeatures(User.find(), req.query)
    .filter()
    .search(["firstName", "lastName", "phone"])
    .sort()
    .limitFields();

  await features.paginate();

  const users = await features.mongooseQuery.select("-otp");
  const paginationResult = features.getPaginationResult();

  res.status(200).json({
    message: "success",
    pagination: paginationResult,
    results: users.length,
    data: users,
  });
});

/**
 * @desc    Get specific user by ID
 * @route   GET /api/v1/users/:id
 * @access  Private (Admin only)
 */
const getSpecificUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = await User.findById(id).select("-otp");

  if (!user) {
    return next(new ApiError(`No user found with ID: ${id}`, 404));
  }

  res.status(200).json({
    message: "success",
    data: {
      user,
    },
  });
});

/**
 * @desc    Update specific user
 * @route   PUT /api/v1/users/:id
 * @access  Private (Admin only)
 */
const updateUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Don't allow updating OTP through this route
  if (req.body.otp) {
    delete req.body.otp;
  }

  const user = await User.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  }).select("-otp");

  if (!user) {
    return next(new ApiError(`No user found with ID: ${id}`, 404));
  }

  res.status(200).json({
    message: "success",
    data: {
      user,
    },
  });
});

/**
 * @desc    Delete specific user
 * @route   DELETE /api/v1/users/:id
 * @access  Private (Admin only)
 */
const deleteUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return next(new ApiError(`No user found with ID: ${id}`, 404));
  }

  await User.findByIdAndDelete(id);

  res.status(204).json({
    message: "success",
    data: null,
  });
});

/**
 * @desc    Get current logged-in user profile
 * @route   GET /api/v1/users/me
 * @access  Private (User)
 */
const getMe = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user._id) {
    return next(
      new ApiError("User authentication failed. Please log in.", 401)
    );
  }

  const user = await User.findById(req.user._id).select("-otp");

  res.status(200).json({
    message: "success",
    data: {
      user,
    },
  });
});

/**
 * @desc    Update current logged-in user profile
 * @route   PATCH /api/v1/users/updateMe
 * @access  Private (User)
 */
const updateMe = asyncHandler(async (req, res, next) => {
  // Don't allow updating sensitive fields
  if (req.body.otp || req.body.role) {
    return next(
      new ApiError("You cannot update OTP or role through this route", 400)
    );
  }

  // Check if phone number is being updated and if it already exists
  if (req.body.phone) {
    const existingUser = await User.findOne({ phone: req.body.phone });
    if (
      existingUser &&
      existingUser._id.toString() !== req.user._id.toString()
    ) {
      return next(
        new ApiError(
          "Phone number already exists. Please use a different one.",
          400
        )
      );
    }
  }

  const user = await User.findByIdAndUpdate(req.user._id, req.body, {
    new: true,
    runValidators: true,
  }).select("-otp");

  res.status(200).json({
    message: "success",
    data: {
      user,
    },
  });
});

/**
 * @desc    Regenerate OTP for current user
 * @route   PATCH /api/v1/users/regenerate-otp
 * @access  Private (User)
 */
const regenerateMyOTP = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return next(new ApiError("User not found", 404));
  }

  // Generate new OTP
  const newOTP = user.generateOTP();
  await user.save();

  res.status(200).json({
    message: "success",
    data: {
      // In production, don't return OTP in response
      otp: newOTP,
    },
  });
});

const updateUserImage = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ApiError("please upload image", 404));
  }
  req.body.profileImage = req.file.path;
  const user = await User.findByIdAndUpdate(req.user._id, req.body, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    message: "success",
    user,
  });
});
/**
 * @desc    Get user statistics (for admin)
 * @route   GET /api/v1/users/stats
 * @access  Private (Admin only)
 */
const getUserStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const adminUsers = await User.countDocuments({ role: "admin" });
  const regularUsers = await User.countDocuments({ role: "user" });

  // Users registered in the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentUsers = await User.countDocuments({
    createdAt: { $gte: thirtyDaysAgo },
  });

  res.status(200).json({
    message: "success",
    data: {
      totalUsers,
      adminUsers,
      regularUsers,
      recentUsers,
    },
  });
});

/**
 * @desc    Change user role (admin only)
 * @route   PATCH /api/v1/users/:id/role
 * @access  Private (Admin only)
 */
const changeUserRole = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !["user", "admin"].includes(role)) {
    return next(
      new ApiError("Please provide a valid role (user or admin)", 400)
    );
  }

  const user = await User.findByIdAndUpdate(
    id,
    { role },
    {
      new: true,
      runValidators: true,
    }
  ).select("-otp");

  if (!user) {
    return next(new ApiError(`No user found with ID: ${id}`, 404));
  }

  res.status(200).json({
    message: "success",
    data: {
      user,
    },
  });
});
export {
  getAllUsers,
  getSpecificUser,
  updateUser,
  deleteUser,
  getMe,
  updateMe,
  regenerateMyOTP,
  getUserStats,
  changeUserRole,
  updateUserImage,
};
