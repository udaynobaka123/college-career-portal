// Check whether a user is logged in
exports.requireApiAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      message: "Please log in to access this resource.",
    });
  }

  next();
};

// Check whether the logged-in user is a student
exports.requireApiStudent = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      message: "Please log in to access this resource.",
    });
  }

  if (req.session.user.role !== "student") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Student account required.",
    });
  }

  next();
};
