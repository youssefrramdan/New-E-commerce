import { body } from "express-validator";
import validatorMiddleware from "../../middlewares/validatorMiddleware.js";

// Signup validation rules
export const signupValidator = [
  body("firstName")
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\u0600-\u06FF\s]+$/)
    .withMessage("First name can only contain letters and spaces"),

  body("lastName")
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\u0600-\u06FF\s]+$/)
    .withMessage("Last name can only contain letters and spaces"),

  body("phone")
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^(\+201|01|00201)[0-2,5]{1}[0-9]{8}$/)
    .withMessage("Please provide a valid Egyptian phone number"),

  validatorMiddleware,
];

// Login validation rules
export const loginValidator = [
  body("phone")
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^(\+201|01|00201)[0-2,5]{1}[0-9]{8}$/)
    .withMessage("Please provide a valid Egyptian phone number"),

  body("otp")
    .notEmpty()
    .withMessage("OTP is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits")
    .isNumeric()
    .withMessage("OTP must contain only numbers"),

  validatorMiddleware,
];

// Resend OTP validation rules
export const resendOTPValidator = [
  body("phone")
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^(\+201|01|00201)[0-2,5]{1}[0-9]{8}$/)
    .withMessage("Please provide a valid Egyptian phone number"),

  validatorMiddleware,
];
