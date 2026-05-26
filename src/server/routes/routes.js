const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    let query = `SELECT * FROM routes`;
    const params = [];
    if (req.user.role === 'godown') {
      query += ` WHERE godown_id = $1`;
      params.push(req.user.godown_id);
    }
    query += ` ORDER BY created_at DESC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  const { name } = req.body;
  const godown_id = req.user.godown_id;
  try {
    const result = await pool.query(
      `INSERT INTO routes (godown_id, name) VALUES ($1,$2) RETURNING *`,
      [godown_id, name]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      `UPDATE routes SET name=$1 WHERE id=$2 RETURNING *`,
      [name, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM routes WHERE id=$1`, [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;