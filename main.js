const PIN_CORRECTO = '1234'; // Default, but we'll use backend
const API_BASE = window.location.port === '5173' ? 'http://localhost:3001/api' : '/api';
let currentData = [];
let lastUpdateDate = '';

// Use globals provided by CDN
// Papa, XLSX are now available globally

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
const summaryGrid = document.getElementById('summary-grid');
const searchInput = document.getElementById('search-input');
const historyBtn = document.getElementById('history-btn');
const calendarModal = document.getElementById('calendar-modal');
const closeCalendarBtn = document.getElementById('close-calendar');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const monthYearDisplay = document.getElementById('calendar-month-year');
const calendarDaysContainer = document.getElementById('calendar-days-container');
const downloadBtn = document.getElementById('download-pdf');
const downloadExcelBtn = document.getElementById('download-excel');
const newUploadBtn = document.getElementById('new-upload-btn');
const escuelitaNavBtn = document.getElementById('escuelita-nav-btn');
const escuelitaView = document.getElementById('escuelita-view');
const backToDashboardBtn = document.getElementById('back-to-dashboard');
const escuelitaList = document.getElementById('escuelita-list');
const escuelitaDetail = document.getElementById('escuelita-detail');
const importDateInput = document.getElementById('import-date');
const importDateGroup = document.getElementById('import-date-group');

let currentCalendarDate = new Date();
let availableDates = [];

// Set default date for import to today
if (importDateInput) {
  importDateInput.value = new Date().toISOString().split('T')[0];
}

// --- Help Modal Logic ---
const helpModal = document.getElementById('help-modal');
const helpBtn = document.getElementById('help-btn');
const closeHelpBtn = document.getElementById('close-help-btn');
const closeHelpOkBtn = document.getElementById('close-help-ok-btn');

if (helpBtn) helpBtn.onclick = () => helpModal.style.display = 'flex';
if (closeHelpBtn) closeHelpBtn.onclick = () => helpModal.style.display = 'none';
if (closeHelpOkBtn) closeHelpOkBtn.onclick = () => helpModal.style.display = 'none';

// Close modals when clicking outside
window.onclick = (event) => {
  if (event.target === helpModal) helpModal.style.display = 'none';
  if (event.target === calendarModal) calendarModal.style.display = 'none';
};

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
    availableDates = await apiFetch('/dates');
    if (availableDates.length > 0) {
      // Sort dates to ensure we have the latest one (availableDates is usually YYYY-MM-DD)
      const sortedDates = [...availableDates].sort().reverse();
      const latestDate = sortedDates[0];
      const parts = latestDate.split('-');
      const latestFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
      
      const lastUpdateEl = document.getElementById('last-update-text');
      if (lastUpdateEl) lastUpdateEl.textContent = `Última actualización: ${latestFormatted}`;
      
      await loadDataForDate(availableDates[0]);
    } else {
      showUploadArea();
    }
  } catch (err) {
    console.error('Error cargando fechas:', err);
  }
}

function renderCalendar(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  monthYearDisplay.textContent = `${monthNames[month]} ${year}`;
  
  calendarDaysContainer.innerHTML = '';
  
  // Empty slots for days before the 1st
  for (let i = 0; i < firstDay; i++) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'calendar-day empty';
    calendarDaysContainer.appendChild(emptyDiv);
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';
    dayDiv.textContent = day;
    
    if (availableDates.includes(dateStr)) {
      dayDiv.classList.add('has-data');
    }
    
    // Check if this date is currently selected (lastUpdateDate is DD/MM/YYYY)
    if (lastUpdateDate && lastUpdateDate.includes('/')) {
      const [d, m, y] = lastUpdateDate.split('/');
      if (y === String(year) && m === String(month + 1).padStart(2, '0') && d === String(day).padStart(2, '0')) {
        dayDiv.classList.add('selected');
      }
    }
    
    dayDiv.addEventListener('click', () => {
      loadDataForDate(dateStr);
      calendarModal.style.display = 'none';
    });
    
    calendarDaysContainer.appendChild(dayDiv);
  }
}

function openCalendar() {
  calendarModal.style.display = 'flex';
  renderCalendar(currentCalendarDate);
}

function closeCalendar() {
  calendarModal.style.display = 'none';
}

function changeMonth(offset) {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
  renderCalendar(currentCalendarDate);
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
    
    const viewingDateEl = document.getElementById('viewing-date-text');
    if (viewingDateEl) viewingDateEl.textContent = `Estas viendo: ${lastUpdateDate}`;
    
    const statusBar = document.getElementById('date-status-bar');
    if (statusBar) statusBar.style.display = 'flex';
    
    updateDashboard();
    showTable();
  } catch (err) {
    console.error(`Error cargando datos para ${date}:`, err);
    alert('No se pudieron cargar los datos de esta fecha. Revisa la conexión con el servidor.');
  }
}

function showUploadArea() {
  uploadSection.style.display = 'block';
  tableSection.style.display = 'none';
  if (summaryGrid) summaryGrid.style.display = 'none';
  if (importDateGroup) importDateGroup.style.display = 'flex';
  const statusBar = document.getElementById('date-status-bar');
  if (statusBar) statusBar.style.display = 'none';
  downloadBtn.disabled = true;
  downloadExcelBtn.disabled = true;
}

function showTable() {
  uploadSection.style.display = 'none';
  tableSection.style.display = 'block';
  if (summaryGrid) summaryGrid.style.display = 'grid';
  if (importDateGroup) importDateGroup.style.display = 'none';
  downloadBtn.disabled = false;
  downloadExcelBtn.disabled = false;
}

newUploadBtn.addEventListener('click', showUploadArea);

searchInput.addEventListener('input', updateDashboard);
historyBtn.addEventListener('click', openCalendar);
closeCalendarBtn.addEventListener('click', closeCalendar);
prevMonthBtn.addEventListener('click', () => changeMonth(-1));
nextMonthBtn.addEventListener('click', () => changeMonth(1));

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

async function handleFile(file) {
  try {
    const isXLSX = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    
    if (isXLSX) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          if (typeof XLSX === 'undefined') throw new Error('La librería Excel (XLSX) no se cargó correctamente.');
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          await processRows(rows);
        } catch (err) {
          console.error('Error leyendo Excel:', err);
          alert(`Error al leer el archivo Excel: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      if (typeof Papa === 'undefined') throw new Error('La librería CSV (PapaParse) no se cargó correctamente.');
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            await processRows(results.data);
          } catch (err) {
            alert(`Error procesando CSV: ${err.message}`);
          }
        },
        error: (err) => {
          alert(`Error al analizar CSV: ${err.message}`);
        }
      });
    }
  } catch (err) {
    console.error('Error en handleFile:', err);
    alert(`Error al procesar el archivo: ${err.message}`);
  }
}

async function processRows(rows) {
  try {
    const date = importDateInput.value || new Date().toISOString().split('T')[0];
    console.log(`[DEBUG] Iniciando procesamiento de ${rows.length} filas para la fecha ${date}`);

    // Skip empty rows at the start
    let startIdx = 0;
    while (startIdx < rows.length && (!rows[startIdx] || rows[startIdx].length < 2)) {
      startIdx++;
    }
    
    // Assume header is at startIdx, data starts at startIdx + 1
    const dataRows = rows.slice(startIdx + 1);
    console.log(`[DEBUG] Filas de datos tras saltar encabezado: ${dataRows.length}`);

    const newItems = dataRows.map((row, idx) => {
      try {
        if (!row || row.length < 2) return null;
        
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
          let n = parseFloat(s);
          return isNaN(n) ? 0 : n;
        };

        const stock = cleanNum(row[4]);
        const cost = cleanNum(row[6]);
        
        return { code, description, stock, cost };
      } catch (e) {
        return null;
      }
    }).filter(p => p && p.stock > 0 && p.description !== 'Sin nombre');

    console.log(`[DEBUG] Items válidos filtrados: ${newItems.length}`);

    if (newItems.length === 0) {
      alert('No se encontraron productos válidos (con stock > 0) en el archivo seleccionado.');
      return;
    }

    // Indicate progress
    console.log('[DEBUG] Enviando datos al servidor...');
    
    // Save to backend
    const res = await apiFetch('/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, items: newItems })
    });
    
    console.log('[DEBUG] Respuesta del servidor recibida:', res);

    await loadDates();
    await loadDataForDate(date);
    
    alert(`¡Carga completada! Se guardaron ${newItems.length} productos correctamente.`);
  } catch (err) {
    console.error('[ERROR] Fallo en processRows:', err);
    alert(`Error crítico al procesar: ${err.message}`);
  }
}

function updateDashboard() {
  const margin = parseFloat(marginInput.value) / 100 || 0;
  const searchTerm = searchInput.value.toLowerCase();
  let totals = { sales: 0, cost: 0, tax: 0, profit: 0 };

  console.log('Actualizando Dashboard con', currentData.length, 'productos');

  productsTableBody.innerHTML = '';

  // 1. Filter
  const filteredData = currentData.filter(p => 
    p.description.toLowerCase().includes(searchTerm) || 
    p.code.toLowerCase().includes(searchTerm)
  );

  // 2. Group by first 4 digits of code
  const groups = {};
  filteredData.forEach(p => {
    const prefix = p.code.substring(0, 8) || 'OTRO';
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(p);
  });

  // 3. Render Groups
  Object.keys(groups).sort().forEach((prefix, groupIdx) => {
    const groupItems = groups[prefix];
    let groupTotals = { stock: 0, cost: 0, sale: 0, tax: 0, profit: 0 };
    
    // Group Header (Optional, for visual separation)
    const headerRow = document.createElement('tr');
    headerRow.className = 'group-header';
    headerRow.innerHTML = `<td colspan="8">Grupo: ${prefix}</td>`;
    productsTableBody.appendChild(headerRow);

    groupItems.forEach((p, itemIdx) => {
      const cost = p.unitCost;
      const sale = cost * (1 + margin);
      const tax = sale * 0.11;
      const profit = sale - cost - tax;

      groupTotals.stock += p.stock;
      groupTotals.cost += cost;
      groupTotals.sale += sale;
      groupTotals.tax += tax;
      groupTotals.profit += profit;

      totals.sales += sale;
      totals.cost += cost;
      totals.tax += tax;
      totals.profit += profit;

      const row = document.createElement('tr');
      row.style.background = groupIdx % 2 === 0 ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent';
      
      row.innerHTML = `
        <td>${p.description} <small style="display:block; color:var(--text-muted)">${p.code}</small></td>
        <td class="numeric">${p.stock.toLocaleString('es-ES')}</td>
        <td class="numeric">$${(cost / p.stock).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="numeric">$${cost.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="numeric">$${(sale / p.stock).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="numeric">$${sale.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="numeric">$${tax.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="numeric ${profit >= 0 ? 'profit-positive' : 'profit-negative'}">
          $${profit.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
      `;
      productsTableBody.appendChild(row);
    });

    // Subtotal Row
    const subtotalRow = document.createElement('tr');
    subtotalRow.className = 'subtotal-row';
    subtotalRow.innerHTML = `
      <td style="display: flex; align-items: center; gap: 0.5rem;">
        SUBTOTAL (${prefix})
        <button class="btn btn-outline save-group-btn" data-prefix="${prefix}" style="padding: 2px 6px; font-size: 10px; border-color: var(--secondary); color: var(--secondary);">
          💾 Guardar
        </button>
      </td>
      <td class="numeric">${groupTotals.stock.toLocaleString('es-ES')}</td>
      <td></td>
      <td class="numeric">$${groupTotals.cost.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td></td>
      <td class="numeric">$${groupTotals.sale.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td class="numeric">$${groupTotals.tax.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td class="numeric">$${groupTotals.profit.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    `;
    productsTableBody.appendChild(subtotalRow);
  });

  // Attach Save Group Listeners
  document.querySelectorAll('.save-group-btn').forEach(btn => {
    btn.addEventListener('click', (e) => saveToEscuelita(e.target.dataset.prefix));
  });

  document.getElementById('total-sales').textContent = `$${totals.sales.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('total-cost').textContent = `$${totals.cost.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('total-tax').textContent = `$${totals.tax.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('total-profit').textContent = `$${totals.profit.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  const searchTerm = searchInput.value.toLowerCase();
  
  const filteredData = currentData.filter(p => 
    p.description.toLowerCase().includes(searchTerm) || 
    p.code.toLowerCase().includes(searchTerm)
  );

  const groups = {};
  filteredData.forEach(p => {
    const prefix = p.code.substring(0, 8) || 'OTRO';
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(p);
  });

  let excelRows = [];
  let grandTotals = { stock: 0, cost: 0, sale: 0, profit: 0 };

  Object.keys(groups).sort().forEach(prefix => {
    const groupItems = groups[prefix];
    let groupTotals = { stock: 0, cost: 0, sale: 0, tax: 0, profit: 0 };

    groupItems.forEach(p => {
      const cost = p.unitCost;
      const sale = cost * (1 + margin);
      const tax = sale * 0.11;
      const profit = sale - cost - tax;

      groupTotals.stock += p.stock;
      groupTotals.cost += cost;
      groupTotals.sale += sale;
      groupTotals.tax += tax;
      groupTotals.profit += profit;

      excelRows.push({
        'Producto': p.description,
        'Código': p.code,
        'Stock': p.stock,
        'Costo Unit.': cost / p.stock,
        'Costo Total': cost,
        'P. Venta': sale / p.stock,
        'Venta Total': sale,
        'Impuesto (11%)': tax,
        'Ganancia Neta': profit
      });
    });

    // Subtotal Excel Row
    excelRows.push({
      'Producto': `SUBTOTAL (${prefix})`,
      'Código': '',
      'Stock': groupTotals.stock,
      'Costo Unit.': '',
      'Costo Total': groupTotals.cost,
      'P. Venta': '',
      'Venta Total': groupTotals.sale,
      'Impuesto (11%)': groupTotals.tax,
      'Ganancia Neta': groupTotals.profit
    });
    
    grandTotals.stock += groupTotals.stock;
    grandTotals.cost += groupTotals.cost;
    grandTotals.sale += groupTotals.sale;
    grandTotals.profit += groupTotals.profit;
  });

  // Grand Total Row
  excelRows.push({
    'Producto': 'TOTAL GENERAL',
    'Código': '',
    'Stock': grandTotals.stock,
    'Costo Unit.': '',
    'Costo Total': grandTotals.cost,
    'P. Venta': '',
    'Venta Total': grandTotals.sale,
    'Ganancia Neta': grandTotals.profit
  });

  const ws = XLSX.utils.json_to_sheet(excelRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reporte Detallado");
  
  const fileName = `Reporte_${lastUpdateDate.replace(/\//g, '-')}.xlsx`;
  XLSX.writeFile(wb, fileName);
});

// --- Escuelita Logic ---
escuelitaNavBtn.addEventListener('click', () => {
  dashboard.style.display = 'none';
  escuelitaView.style.display = 'block';
  loadEscuelita();
});

backToDashboardBtn.addEventListener('click', () => {
  escuelitaView.style.display = 'none';
  dashboard.style.display = 'block';
});

async function saveToEscuelita(prefix) {
  const margin = parseFloat(marginInput.value);
  const m = margin / 100 || 0;
  
  // 1. Check for duplicates first
  try {
    const existingArchives = await apiFetch('/escuelita');
    const isDuplicate = existingArchives.some(a => a.prefix === prefix && a.original_date === lastUpdateDate);
    
    if (isDuplicate) {
      return alert(`Este grupo (${prefix}) ya ha sido guardado para la fecha ${lastUpdateDate}. No se permiten duplicados.`);
    }
  } catch (err) {
    console.error('Error checking duplicates:', err);
  }

  // 2. Filter products for this prefix and apply current margin
  const groupItems = currentData.filter(p => (p.code.substring(0, 8) || 'OTRO') === prefix).map(p => {
    const cost = p.unitCost;
    const sale = cost * (1 + m);
    const tax = sale * 0.11;
    const profit = sale - cost - tax;
    return { ...p, unitCost: cost, unitPrice: sale, tax, profit, totalSales: sale };
  });

  if (groupItems.length === 0) return;

  try {
    const today = new Date().toISOString().split('T')[0];
    await apiFetch('/escuelita', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prefix,
        saveDate: today,
        originalDate: lastUpdateDate,
        margin,
        items: groupItems
      })
    });
    alert('Grupo guardado en Escuelita correctamente');
  } catch (err) {
    alert('Error al guardar en Escuelita');
  }
}

async function loadEscuelita() {
  try {
    const archives = await apiFetch('/escuelita');
    const displayList = archives.map(a => `
      <div class="summary-card" style="cursor: pointer; border: 1px solid rgba(var(--primary-rgb), 0.1);" onclick="handleEscuelitaClick(${a.id})">
        <h3 style="color: var(--secondary);">Grupo: ${a.prefix}</h3>
        <p style="font-size: 0.8rem; color: var(--text-muted);">${a.items.length} productos | Margen: ${a.margin}%</p>
        <div class="value" style="font-size: 1.2rem; margin-top: 1rem;">$${a.items.reduce((sum, i) => sum + i.unitPrice, 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <p style="font-size: 0.7rem; margin-top: 0.5rem;">Carga: ${a.original_date} | Guardado: ${a.save_date}</p>
      </div>
    `).join('');
    
    escuelitaList.innerHTML = displayList || '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">No hay grupos guardados.</p>';
    
    // Global function for onclick
    window.handleEscuelitaClick = (id) => {
      const archive = archives.find(a => a.id === id);
      if (archive) showEscuelitaDetail(archive);
    };
  } catch (err) {
    console.error('Error loading Escuelita:', err);
  }
}

function showEscuelitaDetail(archive) {
  escuelitaDetail.style.display = 'block';
  document.getElementById('escuelita-detail-title').textContent = `Grupo: ${archive.prefix} (Original: ${archive.original_date})`;
  
  const totalSales = archive.items.reduce((sum, i) => sum + i.unitPrice, 0);
  const totalCost = archive.items.reduce((sum, i) => sum + i.unitCost, 0);
  const totalStock = archive.items.reduce((sum, i) => sum + i.stock, 0);
  const totalTax = totalSales * 0.11;
  const totalProfit = totalSales - totalCost - totalTax;

  // Populate Summary Cards
  document.getElementById('escuelita-detail-summary').innerHTML = `
    <div class="summary-card"><h3>Venta Total</h3><div class="value">$${totalSales.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div></div>
    <div class="summary-card"><h3>Costo Total</h3><div class="value">$${totalCost.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div></div>
    <div class="summary-card"><h3>Impuestos (11%)</h3><div class="value">$${totalTax.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div></div>
    <div class="summary-card"><h3>Ganancia Neta</h3><div class="value" style="color: var(--success);">$${totalProfit.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div></div>
  `;

  const tbody = document.querySelector('#escuelita-table tbody');
  let tableHtml = archive.items.map(p => {
    const tax = p.unitPrice * 0.11;
    return `
    <tr>
      <td>${p.description} <small style="display:block; color:var(--text-muted)">${p.code}</small></td>
      <td class="numeric">${p.stock.toLocaleString('es-ES')}</td>
      <td class="numeric">$${(p.unitCost / p.stock).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td class="numeric">$${p.unitCost.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td class="numeric">$${(p.unitPrice / p.stock).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td class="numeric">$${p.unitPrice.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td class="numeric">$${tax.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td class="numeric" style="color: ${p.profit >= 0 ? 'var(--success)' : 'var(--danger)'}">$${p.profit.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
  `}).join('');

  // Add Total Row
  tableHtml += `
    <tr class="subtotal-row">
      <td>TOTAL DEL GRUPO</td>
      <td class="numeric">${totalStock.toLocaleString('es-ES')}</td>
      <td></td>
      <td class="numeric">$${totalCost.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td></td>
      <td class="numeric">$${totalSales.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td class="numeric">$${totalTax.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td class="numeric">$${totalProfit.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
  `;
  tbody.innerHTML = tableHtml;

  document.getElementById('escuelita-delete').onclick = async () => {
    if (confirm('¿Estás seguro de que quieres borrar este archivo histórico?')) {
      try {
        await apiFetch(`/escuelita/${archive.id}`, { method: 'DELETE' });
        escuelitaDetail.style.display = 'none';
        loadEscuelita();
      } catch (err) {
        alert('Error al borrar');
      }
    }
  };

  document.getElementById('escuelita-pdf').onclick = () => {
    const totalSales = archive.items.reduce((sum, i) => sum + i.unitPrice, 0);
    const totalCost = archive.items.reduce((sum, i) => sum + i.unitCost, 0);
    const totalTax = totalSales * 0.11;
    const totalProfit = totalSales - totalCost - totalTax;

    const summary = {
      totalSales: `$${totalSales.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`,
      totalCost: `$${totalCost.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`,
      totalTax: `$${totalTax.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`,
      totalProfit: `$${totalProfit.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`
    };
    
    const pdfTitle = `Escuelita: ${archive.prefix} (${archive.save_date})`;
    exportToPDF(archive.items, summary, archive.margin, archive.original_date, pdfTitle);
  };

  document.getElementById('escuelita-excel').onclick = () => {
    const rows = [
      { 'Producto': `GRUPO: ${archive.prefix}`, 'Código': `Guardado: ${archive.save_date}`, 'Stock': '', 'Costo Unit.': '', 'Costo Total': '', 'P. Venta': '', 'Venta Total': '', 'Impuesto (11%)': '', 'Ganancia Neta': '' },
      ...archive.items.map(p => ({
        'Producto': p.description,
        'Código': p.code,
        'Stock': p.stock,
        'Costo Unit.': p.unitCost / p.stock,
        'Costo Total': p.unitCost,
        'P. Venta': p.unitPrice / p.stock,
        'Venta Total': p.unitPrice,
        'Impuesto (11%)': p.unitPrice * 0.11,
        'Ganancia Neta': p.profit
      })),
      { 'Producto': 'TOTAL DEL GRUPO', 'Código': '', 'Stock': totalStock, 'Costo Unit.': '', 'Costo Total': totalCost, 'P. Venta': '', 'Venta Total': totalSales, 'Impuesto (11%)': totalTax, 'Ganancia Neta': totalProfit }
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Escuelita");
    XLSX.writeFile(wb, `Escuelita_${archive.prefix}_${archive.save_date.replace(/\//g, '-')}.xlsx`);
  };
  
  escuelitaDetail.scrollIntoView({ behavior: 'smooth' });
}
