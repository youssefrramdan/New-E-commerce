import { body, param } from "express-validator";
import validatorMiddleware from "../../middlewares/validatorMiddleware.js";

// Update user validation (for admin)
export const updateUserValidator = [
  param("id").isMongoId().withMessage("Invalid user ID format"),

  body("firstName")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\u0600-\u06FF\s]+$/)
    .withMessage("First name can only contain letters and spaces"),

  body("lastName")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\u0600-\u06FF\s]+$/)
    .withMessage("Last name can only contain letters and spaces"),

  body("phone")
    .optional()
    .matches(/^(\+201|01|00201)[0-2,5]{1}[0-9]{8}$/)
    .withMessage("Please provide a valid Egyptian phone number"),

  body("role")
    .optional()
    .isIn(["user", "admin"])
    .withMessage("Role must be either 'user' or 'admin'"),

  validatorMiddleware,
];

// Update me validation (for current user)
export const updateMeValidator = [
  body("firstName")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\u0600-\u06FF\s]+$/)
    .withMessage("First name can only contain letters and spaces"),

  body("lastName")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\u0600-\u06FF\s]+$/)
    .withMessage("Last name can only contain letters and spaces"),

  body("phone")
    .optional()
    .matches(/^(\+201|01|00201)[0-2,5]{1}[0-9]{8}$/)
    .withMessage("Please provide a valid Egyptian phone number"),

  // Prevent updating sensitive fields
  body("role").not().exists().withMessage("You cannot update your role"),

  body("otp")
    .not()
    .exists()
    .withMessage("You cannot update OTP through this route"),

  validatorMiddleware,
];

// Change user role validation (admin only)
export const changeRoleValidator = [
  param("id").isMongoId().withMessage("Invalid user ID format"),

  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .isIn(["user", "admin"])
    .withMessage("Role must be either 'user' or 'admin'"),

  validatorMiddleware,
];

// Get specific user validation
export const getUserValidator = [
  param("id").isMongoId().withMessage("Invalid user ID format"),

  validatorMiddleware,
];

// Delete user validation
export const deleteUserValidator = [
  param("id").isMongoId().withMessage("Invalid user ID format"),

  validatorMiddleware,
];
