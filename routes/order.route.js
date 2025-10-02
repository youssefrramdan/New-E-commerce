import express from "express";
import { allowTo, protectedRoutes } from "../controllers/auth.controller.js";
import { createCashOrder, getAllOrders, getLoggedUserOrders, getSpecificOrder, updateOrderToDelivered, updateOrderToPaid } from "../controllers/order.controller.js";

const router = express.Router();

// Apply JWT authentication to all order routes
router.use(protectedRoutes);
router.post("/cash/:cartId", createCashOrder);
router.get("/",getAllOrders); 
router.get("/:orderId",getSpecificOrder);
router.get("/my/orders",getLoggedUserOrders);
router.put("/:id/pay",updateOrderToPaid);
router.put("/:id/deliver",updateOrderToDelivered);


export default router;
