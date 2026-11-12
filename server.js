
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";
import { connectRedis } from "./config/redis.js";
import swaggerRoutes from "./routes/swaggerRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import hallRoutes from "./routes/hallRoutes.js";
import trackRoutes from "./routes/trackRoutes.js";
import facultyRoutes from "./routes/facultyRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";

import errorHandler from "./middlewares/errorHandler.js";

// ==========================================
// INITIALIZE EXPRESS
// ==========================================

const app = express();

// Trust reverse proxy (Nginx).
app.set("trust proxy", 1);

// ==========================================
// CORS CONFIGURATION
// ==========================================

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Allow requests without an Origin header,
    // such as server-to-server requests and Postman.

    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS."));
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],
};

// ==========================================
// GLOBAL RATE LIMITER
// ==========================================

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit: 200,

  standardHeaders: true,

  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// ==========================================
// GLOBAL MIDDLEWARES
// ==========================================

app.use(helmet());

app.use(compression());

app.use(cors(corsOptions));

app.use(limiter);

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

app.use(cookieParser());

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Live Agenda Backend API",
    company: "SaaScraft Studio (India) Pvt. Ltd.",
    version: "1.0.0",
  });
});

// ==========================================
// SWAGGER DOCUMENTATION
// ==========================================

app.use("/api-docs", swaggerRoutes);

// ==========================================
// API ROUTES
// ==========================================

app.use("/api/auth", authRoutes);
app.use("/api/halls", hallRoutes);
app.use("/api/tracks", trackRoutes);
app.use("/api/faculties", facultyRoutes);
app.use("/api/sessions", sessionRoutes);

// ==========================================
// 404 ROUTE
// ==========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found.",
    data: null,
  });
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use(errorHandler);

// ==========================================
// CONNECT DATABASE & START SERVER
// ==========================================

const startServer = async () => {
  try {
    await connectDB();

    await connectRedis();

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, "0.0.0.0", () => {
      console.log("--------------------------------");
      console.log("Live Agenda Backend Started");
      console.log("--------------------------------");
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();

export default app;
