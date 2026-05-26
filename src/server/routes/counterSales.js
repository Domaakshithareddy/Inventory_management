const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET ALL
router.get('/', auth, async (req, res) => {
  const { role, godown_id } = req.user;
  let query = `
    SELECT cs.*, p.name as product_name, p.bottles_per_case, g.name as godown_name
    FROM counter_sales cs 
    JOIN products p ON cs.product_id = p.id
    LEFT JOIN godowns g ON cs.godown_id = g.id
  `;
  const params = [];
  if (role !== 'admin') {
    query += ` WHERE cs.godown_id = $1`;
    params.push(godown_id);
  }
  query += ` ORDER BY cs.created_at DESC`;
  const result = await pool.query(query, params);
  res.json(result.rows);
});

// POST
router.post('/', auth, async (req, res) => {
  const { product_id, quantity_units, price_per_unit, payment_mode } = req.body;
  const godown_id = req.user.godown_id || req.body.godown_id;
  if (!godown_id) return res.status(400).json({ error: 'Godown required' });
  const total_amount = parseFloat(quantity_units) * parseFloat(price_per_unit);
  const mode = payment_mode === 'ONLINE' ? 'ONLINE' : 'CASH';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO counter_sales (godown_id, product_id, quantity_units, price_per_unit, total_amount, payment_mode)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [godown_id, product_id, quantity_units, price_per_unit, total_amount, mode]
    );

    const inv = await client.query(
      `SELECT quantity_cases, quantity_units FROM inventory WHERE godown_id=$1 AND product_id=$2`,
      [godown_id, product_id]
    );
    if (!inv.rows[0]) throw new Error('No inventory found for this product');

    const bpc = (await client.query(
      `SELECT bottles_per_case FROM products WHERE id=$1`, [product_id]
    )).rows[0];

    const bottles_per_case = parseInt(bpc.bottles_per_case);
    let totalBottles = (parseInt(inv.rows[0].quantity_cases) * bottles_per_case) + parseInt(inv.rows[0].quantity_units || 0);

    if (totalBottles < parseInt(quantity_units)) throw new Error(`Insufficient stock. Available: ${totalBottles} bottles`);

    totalBottles -= parseInt(quantity_units);
    await client.query(
      `UPDATE inventory SET quantity_cases=$1, quantity_units=$2 WHERE godown_id=$3 AND product_id=$4`,
      [Math.floor(totalBottles / bottles_per_case), totalBottles % bottles_per_case, godown_id, product_id]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT - Edit
router.put('/:id', auth, async (req, res) => {
  const { product_id, quantity_units, price_per_unit, payment_mode } = req.body;
  const godown_id = req.user.godown_id || req.body.godown_id;
  if (!godown_id) return res.status(400).json({ error: 'Godown required' });
  const mode = payment_mode === 'ONLINE' ? 'ONLINE' : 'CASH';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const original = await client.query(`SELECT * FROM counter_sales WHERE id=$1`, [req.params.id]);
    if (!original.rows[0]) throw new Error('Sale not found');

    const orig = original.rows[0];
    const bpcRes = await client.query(`SELECT bottles_per_case FROM products WHERE id=$1`, [product_id]);
    const bottles_per_case = parseInt(bpcRes.rows[0].bottles_per_case);

    // Restore original inventory
    const inv = await client.query(
      `SELECT quantity_cases, quantity_units FROM inventory WHERE godown_id=$1 AND product_id=$2`,
      [godown_id, orig.product_id]
    );
    if (inv.rows[0]) {
      const bpcOrig = (await client.query(`SELECT bottles_per_case FROM products WHERE id=$1`, [orig.product_id])).rows[0];
      const bpcOrigVal = parseInt(bpcOrig.bottles_per_case);
      const restoredBottles = (parseInt(inv.rows[0].quantity_cases) * bpcOrigVal) + parseInt(inv.rows[0].quantity_units || 0) + parseInt(orig.quantity_units);
      await client.query(
        `UPDATE inventory SET quantity_cases=$1, quantity_units=$2 WHERE godown_id=$3 AND product_id=$4`,
        [Math.floor(restoredBottles / bpcOrigVal), restoredBottles % bpcOrigVal, godown_id, orig.product_id]
      );
    }

    // Deduct new inventory
    const newInv = await client.query(
      `SELECT quantity_cases, quantity_units FROM inventory WHERE godown_id=$1 AND product_id=$2`,
      [godown_id, product_id]
    );
    if (!newInv.rows[0]) throw new Error('No inventory found for new product');

    let newTotal = (parseInt(newInv.rows[0].quantity_cases) * bottles_per_case) + parseInt(newInv.rows[0].quantity_units || 0);
    if (newTotal < parseInt(quantity_units)) throw new Error(`Insufficient stock. Available: ${newTotal} bottles`);

    newTotal -= parseInt(quantity_units);
    await client.query(
      `UPDATE inventory SET quantity_cases=$1, quantity_units=$2 WHERE godown_id=$3 AND product_id=$4`,
      [Math.floor(newTotal / bottles_per_case), newTotal % bottles_per_case, godown_id, product_id]
    );

    const total_amount = parseFloat(quantity_units) * parseFloat(price_per_unit);
    const result = await client.query(
      `UPDATE counter_sales SET product_id=$1, quantity_units=$2, price_per_unit=$3, total_amount=$4, payment_mode=$5 WHERE id=$6 RETURNING *`,
      [product_id, quantity_units, price_per_unit, total_amount, mode, req.params.id]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE
router.delete('/:id', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sale = await client.query(`SELECT * FROM counter_sales WHERE id=$1`, [req.params.id]);
    if (!sale.rows[0]) return res.status(404).json({ error: 'Sale not found' });

    const { godown_id, product_id, quantity_units } = sale.rows[0];
    const prod = await client.query(`SELECT bottles_per_case FROM products WHERE id=$1`, [product_id]);
    const bpc = parseInt(prod.rows[0]?.bottles_per_case || 24);

    const inv = await client.query(
      `SELECT quantity_cases, quantity_units FROM inventory WHERE godown_id=$1 AND product_id=$2`,
      [godown_id, product_id]
    );
    if (inv.rows[0]) {
      const currentBottles = (parseInt(inv.rows[0].quantity_cases) * bpc) + parseInt(inv.rows[0].quantity_units || 0);
      const newTotal = currentBottles + parseInt(quantity_units);
      await client.query(
        `UPDATE inventory SET quantity_cases=$1, quantity_units=$2 WHERE godown_id=$3 AND product_id=$4`,
        [Math.floor(newTotal / bpc), newTotal % bpc, godown_id, product_id]
      );
    }

    await client.query(`DELETE FROM counter_sales WHERE id=$1`, [req.params.id]);
    await client.query('COMMIT');
    res.json({ message: 'Deleted and inventory restored' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;