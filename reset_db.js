import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'inventory.db');
const db = new Database(dbPath);

console.log('--- Reseteando Base de Datos ---');

try {
  db.transaction(() => {
    // Borrar datos de inventario
    db.prepare('DELETE FROM inventory').run();
    // Borrar datos de la escuelita
    db.prepare('DELETE FROM escuelita').run();
    // Reiniciar secuencias de IDs (opcional pero limpio)
    db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('inventory', 'escuelita')").run();
  })();
  console.log('¡Base de datos vaciada con éxito! (Se han conservado los ajustes y el PIN).');
} catch (err) {
  console.error('Error al resetear la base de datos:', err);
} finally {
  db.close();
}
