import Papa from 'papaparse';
import { exportToPDF } from './pdf-export.js';

const PIN_CORRECTO = '1234';
let currentData = [];
let lastUpdateDate = '';

// --- Login Logic ---
const pinInputs = document.querySelectorAll('#pin-container input');
const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');
const loginError = document.getElementById('login-error');

pinInputs.forEach((input, index) => {
  input.addEventListener('input', (e) => {
    if (e.target.value.length === 1 && index < pinInputs.length - 1) {
      pinInputs[index + 1].focus();
    }
    checkPin();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !e.target.value && index > 0) {
      pinInputs[index - 1].focus();
    }
  });
});

function checkPin() {
  const pin = Array.from(pinInputs).map(i => i.value).join('');
  if (pin.length === 4) {
    if (pin === PIN_CORRECTO) {
      loginScreen.style.display = 'none';
      dashboard.style.display = 'block';
      document.body.style.alignItems = 'flex-start';
      document.body.style.overflowY = 'auto';
    } else {
      loginError.style.display = 'block';
      pinInputs.forEach(i => i.value = '');
      pinInputs[0].focus();
    }
  }
}

// --- Dashboard Logic ---
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const tableSection = document.getElementById('table-section');
const productsTableBody = document.querySelector('#products-table tbody');
const marginInput = document.getElementById('margin-input');
const updateDateEl = document.getElementById('update-date');
const downloadBtn = document.getElementById('download-pdf');

uploadSection.addEventListener('click', () => fileInput.click());

uploadSection.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadSection.classList.add('active');
});

uploadSection.addEventListener('dragleave', () => {
  uploadSection.classList.remove('active');
});

uploadSection.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadSection.classList.remove('active');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

function handleFile(file) {
  Papa.parse(file, {
    header: false,
    skipEmptyLines: true,
    complete: (results) => {
      // Find the update date from the file if possible, or use current
      const rows = results.data;
      lastUpdateDate = new Date().toLocaleDateString('es-ES', { 
        day: '2-digit', month: '2-digit', year: 'numeric' 
      });

      // Parse data (skip header row 0)
      currentData = rows.slice(1).map(row => {
        const name = row[1];
        const stock = parseFloat(row[10]) || 0;
        const unitCost = parseFloat(row[13]?.replace(',', '.')) || 0;
        
        return { name, stock, unitCost };
      }).filter(p => p.stock > 0);

      updateDashboard();
      uploadSection.style.display = 'none';
      tableSection.style.display = 'block';
      downloadBtn.disabled = false;
      updateDateEl.textContent = `Datos actualizados al ${lastUpdateDate}`;
    }
  });
}

function updateDashboard() {
  const margin = parseFloat(marginInput.value) / 100 || 0;
  let totalSales = 0;
  let totalCost = 0;
  let totalTax = 0;
  let totalProfit = 0;

  productsTableBody.innerHTML = '';

  currentData.forEach(p => {
    const unitPrice = p.unitCost * (1 + margin);
    const itemSales = unitPrice * p.stock;
    const itemCost = p.unitCost * p.stock;
    const itemTax = itemSales * 0.11;
    const itemProfit = itemSales - itemCost - itemTax;

    totalSales += itemSales;
    totalCost += itemCost;
    totalTax += itemTax;
    totalProfit += itemProfit;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${p.name}</td>
      <td class="numeric">${p.stock.toLocaleString()}</td>
      <td class="numeric">$${p.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td class="numeric">$${unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td class="numeric">$${itemSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td class="numeric ${itemProfit >= 0 ? 'profit-positive' : 'profit-negative'}">
        $${itemProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </td>
    `;
    productsTableBody.appendChild(row);
  });

  document.getElementById('total-sales').textContent = `$${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  document.getElementById('total-cost').textContent = `$${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  document.getElementById('total-tax').textContent = `$${totalTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  document.getElementById('total-profit').textContent = `$${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

marginInput.addEventListener('input', updateDashboard);

downloadBtn.addEventListener('click', () => {
  const summary = {
    totalSales: document.getElementById('total-sales').textContent,
    totalCost: document.getElementById('total-cost').textContent,
    totalTax: document.getElementById('total-tax').textContent,
    totalProfit: document.getElementById('total-profit').textContent
  };

  const margin = marginInput.value;
  
  // Prepare data for PDF
  const pdfData = currentData.map(p => {
    const m = parseFloat(margin) / 100 || 0;
    const unitPrice = p.unitCost * (1 + m);
    const itemSales = unitPrice * p.stock;
    const itemTax = itemSales * 0.11;
    const itemCost = p.unitCost * p.stock;
    const itemProfit = itemSales - itemCost - itemTax;
    
    return {
      ...p,
      unitPrice,
      totalSales: itemSales,
      profit: itemProfit
    };
  });

  exportToPDF(pdfData, summary, margin, lastUpdateDate);
});
