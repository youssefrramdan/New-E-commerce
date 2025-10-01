import { body, param } from "express-validator";
import validatorMiddleware from "../../middlewares/validatorMiddleware.js";

// Create product validation (for admin)
export const createProductValidator = [
  body("name")
    .notEmpty()
    .withMessage("Product required")
    .isLength({ min: 3})
    .withMessage("Must be at least 3 chars"),

  body("description")
    .notEmpty()
    .withMessage("Product description is required")
    .isLength({ max: 2000 })
    .withMessage("Too long description"),

  body("quantity")
    .notEmpty()
    .withMessage("Product quantity is required")
    .isNumeric()
    .withMessage("Product quantity must be a number"),

  body("sold")
    .optional()
    .isNumeric()
    .withMessage("Product sold must be a number"),  

  body("price")
    .notEmpty()
    .withMessage("Product price is required")
    .isNumeric()
    .withMessage("Product price must be a number")
    .isFloat({ max: 9999999999999999 })
    .withMessage("Too long price"),

  body("priceAfterDiscount")
    .optional()
    .isNumeric()
    .withMessage("Product priceAfterDiscount must be a number")
    .toFloat()
    .custom((value, { req }) => {
      if( parseFloat(req.body.price) <= value ){
        throw new Error("priceAfterDiscount must be lower than price");
      }
      return true;
    }),

  validatorMiddleware,
];

// Get product validation
export const getProductValidator = [
  param("id").isMongoId().withMessage("Invalid ID format"),
  validatorMiddleware,
];

// Update product validation (for admin)
export const updateProductValidator = [
  param("id").isMongoId().withMessage("Invalid ID format"),
  validatorMiddleware,
];

// Delete product validation (for admin)
export const deleteProductValidator = [
  param("id").isMongoId().withMessage("Invalid ID format"),
  validatorMiddleware,
];

