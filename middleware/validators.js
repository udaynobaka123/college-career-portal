const { body } = require("express-validator");
exports.registerRules = [
  body("name").trim().isLength({ min: 2, max: 120 }),
  body("student_id").trim().isLength({ min: 2, max: 40 }),
  body("email").trim().isEmail().normalizeEmail(),
  body("password").isLength({ min: 8 }),
  body("department").trim().notEmpty(),
];
exports.loginRules = [
  body("email").trim().isEmail(),
  body("password").notEmpty(),
];
