import express from "express";
import { createCoupon, deleteCoupon, getAllCoupons, getSingleCoupon, updateCoupon } from "../controllers/coupon.controller.js";

const couponRouter = express.Router();

couponRouter
    .route("/")
    .post(createCoupon)
    .get(getAllCoupons);

couponRouter
    .route("/:id")
    .get(getSingleCoupon)   
    .put(updateCoupon)     
    .delete(deleteCoupon)

export default couponRouter;