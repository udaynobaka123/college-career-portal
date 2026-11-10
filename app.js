require("dotenv").config();

const express = require("express");
const path = require("path");
const session = require("express-session");

const PgSession = require("connect-pg-simple")(session);
const flash = require("connect-flash");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const methodOverride = require("method-override");

const { pool } = require("./config/db");

const app = express();

// ==========================================
// VIEW ENGINE
// ==========================================

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ==========================================
// SECURITY AND MIDDLEWARE
// ==========================================

app.use(helmet({ contentSecurityPolicy: false }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "2mb",
  }),
);

app.use(express.json());

app.use(methodOverride("_method"));

app.use(express.static(path.join(__dirname, "public")));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// ==========================================
// SESSION CONFIGURATION
// ==========================================

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),

    secret: process.env.SESSION_SECRET || "dev-secret-change-this",
    resave: false,
    saveUninitialized: false,

    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8,
    },
  }),
);

app.use(flash());

// ==========================================
// GLOBAL RESPONSE VARIABLES
// ==========================================

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");

  next();
});

// ==========================================
// WEBSITE ROUTES
// ==========================================

app.use("/", require("./routes/publicRoutes"));
app.use("/auth", require("./routes/authRoutes"));
app.use("/student", require("./routes/studentRoutes"));
app.use("/admin", require("./routes/adminRoutes"));
app.use("/employer", require("./routes/employerRoutes"));

// ==========================================
// REST API ROUTES
// ==========================================

app.use("/api", require("./routes/apiRoutes"));

// JSON response for unknown API endpoints
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found.",
  });
});

// ==========================================
// WEBSITE 404 HANDLER
// ==========================================

app.use((req, res) => {
  res.status(404).render("public/404", {
    title: "Page not found",
  });
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  // JSON errors for REST API requests
  if (req.originalUrl.startsWith("/api")) {
    return res.status(err.status || 500).json({
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "An unexpected error occurred."
          : err.message,
    });
  }

  // EJS error page for website requests
  res.status(err.status || 500).render("public/error", {
    title: "Something went wrong",

    message:
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred."
        : err.message,
  });
});

// ==========================================
// START SERVER
// ==========================================

const port = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(port, "0.0.0.0", () => {
    console.log(`Career Portal running on port ${port}`);
  });
}

module.exports = app;
