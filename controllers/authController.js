const { pool } = require("../config/db");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");

// Login page
exports.loginPage = (req, res) => {
  res.render("auth/login", {
    title: "Sign in",
  });
};

// Registration page
exports.registerPage = (req, res) => {
  res.render("auth/register", {
    title: "Create student account",
  });
};

// Register student
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      req.flash(
        "error",
        errors
          .array()
          .map((error) => error.msg)
          .join(" "),
      );

      return res.redirect("/auth/register");
    }

    const { name, full_name, student_id, email, password, department } =
      req.body;

    // Accept either "name" or "full_name" from the registration form
    const userName = full_name || name;

    if (!userName || !email || !password) {
      req.flash("error", "Please complete all required fields.");
      return res.redirect("/auth/register");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const sql = `
  INSERT INTO users (
    full_name,
    email,
    password,
    role,
    student_id,
    department
  )
  VALUES ($1, $2, $3, 'student', $4, $5)
  RETURNING id
`;

    await pool.query(sql, [
      userName,
      email,
      hashedPassword,
      student_id || null,
      department || null,
    ]);

    req.flash("success", "Account created. Sign in to continue.");
    res.redirect("/auth/login");
  } catch (error) {
    if (error.code === "23505") {
      req.flash("error", "Email or student ID is already registered.");
      return res.redirect("/auth/register");
    }

    next(error);
  }
};

// Login
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      req.flash("error", "Enter a valid email and password.");
      return res.redirect("/auth/login");
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND is_active = TRUE",
      [req.body.email],
    );

    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
      req.flash("error", "Invalid credentials.");
      return res.redirect("/auth/login");
    }

    req.session.regenerate((error) => {
      if (error) return next(error);

      req.session.user = {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
      };

      res.redirect(
        user.role === "admin"
          ? "/admin"
          : user.role === "employer"
            ? "/employer"
            : "/student",
      );
    });
  } catch (error) {
    next(error);
  }
};

// Logout
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
};
