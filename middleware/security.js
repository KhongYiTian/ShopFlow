const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

// Validation rules for registration & login
const userValidationRules = () => [
  body('username').trim().isLength({ min: 4 }).escape().withMessage('Username must be at least 4 chars long.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.')
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(400).json({ errors: errors.array() });
};

// Password Hashing Helper
async function hashPassword(plainTextPassword) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plainTextPassword, salt);
}

// Secure Login Route Handler using Parameterized Queries
const handleSecureLogin = async (req, res, db) => {
  const { username, password } = req.body;
  try {
    // SQL Injection safe parameterized query
    const [users] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
    if (!users.length) return res.status(401).json({ error: "Invalid credentials" });

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    res.json({ message: "Login successful", user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { userValidationRules, validate, hashPassword, handleSecureLogin };