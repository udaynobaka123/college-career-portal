const Opportunity = require("../../models/opportunityModel");

// GET /api/opportunities
// Retrieve all approved opportunities
exports.getAllOpportunities = async (req, res, next) => {
  try {
    const search = String(req.query.search || "").trim();
    const type = String(req.query.type || "").trim();
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);

    // Validate search length
    if (search.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Search must not exceed 100 characters.",
      });
    }

    // Validate opportunity type
    const allowedTypes = [
      "internship",
      "job",
      "part-time",
      "graduate-trainee",
      "contract",
    ];

    if (type && !allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid opportunity type.",
        allowedTypes,
      });
    }

    // Validate pagination
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 50
    ) {
      return res.status(400).json({
        success: false,
        message: "Page must be positive and limit must be between 1 and 50.",
      });
    }

    const opportunities = await Opportunity.list({
      search,
      type,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      count: opportunities.length,
      pagination: {
        page,
        limit,
      },
      data: opportunities,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/opportunities/:id
// Retrieve one approved opportunity
exports.getOpportunityById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    // Validate opportunity ID
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid opportunity ID.",
      });
    }

    const opportunity = await Opportunity.findPublishedById(id);

    // Check whether opportunity exists
    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: "Opportunity not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: opportunity,
    });
  } catch (error) {
    next(error);
  }
};
