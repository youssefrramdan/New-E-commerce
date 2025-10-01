import couponModel from "../models/coupon.model.js";
import asyncHandler from "express-async-handler";
import ApiError from "../utils/apiError.js"

/**
 * @desc    Create coupon
 * @route   POST /api/v1/coupons
 * @access  Private
 */

const createCoupon = asyncHandler(async (req, res, next) => {
    let isExist = await couponModel.findOne({code:req.body.code})
    if(isExist) return next(new ApiError('Coupon exist', 409));
    let coupon = new couponModel(req.body)
    await coupon.save()
    res.json({message:"success", data: coupon })
});

/**
 * @desc    Get list of coupons
 * @route   GET /api/v1/coupons
 * @access  Private
 */

const getAllCoupons = asyncHandler(async (req, res, next) => {
    const coupons = await couponModel.find({})
    res.status(200).json({ message: "success", results: coupons.length, data: coupons });
});


/** 
 * @desc    Delete coupons
 * @route   DELETE /api/v1/coupons/:id
 * @access  Private
 */

const deleteCoupon = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const coupon = await couponModel.findByIdAndDelete(id);

    if (!coupon) {
        return next(new ApiError(`Coupon not found for id: ${id}`, 404));
    }

    res.status(200).json({ message: "Coupon deleted successfully" });
});

export {
    createCoupon,
    getAllCoupons,
    deleteCoupon
}