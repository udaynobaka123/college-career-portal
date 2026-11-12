const { pool } = require("../config/db");

// ==========================================
// STUDENT DASHBOARD
// GET /student
// ==========================================
exports.dashboard = async (req, res, next) => {
  try {
    const studentId = req.session.user.id;

    const [applications, saved, opportunities] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status = 'pending') AS submitted,
           COUNT(*) FILTER (WHERE status = 'shortlisted') AS shortlisted
         FROM applications
         WHERE student_id = $1`,
        [studentId],
      ),

      pool.query(
        `SELECT COUNT(*) AS total
         FROM saved_opportunities
         WHERE student_id = $1`,
        [studentId],
      ),

      pool.query(
        `SELECT COUNT(*) AS total
         FROM opportunities
         WHERE status = 'approved'
         AND (
           application_deadline IS NULL
           OR application_deadline >= CURRENT_DATE
         )`,
      ),
    ]);

    const student = req.session.user;

    res.render("student/dashboard", {
      user: {
        ...student,
        name: student.name || student.full_name,
      },

      stats: {
        total: Number(applications.rows[0].total),
        submitted: Number(applications.rows[0].submitted),
        shortlisted: Number(applications.rows[0].shortlisted),
      },

      saved: Number(saved.rows[0].total),
      opportunityCount: Number(opportunities.rows[0].total),
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// APPLICATION PAGE
// GET /student/apply/:id
// ==========================================
exports.applyPage = async (req, res, next) => {
  try {
    const opportunityId = req.params.id;

    const result = await pool.query(
      `SELECT *
       FROM opportunities
       WHERE id = $1
       AND status = 'approved'
       AND (
         application_deadline IS NULL
         OR application_deadline >= CURRENT_DATE
       )`,
      [opportunityId],
    );

    if (result.rows.length === 0) {
      req.flash(
        "error",
        "Opportunity not found or application deadline has passed.",
      );
      return res.redirect("/opportunities");
    }

    res.render("student/apply", {
      opportunity: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SUBMIT APPLICATION
// POST /student/apply
// ==========================================
exports.apply = async (req, res, next) => {
  try {
    const studentId = req.session.user.id;
    const { opportunity_id, cover_letter } = req.body;

    if (!opportunity_id) {
      req.flash("error", "Please select an opportunity.");
      return res.redirect("/opportunities");
    }

    const opportunity = await pool.query(
      `SELECT id
       FROM opportunities
       WHERE id = $1
       AND status = 'approved'
       AND (
         application_deadline IS NULL
         OR application_deadline >= CURRENT_DATE
       )`,
      [opportunity_id],
    );

    if (opportunity.rows.length === 0) {
      req.flash("error", "This opportunity is no longer available.");
      return res.redirect("/opportunities");
    }

    const resumePath = req.files?.resume?.[0]?.filename || null;

    const existing = await pool.query(
      `SELECT id
       FROM applications
       WHERE student_id = $1
       AND opportunity_id = $2`,
      [studentId, opportunity_id],
    );

    if (existing.rows.length > 0) {
      req.flash("error", "You have already applied for this opportunity.");
      return res.redirect("/student/applications");
    }

    await pool.query(
      `INSERT INTO applications
       (student_id, opportunity_id, resume_path, cover_letter)
       VALUES ($1, $2, $3, $4)`,
      [studentId, opportunity_id, resumePath, cover_letter || null],
    );

    req.flash("success", "Your application was submitted successfully.");
    res.redirect("/student/applications");
  } catch (error) {
    next(error);
  }
};

// ==========================================
// VIEW APPLICATIONS
// GET /student/applications
// ==========================================
exports.applications = async (req, res, next) => {
  try {
    const studentId = req.session.user.id;

    const result = await pool.query(
      `SELECT
         a.*,
         o.title,
         o.company_name,
         o.location,
         o.opportunity_type,
         o.application_deadline
       FROM applications a
       JOIN opportunities o ON o.id = a.opportunity_id
       WHERE a.student_id = $1
       ORDER BY a.applied_at DESC`,
      [studentId],
    );

    res.render("student/applications", {
      applications: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// WITHDRAW APPLICATION
// POST /student/applications/:id/withdraw
// ==========================================
exports.withdraw = async (req, res, next) => {
  try {
    const studentId = req.session.user.id;
    const applicationId = req.params.id;

    const result = await pool.query(
      `UPDATE applications
       SET status = 'withdrawn',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       AND student_id = $2
       AND status IN ('pending', 'reviewed')
       RETURNING id`,
      [applicationId, studentId],
    );

    if (result.rows.length === 0) {
      req.flash("error", "Application could not be withdrawn.");
    } else {
      req.flash("success", "Application withdrawn successfully.");
    }

    res.redirect("/student/applications");
  } catch (error) {
    next(error);
  }
};

// ==========================================
// VIEW SAVED OPPORTUNITIES
// GET /student/saved
// ==========================================
exports.saved = async (req, res, next) => {
  try {
    const studentId = req.session.user.id;

    const result = await pool.query(
      `SELECT
         o.*,
         so.created_at AS saved_at
       FROM saved_opportunities so
       JOIN opportunities o ON o.id = so.opportunity_id
       WHERE so.student_id = $1
       ORDER BY so.created_at DESC`,
      [studentId],
    );

    res.render("student/saved", {
      opportunities: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SAVE OPPORTUNITY
// POST /student/saved/:id
// ==========================================
exports.save = async (req, res, next) => {
  try {
    const studentId = req.session.user.id;
    const opportunityId = req.params.id;

    const opportunity = await pool.query(
      `SELECT id
       FROM opportunities
       WHERE id = $1
       AND status = 'approved'`,
      [opportunityId],
    );

    if (opportunity.rows.length === 0) {
      req.flash("error", "Opportunity not found.");
      return res.redirect(req.get("Referrer") || "/opportunities");
    }

    await pool.query(
      `INSERT INTO saved_opportunities (student_id, opportunity_id)
       VALUES ($1, $2)
       ON CONFLICT (student_id, opportunity_id) DO NOTHING`,
      [studentId, opportunityId],
    );

    req.flash("success", "Opportunity saved successfully.");
    res.redirect(req.get("Referrer") || "/opportunities");
  } catch (error) {
    next(error);
  }
};

// ==========================================
// REMOVE SAVED OPPORTUNITY
// POST /student/saved/:id/remove
// ==========================================
exports.unsave = async (req, res, next) => {
  try {
    const studentId = req.session.user.id;
    const opportunityId = req.params.id;

    await pool.query(
      `DELETE FROM saved_opportunities
       WHERE student_id = $1
       AND opportunity_id = $2`,
      [studentId, opportunityId],
    );

    req.flash("success", "Saved opportunity removed.");
    res.redirect(req.get("Referrer") || "/student/saved");
  } catch (error) {
    next(error);
  }
};

// ==========================================
// VIEW STUDENT PROFILE
// GET /student/profile
// ==========================================
exports.profile = async (req, res, next) => {
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
       AND role = 'student'`,
      [studentId],
    );

    if (result.rows.length === 0) {
      req.flash("error", "Student profile not found.");
      return res.redirect("/");
    }

    res.render("student/profile", {
      student: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// UPDATE STUDENT PROFILE
// POST /student/profile
// ==========================================
exports.updateProfile = async (req, res, next) => {
  try {
    const studentId = req.session.user.id;

    const fullName = String(req.body.full_name || "").trim();
    const department = String(req.body.department || "").trim();
    const phone = String(req.body.phone || "").trim();

    if (!fullName || !department) {
      req.flash("error", "Full name and department are required.");
      return res.redirect("/student/profile");
    }

    if (fullName.length < 2 || fullName.length > 120) {
      req.flash("error", "Full name must be between 2 and 120 characters.");
      return res.redirect("/student/profile");
    }

    await pool.query(
      `UPDATE users
       SET full_name = $1,
           department = $2,
           phone = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       AND role = 'student'`,
      [fullName, department, phone || null, studentId],
    );

    req.session.user.name = fullName;
    req.session.user.full_name = fullName;

    req.flash("success", "Profile updated successfully.");
    res.redirect("/student/profile");
  } catch (error) {
    next(error);
  }
};
