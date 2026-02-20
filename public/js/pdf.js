// ═══════════════════════════════════════════════════════════
//  PDF Generator – Professional Quotation & Invoice
// ═══════════════════════════════════════════════════════════

const PDF_COLORS = {
    PRIMARY: [0, 82, 155],     // Deep blue brand accent
    DARK: [30, 41, 59],     // Slate-800 for body text
    SECONDARY: [100, 116, 139],  // Slate-500 for muted text
    LIGHT_BG: [248, 250, 252],  // Slate-50 row shading
    WHITE: [255, 255, 255],
    BORDER: [226, 232, 240],  // Slate-200
    ACCENT_LINE: [0, 82, 155],   // Accent color for lines
};

// ────────────────────────────────────
//  Helpers
// ────────────────────────────────────
const fmtCurrency = (v) => {
    const n = Number(v) || 0;
    return 'Rp ' + n.toLocaleString('id-ID', { minimumFractionDigits: 0 });
};

const fmtDate = (d) => {
    if (!d) return '-';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
};

// ────────────────────────────────────
//  Main entry
// ────────────────────────────────────
const printPDF = async (id) => {
    const { jsPDF } = window.jspdf;
    const store = window.store;
    const tx = await store.getTransaction(id);
    if (!tx) return alert('Transaction not found');

    const settings = store.companySettings;
    const client = store.clients.find(c => c.id === tx.clientId);

    if (tx.type === 'QUO') {
        generateQuotationPDF(jsPDF, tx, settings, client);
    } else if (tx.type === 'INV') {
        generateInvoicePDF(jsPDF, tx, settings, client);
    } else {
        // Fallback for DO, BAP, etc.
        const doc = new jsPDF();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(`${tx.type}: ${tx.docNumber}`, 20, 30);
        doc.save(`${tx.docNumber}.pdf`);
    }
};

// ═══════════════════════════════════════════════════════════
//  QUOTATION PDF
// ═══════════════════════════════════════════════════════════
function generateQuotationPDF(jsPDF, tx, settings, client) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const marginL = 18;
    const marginR = 18;
    const contentW = pageW - marginL - marginR;
    let y = 18;

    // ── HEADER: Logo + Company info (left)  |  QUOTATION title (right) ──
    const logoH = 22;
    if (settings.logo) {
        try { doc.addImage(settings.logo, 'AUTO', marginL, y, 22, logoH); } catch (e) { }
    }

    const infoX = settings.logo ? marginL + 28 : marginL;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...PDF_COLORS.PRIMARY);
    doc.text(settings.name || 'PT IDE SOLUSI INTEGRASI', infoX, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.SECONDARY);
    const addressLines = doc.splitTextToSize(settings.address || '', 80);
    doc.text(addressLines, infoX, y + 13);
    if (settings.phone) {
        doc.text(`Phone: ${settings.phone}`, infoX, y + 13 + addressLines.length * 3.5);
    }

    // Title "QUOTATION" on the right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(...PDF_COLORS.PRIMARY);
    doc.text('QUOTATION', pageW - marginR, y + 10, { align: 'right' });

    y += Math.max(logoH, 26) + 6;

    // ── Accent line ──────────────────────────
    doc.setDrawColor(...PDF_COLORS.PRIMARY);
    doc.setLineWidth(0.8);
    doc.line(marginL, y, pageW - marginR, y);
    y += 10;

    // ── Info Grid: Bill To (left) | Doc Info (right) ──
    // Left side – Client
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.SECONDARY);
    doc.text('BILL TO', marginL, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.DARK);
    doc.text(client?.name || tx.clientName || '-', marginL, y);
    y += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_COLORS.SECONDARY);
    if (client?.address) {
        const clientAddr = doc.splitTextToSize(client.address, 85);
        doc.text(clientAddr, marginL, y);
        y += clientAddr.length * 3.5;
    }
    if (client?.email) {
        doc.text(client.email, marginL, y);
    }

    // Right side – Document info
    const rightColX = pageW - marginR - 60;
    const rightValX = pageW - marginR;
    let ry = y - (client?.address ? 12 : 8);

    const drawInfoRow = (label, value) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...PDF_COLORS.SECONDARY);
        doc.text(label, rightColX, ry);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PDF_COLORS.DARK);
        doc.text(value, rightValX, ry, { align: 'right' });
        ry += 5.5;
    };

    drawInfoRow('Quotation No.', tx.docNumber || '-');
    drawInfoRow('Date', fmtDate(tx.date));
    drawInfoRow('Valid Until', fmtDate(new Date(new Date(tx.date).getTime() + 14 * 86400000)));

    y = Math.max(y + 6, ry + 4);

    // ── ITEMS TABLE ──────────────────────────
    const items = tx.items || [];

    // Resolve product names from store if not in API response
    const resolvedItems = items.map(item => {
        let name = item.itemName || item.item_name || '';
        let desc = item.itemDescription || item.item_description || '';
        if (!name && item.itemId) {
            const prod = window.store.products.find(p => p.id === item.itemId);
            if (prod) { name = prod.name; desc = prod.description || ''; }
        }
        return { ...item, resolvedName: name, resolvedDesc: desc };
    });

    const tableHeaders = [['No.', 'Description', 'Qty', 'Unit Price', 'Amount']];

    const tableBody = resolvedItems.map((item, i) => {
        const basePrice = Number(item.price) || 0;
        const margin = Number(item.margin) || 0;
        const sellingPrice = basePrice * (1 + margin / 100);
        const qty = Number(item.qty) || 0;
        const amount = sellingPrice * qty;
        const descText = item.resolvedName + (item.remarks ? '\n' + item.remarks : '');
        return [
            String(i + 1),
            descText,
            String(qty),
            fmtCurrency(sellingPrice),
            fmtCurrency(amount)
        ];
    });

    doc.autoTable({
        startY: y,
        head: tableHeaders,
        body: tableBody,
        theme: 'plain',
        margin: { left: marginL, right: marginR },
        tableWidth: contentW,
        styles: {
            font: 'helvetica',
            fontSize: 8.5,
            cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
            textColor: PDF_COLORS.DARK,
            lineColor: PDF_COLORS.BORDER,
            lineWidth: 0.2,
            valign: 'middle'
        },
        headStyles: {
            fillColor: PDF_COLORS.PRIMARY,
            textColor: PDF_COLORS.WHITE,
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 35, halign: 'right' },
            4: { cellWidth: 38, halign: 'right' }
        },
        alternateRowStyles: {
            fillColor: PDF_COLORS.LIGHT_BG
        },
        didParseCell: (data) => {
            // Add top border on head
            if (data.section === 'head') {
                data.cell.styles.lineWidth = 0;
            }
        }
    });

    y = doc.lastAutoTable.finalY + 6;

    // ── TOTALS ──────────────────────────
    let subtotal = 0;
    resolvedItems.forEach(item => {
        const basePrice = Number(item.price) || 0;
        const margin = Number(item.margin) || 0;
        const sellingPrice = basePrice * (1 + margin / 100);
        subtotal += sellingPrice * (Number(item.qty) || 0);
    });

    const totalsX = pageW - marginR - 75;
    const totalsValX = pageW - marginR;

    const drawTotalRow = (label, value, bold = false, bg = false) => {
        if (bg) {
            doc.setFillColor(...PDF_COLORS.PRIMARY);
            doc.roundedRect(totalsX - 4, y - 4, 79, 8, 1, 1, 'F');
        }
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(bold ? 10 : 9);
        doc.setTextColor(bg ? 255 : (bold ? PDF_COLORS.DARK[0] : PDF_COLORS.SECONDARY[0]), bg ? 255 : (bold ? PDF_COLORS.DARK[1] : PDF_COLORS.SECONDARY[1]), bg ? 255 : (bold ? PDF_COLORS.DARK[2] : PDF_COLORS.SECONDARY[2]));
        doc.text(label, totalsX, y);
        doc.text(value, totalsValX, y, { align: 'right' });
        y += bold ? 8 : 6;
    };

    drawTotalRow('Subtotal', fmtCurrency(subtotal));

    // PPN 11%
    const ppn = subtotal * 0.11;
    drawTotalRow('PPN (11%)', fmtCurrency(ppn));

    y += 1;
    const grandTotal = subtotal + ppn;
    drawTotalRow('GRAND TOTAL', fmtCurrency(grandTotal), true, true);

    y += 8;

    // ── Check page break ──
    const neededSpace = 80; // estimated space for T&C + signature
    if (y + neededSpace > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        y = 20;
    }

    // ── TERMS & CONDITIONS ──────────────────────────
    const terms = tx.terms || '';
    if (terms.trim()) {
        doc.setDrawColor(...PDF_COLORS.BORDER);
        doc.setLineWidth(0.3);
        doc.line(marginL, y, pageW - marginR, y);
        y += 7;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...PDF_COLORS.PRIMARY);
        doc.text('TERMS & CONDITIONS', marginL, y);
        y += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...PDF_COLORS.SECONDARY);

        const termLines = terms.split('\n').filter(l => l.trim());
        termLines.forEach(line => {
            const wrapped = doc.splitTextToSize(line.trim(), contentW);
            doc.text(wrapped, marginL, y);
            y += wrapped.length * 3.5 + 1;
        });

        y += 4;
    }

    // ── SIGNATURE AREA ──────────────────────────
    const sigY = Math.max(y + 5, doc.internal.pageSize.getHeight() - 55);

    // Check if we need a new page for signatures
    if (sigY + 40 > doc.internal.pageSize.getHeight() - 10) {
        doc.addPage();
        y = 30;
    } else {
        y = sigY;
    }

    const sigLeftX = marginL + 15;
    const sigRightX = pageW - marginR - 55;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_COLORS.SECONDARY);

    doc.text('Prepared by,', sigLeftX, y);
    doc.text('Accepted by,', sigRightX, y);

    y += 28;

    // Signature lines
    doc.setDrawColor(...PDF_COLORS.BORDER);
    doc.setLineWidth(0.4);
    doc.line(sigLeftX - 5, y, sigLeftX + 45, y);
    doc.line(sigRightX - 5, y, sigRightX + 45, y);

    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_COLORS.DARK);
    doc.text(settings.name || 'PT IDE SOLUSI INTEGRASI', sigLeftX, y);
    doc.text(client?.name || '-', sigRightX, y);

    // ── Save ──────────────────────────
    doc.save(`${tx.docNumber || 'Quotation'}.pdf`);
}

// ═══════════════════════════════════════════════════════════
//  INVOICE PDF  (existing logic preserved & enhanced)
// ═══════════════════════════════════════════════════════════
function generateInvoicePDF(jsPDF, tx, settings, client) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const marginL = 18;
    const marginR = 18;
    let y = 18;

    // Header
    if (settings.logo) {
        try { doc.addImage(settings.logo, 'AUTO', marginL, y, 22, 22); } catch (e) { }
    }

    const infoX = settings.logo ? marginL + 28 : marginL;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...PDF_COLORS.PRIMARY);
    doc.text(settings.name || 'PT IDE SOLUSI INTEGRASI', infoX, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.SECONDARY);
    doc.text(settings.address || '', infoX, y + 13, { maxWidth: 80 });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(...PDF_COLORS.PRIMARY);
    doc.text('INVOICE', pageW - marginR, y + 10, { align: 'right' });

    y += 32;

    doc.setDrawColor(...PDF_COLORS.PRIMARY);
    doc.setLineWidth(0.8);
    doc.line(marginL, y, pageW - marginR, y);
    y += 10;

    // Info
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.DARK);
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice No:', marginL, y);
    doc.setFont('helvetica', 'normal');
    doc.text(tx.docNumber || '-', marginL + 25, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Date:', 120, y);
    doc.setFont('helvetica', 'normal');
    doc.text(fmtDate(tx.date), 135, y);
    y += 6;

    if (client) {
        doc.setFont('helvetica', 'bold');
        doc.text('Bill To:', marginL, y);
        doc.setFont('helvetica', 'normal');
        doc.text(client.name, marginL + 25, y);
        y += 4;
        if (client.address) {
            doc.setFontSize(8);
            doc.setTextColor(...PDF_COLORS.SECONDARY);
            doc.text(client.address, marginL + 25, y, { maxWidth: 100 });
            y += 6;
        }
    }
    y += 6;

    // Table
    const items = tx.items || [];
    const resolvedItems = items.map(item => {
        let name = item.itemName || item.item_name || '';
        if (!name && item.itemId) {
            const prod = window.store.products.find(p => p.id === item.itemId);
            if (prod) name = prod.name;
        }
        return { ...item, resolvedName: name };
    });

    const headers = [['No.', 'Description', 'Qty', 'Unit Price', 'Total']];
    const body = resolvedItems.map((item, i) => {
        const price = Number(item.price) || 0;
        const margin = Number(item.margin) || 0;
        const sellingPrice = price * (1 + margin / 100);
        const total = sellingPrice * (Number(item.qty) || 0);
        return [
            String(i + 1),
            item.resolvedName || '-',
            String(item.qty),
            fmtCurrency(sellingPrice),
            fmtCurrency(total)
        ];
    });

    doc.autoTable({
        startY: y,
        head: headers,
        body: body,
        theme: 'plain',
        margin: { left: marginL, right: marginR },
        styles: {
            fontSize: 8.5,
            cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
            textColor: PDF_COLORS.DARK,
            lineColor: PDF_COLORS.BORDER,
            lineWidth: 0.2
        },
        headStyles: {
            fillColor: PDF_COLORS.PRIMARY,
            textColor: PDF_COLORS.WHITE,
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 35, halign: 'right' },
            4: { cellWidth: 38, halign: 'right' }
        },
        alternateRowStyles: { fillColor: PDF_COLORS.LIGHT_BG }
    });

    y = doc.lastAutoTable.finalY + 8;

    // Totals
    let subtotal = 0;
    resolvedItems.forEach(item => {
        const price = Number(item.price) || 0;
        const margin = Number(item.margin) || 0;
        const sellingPrice = price * (1 + margin / 100);
        subtotal += sellingPrice * (Number(item.qty) || 0);
    });

    const totX = pageW - marginR - 75;
    const totVX = pageW - marginR;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.SECONDARY);
    doc.text('Subtotal', totX, y);
    doc.text(fmtCurrency(subtotal), totVX, y, { align: 'right' });
    y += 6;

    const ppn = subtotal * 0.11;
    doc.text('PPN (11%)', totX, y);
    doc.text(fmtCurrency(ppn), totVX, y, { align: 'right' });
    y += 7;

    doc.setFillColor(...PDF_COLORS.PRIMARY);
    doc.roundedRect(totX - 4, y - 4, 79, 8, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('GRAND TOTAL', totX, y);
    doc.text(fmtCurrency(subtotal + ppn), totVX, y, { align: 'right' });

    doc.save(`${tx.docNumber}.pdf`);
}

window.printPDF = printPDF;
