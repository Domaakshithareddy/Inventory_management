const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    let query = `
      SELECT fp.*, p.name as product_name, p.size, p.category,
             s.name as shop_name
      FROM free_products fp
      JOIN products p ON fp.product_id = p.id
      LEFT JOIN shops s ON fp.shop_id = s.id
    `;
    const params = [];
    if (req.user.role === 'godown') {
      query += ` WHERE fp.godown_id = $1`;
      params.push(req.user.godown_id);
    }
    query += ` ORDER BY fp.given_date DESC, fp.created_at DESC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  const { product_id, quantity_units, notes, given_date, shop_id } = req.body;
  const godown_id = req.user.godown_id;

  if (!quantity_units || quantity_units <= 0) {
    return res.status(400).json({ error: 'quantity_units must be greater than 0' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO free_products (godown_id, product_id, quantity_units, notes, given_date, shop_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [godown_id, product_id, quantity_units, notes || null, given_date || new Date(), shop_id || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  const { product_id, quantity_units, notes, given_date, shop_id } = req.body;
  try {
    const result = await pool.query(
      `UPDATE free_products SET product_id=$1, quantity_units=$2, notes=$3, given_date=$4, shop_id=$5
       WHERE id=$6 RETURNING *`,
      [product_id, quantity_units, notes || null, given_date, shop_id || null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM free_products WHERE id=$1`, [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;