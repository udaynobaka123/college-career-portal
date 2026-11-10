const { pool } = require("../config/db");
const Opportunity = require("../models/opportunityModel");

// Employer dashboard
exports.dashboard = async (req, res, next) => {
  try {
    const employerId = req.session.user.id;

    // Get opportunities posted by this employer
    const result = await pool.query(
      `
        SELECT *
        FROM opportunities
        WHERE employer_id = $1
        ORDER BY created_at DESC
      `,
      [employerId],
    );

    const opportunities = result.rows;

    res.render("employer/dashboard", {
      title: "Employer dashboard",
      organization: req.session.user,
      opportunities,
    });
  } catch (error) {
    next(error);
  }
};

// Create a new opportunity
exports.create = async (req, res, next) => {
  try {
    const employer = req.session.user;

    await Opportunity.create({
      employer_id: employer.id,
      title: req.body.title,
      company_name: employer.company_name || employer.full_name,
      description: req.body.description,
      requirements: req.body.requirements,
      opportunity_type: req.body.opportunity_type,
      location: req.body.location,
      salary: req.body.salary,
      application_deadline: req.body.application_deadline || null,
      status: "pending",
    });

    req.flash(
      "success",
      "Opportunity submitted successfully. Waiting for college approval.",
    );

    res.redirect("/employer");
  } catch (error) {
    next(error);
  }
};
