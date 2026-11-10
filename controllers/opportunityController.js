const db = require("../config/db");
exports.home = async (req, res) => {
  const [featured, stats, ann] = await Promise.all([
    db.query(
      "SELECT o.*,org.name organization FROM opportunities o JOIN organizations org ON org.id=o.organization_id WHERE o.status='published' AND o.deadline>=CURRENT_DATE ORDER BY o.created_at DESC LIMIT 6",
    ),
    db.query(
      "SELECT (SELECT count(*) FROM opportunities WHERE status='published') opportunities,(SELECT count(*) FROM students) students",
    ),
    db.query(
      "SELECT * FROM announcements WHERE published=true ORDER BY created_at DESC LIMIT 3",
    ),
  ]);
  res.render("public/home", {
    featured: featured.rows,
    stats: stats.rows[0],
    announcements: ann.rows,
  });
};
exports.list = async (req, res) => {
  const { q = "", type = "", location = "" } = req.query;
  const vals = [],
    w = ["o.status='published'", "o.deadline>=CURRENT_DATE"];
  if (q) {
    vals.push("%" + q + "%");
    w.push(
      `(o.title ILIKE $${vals.length} OR o.description ILIKE $${vals.length} OR org.name ILIKE $${vals.length})`,
    );
  }
  if (type) {
    vals.push(type);
    w.push(`o.type=$${vals.length}`);
  }
  if (location) {
    vals.push("%" + location + "%");
    w.push(`o.location ILIKE $${vals.length}`);
  }
  const r = await db.query(
    `SELECT o.*,org.name organization FROM opportunities o JOIN organizations org ON org.id=o.organization_id WHERE ${w.join(" AND ")} ORDER BY o.created_at DESC`,
    vals,
  );
  res.render("public/opportunities", {
    opportunities: r.rows,
    filters: req.query,
  });
};
exports.detail = async (req, res) => {
  const r = await db.query(
    "SELECT o.*,org.name organization,org.logo_url,org.website FROM opportunities o JOIN organizations org ON org.id=o.organization_id WHERE o.id=$1 AND o.status='published'",
    [req.params.id],
  );
  if (!r.rows[0])
    return res
      .status(404)
      .render("error", { message: "Opportunity not found" });
  res.render("public/detail", { opportunity: r.rows[0] });
};
exports.contact = async (req, res) => {
  const { name, email, subject, message } = req.body;
  await db.query(
    "INSERT INTO contact_messages(name,email,subject,message) VALUES($1,$2,$3,$4)",
    [name, email, subject, message],
  );
  req.flash("success", "Message sent to Career Services.");
  res.redirect("/contact");
};
