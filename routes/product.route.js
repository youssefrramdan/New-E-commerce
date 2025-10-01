import express from "express";
import { createProduct, deleteProduct, getAllProducts, getSpecificProduct, updateProduct } from "../controllers/product.controller.js";
import { createProductValidator, deleteProductValidator, getProductValidator, updateProductValidator } from "../utils/validator/productValidators.js";
import createUploader from "../middlewares/uploadImageMiddleware.js";

const productRouter = express.Router();
const uploadProductImage = createUploader("products");

productRouter
    .route("/")
    .post(uploadProductImage.single("image"),createProductValidator, createProduct)
    .get(getAllProducts);

productRouter
    .route("/:id")
    .get(getProductValidator, getSpecificProduct)
    .put(uploadProductImage.single("image"),updateProductValidator, updateProduct)
    .delete(deleteProductValidator, deleteProduct)

export default productRouter;

