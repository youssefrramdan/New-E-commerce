import express from "express";
import {
  login,
  logout,
  protectedRoutes,
  adminLogin,
} from "../controllers/auth.controller.js";
import loginValidator, {
  adminLoginValidator,
} from "../utils/validator/authValidators.js";

const router = express.Router();

// Public routes
router.post("/login", loginValidator, login);
router.post("/admin/login", adminLoginValidator, adminLogin);

// Protected routes
router.post("/logout", protectedRoutes, logout);

export default router;
