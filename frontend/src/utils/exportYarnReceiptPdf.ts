import { jsPDF } from 'jspdf';
import type { YarnReceipt } from '../types';

/**
 * Generates an official, beautifully formatted PDF document for an individual Yarn Inward Receipt.
 */
export function exportYarnReceiptPdf(receipt: YarnReceipt): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // Colors based on Everest Textile Mills Design System
  const cyprus = [0, 70, 67]; // #004643
  const cyprusDark = [0, 51, 48]; // #003330
  const emerald = [28, 124, 84]; // #1C7C54
  const slateText = [30, 41, 59];
  const slateMuted = [100, 116, 139];
  const panelBg = [245, 248, 247];
  const borderLine = [218, 228, 225];

  // 1. Header Banner
  doc.setFillColor(cyprus[0], cyprus[1], cyprus[2]);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Decorative top accent strip
  doc.setFillColor(emerald[0], emerald[1], emerald[2]);
  doc.rect(0, 27, pageWidth, 1.5, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('EVEREST TEXTILE MILLS', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(200, 225, 220);
  doc.text('ERP Enterprise Operations · Inward Raw Material Verification', margin, 17.5);
  doc.text('Industrial Area Phase II, Mill Division · Certified ISO 9001:2015', margin, 22);

  // Document Badge on top right
  doc.setFillColor(cyprusDark[0], cyprusDark[1], cyprusDark[2]);
  doc.roundedRect(pageWidth - margin - 58, 6, 58, 15, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('GOODS RECEIPT NOTE', pageWidth - margin - 29, 11.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(175, 215, 205);
  doc.text('YARN CONSIGNMENT INWARD', pageWidth - margin - 29, 16.5, { align: 'center' });

  // 2. Receipt Reference Card
  let y = 37;
  doc.setFillColor(panelBg[0], panelBg[1], panelBg[2]);
  doc.setDrawColor(borderLine[0], borderLine[1], borderLine[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('RECEIPT NUMBER', margin + 6, y + 7);
  doc.text('RECEIPT DATE', margin + 65, y + 7);
  doc.text('INVOICE / CHALLAN REF', margin + 120, y + 7);

  doc.setFont('courier', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(cyprus[0], cyprus[1], cyprus[2]);
  doc.text(receipt.id, margin + 6, y + 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text(receipt.date || '—', margin + 65, y + 14);

  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text(receipt.invoiceNo || 'DIRECT-INTAKE', margin + 120, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Official Mill Ledger Record', margin + 6, y + 19.5);
  doc.text('Intake Recorded Stamp', margin + 65, y + 19.5);
  doc.text('Supplier Commercial Doc', margin + 120, y + 19.5);

  // 3. Supplier & Source Information Grid
  y = 68;
  const colWidth = (contentWidth - 6) / 2;

  // Box 1: Supplier Info
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, colWidth, 30, 2, 2, 'FD');
  doc.setFillColor(cyprus[0], cyprus[1], cyprus[2]);
  doc.rect(margin, y, colWidth, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('SUPPLIER / VENDOR DETAILS', margin + 5, y + 4.2);

  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.setFontSize(7);
  doc.text('Vendor Name:', margin + 5, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text(receipt.supplier, margin + 5, y + 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Status: Verified Raw Material Supplier', margin + 5, y + 23);

  // Box 2: Procurement & Allocation Info
  const box2X = margin + colWidth + 6;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(box2X, y, colWidth, 30, 2, 2, 'FD');
  doc.setFillColor(cyprus[0], cyprus[1], cyprus[2]);
  doc.rect(box2X, y, colWidth, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('PURCHASE ORDER & ALLOCATION', box2X + 5, y + 4.2);

  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.setFontSize(7);
  doc.text('PO Reference:', box2X + 5, y + 12);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(receipt.purchaseOrderId ? cyprus[0] : slateMuted[0], receipt.purchaseOrderId ? cyprus[1] : slateMuted[1], receipt.purchaseOrderId ? cyprus[2] : slateMuted[2]);
  doc.text(receipt.purchaseOrderId || 'Direct / Spot Intake (No PO)', box2X + 5, y + 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Reserved For Sales Order:', box2X + 5, y + 23);
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(cyprus[0], cyprus[1], cyprus[2]);
  doc.text(receipt.forOrderId || 'General Stock (Unreserved)', box2X + 42, y + 23);

  // 4. Yarn Specification & Quantity Table
  y = 106;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(cyprus[0], cyprus[1], cyprus[2]);
  doc.text('MATERIAL CONSIGNMENT SPECIFICATION', margin, y);

  y += 4;
  // Table Header
  doc.setFillColor(cyprus[0], cyprus[1], cyprus[2]);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('#', margin + 4, y + 5.2);
  doc.text('FIBRE / YARN TYPE', margin + 14, y + 5.2);
  doc.text('SHADE / COLOUR', margin + 65, y + 5.2);
  doc.text('INVOICE REF', margin + 105, y + 5.2);
  doc.text('NET INWARD (KG)', margin + contentWidth - 4, y + 5.2, { align: 'right' });

  // Table Row
  y += 8;
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, 12, 'FD');
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('1', margin + 4, y + 7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(receipt.yarnType, margin + 14, y + 7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(receipt.colour, margin + 65, y + 7.5);
  doc.setFont('courier', 'normal');
  doc.text(receipt.invoiceNo, margin + 105, y + 7.5);

  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(emerald[0], emerald[1], emerald[2]);
  doc.text(`${receipt.quantityKg.toLocaleString()} kg`, margin + contentWidth - 4, y + 7.5, { align: 'right' });

  // Total Summary Row
  y += 12;
  doc.setFillColor(panelBg[0], panelBg[1], panelBg[2]);
  doc.rect(margin, y, contentWidth, 10, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(cyprus[0], cyprus[1], cyprus[2]);
  doc.text('TOTAL CONSIGNMENT NET WEIGHT:', margin + 14, y + 6.5);

  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(cyprus[0], cyprus[1], cyprus[2]);
  doc.text(`${receipt.quantityKg.toLocaleString()} kg`, margin + contentWidth - 4, y + 6.5, { align: 'right' });

  // 5. Verification & Gate Inward Checklist
  y += 18;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, contentWidth, 36, 2, 2, 'FD');

  doc.setFillColor(cyprusDark[0], cyprusDark[1], cyprusDark[2]);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('GATE PASS & WAREHOUSE INWARD COMPLIANCE', margin + 5, y + 4.2);

  const checkY = y + 12;
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  doc.text('[X] Weighbridge Gross & Tare Verified', margin + 6, checkY);
  doc.text('[X] Moisture & Lot Sample Checked', margin + 6, checkY + 7);
  doc.text('[X] Yarn Packaging & Cones Undamaged', margin + 6, checkY + 14);

  doc.text('[X] Supplier Delivery Challan Attached', margin + 95, checkY);
  doc.text('[X] Allocated to Designated Raw Material Bin', margin + 95, checkY + 7);
  doc.text('[X] Synchronized with Central ERP Inventory Ledger', margin + 95, checkY + 14);

  // 6. Signatures & Approvals Box
  y += 44;
  const sigBoxWidth = (contentWidth - 8) / 3;

  const signatures = [
    { title: 'RECEIVED BY', person: receipt.receivedBy || 'Store Inward Clerk', role: 'Gate / Weighbridge Officer' },
    { title: 'QUALITY CHECKED BY', person: 'Quality Control Dept.', role: 'QC Lab Inspector' },
    { title: 'AUTHORIZED BY', person: 'Plant Inventory Manager', role: 'Storekeeper / Mill Manager' },
  ];

  signatures.forEach((sig, index) => {
    const sx = margin + index * (sigBoxWidth + 4);
    doc.setFillColor(panelBg[0], panelBg[1], panelBg[2]);
    doc.setDrawColor(borderLine[0], borderLine[1], borderLine[2]);
    doc.roundedRect(sx, y, sigBoxWidth, 28, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(sig.title, sx + 4, y + 5.5);

    // Signature line
    doc.setDrawColor(borderLine[0], borderLine[1], borderLine[2]);
    doc.line(sx + 4, y + 18, sx + sigBoxWidth - 4, y + 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    doc.text(sig.person, sx + 4, y + 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(sig.role, sx + 4, y + 25.5);
  });

  // 7. Footer
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(
    `Everest Textile Mills ERP · Automated System Document · Generated on ${new Date().toLocaleString()}`,
    margin,
    footerY
  );
  doc.text('Page 1 of 1', pageWidth - margin, footerY, { align: 'right' });

  // Save the PDF
  const filename = `Yarn_Receipt_${receipt.id}_${receipt.date || 'doc'}.pdf`;
  doc.save(filename);
}

/**
 * Generates an official PDF report listing multiple yarn receipts (e.g. filtered view / archive).
 */
export function exportYarnReceiptsListPdf(receipts: YarnReceipt[], filterTitle = 'All Receipts'): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const cyprus = [0, 70, 67];
  const cyprusDark = [0, 51, 48];
  const emerald = [28, 124, 84];
  const slateText = [30, 41, 59];
  const slateMuted = [100, 116, 139];
  const borderLine = [218, 228, 225];

  // Header Banner
  doc.setFillColor(cyprus[0], cyprus[1], cyprus[2]);
  doc.rect(0, 0, pageWidth, 22, 'F');
  doc.setFillColor(emerald[0], emerald[1], emerald[2]);
  doc.rect(0, 21, pageWidth, 1, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('EVEREST TEXTILE MILLS', margin, 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(200, 225, 220);
  doc.text(`Yarn Inward Receipts Summary Register · Filter: ${filterTitle}`, margin, 16);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`Total Records: ${receipts.length}`, pageWidth - margin, 10, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(200, 225, 220);
  const totalKg = receipts.reduce((sum, r) => sum + Number(r.quantityKg || 0), 0);
  doc.text(`Total Inward Qty: ${totalKg.toLocaleString()} kg`, pageWidth - margin, 16, { align: 'right' });

  // Table Column Specifications
  const cols = [
    { label: 'Receipt ID', width: 26, align: 'left' },
    { label: 'Date', width: 22, align: 'left' },
    { label: 'Supplier / Mill', width: 52, align: 'left' },
    { label: 'PO Ref', width: 26, align: 'left' },
    { label: 'Yarn Type', width: 25, align: 'left' },
    { label: 'Colour / Shade', width: 28, align: 'left' },
    { label: 'Net (kg)', width: 25, align: 'right' },
    { label: 'Order Link', width: 26, align: 'left' },
    { label: 'Invoice #', width: 25, align: 'left' },
    { label: 'Received By', width: 14, align: 'left' },
  ];

  let y = 28;

  // Header Row
  const drawTableHeader = () => {
    doc.setFillColor(cyprusDark[0], cyprusDark[1], cyprusDark[2]);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);

    let curX = margin;
    cols.forEach(col => {
      const textX = col.align === 'right' ? curX + col.width - 2 : curX + 2;
      doc.text(col.label, textX, y + 4.8, { align: col.align as 'left' | 'right' });
      curX += col.width;
    });
    y += 7;
  };

  drawTableHeader();

  // Draw rows
  doc.setFontSize(7.5);
  receipts.forEach((r, idx) => {
    // Page overflow check
    if (y > pageHeight - 16) {
      doc.addPage('landscape');
      y = 15;
      drawTableHeader();
    }

    const rowBg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 249];
    doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
    doc.setDrawColor(borderLine[0], borderLine[1], borderLine[2]);
    doc.setLineWidth(0.15);
    doc.rect(margin, y, contentWidth, 6.5, 'FD');

    let curX = margin;

    // Receipt ID
    doc.setFont('courier', 'bold');
    doc.setTextColor(cyprus[0], cyprus[1], cyprus[2]);
    doc.text(r.id, curX + 2, y + 4.5);
    curX += cols[0].width;

    // Date
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(r.date || '', curX + 2, y + 4.5);
    curX += cols[1].width;

    // Supplier
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    const suppText = r.supplier.length > 28 ? r.supplier.substring(0, 26) + '...' : r.supplier;
    doc.text(suppText, curX + 2, y + 4.5);
    curX += cols[2].width;

    // PO Ref
    doc.setFont('courier', 'normal');
    doc.setTextColor(r.purchaseOrderId ? cyprus[0] : slateMuted[0], r.purchaseOrderId ? cyprus[1] : slateMuted[1], r.purchaseOrderId ? cyprus[2] : slateMuted[2]);
    doc.text(r.purchaseOrderId || 'Direct', curX + 2, y + 4.5);
    curX += cols[3].width;

    // Yarn Type
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    doc.text(r.yarnType, curX + 2, y + 4.5);
    curX += cols[4].width;

    // Colour
    doc.text(r.colour, curX + 2, y + 4.5);
    curX += cols[5].width;

    // Net kg
    doc.setFont('courier', 'bold');
    doc.setTextColor(emerald[0], emerald[1], emerald[2]);
    doc.text(r.quantityKg.toLocaleString(), curX + cols[6].width - 2, y + 4.5, { align: 'right' });
    curX += cols[6].width;

    // Order Link
    doc.setFont('courier', 'normal');
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    doc.text(r.forOrderId || '—', curX + 2, y + 4.5);
    curX += cols[7].width;

    // Invoice
    doc.text(r.invoiceNo, curX + 2, y + 4.5);
    curX += cols[8].width;

    // Received By
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    const recText = r.receivedBy.length > 8 ? r.receivedBy.substring(0, 7) + '..' : r.receivedBy;
    doc.text(recText, curX + 2, y + 4.5);

    y += 6.5;
  });

  // Footer
  const footerY = pageHeight - 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(`Generated on ${new Date().toLocaleString()} · Everest Textile Mills Raw Material ERP`, margin, footerY);

  const filename = `Yarn_Receipts_Register_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
