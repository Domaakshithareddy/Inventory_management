const router = require('express').Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register - NO auth middleware here
router.post('/register', async (req, res) => {
  const { username, password, godown_id } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, godown_id) 
       VALUES ($1, $2, $3) 
       RETURNING id, username, godown_id`,
      [username, hash, godown_id || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login - NO auth middleware here
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      `SELECT * FROM users WHERE username = $1`, 
      [username]
    );
    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: 'User not found' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ error: 'Wrong password' });

    const role = user.godown_id ? 'godown' : 'admin';

    const token = jwt.sign(
      { id: user.id, username: user.username, godown_id: user.godown_id, role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, role, godown_id: user.godown_id, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;