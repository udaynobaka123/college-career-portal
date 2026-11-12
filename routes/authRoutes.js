const r = require("express").Router();

const c = require("../controllers/authController");

const { registerRules, loginRules } = require("../middleware/validators");

// Login
r.get("/login", c.loginPage);
r.post("/login", loginRules, c.login);

// Student registration
r.get("/register", c.registerPage);
r.post("/register", registerRules, c.register);

// Employer registration
r.get("/employer-register", c.employerRegisterPage);
r.post("/employer-register", c.employerRegister);

// Logout
r.post("/logout", c.logout);

module.exports = r;
