const db = require("../config/db"),
  path = require("path"),
  fs = require("fs"),
  multer = require("multer");
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/resumes"),
  filename: (req, file, cb) =>
    cb(
      null,
      `${req.session.user.id}-${Date.now()}${path.extname(file.originalname)}`,
    ),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, f, cb) =>
    cb(
      null,
      f.mimetype === "application/pdf" &&
        path.extname(f.originalname).toLowerCase() === ".pdf",
    ),
}).single("resume");
exports.dashboard = async (req, res) => {
  const r = await db.query(
    "SELECT count(*) total,count(*) FILTER(WHERE status='Submitted') pending,count(*) FILTER(WHERE status='Shortlisted') shortlisted FROM applications WHERE student_id=(SELECT id FROM students WHERE user_id=$1)",
    [req.session.user.id],
  );
  res.render("student/dashboard", { stats: r.rows[0] });
};
exports.apply = (req, res) =>
  upload(req, res, async (err) => {
    if (err || !req.file) {
      req.flash("error", "Please upload a valid PDF resume (max 5 MB).");
      return res.redirect("/opportunities/" + req.params.id);
    }
    try {
      const s = await db.query("SELECT id FROM students WHERE user_id=$1", [
        req.session.user.id,
      ]);
      await db.query(
        "INSERT INTO applications(student_id,opportunity_id,cover_letter,resume_path) VALUES($1,$2,$3,$4)",
        [s.rows[0].id, req.params.id, req.body.cover_letter, req.file.filename],
      );
      req.flash("success", "Application submitted.");
      res.redirect("/student/applications");
    } catch (e) {
      fs.unlinkSync(req.file.path);
      req.flash(
        "error",
        e.code === "23505"
          ? "You have already applied."
          : "Application could not be submitted.",
      );
      res.redirect("/opportunities/" + req.params.id);
    }
  });
exports.list = async (req, res) => {
  const r = await db.query(
    "SELECT a.*,o.title,o.deadline,org.name organization FROM applications a JOIN students s ON s.id=a.student_id JOIN opportunities o ON o.id=a.opportunity_id JOIN organizations org ON org.id=o.organization_id WHERE s.user_id=$1 ORDER BY a.created_at DESC",
    [req.session.user.id],
  );
  res.render("student/applications", { applications: r.rows });
};
exports.withdraw = async (req, res) => {
  await db.query(
    "UPDATE applications SET status='Withdrawn' WHERE id=$1 AND student_id=(SELECT id FROM students WHERE user_id=$2) AND status IN ('Submitted','Under Review')",
    [req.params.id, req.session.user.id],
  );
  res.redirect("/student/applications");
};
exports.save = async (req, res) => {
  try {
    const s = await db.query("SELECT id FROM students WHERE user_id=$1", [
      req.session.user.id,
    ]);
    await db.query(
      "INSERT INTO saved_opportunities(student_id,opportunity_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [s.rows[0].id, req.params.id],
    );
    req.flash("success", "Opportunity saved.");
  } catch (e) {}
  res.redirect("/opportunities/" + req.params.id);
};
