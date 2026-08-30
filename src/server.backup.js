import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDatabase from "./config/db.js";
import routes from "./routes/index.js";
import morgan from "morgan";

const app = express();
app.use(morgan("dev"));

const port = Number(process.env.PORT || 5000);

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true
}));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/", (req, res) => res.json({ message: "Campus Rescue API" }));
app.use("/api", routes);

app.use((error, req, res, next) => {
  if (error.message === "Origin not allowed by CORS") return res.status(403).json({ error: error.message });
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

async function start() {
  try {
    await connectDatabase();
    app.listen(port, () => console.log(`Campus Rescue API running on port ${port}`));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

start();
