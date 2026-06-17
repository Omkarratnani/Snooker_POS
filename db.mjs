import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs/promises';
import path from 'path';

let db;

export async function initDb(dbPath, oldDbJsonPath) {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS business (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT,
      phone TEXT,
      address TEXT,
      gstPercent REAL,
      currency TEXT,
      rates TEXT
    );

    CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY,
      name TEXT,
      type TEXT,
      status TEXT,
      customerName TEXT,
      activeMatch TEXT,
      items TEXT,
      matches TEXT
    );

    CREATE TABLE IF NOT EXISTS menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      price REAL,
      category TEXT,
      stock REAL
    );

    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      date TEXT,
      day TEXT,
      tableId INTEGER,
      tableName TEXT,
      customerName TEXT,
      paymentMode TEXT,
      seconds INTEGER,
      tableAmount REAL,
      itemAmount REAL,
      subtotal REAL,
      gst REAL,
      total REAL,
      discountValue REAL,
      discountType TEXT,
      discountAmount REAL,
      splitNames TEXT,
      items TEXT
    );
  `);

  // Check if we need to migrate old db.json
  const row = await db.get('SELECT COUNT(*) as count FROM business');
  if (row.count === 0) {
    try {
      const data = await fs.readFile(oldDbJsonPath, 'utf-8');
      const oldState = JSON.parse(data);
      console.log('Migrating old db.json to SQLite...');
      await migrateData(oldState);
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log('No db.json found. Creating default SQLite state...');
        await createDefaultState();
      } else {
        console.error('Error reading db.json for migration:', err);
      }
    }
  }
}

async function migrateData(state) {
  const { business, tables, menu, bills } = state;

  if (business) {
    await db.run(
      `INSERT INTO business (id, name, phone, address, gstPercent, currency, rates) VALUES (1, ?, ?, ?, ?, ?, ?)`,
      [business.name, business.phone, business.address, business.gstPercent || 0, business.currency || '₹', JSON.stringify(business.rates || {})]
    );
  }

  if (tables) {
    for (const t of tables) {
      await db.run(
        `INSERT INTO tables (id, name, type, status, customerName, activeMatch, items, matches) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [t.id, t.name, t.type, t.status, t.customerName || '', JSON.stringify(t.activeMatch || null), JSON.stringify(t.items || []), JSON.stringify(t.matches || [])]
      );
    }
  }

  if (menu) {
    for (const m of menu) {
      await db.run(
        `INSERT INTO menu (id, name, price, category, stock) VALUES (?, ?, ?, ?, ?)`,
        [m.id, m.name, m.price, m.category, m.stock]
      );
    }
  }

  if (bills) {
    for (const b of bills) {
      await db.run(
        `INSERT INTO bills (id, date, day, tableId, tableName, customerName, paymentMode, seconds, tableAmount, itemAmount, subtotal, gst, total, discountValue, discountType, discountAmount, splitNames, items) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [b.id, b.date, b.day, b.tableId, b.table || b.tableName, b.customerName, b.paymentMode, b.seconds, b.tableAmount, b.itemAmount, b.subtotal, b.gst, b.total, b.discountValue || 0, b.discountType || 'Amount', b.discountAmount || 0, b.splitNames || '', JSON.stringify(b.items || [])]
      );
    }
  }
}

async function createDefaultState() {
  await db.run(
    `INSERT INTO business (id, name, phone, address, gstPercent, currency, rates) VALUES (1, ?, ?, ?, ?, ?, ?)`,
    ['Royal Snooker Club', '', '', 0, '₹', JSON.stringify({ 1: 300, 2: 300, 3: 200, 4: 200 })]
  );

  const defaultTables = [
    { id: 1, name: "Snooker 1", type: "Snooker", status: "free" },
    { id: 2, name: "Snooker 2", type: "Snooker", status: "free" },
    { id: 3, name: "Pool 1", type: "Pool", status: "free" },
    { id: 4, name: "Pool 2", type: "Pool", status: "free" },
  ];

  for (const t of defaultTables) {
    await db.run(
      `INSERT INTO tables (id, name, type, status, customerName, activeMatch, items, matches) VALUES (?, ?, ?, ?, '', 'null', '[]', '[]')`,
      [t.id, t.name, t.type, t.status]
    );
  }

  const defaultMenu = [
    { id: 1, name: "Water Bottle", price: 20, category: "Drinks", stock: 100 },
    { id: 2, name: "Cold Drink", price: 40, category: "Drinks", stock: 50 },
    { id: 3, name: "Tea", price: 20, category: "Drinks", stock: 999 },
    { id: 4, name: "Coffee", price: 40, category: "Drinks", stock: 999 },
    { id: 5, name: "Maggi", price: 60, category: "Food", stock: 40 },
    { id: 6, name: "Sandwich", price: 80, category: "Food", stock: 30 },
    { id: 7, name: "Chips", price: 30, category: "Snacks", stock: 80 },
    { id: 8, name: "Cue Tip", price: 50, category: "Extras", stock: 25 },
  ];

  for (const m of defaultMenu) {
    await db.run(
      `INSERT INTO menu (id, name, price, category, stock) VALUES (?, ?, ?, ?, ?)`,
      [m.id, m.name, m.price, m.category, m.stock]
    );
  }
}

export function getDb() {
  return db;
}
