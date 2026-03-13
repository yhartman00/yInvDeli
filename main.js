import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { exportToPDF } from './pdf-export.js';

const PIN_CORRECTO = '1234'; // Default, but we'll use backend
const API_BASE = 'http://localhost:3001/api';
let currentData = [];
let lastUpdateDate = '';

// --- Login Logic ---
const pinInputs = document.querySelectorAll('#pin-container input');
const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');

// Auto-login if session exists
if (localStorage.getItem('isLoggedIn') === 'true') {
  showDashboard();
}

pinInputs.forEach((input, index) => {
  input.addEventListener('input', (e) => {
    if (e.target.value.length === 1 && index < pinInputs.length - 1) {
      pinInputs[index + 1].focus();
    }
    checkPin();
  });
});

async function checkPin() {
  const pin = Array.from(pinInputs).map(i => i.value).join('');
  if (pin.length === 4) {
    try {
      const res = await fetch(`${API_BASE}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      
      if (res.ok) {
        localStorage.setItem('isLoggedIn', 'true');
        showDashboard();
      } else {
        alert('PIN incorrecto');
        pinInputs.forEach(i => i.value = '');
        pinInputs[0].focus();
      }
    } catch (err) {
      alert('Error de conexión con el servidor');
    }
  }
}

function showDashboard() {
  loginScreen.style.display = 'none';
  dashboard.style.display = 'block';
  document.body.style.alignItems = 'flex-start';
  document.body.style.overflowY = 'auto';
  loadDates();
}

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('isLoggedIn');
  window.location.reload();
});

// Change PIN Logic
const pinModal = document.getElementById('pin-modal');
const changePinBtn = document.getElementById('change-pin-btn');
const cancelPinBtn = document.getElementById('cancel-pin-btn');
const savePinBtn = document.getElementById('save-pin-btn');

changePinBtn.addEventListener('click', () => {
  pinModal.style.display = 'flex';
});

cancelPinBtn.addEventListener('click', () => {
  pinModal.style.display = 'none';
});

savePinBtn.addEventListener('click', async () => {
  const oldPin = document.getElementById('old-pin').value;
  const newPin = document.getElementById('new-pin').value;

  if (newPin.length !== 4) {
    return alert('El nuevo PIN debe ser de 4 dígitos');
  }

  try {
    const res = await apiFetch('/settings/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPin, newPin })
    });
    
    alert('PIN actualizado correctamente');
    pinModal.style.display = 'none';
    document.getElementById('old-pin').value = '';
    document.getElementById('new-pin').value = '';
  } catch (err) {
    alert(err.message || 'Error al actualizar el PIN');
  }
});

// --- Dashboard Logic ---
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const tableSection = document.getElementById('table-section');
const productsTableBody = document.querySelector('#products-table tbody');
const marginInput = document.getElementById('margin-input');
const dateSelector = document.getElementById('date-selector');
const downloadBtn = document.getElementById('download-pdf');
const downloadExcelBtn = document.getElementById('download-excel');
const newUploadBtn = document.getElementById('new-upload-btn');

async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type');
    
    if (!res.ok) {
      const text = await res.text();
      console.error(`API Error (${res.status}):`, text);
      throw new Error(`Servidor respondió con error ${res.status}`);
    }

    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    } else {
      const text = await res.text();
      console.error('Respuesta no es JSON:', text);
      throw new Error('El servidor no devolvió un formato JSON válido');
    }
  } catch (err) {
    console.error(`Error en fetch a ${url}:`, err);
    throw err;
  }
}

async function loadDates() {
  try {
    const dates = await apiFetch('/dates');
    dateSelector.innerHTML = dates.map(d => {
      // YYYY-MM-DD -> DD/MM/YYYY para mostrar al usuario
      const parts = d.split('-');
      const displayDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
      return `<option value="${d}">${displayDate}</option>`;
    }).join('') || '<option value="">No hay datos</option>';
    if (dates.length > 0) {
      await loadDataForDate(dates[0]);
    } else {
      showUploadArea();
    }
  } catch (err) {
    console.error('Error cargando fechas:', err);
  }
}

async function loadDataForDate(date) {
  try {
    const items = await apiFetch(`/inventory/${date}`);
    currentData = items.map(p => ({
      description: p.description,
      stock: p.stock,
      unitCost: p.cost,
      code: p.code
    }));
    // YYYY-MM-DD -> DD/MM/YYYY para el título y PDF
    const parts = date.split('-');
    lastUpdateDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : date;
    updateDashboard();
    showTable();
  } catch (err) {
    console.error(`Error cargando datos para ${date}:`, err);
  }
}

function showUploadArea() {
  uploadSection.style.display = 'block';
  tableSection.style.display = 'none';
  downloadBtn.disabled = true;
  downloadExcelBtn.disabled = true;
}

function showTable() {
  uploadSection.style.display = 'none';
  tableSection.style.display = 'block';
  downloadBtn.disabled = false;
  downloadExcelBtn.disabled = false;
}

newUploadBtn.addEventListener('click', showUploadArea);

dateSelector.addEventListener('change', (e) => {
  if (e.target.value) loadDataForDate(e.target.value);
});

uploadSection.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

async function handleFile(file) {
  const isXLSX = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
  
  if (isXLSX) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      await processRows(rows);
    };
    reader.readAsArrayBuffer(file);
  } else {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: async (results) => {
        await processRows(results.data);
      }
    });
  }
}

async function processRows(rows) {
  try {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    console.log('Procesando filas:', rows.length);

    // Skip header and find data
    const newItems = rows.slice(1).map((row, idx) => {
      try {
        const code = row[0]?.toString().trim() || 'S/C';
        const description = row[1]?.toString().trim() || 'Sin nombre';
        
        const cleanNum = (val) => {
          if (val === undefined || val === null) return 0;
          let s = val.toString().trim().replace(/[^0-9.,-]/g, '');
          if (s.includes('.') && s.includes(',')) {
            s = s.replace(/\./g, '').replace(',', '.');
          } else if (s.includes(',') && !s.includes('.')) {
            s = s.replace(',', '.');
          }
          return parseFloat(s) || 0;
        };

        const stock = cleanNum(row[4]);
        const cost = cleanNum(row[6]);
        
        return { code, description, stock, cost };
      } catch (e) {
        console.warn(`Error en fila ${idx + 1}:`, e);
        return null;
      }
    }).filter(p => p && p.stock > 0 && p.description !== 'Sin nombre');

    if (newItems.length === 0) {
      alert('No se encontraron productos válidos con stock mayor a 0 en el archivo.');
      return;
    }

    console.log('Items válidos encontrados:', newItems.length);

    // Save to backend
    await apiFetch('/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, items: newItems })
    });

    await loadDates();
    dateSelector.value = date;
    await loadDataForDate(date);
    
    alert(`¡Datos cargados con éxito! Se procesaron ${newItems.length} productos.`);
  } catch (err) {
    console.error('Error procesando el archivo:', err);
    alert(`Error: ${err.message}\n\nRevisa que el servidor backend esté corriendo (reiniciar.bat).`);
  }
}

function updateDashboard() {
  const margin = parseFloat(marginInput.value) / 100 || 0;
  let totals = { sales: 0, cost: 0, tax: 0, profit: 0 };

  console.log('Actualizando Dashboard con', currentData.length, 'productos');

  productsTableBody.innerHTML = '';
  currentData.forEach(p => {
    const cost = p.unitCost; // Total cost for this item/stock
    const sale = cost * (1 + margin);
    const tax = sale * 0.11;
    const profit = sale - cost - tax;

    totals.sales += sale;
    totals.cost += cost;
    totals.tax += tax;
    totals.profit += profit;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${p.description} <small style="display:block; color:var(--text-muted)">${p.code}</small></td>
      <td class="numeric">${p.stock.toLocaleString()}</td>
      <td class="numeric">$${cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td class="numeric">$${sale.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td class="numeric">$${sale.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td class="numeric ${profit >= 0 ? 'profit-positive' : 'profit-negative'}">
        $${profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </td>
    `;
    productsTableBody.appendChild(row);
  });

  document.getElementById('total-sales').textContent = `$${totals.sales.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  document.getElementById('total-cost').textContent = `$${totals.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  document.getElementById('total-tax').textContent = `$${totals.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  document.getElementById('total-profit').textContent = `$${totals.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

marginInput.addEventListener('input', updateDashboard);
downloadBtn.addEventListener('click', () => {
  // Pass current formatted summary
  const summary = {
    totalSales: document.getElementById('total-sales').textContent,
    totalCost: document.getElementById('total-cost').textContent,
    totalTax: document.getElementById('total-tax').textContent,
    totalProfit: document.getElementById('total-profit').textContent
  };
  
  const margin = marginInput.value;
  const pdfData = currentData.map(p => {
    const m = parseFloat(margin) / 100 || 0;
    const cost = p.unitCost;
    const sale = cost * (1 + m);
    const profit = sale - cost - (sale * 0.11);
    return { ...p, unitCost: cost, unitPrice: sale, totalSales: sale, profit };
  });

  exportToPDF(pdfData, summary, margin, lastUpdateDate);
});

downloadExcelBtn.addEventListener('click', () => {
  const margin = parseFloat(marginInput.value) / 100 || 0;
  
  const data = currentData.map(p => {
    const cost = p.unitCost;
    const sale = cost * (1 + margin);
    const tax = sale * 0.11;
    const profit = sale - cost - tax;
    
    return {
      'Producto': p.description,
      'Código': p.code,
      'Stock': p.stock,
      'Costo Unit.': cost,
      'Precio Venta': sale,
      'Venta Total': sale,
      'Impuesto (11%)': tax,
      'Ganancia Neta': profit
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reporte");
  
  const fileName = `Reporte_${lastUpdateDate.replace(/\//g, '-')}.xlsx`;
  XLSX.writeFile(wb, fileName);
});
