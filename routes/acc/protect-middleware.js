const jwt = require("jsonwebtoken");

function authen(req, res, next) {
  if (!req.headers["authorization"]) {
    return res.status(400).json("Access Denied. Authorization header is required!");
  }

  const token = req.headers["authorization"].split(" ")[1];
  if (!token) {
    return res.status(400).json("Access Denied. Check your Authorization header format! (Bearer token)");
  }

  try {
    const verified = jwt.verify(token, process.env.TOKEN_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json(err);
  }
}

function author(role) {
  return function (req, res, next) {
    if (req.user.role !== role) return res.status(403).json("Forbidden!");
    next();
  };
}

module.exports = { authen, author };
