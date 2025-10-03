import { body, param } from "express-validator";
import validatorMiddleware from "../../middlewares/validatorMiddleware.js";

// Create admin validator
export const createAdminValidator = [
  body("firstName").notEmpty().withMessage("First name is required"),
  body("lastName").notEmpty().withMessage("Last name is required"),
  body("phone")
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^(\+201|01|00201)[0-2,5]{1}[0-9]{8}$/)
    .withMessage("Please provide a valid Egyptian phone number"),
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email"),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  validatorMiddleware,
];

// Create normal user validator
export const createNormalUserValidator = [
  body("firstName").notEmpty().withMessage("First name is required"),
  body("lastName").notEmpty().withMessage("Last name is required"),
  body("phone")
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^(\+201|01|00201)[0-2,5]{1}[0-9]{8}$/)
    .withMessage("Please provide a valid Egyptian phone number"),
  body("code").not().exists().withMessage("Code is generated automatically"),
  validatorMiddleware,
];

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

  body("code").not().exists().withMessage("You cannot update code here"),

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
