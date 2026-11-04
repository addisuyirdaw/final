/** @format */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const complaintRoutes = require("./routes/complaints");
const clubRoutes = require("./routes/clubs");
const electionRoutes = require("./routes/elections");
const postRoutes = require("./routes/posts");
const contactRoutes = require("./routes/contact");
const reportRoutes = require("./routes/reports");
const messageRoutes = require("./routes/messages");
const aiRoutes = require("./routes/ai");
const carouselRoutes = require("./routes/carousel");
const leadershipRoutes = require("./routes/leadership");
const staffRoutes = require("./routes/staff");
const templateRoutes = require("./routes/templates");
const departmentRoutes = require("./routes/departments");
const configRoutes = require("./routes/config");
const certificateRoutes = require("./routes/certificates");
const backupRoutes = require("./routes/backup");
const { initBackupCron } = require("./services/backupService");
const crossCampusRoutes = require("./routes/crossCampus");
const attendanceRoutes = require("./routes/attendance");
const transcriptRoutes = require("./routes/transcripts");
const budgetRoutes = require("./routes/budget");
const grantRoutes = require("./routes/grants");
const projectRoutes = require("./routes/projects");
const taskRoutes = require("./routes/tasks");
const announcementRoutes = require("./routes/announcements");
const resourceRoutes = require("./routes/resources");
const handoverRoutes = require("./routes/handover");
const renewalRoutes = require("./routes/renewals");
const proposalRoutes = require("./routes/proposals");

// Import middleware
const errorHandler = require("./middleware/errorHandler");
const { runMigrations } = require('./utils/migrationRunner');

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // Allow images/files to be loaded cross-origin (needed for frontend on :5173 loading uploads from :5000)
}));
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        // Local development
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:8080",
        // Custom domain from env
        process.env.FRONTEND_URL,
        // Dynamic origins from CORS_ORIGINS env var (comma-separated)
        ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()) : []),
      ].filter(Boolean);

      // Allow any Vercel deployment URL (covers all preview and production deployments)
      const isVercelUrl = /^https:\/\/.*\.vercel\.app$/.test(origin);
      // Allow Cloudflare Quick Tunnels for easy public testing
      const isCloudflareUrl = /^https:\/\/.*\.trycloudflare\.com$/.test(origin);
      // Allow exact matches
      const isAllowed = allowedOrigins.includes(origin);

      if (isVercelUrl || isCloudflareUrl || isAllowed) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 50000 : 1000, // Large threshold in development
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later."
  },
});
app.use("/api/", limiter);

// Body parsing middleware — 50 MB limit to handle PDF uploads without server hangs
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

const path = require('path');
const fs = require('fs');
// Serve the uploads directory statically — always relative to this server.js file (backend/)
const uploadsPath = path.join(__dirname, 'uploads');
console.log("✅ Serving static uploads from:", uploadsPath);
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsPath), async (req, res, next) => {
  // ──────────────────────────────────────────────────────────────────────────
  // SELF-HEALING STATIC HANDLER
  // When a file is missing on disk (e.g. ephemeral Render storage reset,
  // new computer, or fresh deployment), pull the base64 backup from MongoDB
  // and recreate the physical file transparently before serving it.
  // ──────────────────────────────────────────────────────────────────────────
  const cleanUrl = req.url.split('?')[0];

  // Helper: ensure dir exists and write buffer to path, then serve it
  const healAndServe = (filePath, buffer) => {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, buffer);
      console.log(`✨ Self-healed missing file: ${path.basename(filePath)}`);
      return res.sendFile(filePath);
    } catch (err) {
      console.error('Self-heal write error:', err);
      return next();
    }
  };

  try {
    // 1. /uploads/reports/:filename  →  ActivityReport.fileData
    const reportsMatch = cleanUrl.match(/^\/reports\/([^/]+)$/i);
    if (reportsMatch) {
      const filename = reportsMatch[1];
      const filePath = path.join(uploadsPath, 'reports', filename);
      const ActivityReport = require('./models/ActivityReport');
      const report = await ActivityReport.findOne({ fileUrl: { $regex: filename } }).select('+fileData');
      if (report && report.fileData) {
        return healAndServe(filePath, Buffer.from(report.fileData, 'base64'));
      }
      return next();
    }

    // 2. /uploads/carousel/:filename  →  Carousel.fileData
    const carouselMatch = cleanUrl.match(/^\/carousel\/([^/]+)$/i);
    if (carouselMatch) {
      const filename = carouselMatch[1];
      const filePath = path.join(uploadsPath, 'carousel', filename);
      const Carousel = require('./models/Carousel');
      const slide = await Carousel.findOne({ imageUrl: { $regex: filename } }).select('+fileData');
      if (slide && slide.fileData) {
        return healAndServe(filePath, Buffer.from(slide.fileData, 'base64'));
      }
      return next();
    }

    // 3. /uploads/profiles/:filename  →  User.profileImageData
    const profilesMatch = cleanUrl.match(/^\/profiles\/([^/]+)$/i);
    if (profilesMatch) {
      const filename = profilesMatch[1];
      const filePath = path.join(uploadsPath, 'profiles', filename);
      const User = require('./models/User');
      const user = await User.findOne({ profileImage: { $regex: filename } }).select('+profileImageData');
      if (user && user.profileImageData) {
        return healAndServe(filePath, Buffer.from(user.profileImageData, 'base64'));
      }
      return next();
    }

    // 4. /uploads/leadership/:filename  →  Staff.fileData  (uploaded via /api/leadership)
    const leadershipMatch = cleanUrl.match(/^\/leadership\/([^/]+)$/i);
    if (leadershipMatch) {
      const filename = leadershipMatch[1];
      const filePath = path.join(uploadsPath, 'leadership', filename);
      const Staff = require('./models/Staff');
      const profile = await Staff.findOne({ imageUrl: { $regex: filename } }).select('+fileData');
      if (profile && profile.fileData) {
        return healAndServe(filePath, Buffer.from(profile.fileData, 'base64'));
      }
      return next();
    }

    // 5. /uploads/templates/:filename  →  Template.fileData
    const templatesMatch = cleanUrl.match(/^\/templates\/([^/]+)$/i);
    if (templatesMatch) {
      const filename = templatesMatch[1];
      const filePath = path.join(uploadsPath, 'templates', filename);
      const Template = require('./models/Template');
      const tmpl = await Template.findOne({ pdfUrl: { $regex: filename } }).select('+fileData');
      if (tmpl && tmpl.fileData) {
        return healAndServe(filePath, Buffer.from(tmpl.fileData, 'base64'));
      }
      return next();
    }

    // 6. /uploads/:filename (root — uploaded via /api/staff POST/PUT which copies here)
    const rootMatch = cleanUrl.match(/^\/([^/]+)$/i);
    if (rootMatch) {
      const filename = rootMatch[1];
      const filePath = path.join(uploadsPath, filename);
      const Staff = require('./models/Staff');
      const profile = await Staff.findOne({ imageUrl: { $regex: filename } }).select('+fileData');
      if (profile && profile.fileData) {
        return healAndServe(filePath, Buffer.from(profile.fileData, 'base64'));
      }
      return next();
    }
  } catch (err) {
    console.error('Self-healing static handler error:', err);
  }
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  return res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/clubs", clubRoutes);
app.use("/api/elections", electionRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/handover", handoverRoutes);
app.use("/api/renewals", renewalRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/carousel", carouselRoutes);
app.use("/api/leadership", leadershipRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/config", configRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/admin/backup", backupRoutes);
app.use("/api/cross-campus", crossCampusRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/transcripts", transcriptRoutes);
app.use("/api/students", transcriptRoutes);
app.use("/api/budget", budgetRoutes);
app.use("/api/grants", grantRoutes);
app.use("/api/clubs/:clubId/projects", projectRoutes);
app.use("/api/clubs/:clubId/projects/:projectId/tasks", taskRoutes);
app.use("/api/clubs/:clubId/announcements", announcementRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/proposals", proposalRoutes);


// 404 handler
app.use("*", (req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl
  });
});

// Error handling middleware - MUST be the last middleware
app.use(errorHandler);

const sanitizeMongoUri = (uri) => {
  if (!uri || typeof uri !== "string") return "none";
  return uri.replace(/\/\/[^:]+:[^@]+@/, "//***:***@");
};

// Database connection with safe environment management
let mongodInstance = null;
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/student_union_db";
  const isProduction = process.env.NODE_ENV === "production";
  const isTest = process.env.NODE_ENV === "test";
  const allowMemoryFallback = process.env.ALLOW_IN_MEMORY_DB === "true" || isTest;

  console.log("Attempting MongoDB connection to:", sanitizeMongoUri(uri));

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected (Persistent): ${conn.connection.host}`);
    console.log(`✅ Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    if (isProduction || !allowMemoryFallback) {
      console.error(`❌ Fatal: Persistent MongoDB connection failed: ${error.message}`);
      console.error(`❌ In-memory database fallback is prohibited in ${process.env.NODE_ENV || "production"} environment.`);
      console.error("❌ Please ensure MONGODB_URI points to a running MongoDB database or set ALLOW_IN_MEMORY_DB=true for local dev.");
      process.exit(1);
    }

    console.warn(`⚠️ Local MongoDB unreachable (${error.message}). Starting In-Memory MongoDB Server (dev/test only)...`);
    try {
      const { MongoMemoryServer } = require("mongodb-memory-server");
      mongodInstance = await MongoMemoryServer.create();
      const inMemUri = mongodInstance.getUri();
      const conn = await mongoose.connect(inMemUri);
      console.log(`⚠️ Ephemeral In-Memory MongoDB Connected at: ${sanitizeMongoUri(inMemUri)} (RAM only)`);
      return conn;
    } catch (memErr) {
      console.error("❌ Failed to start In-Memory MongoDB Server:", memErr.message);
      process.exit(1);
    }
  }
};

// Initialize database connection
const initializeDatabase = async () => {
  await connectDB();
  if (process.env.RUN_MIGRATIONS_ON_STARTUP === 'true') {
    try {
      await runMigrations({ silent: false });
    } catch (migrationError) {
      console.error("❌ Database migration error during startup:", migrationError.message);
    }
  } else {
    console.log("🚀 Database connection verified. Normal server startup ready.");
  }
};

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await initializeDatabase();

    // Initialize scheduled database backup cron job
    try {
      initBackupCron();
    } catch (cronErr) {
      console.warn("⚠️ Backup cron initialization warning:", cronErr.message);
    }

    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`✅ Health check: http://localhost:${PORT}/health`);
    });

    // Increase timeouts to prevent Render / cloud proxy drops on large file uploads
    server.timeout = 120000;          // 2 min request timeout
    server.keepAliveTimeout = 65000;  // keep TCP alive past load-balancer idle window
    server.headersTimeout = 70000;    // must be > keepAliveTimeout

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
      }
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n🔄 Received ${signal}, shutting down gracefully...`);

      server.close(async () => {
        console.log("✅ HTTP server closed");
        try {
          await mongoose.connection.close();
          console.log("✅ MongoDB connection closed");
          process.exit(0);
        } catch (err) {
          console.error("❌ Error closing MongoDB connection:", err);
          process.exit(1);
        }
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error("❌ Could not close connections in time, forcefully shutting down");
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err.message);
  console.error(err.stack);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
  console.error(err.stack);
  process.exit(1);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;

