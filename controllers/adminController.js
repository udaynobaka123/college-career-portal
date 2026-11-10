const { pool } = require("../config/db");

// ========================================
// ADMIN DASHBOARD
// ========================================
exports.dashboard = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'student') AS students,
        (SELECT COUNT(*) FROM users WHERE role = 'employer') AS organizations,
        (SELECT COUNT(*) FROM opportunities) AS opportunities,
        (SELECT COUNT(*) FROM opportunities
          WHERE opportunity_type = 'internship') AS internships,
        (SELECT COUNT(*) FROM opportunities
          WHERE opportunity_type = 'job') AS jobs,
        (SELECT COUNT(*) FROM applications) AS applications,
        (SELECT COUNT(*) FROM opportunities
          WHERE status = 'pending') AS pending
    `);

    res.render("admin/dashboard", {
      title: "Admin dashboard",
      stats: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// MANAGE OPPORTUNITIES
// ========================================
exports.opportunities = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        o.*,
        u.full_name AS employer_name
      FROM opportunities o
      LEFT JOIN users u ON u.id = o.employer_id
      ORDER BY o.created_at DESC
    `);

    res.render("admin/opportunities", {
      title: "Manage opportunities",
      opportunities: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

// New opportunity form
exports.newOpportunity = (req, res) => {
  res.render("admin/opportunity-form", {
    title: "Create opportunity",
    opportunity: {},
  });
};

// Create opportunity

exports.createOpportunity = async (req, res, next) => {
  try {
    console.log("FORM DATA RECEIVED:", req.body);
    const {
      title,
      company_name,
      description,
      requirements,
      type,
      opportunity_type,
      location,
      salary,
      application_deadline,
    } = req.body;

    // Check required fields
    if (!title || !company_name || !description) {
      req.flash(
        "error",
        "Please provide the opportunity title, company name and description.",
      );
      return res.redirect("/admin/opportunities/new");
    }

    // Insert opportunity into database
    await pool.query(
      `
        INSERT INTO opportunities (
          employer_id,
          title,
          company_name,
          description,
          requirements,
          opportunity_type,
          location,
          salary,
          application_deadline,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        null,
        title.trim(),
        company_name.trim(),
        description,
        requirements || null,
        (opportunity_type || type || "").toLowerCase(),
        location || null,
        salary || null,
        application_deadline || null,
        "approved",
      ],
    );

    req.flash("success", "Opportunity created successfully.");
    res.redirect("/admin/opportunities");
  } catch (error) {
    next(error);
  }
};

// Update opportunity status
exports.setStatus = async (req, res, next) => {
  try {
    const allowedStatuses = ["pending", "approved", "rejected", "closed"];

    const status = req.body.status;

    if (!allowedStatuses.includes(status)) {
      req.flash("error", "Invalid opportunity status.");
      return res.redirect("/admin/opportunities");
    }

    await pool.query(
      `UPDATE opportunities
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [status, req.params.id],
    );

    req.flash("success", "Opportunity status updated.");
    res.redirect("/admin/opportunities");
  } catch (error) {
    next(error);
  }
};

// ========================================
// MANAGE STUDENTS
// ========================================
exports.students = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        full_name,
        email,
        is_active,
        student_id,
        department,
        created_at
      FROM users
      WHERE role = 'student'
      ORDER BY created_at DESC
    `);

    res.render("admin/students", {
      title: "Manage students",
      students: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

// Activate or deactivate student
exports.toggleStudent = async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE users
       SET is_active = NOT is_active,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND role = 'student'`,
      [req.params.id],
    );

    req.flash("success", "Student account status updated.");
    res.redirect("/admin/students");
  } catch (error) {
    next(error);
  }
};

// ========================================
// MANAGE EMPLOYERS
// ========================================
exports.organizations = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        full_name,
        email,
        company_name,
        company_website,
        phone,
        is_active,
        created_at
      FROM users
      WHERE role = 'employer'
      ORDER BY created_at DESC
    `);

    res.render("admin/organizations", {
      title: "Manage employers",
      organizations: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

// Employer accounts are created through employer registration
exports.addOrganization = (req, res) => {
  req.flash(
    "error",
    "Please create employer accounts through the employer registration process.",
  );
  res.redirect("/admin/organizations");
};

// ========================================
// MANAGE APPLICATIONS
// ========================================
exports.applications = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        a.*,
        u.full_name AS student_name,
        u.email AS student_email,
        u.student_id,
        o.title AS opportunity_title,
        o.company_name
      FROM applications a
      JOIN users u ON u.id = a.student_id
      JOIN opportunities o ON o.id = a.opportunity_id
      ORDER BY a.applied_at DESC
    `);

    res.render("admin/applications", {
      title: "Review applications",
      applications: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

// Update application status and notify student
exports.updateApplication = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const allowedStatuses = [
      "pending",
      "reviewed",
      "shortlisted",
      "accepted",
      "rejected",
    ];

    const status = req.body.status;

    if (!allowedStatuses.includes(status)) {
      req.flash("error", "Invalid application status.");
      return res.redirect("/admin/applications");
    }

    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE applications
       SET status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING student_id`,
      [status, req.params.id],
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      req.flash("error", "Application not found.");
      return res.redirect("/admin/applications");
    }

    const studentId = result.rows[0].student_id;

    await client.query(
      `INSERT INTO notifications (user_id, message)
       VALUES ($1, $2)`,
      [studentId, `Your application status has been updated to ${status}.`],
    );

    await client.query("COMMIT");

    req.flash("success", "Application updated and student notified.");
    res.redirect("/admin/applications");
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};
