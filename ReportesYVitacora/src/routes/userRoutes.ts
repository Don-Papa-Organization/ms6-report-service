import { Router } from "express";
import { register, verifyEmail, login, refreshToken } from "../controllers/userController";

const router = Router();

router.post("/register", register);
router.get("/verify-email", verifyEmail);
router.post("/login", login);
router.post("/refresh-token", refreshToken);

export default router;
