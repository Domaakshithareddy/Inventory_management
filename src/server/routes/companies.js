const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const apicache = require('apicache');

router.get('/', auth, async (req, res) => {
  const result = await pool.query(`
    SELECT c.*, 
      COALESCE(c.outstanding_balance, 0) as outstanding_balance,
      COUNT(pu.id) as total_purchases,
      COALESCE(SUM(pu.total_amount), 0) as total_purchased
    FROM companies c
    LEFT JOIN purchases pu ON pu.company_id = c.id
    GROUP BY c.id
    ORDER BY c.name
  `);
  res.json(result.rows);
});

router.post('/', auth, async (req, res) => {
  const { name, phone, address } = req.body;
  const result = await pool.query(
    `INSERT INTO companies (name, phone, address) VALUES ($1,$2,$3) RETURNING *`,
    [name, phone, address]
  );
  apicache.clear();
  res.json(result.rows[0]);
});

router.put('/:id', auth, async (req, res) => {
  const { name, phone, address } = req.body;
  const result = await pool.query(
    `UPDATE companies SET name=$1, phone=$2, address=$3 WHERE id=$4 RETURNING *`,
    [name, phone, address, req.params.id]
  );
  apicache.clear();
  res.json(result.rows[0]);
});

router.delete('/:id', auth, async (req, res) => {
  await pool.query(`DELETE FROM companies WHERE id=$1`, [req.params.id]);
  apicache.clear();
  res.json({ message: 'Deleted' });
});

module.exports = router;