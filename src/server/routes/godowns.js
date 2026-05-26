const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Get all godowns
router.get('/', auth, async (req, res) => {
  const result = await pool.query(`SELECT * FROM godowns ORDER BY created_at`);
  res.json(result.rows);
});

// Create godown
router.post('/', auth, async (req, res) => {
  const { name, location } = req.body;
  const result = await pool.query(
    `INSERT INTO godowns (name, location) VALUES ($1, $2) RETURNING *`,
    [name, location]
  );
  res.json(result.rows[0]);
});

module.exports = router;