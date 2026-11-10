const { pool } = require("../config/db");

// Get published opportunities with search, filters, and pagination
exports.list = async ({ search = "", type = "", page = 1, limit = 9 } = {}) => {
  const values = [];
  const conditions = [
    "o.status = 'approved'",
    "(o.application_deadline IS NULL OR o.application_deadline >= CURRENT_DATE)",
  ];

  // Search by title, company, or description
  if (search) {
    values.push(`%${search}%`);
    const searchIndex = values.length;

    conditions.push(`
      (
        o.title ILIKE $${searchIndex}
        OR o.company_name ILIKE $${searchIndex}
        OR o.description ILIKE $${searchIndex}
      )
    `);
  }

  // Filter by job or internship
  if (type) {
    values.push(type);
    conditions.push(`o.opportunity_type = $${values.length}`);
  }

  // Pagination
  const currentPage = Math.max(Number(page) || 1, 1);
  const pageLimit = Math.max(Number(limit) || 9, 1);
  const offset = (currentPage - 1) * pageLimit;

  values.push(pageLimit);
  const limitIndex = values.length;

  values.push(offset);
  const offsetIndex = values.length;

  const sql = `
    SELECT
      o.*,
      u.full_name AS employer_name
    FROM opportunities o
    LEFT JOIN users u ON u.id = o.employer_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY o.created_at DESC
    LIMIT $${limitIndex}
    OFFSET $${offsetIndex}
  `;

  const result = await pool.query(sql, values);

  return result.rows;
};

// Find one opportunity by ID
exports.findById = async (id) => {
  const sql = `
    SELECT
      o.*,
      u.full_name AS employer_name,
      u.company_name AS employer_company,
      u.company_website AS employer_website
    FROM opportunities o
    LEFT JOIN users u ON u.id = o.employer_id
    WHERE o.id = $1
  `;

  const result = await pool.query(sql, [id]);

  return result.rows[0];
};

// Create a new job or internship
exports.create = async (data) => {
  const sql = `
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
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10
    )
    RETURNING *
  `;

  const values = [
    data.employer_id,
    data.title,
    data.company_name,
    data.description,
    data.requirements || null,
    data.opportunity_type,
    data.location || null,
    data.salary || null,
    data.application_deadline || null,
    data.status || "pending",
  ];

  const result = await pool.query(sql, values);

  return result.rows[0];
};

// Update opportunity status
exports.updateStatus = async (id, status) => {
  const sql = `
    UPDATE opportunities
    SET
      status = $1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;

  const result = await pool.query(sql, [status, id]);

  return result.rows[0];
};
