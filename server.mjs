import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, getDb } from './db.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5001;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
const OLD_DB_JSON = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// Initialize Database
await initDb(DB_PATH, OLD_DB_JSON);

// ---- API ENDPOINTS ----

// GET Full State for initialization
app.get('/api/state', async (req, res) => {
  try {
    const db = getDb();
    const businessRow = await db.get('SELECT * FROM business WHERE id = 1');
    const business = {
      ...businessRow,
      rates: JSON.parse(businessRow.rates || '{}')
    };

    const tablesRows = await db.all('SELECT * FROM tables');
    const tables = tablesRows.map(t => ({
      ...t,
      activeMatch: JSON.parse(t.activeMatch || 'null'),
      items: JSON.parse(t.items || '[]'),
      matches: JSON.parse(t.matches || '[]')
    }));

    const menu = await db.all('SELECT * FROM menu');
    
    // For performance, we might want to limit bills fetched on init in the future.
    // But currently frontend relies on all bills for reports.
    const billsRows = await db.all('SELECT * FROM bills ORDER BY date DESC');
    const bills = billsRows.map(b => ({
      ...b,
      items: JSON.parse(b.items || '[]')
    }));

    res.json({ business, tables, menu, bills });
  } catch (error) {
    console.error("Error fetching state:", error);
    res.status(500).json({ error: 'Failed to fetch database' });
  }
});

// Update Business Settings
app.put('/api/business', async (req, res) => {
  try {
    const db = getDb();
    const { name, phone, address, gstPercent, currency, rates } = req.body;
    await db.run(
      'UPDATE business SET name=?, phone=?, address=?, gstPercent=?, currency=?, rates=? WHERE id=1',
      [name, phone, address, gstPercent, currency, JSON.stringify(rates)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Table
app.put('/api/tables/:id', async (req, res) => {
  try {
    const db = getDb();
    const { status, customerName, activeMatch, items, matches } = req.body;
    await db.run(
      'UPDATE tables SET status=?, customerName=?, activeMatch=?, items=?, matches=? WHERE id=?',
      [status, customerName || '', JSON.stringify(activeMatch || null), JSON.stringify(items || []), JSON.stringify(matches || []), req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear Table (e.g. after checkout)
app.post('/api/tables/:id/clear', async (req, res) => {
  try {
    const db = getDb();
    await db.run(
      'UPDATE tables SET status=?, customerName=?, activeMatch=?, items=?, matches=? WHERE id=?',
      ['free', '', 'null', '[]', '[]', req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update or Insert Menu Item
app.post('/api/menu', async (req, res) => {
  try {
    const db = getDb();
    const { id, name, price, category, stock } = req.body;
    const exists = await db.get('SELECT id FROM menu WHERE id=?', [id]);
    if (exists) {
      await db.run('UPDATE menu SET name=?, price=?, category=?, stock=? WHERE id=?', [name, price, category, stock, id]);
    } else {
      await db.run('INSERT INTO menu (id, name, price, category, stock) VALUES (?, ?, ?, ?, ?)', [id, name, price, category, stock]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Menu Item
app.delete('/api/menu/:id', async (req, res) => {
  try {
    const db = getDb();
    await db.run('DELETE FROM menu WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Menu Stock (Batch)
app.post('/api/menu/stock', async (req, res) => {
  try {
    const db = getDb();
    const updates = req.body; // Array of { id, stock }
    const stmt = await db.prepare('UPDATE menu SET stock=? WHERE id=?');
    for (const u of updates) {
      await stmt.run([u.stock, u.id]);
    }
    await stmt.finalize();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save Bill
app.post('/api/bills', async (req, res) => {
  try {
    const db = getDb();
    const b = req.body;
    await db.run(
      `INSERT INTO bills (id, date, day, tableId, tableName, customerName, paymentMode, seconds, tableAmount, itemAmount, subtotal, gst, total, discountValue, discountType, discountAmount, splitNames, items) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [b.id, b.date, b.day, b.tableId, b.table, b.customerName, b.paymentMode, b.seconds, b.tableAmount, b.itemAmount, b.subtotal, b.gst, b.total, b.discountValue || 0, b.discountType || 'Amount', b.discountAmount || 0, b.splitNames || '', JSON.stringify(b.items || [])]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to save bill:", err);
    res.status(500).json({ error: err.message });
  }
});

// SPA Fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Production server running at http://localhost:${PORT}`);
  console.log(`Database persisting to ${DB_PATH}`);
});
