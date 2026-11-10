const r = require("express").Router(),
  c = require("../controllers/publicController");
r.get("/", c.home);
r.get("/opportunities", c.list);
r.get("/opportunities/:id", c.detail);
r.get("/about", c.about);
r.get("/contact", c.contactPage);
r.post("/contact", c.contact);
module.exports = r;
