import express from "express";
import {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount,
  addTips,
  applyPoints,
  removePointsDiscount,
  getUserPoints,
  updateAddress,
  applyCoupon,
  removeCoupon,
} from "../controllers/cart.controller.js";
import { protectedRoutes } from "../controllers/auth.controller.js";

const router = express.Router();

// Apply JWT authentication to all cart routes
router.use(protectedRoutes);

// GET /api/cart - Get cart items
router.get("/", getCart);

// GET /api/cart/count - Get cart items count only
router.get("/count", getCartCount);

// POST /api/cart/add - Add product to cart
router.post("/add", addToCart);

// PUT /api/cart/update - Update cart item quantity
router.put("/update", updateCartItem);

// PUT /api/cart/address - Update address & location
router.put("/address", updateAddress);

// DELETE /api/cart/remove/:productId - Remove item from cart
router.delete("/remove/:productId", removeFromCart);

// DELETE /api/cart/clear - Clear entire cart
router.delete("/clear", clearCart);

// POST /api/cart/tips - Add tips to cart
router.post("/tips", addTips);

// Points related routes
// GET /api/cart/points - Get user points
router.get("/points", getUserPoints);

// POST /api/cart/apply-points - Apply points for discount
router.post("/apply-points", applyPoints);

// DELETE /api/cart/remove-points - Remove points discount
router.delete("/remove-points", removePointsDiscount);

router.put("/applyCoupon", applyCoupon);

// DELETE /api/cart/removeCoupon - Remove coupon from cart
router.delete("/removeCoupon", removeCoupon);

export default router;
