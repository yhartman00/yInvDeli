import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export function exportToPDF(data, summary, margin, date) {
  const doc = jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(99, 102, 241);
  doc.text('yInvDeli - Proyección de Ventas', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Fecha de actualización: ${date}`, 14, 30);
  doc.text(`Margen aplicado: ${margin}%`, 14, 35);

  // Summary Cards (in a table-like format)
  doc.autoTable({
    startY: 45,
    head: [['Total Vales Venta', 'Costo Total', 'Impuestos (11%)', 'Ganancia Neta']],
    body: [[
      summary.totalSales,
      summary.totalCost,
      summary.totalTax,
      summary.totalProfit
    ]],
    theme: 'grid',
    headStyles: { fillGray: 200, textColor: 50, fontStyle: 'bold' },
    styles: { fontSize: 12, halign: 'center' }
  });

  // Products Table
  const tableRows = data.map(p => [
    p.description || p.name,
    p.stock.toLocaleString(),
    p.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 }),
    p.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }),
    p.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 }),
    p.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })
  ]);

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Producto', 'Stock', 'Costo Unit.', 'P. Venta', 'Venta Total', 'Ganancia']],
    body: tableRows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [99, 102, 241] },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' }
    }
  });

  doc.save(`Reporte_Ventas_${date.replace(/\//g, '-')}.pdf`);
}
