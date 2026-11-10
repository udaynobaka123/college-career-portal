const r = require("express").Router(),
  c = require("../controllers/employerController"),
  { requireAuth, requireRole } = require("../middleware/auth");
r.use(requireAuth, requireRole("employer"));
r.get("/", c.dashboard);
r.post("/opportunities", c.create);
module.exports = r;
