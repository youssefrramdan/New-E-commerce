// eslint-disable-next-line import/no-unresolved
import slugify from "slugify"
import asyncHandler from "express-async-handler";
import ApiError from "../utils/apiError.js";
import productModel from "../models/product.model.js";

/**
 * @desc    Create product
 * @route   POST /api/v1/products
 * @access  Private
 */

const createProduct = asyncHandler(async (req, res, next) => {
    req.body.slug = slugify(req.body.name)
    if (req.file && req.file.path) {
        req.body.image = req.file.path;
    }
    const product = await productModel.create(req.body);
    res.status(201).json({message: "success", data: product });
});

/**
 * @desc    Get list of products
 * @route   GET /api/v1/products
 * @access  Public
 */

const getAllProducts = asyncHandler(async (req, res, next) => {
    // 1) Filtering
    const queryStringObj = { ...req.query };
    const excludesFields = ['page', 'sort', 'limit', 'fields', 'keyword'];
    excludesFields.forEach((field) => delete queryStringObj[field]);
    // Apply filteration using [gte, gt, lte, lt]
    let queryStr = JSON.stringify(queryStringObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    let filterObj = JSON.parse(queryStr);

    // 2) Search
    if(req.query.keyword) {
        filterObj.$or = [
            { name: { $regex: req.query.keyword, $options: "i" }},
            { description: { $regex: req.query.keyword, $options: "i" }},
        ];
    }

    //3) Pagination
    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 50;
    const skip = (page - 1) * limit;

    // Build query
    let mongooseQuery = productModel.find(filterObj)
    .skip(skip).
    limit(limit);

    // 4) Sorting
    if(req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        mongooseQuery = mongooseQuery.sort(sortBy);
    } else{
        mongooseQuery = mongooseQuery.sort('-createdAt');
    }

    // 5) Fiels Limiting
    if(req.query.fields) {
        const fields = req.query.fields.split(",").join(' ');
        mongooseQuery = mongooseQuery.select(fields);
    } else {
        mongooseQuery = mongooseQuery.select('-__v');
    }

    // Execute query 
    const products = await mongooseQuery;
    res.status(200).json({ message: "success", results: products.length, page, data: products });
});

/**
 * @desc    Get specific product by id
 * @route   GET /api/v1/products/:id
 * @access  Public
 */

const getSpecificProduct = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const product = await productModel.findById({ _id: id });
    if (!product) {
        return next(new ApiError(`No product for this id ${id}`, 404));
    }
    res.status(200).json({ message: "success", data: product });
});

/**
 * @desc    Update specific product 
 * @route   Put /api/v1/products/:id
 * @access  Public
 */

const updateProduct = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    if(req.body.name) {
        req.body.slug = slugify(req.body.name);
    }
    if (req.file && req.file.path) {
        req.body.image = req.file.path;
    }
    const product = await productModel.findOneAndUpdate({ _id: id }, req.body, {
        new: true,
    });
    if (!product) {
        return next(new ApiError(`No product for this id ${id}`, 404));
    }
    res.status(200).json({ message: "success", data: product });
});

/**
 * @desc    Delete specific product 
 * @route   DELETE /api/v1/products/:id
 * @access  Private
 */

const deleteProduct = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const product = await productModel.findByIdAndDelete({ _id: id });
    if (!product) {
        return next(new ApiError(`No product for this id ${id}`, 404));
    }
    res.status(200).json({ message: "Product deleted successfully", data: product });
});

export{
    createProduct,
    getAllProducts,
    getSpecificProduct,
    updateProduct,
    deleteProduct
}
