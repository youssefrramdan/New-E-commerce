import express from "express";
import { protectedRoutes } from "../controllers/auth.controller.js";
import {
  checkoutSession,
  createCashOrder,
  confirmCardPayment,
  getAllOrders,
  getLoggedUserOrders,
  getSpecificOrder,
  updateOrderToDelivered,
  updateOrderToPaid,
} from "../controllers/order.controller.js";

const router = express.Router();

// Public route for Stripe redirect (no token available on redirect)
router.get("/card/success", confirmCardPayment);

// Apply JWT authentication to all other order routes
router.use(protectedRoutes);
router.get("/checkout_session/:cartId", checkoutSession);
router.post("/cash/:cartId", createCashOrder);
router.get("/", getAllOrders);
router.get("/my/orders", getLoggedUserOrders);
router.get("/:orderId", getSpecificOrder);
router.put("/:id/pay", updateOrderToPaid);
router.put("/:id/deliver", updateOrderToDelivered);

export default router;
