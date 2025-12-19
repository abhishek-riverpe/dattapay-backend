import exporess from "express";
import users from "./user.routes";

const router = exporess.Router();

router.use("/users", users);

export default router;
