import express from "express";
import {
    authUser,
    registerUser,
    logoutUser,
    getUserProfile,
    updateUserProfile,
    activateUser,
    forgotPassword,
    resetPassword
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/auth", authUser);
router.post("/logout", logoutUser);
router.get("/activate/:token", activateUser);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);

router.route("/profile")
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile);

export default router;
