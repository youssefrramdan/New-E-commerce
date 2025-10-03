import { body } from "express-validator";
import validatorMiddleware from "../../middlewares/validatorMiddleware.js";

// Login validation rules (phone + code)
const loginValidator = [
  body("code").notEmpty().withMessage("Code is required"),

  validatorMiddleware,
];

export default loginValidator;

export const adminLoginValidator = [
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
