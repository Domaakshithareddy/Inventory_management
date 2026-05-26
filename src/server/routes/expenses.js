const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { start, end } = req.query; // new: ?start=2025-01-01&end=2025-03-31
  const { role, godown_id } = req.user;

  let query = `
    SELECT e.*, g.name as godown_name 
    FROM expenses e 
    JOIN godowns g ON e.godown_id = g.id
    WHERE 1=1
  `;
  const params = [];

  // Godown role filter (existing)
  if (role === 'godown') {
    query += ` AND e.godown_id = $${params.length + 1}`;
    params.push(godown_id);
  }

  // Date range filter (new)
  if (start) {
    query += ` AND e.expense_date >= $${params.length + 1}`;
    params.push(start);
  }
  if (end) {
    query += ` AND e.expense_date <= $${params.length + 1}`;
    params.push(end);
  }

  query += ` ORDER BY e.expense_date DESC`;

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

router.post('/', auth, async (req, res) => {
  const { type, amount, notes, expense_date } = req.body;
  const godown_id = req.user.godown_id;

  try {
    const result = await pool.query(
      `INSERT INTO expenses (godown_id, type, amount, notes, expense_date) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [godown_id, type, amount, notes, expense_date]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  const { type, amount, notes, expense_date } = req.body;

  try {
    const result = await pool.query(
      `UPDATE expenses 
       SET type=$1, amount=$2, notes=$3, expense_date=$4 
       WHERE id=$5 RETURNING *`,
      [type, amount, notes, expense_date, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM expenses WHERE id=$1`, [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;