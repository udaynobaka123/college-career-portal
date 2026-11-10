const { pool } = require("../config/db");
const Opportunity = require("../models/opportunityModel");

// Homepage
exports.home = async (req, res, next) => {
  try {
    // Get the latest approved opportunities
    const opportunityResult = await pool.query(`
      SELECT
        o.*,
        u.full_name AS employer_name
      FROM opportunities o
      LEFT JOIN users u ON u.id = o.employer_id
      WHERE o.status = 'approved'
        AND (
          o.application_deadline IS NULL
          OR o.application_deadline >= CURRENT_DATE
        )
      ORDER BY o.created_at DESC
      LIMIT 6
    `);

    const opportunities = opportunityResult.rows;

    // Get portal statistics
    const statsResult = await pool.query(`
      SELECT
        (
          SELECT COUNT(*)
          FROM opportunities
          WHERE status = 'approved'
        ) AS opportunities,

        (
          SELECT COUNT(*)
          FROM users
          WHERE role = 'student'
        ) AS students
    `);

    const stats = statsResult.rows[0];

    res.render("public/home", {
      title: "Find your next opportunity",
      opportunities,
      stats,
      announcements: [],
    });
  } catch (error) {
    next(error);
  }
};

// Opportunity listing
exports.list = async (req, res, next) => {
  try {
    const opportunities = await Opportunity.list({
      search: req.query.search || "",
      type: req.query.type || "",
      page: Math.max(1, Number(req.query.page) || 1),
    });

    res.render("public/opportunities", {
      title: "Opportunities",
      opportunities,
      filters: req.query,
    });
  } catch (error) {
    next(error);
  }
};

// Opportunity details
exports.detail = async (req, res, next) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);

    if (!opportunity || opportunity.status !== "approved") {
      return res.status(404).render("public/404", {
        title: "Opportunity not found",
      });
    }

    res.render("public/detail", {
      title: opportunity.title,
      opportunity,
    });
  } catch (error) {
    next(error);
  }
};

// About page
exports.about = (req, res) => {
  res.render("public/about", {
    title: "About the portal",
  });
};

// Contact page
exports.contactPage = (req, res) => {
  res.render("public/contact", {
    title: "Contact career services",
  });
};

// Contact form
exports.contact = async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    await pool.query(
      `
        INSERT INTO contact_messages (
          name,
          email,
          subject,
          message
        )
        VALUES ($1, $2, $3, $4)
      `,
      [name, email, subject, message],
    );

    req.flash("success", "Your message has been sent.");
    res.redirect("/contact");
  } catch (error) {
    next(error);
  }
};
