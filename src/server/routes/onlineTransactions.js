const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET all
router.get('/', auth, async (req, res) => {
  try {
    let query = `
      SELECT ot.*, s.name as shop_name_resolved
      FROM online_transactions ot
      LEFT JOIN shops s ON ot.shop_id = s.id
    `;
    const params = [];
    if (req.user.role === 'godown') {
      query += ` WHERE ot.godown_id = $1`;
      params.push(req.user.godown_id);
    }
    query += ` ORDER BY ot.transaction_date DESC, ot.created_at DESC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper — apply payment to oldest unpaid bills for a shop
async function applyPaymentToShop(client, godown_id, shop_id, amount) {
  if (!shop_id || amount <= 0) return;

  // Get all pending/partial bills for this shop, oldest first
  const bills = await client.query(
    `SELECT * FROM bills
     WHERE godown_id = $1 AND shop_id = $2 AND status != 'CLEARED'
     ORDER BY created_at ASC`,
    [godown_id, shop_id]
  );

  let remaining = parseFloat(amount);

  for (const bill of bills.rows) {
    if (remaining <= 0) break;
    const currentPaid = parseFloat(bill.paid_amount || 0);
    const total = parseFloat(bill.total_amount);
    const currentPending = parseFloat(bill.pending_amount || 0);

    const toApply = Math.min(remaining, currentPending);
    const newPaid = Math.min(currentPaid + toApply, total);
    const newPending = Math.max(0, total - newPaid);
    const newStatus = newPaid >= total ? 'CLEARED' : newPaid > 0 ? 'PARTIAL' : 'PENDING';

    await client.query(
      `UPDATE bills SET paid_amount=$1, pending_amount=$2, status=$3 WHERE id=$4`,
      [newPaid, newPending, newStatus, bill.id]
    );

    remaining -= toApply;
  }
}

// Helper — reverse payment from bills (when editing/deleting a transaction)
async function reversePaymentFromShop(client, godown_id, shop_id, amount) {
  if (!shop_id || amount <= 0) return;

  // Get bills newest first to reverse
  const bills = await client.query(
    `SELECT * FROM bills
     WHERE godown_id = $1 AND shop_id = $2
     ORDER BY created_at DESC`,
    [godown_id, shop_id]
  );

  let remaining = parseFloat(amount);

  for (const bill of bills.rows) {
    if (remaining <= 0) break;
    const currentPaid = parseFloat(bill.paid_amount || 0);
    const total = parseFloat(bill.total_amount);

    const toReverse = Math.min(remaining, currentPaid);
    const newPaid = Math.max(0, currentPaid - toReverse);
    const newPending = Math.max(0, total - newPaid);
    const newStatus = newPaid >= total ? 'CLEARED' : newPaid > 0 ? 'PARTIAL' : 'PENDING';

    await client.query(
      `UPDATE bills SET paid_amount=$1, pending_amount=$2, status=$3 WHERE id=$4`,
      [newPaid, newPending, newStatus, bill.id]
    );

    remaining -= toReverse;
  }
}

// POST
router.post('/', auth, async (req, res) => {
  const { shop_id, is_counter_sale, amount, transaction_date, notes } = req.body;
  const godown_id = req.user.godown_id;

  if (!amount || parseFloat(amount) <= 0)
    return res.status(400).json({ error: 'Amount is required' });
  if (!is_counter_sale && !shop_id)
    return res.status(400).json({ error: 'Shop is required unless counter sale' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO online_transactions (godown_id, shop_id, is_counter_sale, amount, transaction_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        godown_id,
        is_counter_sale ? null : shop_id,
        is_counter_sale ? true : false,
        parseFloat(amount),
        transaction_date,
        notes || null
      ]
    );

    // Auto-apply to bills only for shop payments
    if (!is_counter_sale && shop_id) {
      await applyPaymentToShop(client, godown_id, shop_id, parseFloat(amount));
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT
router.put('/:id', auth, async (req, res) => {
  const { shop_id, is_counter_sale, amount, transaction_date, notes } = req.body;
  const godown_id = req.user.godown_id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get old transaction to reverse its effect
    const old = await client.query(`SELECT * FROM online_transactions WHERE id=$1`, [req.params.id]);
    if (!old.rows[0]) return res.status(404).json({ error: 'Not found' });
    const oldTx = old.rows[0];

    // Reverse old payment
    if (!oldTx.is_counter_sale && oldTx.shop_id) {
      await reversePaymentFromShop(client, godown_id, oldTx.shop_id, parseFloat(oldTx.amount));
    }

    // Save updated transaction
    const result = await client.query(
      `UPDATE online_transactions
       SET shop_id=$1, is_counter_sale=$2, amount=$3, transaction_date=$4, notes=$5
       WHERE id=$6 RETURNING *`,
      [
        is_counter_sale ? null : shop_id,
        is_counter_sale ? true : false,
        parseFloat(amount),
        transaction_date,
        notes || null,
        req.params.id
      ]
    );

    // Apply new payment
    if (!is_counter_sale && shop_id) {
      await applyPaymentToShop(client, godown_id, shop_id, parseFloat(amount));
    }

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
  const godown_id = req.user.godown_id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const old = await client.query(`SELECT * FROM online_transactions WHERE id=$1`, [req.params.id]);
    if (!old.rows[0]) return res.status(404).json({ error: 'Not found' });
    const oldTx = old.rows[0];

    // Reverse payment effect
    if (!oldTx.is_counter_sale && oldTx.shop_id) {
      await reversePaymentFromShop(client, godown_id, oldTx.shop_id, parseFloat(oldTx.amount));
    }

    await client.query(`DELETE FROM online_transactions WHERE id=$1`, [req.params.id]);
    await client.query('COMMIT');
    res.json({ message: 'Deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;