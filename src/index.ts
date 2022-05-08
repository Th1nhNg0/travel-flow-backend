import express, { Express } from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import session from "express-session";
import cors from "cors";
dotenv.config();

import userRouter, { authenticateToken } from "./routes/user";
import locationRouter from "./routes/location";
import planRouter from "./routes/plan";

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: "*" }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(
  session({
    secret: "secret",
    saveUninitialized: true,
    resave: true,
  })
);

app.use("/location", locationRouter);
app.use("/user", userRouter);
app.use("/plan", authenticateToken, planRouter);

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});
