const r = require("express").Router(),
  c = require("../controllers/adminController"),
  { requireAuth, requireRole } = require("../middleware/auth");
r.use(requireAuth, requireRole("admin"));
r.get("/", c.dashboard);
r.get("/opportunities", c.opportunities);
r.get("/opportunities/new", c.newOpportunity);
r.post("/opportunities", c.createOpportunity);
r.post("/opportunities/:id/status", c.setStatus);
r.get("/students", c.students);
r.post("/students/:id/toggle", c.toggleStudent);
r.get("/organizations", c.organizations);
r.post("/organizations", c.addOrganization);
r.get("/applications", c.applications);
r.post("/applications/:id", c.updateApplication);
module.exports = r;
