import "./config.js";
import express from "express";
import cors from "cors";
import  { Router } from "express";
import routes from "./routes.js";
import { getWelcome, getBanks, getRecipients, getUserByEmail, createLinkToken, exchangePublicToken, sendMoney } from "./handlers.js";
import fetchManagementApiAccessToken from "./fetchManagementApiAccessToken.js";
import saveManagementToken from "./saveManagementToken.js";

const app = express();

app.use(express.json());
app.use(cors());
app.options('*', cors());


const router = Router();
const port = 3000;
app.use("/", router);
routes(router, { getWelcome, getBanks, getRecipients, getUserByEmail, createLinkToken, exchangePublicToken, sendMoney });

const managementApiAccessToken = await fetchManagementApiAccessToken();
await saveManagementToken(managementApiAccessToken);

app.listen(port, () => {
  console.log(`Paymo app listening on port ${port}`);
});
