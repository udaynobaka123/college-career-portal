const router = require("express").Router();

const studentController = require("../controllers/api/studentApiController");
const { requireApiStudent } = require("../middleware/apiAuth");

console.log("========== API DIAGNOSTIC ==========");
console.log("Student controller:", studentController);
console.log("getProfile:", typeof studentController.getProfile);
console.log("updateProfile:", typeof studentController.updateProfile);
console.log("requireApiStudent:", typeof requireApiStudent);
console.log("====================================");

// Student profile APIs
router.get("/student/profile", requireApiStudent, studentController.getProfile);

router.put(
  "/student/profile",
  requireApiStudent,
  studentController.updateProfile,
);

module.exports = router;
