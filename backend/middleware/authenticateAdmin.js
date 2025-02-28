const jwt = require("jsonwebtoken");
const User = require("../models/User");
const JWT_SECRET = process.env.JWT_SECRET;

function authenticateAdmin(req, res, next) {
  const token = req.cookies.jwt;

  if (!token) return res.status(401).send("Access denied. No token provided.");

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) return res.status(403).send("Access denied. Invalid token.");

    const adminUser = await User.findById(user.id);
    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).send("Access denied. Not an admin.");
    }

    req.user = adminUser;
    next();
  });
}

module.exports = authenticateAdmin;