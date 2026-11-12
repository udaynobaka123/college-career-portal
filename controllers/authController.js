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

// Employer registration page
exports.employerRegisterPage = (req, res) => {
  res.render("auth/employer-register", {
    title: "Create employer account",
  });
};

// Register employer
exports.employerRegister = async (req, res, next) => {
  try {
    const { full_name, company_name, email, password, phone, company_website } =
      req.body;

    // Check required fields
    if (
      !full_name?.trim() ||
      !company_name?.trim() ||
      !email?.trim() ||
      !password
    ) {
      req.flash("error", "Please complete all required fields.");
      return res.redirect("/auth/employer-register");
    }

    // Validate email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.trim())) {
      req.flash("error", "Please enter a valid email address.");
      return res.redirect("/auth/employer-register");
    }

    // Validate password
    if (password.length < 8) {
      req.flash("error", "Password must contain at least 8 characters.");
      return res.redirect("/auth/employer-register");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create employer account
    await pool.query(
      `INSERT INTO users (
                full_name,
                email,
                password,
                role,
                phone,
                company_name,
                company_website
            )
            VALUES ($1, $2, $3, 'employer', $4, $5, $6)`,
      [
        full_name.trim(),
        email.trim().toLowerCase(),
        hashedPassword,
        phone?.trim() || null,
        company_name.trim(),
        company_website?.trim() || null,
      ],
    );

    req.flash(
      "success",
      "Employer account created successfully. Please sign in.",
    );

    res.redirect("/auth/login");
  } catch (error) {
    if (error.code === "23505") {
      req.flash("error", "This email address is already registered.");
      return res.redirect("/auth/employer-register");
    }

    next(error);
  }
};
