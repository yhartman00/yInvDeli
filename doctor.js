import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'inventory.db');
const db = new Database(dbPath);

console.log('--- Doctor: Normalizando Base de Datos ---');

// 1. Normalize dates in inventory table
const rows = db.prepare('SELECT id, date FROM inventory').all();
let updatedCount = 0;

db.transaction(() => {
  for (const row of rows) {
    if (!row.date) continue;
    
    // Check if format is DD/MM/YYYY
    if (row.date.includes('/') && row.date.split('/').length === 3) {
      const [d, m, y] = row.date.split('/');
      const isoDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      db.prepare('UPDATE inventory SET date = ? WHERE id = ?').run(isoDate, row.id);
      updatedCount++;
    }
  }
})();

console.log(`Normalización completada: ${updatedCount} registros actualizados a formato ISO.`);

// 2. Normalize dates in escuelita table
const escuelitaRows = db.prepare('SELECT id, save_date, original_date FROM escuelita').all();
let escuelitaUpdated = 0;

function normalize(date) {
  if (!date || !date.includes('/')) return date;
  const parts = date.split('/');
  if (parts.length !== 3) return date;
  const [d, m, y] = parts;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

db.transaction(() => {
  for (const row of escuelitaRows) {
    const newSave = normalize(row.save_date);
    const newOriginal = normalize(row.original_date);
    
    if (newSave !== row.save_date || newOriginal !== row.original_date) {
      db.prepare('UPDATE escuelita SET save_date = ?, original_date = ? WHERE id = ?')
        .run(newSave, newOriginal, row.id);
      escuelitaUpdated++;
    }
  }
})();

console.log(`Escuelita actualizada: ${escuelitaUpdated} registros normalizados.`);
db.close();
