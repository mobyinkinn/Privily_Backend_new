//refereshtoken.js
const jwt = require("jsonwebtoken");

const generateRefreshToken = (id, expiresIn = '300d') => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn});
};

module.exports = { generateRefreshToken };
