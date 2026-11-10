const r = require("express").Router(),
  c = require("../controllers/studentController"),
  { requireAuth, requireRole } = require("../middleware/auth"),
  { pdfUpload } = require("../middleware/upload");
r.use(requireAuth, requireRole("student"));
r.get("/", c.dashboard);
r.get("/apply/:id", c.applyPage);
r.post(
  "/apply",
  pdfUpload.fields([
    { name: "resume", maxCount: 1 },
    { name: "supporting", maxCount: 2 },
  ]),
  c.apply,
);
r.get("/applications", c.applications);
r.post("/applications/:id/withdraw", c.withdraw);
r.get("/saved", c.saved);
r.post("/saved/:id", c.save);
r.post("/saved/:id/remove", c.unsave);
r.get("/profile", c.profile);
r.post("/profile", c.updateProfile);
module.exports = r;
