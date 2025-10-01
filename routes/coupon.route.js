import express from "express";
import { createCoupon, deleteCoupon, getAllCoupons } from "../controllers/coupon.controller.js";

const couponRouter = express.Router();

couponRouter
    .route("/")
    .post(createCoupon)
    .get(getAllCoupons);

couponRouter
    .route("/:id")
    .delete(deleteCoupon)

export default couponRouter;