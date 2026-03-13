function exportToPDF(data, summary, margin, date, title = 'yInvDeli - Proyección de Ventas') {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(11, 36, 59); // Dark Tropical Blue
  doc.text(title, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Fecha de actualización: ${date}`, 14, 30);
  doc.text(`Margen aplicado: ${margin}%`, 14, 35);

  // Summary Cards (in a table-like format)
  doc.autoTable({
    startY: 45,
    head: [['Venta Total', 'Costo Total', 'Impuestos (11%)', 'Ganancia Neta']],
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
  const groups = {};
  data.forEach(p => {
    const prefix = p.code?.substring(0, 8) || 'OTRO';
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(p);
  });

  const tableRows = [];
  Object.keys(groups).sort().forEach(prefix => {
    const groupItems = groups[prefix];
    let groupTotals = { stock: 0, cost: 0, sale: 0, profit: 0 };

    // Group Header
    tableRows.push([
      { content: `GRUPO: ${prefix}`, colSpan: 8, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }
    ]);

    groupItems.forEach(p => {
      const tax = p.unitPrice * 0.11;
      groupTotals.stock += p.stock;
      groupTotals.cost += p.unitCost;
      groupTotals.sale += p.unitPrice;
      groupTotals.profit += p.profit;

      tableRows.push([
        p.description,
        p.stock.toLocaleString('es-ES'),
        (p.unitCost / p.stock).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        p.unitCost.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        (p.unitPrice / p.stock).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        p.unitPrice.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        tax.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        p.profit.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      ]);
    });

    // Subtotal Row
    const groupTax = groupTotals.sale * 0.11;
    tableRows.push([
      { content: `SUBTOTAL (${prefix})`, styles: { fontStyle: 'bold', fillColor: [255, 206, 68, 0.1] } },
      { content: groupTotals.stock.toLocaleString('es-ES'), styles: { fontStyle: 'bold', halign: 'right' } },
      '',
      { content: groupTotals.cost.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
      '',
      { content: groupTotals.sale.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: groupTax.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: groupTotals.profit.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } }
    ]);
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Producto', 'Stock', 'Costo Unit.', 'Costo Total', 'P. Venta', 'Venta Total', 'Imp. (11%)', 'Ganancia']],
    body: tableRows,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [11, 36, 59] }, // Tropical Dark Blue
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' }
    }
  });

  doc.save(`Reporte_Ventas_${date.replace(/\//g, '-')}.pdf`);
}
