import express from "express";
import {
  createAdminUser,
  createNormalUser,
  getAllUsers,
  getSpecificUser,
  updateUser,
  deleteUser,
  getMe,
  updateMe,
  getUserStats,
  updateUserImage,
} from "../controllers/user.controller.js";
import {
  updateUserValidator,
  updateMeValidator,
  getUserValidator,
  deleteUserValidator,
  createAdminValidator,
  createNormalUserValidator,
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
userRouter.patch("/updateUserImage", upload.single("image"), updateUserImage);

// Admin only routes
userRouter.use(allowTo("admin"));

userRouter.route("/").get(getAllUsers);

// Separate creation routes
userRouter.post("/admin", createAdminValidator, createAdminUser);
userRouter.post("/user", createNormalUserValidator, createNormalUser);

userRouter.get("/stats", getUserStats);

userRouter
  .route("/:id")
  .get(getUserValidator, getSpecificUser)
  .put(updateUserValidator, updateUser)
  .delete(deleteUserValidator, deleteUser);


export default userRouter;
