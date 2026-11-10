const r = require("express").Router(),
  c = require("../controllers/authController"),
  { registerRules, loginRules } = require("../middleware/validators");
r.get("/login", c.loginPage);
r.post("/login", loginRules, c.login);
r.get("/register", c.registerPage);
r.post("/register", registerRules, c.register);
r.post("/logout", c.logout);
module.exports = r;
