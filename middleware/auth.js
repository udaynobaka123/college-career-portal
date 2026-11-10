exports.requireAuth = (req, res, next) =>
  req.session.user
    ? next()
    : (req.flash("error", "Please sign in to continue."),
      res.redirect("/auth/login"));
exports.requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.session.user) return res.redirect("/auth/login");
    if (!roles.includes(req.session.user.role))
      return res
        .status(403)
        .render("public/error", {
          title: "Access denied",
          message: "You do not have permission to access this page.",
        });
    next();
  };
