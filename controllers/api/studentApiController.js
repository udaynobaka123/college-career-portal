const { pool } = require("../../config/db");

// ==========================================
// GET /api/student/profile
// Retrieve logged-in student's profile
// ==========================================
exports.getProfile = async (req, res, next) => {
  try {
    const studentId = req.session.user.id;

    const result = await pool.query(
      `SELECT
        id,
        full_name,
        email,
        student_id,
        department,
        phone,
        created_at
       FROM users
       WHERE id = $1
         AND role = 'student'
         AND is_active = TRUE
       LIMIT 1`,
      [studentId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Student profile retrieved successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// PUT /api/student/profile
// Update logged-in student's profile
// ==========================================
exports.updateProfile = async (req, res, next) => {
  try {
    const studentId = req.session.user.id;

    const full_name = String(req.body.full_name || "").trim();
    const department = String(req.body.department || "").trim();

    const phoneProvided = Object.prototype.hasOwnProperty.call(
      req.body,
      "phone",
    );

    const phone = phoneProvided ? String(req.body.phone || "").trim() : null;

    if (!full_name || !department) {
      return res.status(400).json({
        success: false,
        message: "Full name and department are required.",
      });
    }

    if (full_name.length < 2 || full_name.length > 120) {
      return res.status(400).json({
        success: false,
        message: "Full name must be between 2 and 120 characters.",
      });
    }

    if (department.length > 120) {
      return res.status(400).json({
        success: false,
        message: "Department must not exceed 120 characters.",
      });
    }

    if (phoneProvided && phone.length > 30) {
      return res.status(400).json({
        success: false,
        message: "Phone number must not exceed 30 characters.",
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET
         full_name = $1,
         phone = CASE WHEN $2 THEN $3 ELSE phone END,
         department = $4,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
         AND role = 'student'
         AND is_active = TRUE
       RETURNING
         id,
         full_name,
         email,
         student_id,
         department,
         phone,
         updated_at`,
      [
        full_name,
        phoneProvided,
        phoneProvided ? phone || null : null,
        department,
        studentId,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Student profile updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// Export both functions
module.exports = {
  getProfile: exports.getProfile,
  updateProfile: exports.updateProfile,
};
