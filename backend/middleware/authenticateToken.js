const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

function authenticateToken(req, res, next) {
  const token = req.cookies.jwt;

  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Access denied. Invalid token." });
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;