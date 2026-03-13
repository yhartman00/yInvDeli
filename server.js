import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Database Initialization
const db = new Database('inventory.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    code TEXT,
    description TEXT,
    stock REAL,
    cost REAL
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Initialize default PIN if not set
const getPin = db.prepare('SELECT value FROM settings WHERE key = ?');
if (!getPin.get('pin')) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('pin', '1234');
}

// API Routes

// Validate PIN
app.post('/api/auth', (req, res) => {
  const { pin } = req.body;
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('pin');
  const storedPin = row ? row.value : '1234';
  
  console.log(`Intento de login - Recibido: [${pin}], Esperado: [${storedPin}]`);
  
  if (pin === storedPin) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'PIN incorrecto' });
  }
});

// Update PIN
app.post('/api/settings/pin', (req, res) => {
  const { oldPin, newPin } = req.body;
  const storedPin = db.prepare('SELECT value FROM settings WHERE key = ?').get('pin');
  
  if (oldPin !== storedPin.value) {
    return res.status(401).json({ error: 'PIN actual incorrecto' });
  }
  
  if (!newPin || newPin.length !== 4) {
    return res.status(400).json({ error: 'El nuevo PIN debe ser de 4 dígitos' });
  }

  db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(newPin, 'pin');
  res.json({ success: true, message: 'PIN actualizado correctamente' });
});

// Get all unique dates
app.get('/api/dates', (req, res) => {
  try {
    const dates = db.prepare('SELECT DISTINCT date FROM inventory ORDER BY date DESC').all();
    res.json(dates.map(d => d.date));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get inventory for a specific date
app.get('/api/inventory/:date', (req, res) => {
  try {
    const { date } = req.params;
    const items = db.prepare('SELECT * FROM inventory WHERE date = ?').all(date);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save/Update inventory for a date
app.post('/api/inventory', (req, res) => {
  const { date, items } = req.body;
  
  if (!date || !items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Invalid data' });
  }

  const deleteExisting = db.prepare('DELETE FROM inventory WHERE date = ?');
  const insertItem = db.prepare('INSERT INTO inventory (date, code, description, stock, cost) VALUES (?, ?, ?, ?, ?)');

  const transaction = db.transaction((data) => {
    deleteExisting.run(date);
    for (const item of data) {
      insertItem.run(date, item.code, item.description, item.stock, item.cost);
    }
  });

  try {
    console.log(`Guardando ${items.length} items para la fecha ${date}`);
    transaction(items);
    const count = db.prepare('SELECT COUNT(*) as count FROM inventory WHERE date = ?').get(date);
    console.log(`Confirmado: ${count.count} items en la DB para ${date}`);
    res.json({ success: true, message: `Saved ${items.length} items for ${date}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
