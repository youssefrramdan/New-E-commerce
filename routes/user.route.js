import express from "express";
import {
  getAllUsers,
  getSpecificUser,
  updateUser,
  deleteUser,
  getMe,
  updateMe,
  regenerateMyOTP,
  getUserStats,
  changeUserRole,
  updateUserImage,
} from "../controllers/user.controller.js";
import {
  updateUserValidator,
  updateMeValidator,
  changeRoleValidator,
  getUserValidator,
  deleteUserValidator,
} from "../utils/validator/userValidators.js";
import { allowTo, protectedRoutes } from "../controllers/auth.controller.js";
import createUploader from "../middlewares/uploadImageMiddleware.js";

const userRouter = express.Router();
const upload = createUploader("users");
// All routes below require authentication
userRouter.use(protectedRoutes);

// User routes
userRouter.get("/me", getMe);
userRouter.patch("/updateMe", updateMeValidator, updateMe);
userRouter.patch("/regenerate-otp", regenerateMyOTP);
userRouter.patch("/updateUserImage", upload.single("image"), updateUserImage);

// Admin only routes
userRouter.use(allowTo("admin"));

userRouter.route("/").get(getAllUsers);

userRouter.get("/stats", getUserStats);

userRouter
  .route("/:id")
  .get(getUserValidator, getSpecificUser)
  .put(updateUserValidator, updateUser)
  .delete(deleteUserValidator, deleteUser);

userRouter.patch("/:id/role", changeRoleValidator, changeUserRole);

export default userRouter;
