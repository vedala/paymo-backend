import "./config.js";
import express from "express";
const port = 3000;
import cors from "cors";
import authorize from "./authorization.js";
import  { Router } from "express";
import routes from "./routes.js";
import { getWelcome } from "./handlers.js";

const app = express();
app.use(cors());

const router = Router();

routes(router, { getWelcome });

app.use("/", router);

app.listen(port, () => {
  console.log(`Paymo app listening on port ${port}`);
});
