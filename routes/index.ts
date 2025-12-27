import express from "express";
import users from "./user.routes";
import addresses from "./address.routes";
import zynk from "./zynk.routes";
import wallets from "./wallet.routes";
import externalAccounts from "./external-accounts.routes";
import teleport from "./teleport.routes";
import auth from "../middlewares/auth";

const router = express.Router();

router.use("/users", users);
router.use("/addresses", auth, addresses);
router.use("/zynk", auth, zynk);
router.use("/wallet", auth, wallets);
router.use("/external-accounts", auth, externalAccounts);
router.use("/teleport", auth, teleport);

export default router;
