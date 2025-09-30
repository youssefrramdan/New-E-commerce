import express from "express";
import {
  signup,
  login,
  logout,
  protectedRoutes,
} from "../controllers/auth.controller.js";
import {
  signupValidator,
  loginValidator,
} from "../utils/validator/authValidators.js";

const router = express.Router();

// Public routes
router.post("/signup", signupValidator, signup);
router.post("/login", loginValidator, login);

// Protected routes
router.post("/logout", protectedRoutes, logout);

export default router;
