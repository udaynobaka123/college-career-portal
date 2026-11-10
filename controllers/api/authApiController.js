const { pool } = require("../../config/db");
const bcrypt = require("bcryptjs");

// ==========================================
// POST /api/auth/register
// Register a new student
// ==========================================
exports.register = async (req, res, next) => {
  try {
    const full_name = String(req.body.full_name || req.body.name || "").trim();

    const student_id = String(req.body.student_id || "").trim();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");
    const department = String(req.body.department || "").trim();

    // Validate required fields
    if (!full_name || !student_id || !email || !password || !department) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    // Validate full name
    if (full_name.length < 2 || full_name.length > 120) {
      return res.status(400).json({
        success: false,
        message: "Full name must be between 2 and 120 characters.",
      });
    }

    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    // Validate password
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long.",
      });
    }

    // Check existing email or student ID
    const existingUser = await pool.query(
      `SELECT id FROM users
       WHERE email = $1 OR student_id = $2
       LIMIT 1`,
      [email, student_id],
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email or student ID is already registered.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert student into database
    const result = await pool.query(
      `INSERT INTO users
        (full_name, email, password, role, student_id, department)
       VALUES ($1, $2, $3, 'student', $4, $5)
       RETURNING id, full_name, email, role, student_id, department, created_at`,
      [full_name, email, hashedPassword, student_id, department],
    );

    return res.status(201).json({
      success: true,
      message: "Student registered successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Email or student ID is already registered.",
      });
    }

    next(error);
  }
};

// ==========================================
// POST /api/auth/login
// Login an existing user
// ==========================================
exports.login = async (req, res, next) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Find active user
    const result = await pool.query(
      `SELECT id, full_name, email, password, role
       FROM users
       WHERE email = $1 AND is_active = TRUE
       LIMIT 1`,
      [email],
    );

    const user = result.rows[0];

    // Check whether user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Compare entered password with hashed password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Regenerate session after successful login
    req.session.regenerate((error) => {
      if (error) return next(error);

      // Store user details in session
      req.session.user = {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
      };

      // Save session
      req.session.save((saveError) => {
        if (saveError) return next(saveError);

        return res.status(200).json({
          success: true,
          message: "Login successful.",
          data: {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
          },
        });
      });
    });
  } catch (error) {
    next(error);
  }
};
