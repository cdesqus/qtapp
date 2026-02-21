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
    } else if (tx.type === 'DO') {
        generateDeliveryOrderPDF(jsPDF, tx, settings, client);
    } else if (tx.type === 'BAP') {
        generateBASTPDF(jsPDF, tx, settings, client);
    } else if (tx.type === 'INV') {
        await generateInvoicePDF(jsPDF, tx, settings, client);
    } else {
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
    let addrText = (settings.address || '').replace(/Tebet,\s*/i, 'Tebet,\n');
    if (settings.phone) addrText += `  Phone: ${settings.phone}`;
    const addressLines = doc.splitTextToSize(addrText, 105);
    doc.text(addressLines, infoX, y + 13);

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

    // ── Info Grid: To (left) | Doc Info (right) ──
    // Left side – Client
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.SECONDARY);
    doc.text('TO', marginL, y);
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

    const tableHeaders = [['NO', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'AMOUNT']];

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
            lineWidth: 0.1,
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

    // PPN
    const ppn = subtotal * 0.11;
    drawTotalRow('PPN', fmtCurrency(ppn));

    y += 1;
    const grandTotal = subtotal + ppn;
    drawTotalRow('GRAND TOTAL', fmtCurrency(grandTotal), true, true);

    y += 10;

    // ── TERMS & CONDITIONS (after totals, before signature) ──
    const defaultTerms = '1. Prices are quoted excluding VAT\n2. PO that has been received by PT IDE SOLUSI INTEGRASI cannot be canceled';
    const terms = (tx.terms && typeof tx.terms === 'string' && tx.terms.trim().length > 0) ? tx.terms : defaultTerms;
    if (terms.trim()) {
        doc.setDrawColor(...PDF_COLORS.BORDER);
        doc.setLineWidth(0.3);
        doc.line(marginL, y, pageW - marginR, y);
        y += 6;

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

    // ── Check page break ──
    const neededSpace = 55;
    if (y + neededSpace > doc.internal.pageSize.getHeight() - 10) {
        doc.addPage();
        y = 20;
    }

    // ── SIGNATURE AREA ──
    y += 5;
    const sigLeftX = marginL + 15;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_COLORS.SECONDARY);
    doc.text('Prepared by,', sigLeftX, y);

    // Add user signature image if available
    const currentUser = window.store.currentUser;
    const loggedUser = (window.store.users || []).find(u => u.username === currentUser?.username);
    if (loggedUser?.signature) {
        try {
            doc.addImage(loggedUser.signature, 'AUTO', sigLeftX - 3, y + 2, 50, 25);
        } catch (e) { }
    }

    y += 30;

    // Signature line
    doc.setDrawColor(...PDF_COLORS.BORDER);
    doc.setLineWidth(0.4);
    doc.line(sigLeftX - 5, y, sigLeftX + 50, y);

    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_COLORS.DARK);
    doc.text(currentUser?.username || 'User', sigLeftX, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_COLORS.SECONDARY);
    doc.text(settings.name || 'PT IDE SOLUSI INTEGRASI', sigLeftX, y);

    // ── Save ──
    doc.save(`${tx.docNumber || 'Quotation'}.pdf`);
}

// ═══════════════════════════════════════════════════════════
//  DELIVERY ORDER PDF
// ═══════════════════════════════════════════════════════════
function generateDeliveryOrderPDF(jsPDF, tx, settings, client) {
    const DO_COLORS = {
        PRIMARY: [0, 82, 155],       // Deep blue (same as Quotation)
        PRIMARY_DARK: [0, 65, 130],
        DARK: [30, 41, 59],
        SECONDARY: [100, 116, 139],
        LIGHT_BG: [248, 250, 252],   // Slate-50 row shading
        WHITE: [255, 255, 255],
        BORDER: [226, 232, 240],     // Slate-200
        ACCENT: [0, 82, 155],       // Deep blue accent
    };

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginL = 18;
    const marginR = 18;
    const contentW = pageW - marginL - marginR;
    let y = 18;

    // ── HEADER: Logo + Company Info (left) | DELIVERY ORDER title (right) ──
    const logoH = 15;
    if (settings.logo) {
        try { doc.addImage(settings.logo, 'AUTO', marginL, y, 15, logoH); } catch (e) { }
    }

    const infoX = settings.logo ? marginL + 20 : marginL;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...DO_COLORS.PRIMARY);
    doc.text(settings.name || 'PT IDE SOLUSI INTEGRASI', infoX, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...DO_COLORS.SECONDARY);

    let companyLine = (settings.address || '').replace(/Tebet,\s*/i, 'Tebet,\n');
    if (settings.phone) companyLine += `  \u2022  Telp: ${settings.phone}`;
    if (settings.email) companyLine += `  \u2022  ${settings.email}`;
    const companyLines = doc.splitTextToSize(companyLine, 100);
    doc.text(companyLines, infoX, y + 13);
    const addrEndY = y + 13 + (companyLines.length - 1) * 3.5;
    if (settings.npwp) {
        doc.text(`NPWP: ${settings.npwp}`, infoX, addrEndY + 4);
    }

    // Title "DELIVERY ORDER" – large, bold, right-aligned
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...DO_COLORS.PRIMARY);
    doc.text('DELIVERY ORDER', pageW - marginR, y + 8, { align: 'right' });


    y += Math.max(logoH, 22) + 6;

    // ── Accent line ──
    doc.setDrawColor(...DO_COLORS.PRIMARY);
    doc.setLineWidth(0.8);
    doc.line(marginL, y, pageW - marginR, y);
    doc.setDrawColor(...DO_COLORS.ACCENT);
    doc.setLineWidth(0.3);
    doc.line(marginL, y + 1.2, pageW - marginR, y + 1.2);
    y += 10;

    // ── Info Grid: Ship To (left) | Document Info (right) ──
    const leftStart = y;

    // LEFT – Ship To
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...DO_COLORS.PRIMARY);
    doc.text('SHIP TO', marginL, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...DO_COLORS.DARK);
    doc.text(client?.name || tx.clientName || '-', marginL, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...DO_COLORS.SECONDARY);
    if (client?.address) {
        const clientAddr = doc.splitTextToSize(client.address, 85);
        doc.text(clientAddr, marginL, y);
        y += clientAddr.length * 3.8;
    }
    if (client?.phone) {
        doc.text(`Phone: ${client.phone}`, marginL, y);
        y += 4;
    }
    if (client?.email) {
        doc.text(client.email, marginL, y);
        y += 4;
    }

    // RIGHT – Document Info
    const rightColX = pageW - marginR - 58;
    const rightValX = pageW - marginR;
    let ry = leftStart;

    const drawInfoRow = (label, value, isBold = false) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...DO_COLORS.SECONDARY);
        doc.text(label, rightColX, ry);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setFontSize(isBold ? 9.5 : 8.5);
        doc.setTextColor(...DO_COLORS.DARK);
        doc.text(value, rightValX, ry, { align: 'right' });
        ry += isBold ? 7 : 5.5;
    };

    drawInfoRow('DO Number', tx.docNumber || '-', true);
    if (tx.customerPo) {
        drawInfoRow('PO Reference', tx.customerPo);
    }
    drawInfoRow('Date', fmtDate(tx.date));

    y = Math.max(y + 8, ry + 6);

    // ── ITEMS TABLE ──
    const items = tx.items || [];

    const resolvedItems = items.map(item => {
        let name = item.itemName || item.item_name || '';
        let desc = item.itemDescription || item.item_description || '';
        if (!name && item.itemId) {
            const prod = window.store.products.find(p => p.id === item.itemId);
            if (prod) { name = prod.name; desc = prod.description || ''; }
        }
        return { ...item, resolvedName: name, resolvedDesc: desc };
    });

    const tableHeaders = [['NO', 'DESCRIPTION', 'QTY', 'UNIT', 'SERIAL NUMBER', 'REMARKS']];

    const tableBody = resolvedItems.map((item, i) => {
        const qty = Number(item.qty) || 0;
        const descText = item.resolvedName + (item.resolvedDesc ? '\n' + item.resolvedDesc : '');
        return [
            String(i + 1),
            descText,
            String(qty),
            item.unit || 'Pcs',
            item.sn || item.serialNumber || item.serial_number || '',
            item.remarks || ''
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
            fontSize: 9,
            cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
            textColor: DO_COLORS.DARK,
            lineColor: DO_COLORS.BORDER,
            lineWidth: 0.1,
            valign: 'middle',
            minCellHeight: 10
        },
        headStyles: {
            fillColor: DO_COLORS.PRIMARY,
            textColor: DO_COLORS.WHITE,
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 16, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 18, halign: 'center' },
            3: { cellWidth: 18, halign: 'center' },
            4: { cellWidth: 38 },
            5: { cellWidth: 38 }
        },
        alternateRowStyles: {
            fillColor: DO_COLORS.LIGHT_BG
        },
        didParseCell: (data) => {
            if (data.section === 'head') {
                data.cell.styles.lineWidth = 0;
            }
        }
    });

    y = doc.lastAutoTable.finalY + 10;

    // ── NOTES / REMARKS AREA ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...DO_COLORS.PRIMARY);
    doc.text('CATATAN PENGIRIMAN:', marginL, y);
    y += 5;

    // Draw empty box for handwritten notes
    doc.setDrawColor(...DO_COLORS.BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginL, y, contentW, 18, 2, 2);

    // Pre-fill if terms exist
    const terms = tx.terms || '';
    if (terms.trim()) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...DO_COLORS.SECONDARY);
        const termLines = terms.split('\n').filter(l => l.trim());
        let ty = y + 5;
        termLines.forEach(line => {
            if (ty < y + 16) {
                doc.text(line.trim(), marginL + 4, ty);
                ty += 3.5;
            }
        });
    }

    y += 25;

    // ── Check page break for signatures ──
    const sigSpace = 65;
    if (y + sigSpace > pageH - 15) {
        doc.addPage();
        y = 25;
    }

    // ── SIGNATURE AREA – Pengirim & Penerima (no signature images, no stamps) ──
    doc.setDrawColor(...DO_COLORS.BORDER);
    doc.setLineWidth(0.3);
    doc.line(marginL, y, pageW - marginR, y);
    y += 8;

    const sigColW = (contentW - 20) / 2;
    const sigLeftX = marginL + sigColW / 2 - 5;
    const sigRightX = pageW - marginR - sigColW / 2 + 5;

    // Column headers
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...DO_COLORS.PRIMARY);
    doc.text('PENGIRIM / SENDER', sigLeftX, y, { align: 'center' });
    doc.text('PENERIMA / RECEIVER', sigRightX, y, { align: 'center' });

    y += 22;

    // Signature lines
    doc.setDrawColor(...DO_COLORS.BORDER);
    doc.setLineWidth(0.4);
    doc.line(sigLeftX - 25, y, sigLeftX + 25, y);
    doc.line(sigRightX - 25, y, sigRightX + 25, y);

    y += 4;

    // Names under lines
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...DO_COLORS.DARK);
    const currentUser = window.store.currentUser;
    doc.text(currentUser?.username || 'Authorized', sigLeftX, y, { align: 'center' });
    doc.text('(                                    )', sigRightX, y, { align: 'center' });

    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...DO_COLORS.SECONDARY);
    doc.text(settings.name || 'PT IDE SOLUSI INTEGRASI', sigLeftX, y, { align: 'center' });
    doc.text(client?.name || 'Customer', sigRightX, y, { align: 'center' });

    // ── Footer line ──
    const footerY = pageH - 10;
    doc.setDrawColor(...DO_COLORS.ACCENT);
    doc.setLineWidth(0.3);
    doc.line(marginL, footerY, pageW - marginR, footerY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...DO_COLORS.SECONDARY);
    doc.text('This document confirms delivery of goods listed above. Please verify items upon receipt.', pageW / 2, footerY + 4, { align: 'center' });

    // ── Save ──
    doc.save(`${tx.docNumber || 'DeliveryOrder'}.pdf`);
}

// ═══════════════════════════════════════════════════════════
//  BAST (HANDOVER PROTOCOL) PDF
// ═══════════════════════════════════════════════════════════
function generateBASTPDF(jsPDF, tx, settings, client) {
    const C = {
        PRIMARY: [0, 82, 155],
        PRIMARY_D: [0, 65, 130],
        DARK: [30, 41, 59],
        SECONDARY: [100, 116, 139],
        LIGHT_BG: [248, 250, 252],
        WHITE: [255, 255, 255],
        BORDER: [226, 232, 240],
        SUCCESS: [22, 163, 74],
        SUCCESS_BG: [220, 252, 231],
        ACCENT2: [59, 130, 246],
    };

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const mL = 18, mR = 18;
    const W = pageW - mL - mR;
    let y = 18;

    // ─────────────────────────────────────────────────
    //  WATERMARK – low-opacity logo in center
    // ─────────────────────────────────────────────────
    if (settings.logo) {
        try {
            const wmSize = 90;
            const wmX = (pageW - wmSize) / 2;
            const wmY = (pageH - wmSize) / 2;
            doc.saveGraphicsState();
            doc.setGState(new doc.GState({ opacity: 0.04 }));
            doc.addImage(settings.logo, 'AUTO', wmX, wmY, wmSize, wmSize);
            doc.restoreGraphicsState();
        } catch (e) { /* logo unavailable */ }
    }



    // ─────────────────────────────────────────────────
    //  HEADER – Centered logo + company + title
    // ─────────────────────────────────────────────────
    const logoH = 18;
    if (settings.logo) {
        try {
            doc.addImage(settings.logo, 'AUTO', (pageW - 18) / 2, y, 18, logoH);
        } catch (e) { }
    }
    y += logoH + 4;

    // Company name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...C.PRIMARY);
    doc.text(settings.name || 'PT IDE SOLUSI INTEGRASI', pageW / 2, y, { align: 'center' });
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.SECONDARY);
    let addrText = (settings.address || '').replace(/\n/g, '  ·  ');
    if (settings.phone) addrText += `  ·  Phone : ${settings.phone}`;
    doc.text(addrText, pageW / 2, y, { align: 'center' });
    y += 10;

    // Title: HANDOVER PROTOCOL
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...C.PRIMARY);
    doc.text('HANDOVER PROTOCOL', pageW / 2, y, { align: 'center' });
    y += 2;

    // Navy blue underline accent
    const titleW = doc.getTextWidth('HANDOVER PROTOCOL');
    doc.setDrawColor(...C.PRIMARY);
    doc.setLineWidth(1.0);
    doc.line((pageW - titleW) / 2, y, (pageW + titleW) / 2, y);
    y += 10;

    // ─────────────────────────────────────────────────
    //  REFERENCE INFO GRID
    // ─────────────────────────────────────────────────
    // Draw info box with HUD-style border
    const infoBoxH = 32;
    doc.setDrawColor(...C.BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(mL, y, W, infoBoxH, 2, 2, 'S');

    // Vertical divider
    const midX = pageW / 2;
    doc.setDrawColor(...C.BORDER);
    doc.line(midX, y + 4, midX, y + infoBoxH - 4);

    // Left column – Client info
    let ly = y + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.SECONDARY);
    doc.text('RECIPIENT', mL + 6, ly);
    ly += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...C.DARK);
    doc.text(client?.name || tx.clientName || '-', mL + 6, ly);
    ly += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.SECONDARY);
    if (client?.address) {
        const cAddr = doc.splitTextToSize(client.address, midX - mL - 14);
        doc.text(cAddr, mL + 6, ly);
    }

    // Right column – Document info
    let ry = y + 8;
    const rL = midX + 6;
    const rR = pageW - mR - 6;

    const drawRef = (label, value) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...C.SECONDARY);
        doc.text(label, rL, ry);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.DARK);
        doc.text(value, rR, ry, { align: 'right' });
        ry += 5.5;
    };

    drawRef('Document No.', tx.docNumber || '-');
    drawRef('Date', fmtDate(tx.date));
    drawRef('PO Reference', tx.customerPo || '-');

    y += infoBoxH + 8;

    // Opening statement referencing PO
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.DARK);
    const openingText = `In accordance with Purchase Order ${tx.customerPo ? '"' + tx.customerPo + '"' : '(ref. above)'}, the following items/services have been completed and are hereby handed over for acceptance:`;
    const openingLines = doc.splitTextToSize(openingText, W);
    doc.text(openingLines, mL, y);
    y += openingLines.length * 4 + 4;

    // ─────────────────────────────────────────────────
    //  ITEM TABLE – HUD grid style with status badges
    // ─────────────────────────────────────────────────
    const items = tx.items || [];
    const resolvedItems = items.map(item => {
        let name = item.itemName || item.item_name || '';
        if (!name && item.itemId) {
            const prod = window.store.products.find(p => p.id === item.itemId);
            if (prod) name = prod.name;
        }
        return { ...item, resolvedName: name };
    });

    const tableHeaders = [['NO', 'DESCRIPTION', 'QTY', 'STATUS']];
    const tableBody = resolvedItems.map((item, i) => [
        String(i + 1),
        item.resolvedName || '-',
        String(item.qty || 0),
        'Completed'
    ]);

    doc.autoTable({
        startY: y,
        head: tableHeaders,
        body: tableBody,
        theme: 'plain',
        margin: { left: mL, right: mR },
        tableWidth: W,
        styles: {
            font: 'helvetica',
            fontSize: 8.5,
            cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
            textColor: C.DARK,
            lineColor: C.BORDER,
            lineWidth: 0.15,
            valign: 'middle'
        },
        headStyles: {
            fillColor: C.PRIMARY,
            textColor: C.WHITE,
            fontStyle: 'bold',
            fontSize: 7.5,
            halign: 'center',
            lineWidth: 0
        },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 28, halign: 'center', fontStyle: 'bold' }
        },
        alternateRowStyles: {
            fillColor: C.LIGHT_BG
        },
        didParseCell: (data) => {
            // Style the STATUS column with badge colors
            if (data.section === 'body' && data.column.index === 3) {
                data.cell.styles.textColor = C.SUCCESS;
                data.cell.styles.fillColor = C.SUCCESS_BG;
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 7;
            }
        }
    });

    y = doc.lastAutoTable.finalY + 10;

    // ─────────────────────────────────────────────────
    //  LEGAL STATEMENT
    // ─────────────────────────────────────────────────
    // Accent bar on left
    const stmtH = 16;
    doc.setFillColor(...C.PRIMARY);
    doc.rect(mL, y - 2, 2, stmtH, 'F');

    // Background
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(mL + 4, y - 2, W - 4, stmtH, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.DARK);
    const legalText = 'By signing this document, the Recipient acknowledges that the items/services mentioned above have been received in good condition and fulfill the agreed specifications.';
    const legalLines = doc.splitTextToSize(legalText, W - 14);
    doc.text(legalLines, mL + 8, y + 3);

    y += stmtH + 12;

    // ─────────────────────────────────────────────────
    //  SIGNATURE AREA – Deliverer & Receiver
    // ─────────────────────────────────────────────────
    const sigNeeded = 65;
    if (y + sigNeeded > pageH - 15) {
        doc.addPage();
        y = 25;
        // Re-draw watermark on new page
        if (settings.logo) {
            try {
                doc.saveGraphicsState();
                doc.setGState(new doc.GState({ opacity: 0.04 }));
                doc.addImage(settings.logo, 'AUTO', (pageW - 90) / 2, (pageH - 90) / 2, 90, 90);
                doc.restoreGraphicsState();
            } catch (e) { }
        }
    }

    // Column layout
    const sigColW = (W - 30) / 2;
    const sigLX = mL + sigColW / 2 + 5;
    const sigRX = pageW - mR - sigColW / 2 - 5;

    // HUD box for each signature
    const sigBoxW = sigColW + 10;
    const sigBoxH = 52;

    // Left signature box
    doc.setDrawColor(...C.BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(mL, y, sigBoxW, sigBoxH, 2, 2, 'S');

    // Right signature box
    const rBoxX = pageW - mR - sigBoxW;
    doc.setDrawColor(...C.BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(rBoxX, y, sigBoxW, sigBoxH, 2, 2, 'S');

    // Headers
    let sy = y + 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.PRIMARY);
    doc.text('HANDED OVER BY', sigLX, sy, { align: 'center' });
    doc.text('ACCEPTED BY', sigRX, sy, { align: 'center' });

    sy += 3.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.SECONDARY);
    doc.text('Deliverer', sigLX, sy, { align: 'center' });
    doc.text('Receiver', sigRX, sy, { align: 'center' });

    // Signature space
    sy += 25;

    // Signature lines
    doc.setDrawColor(...C.BORDER);
    doc.setLineWidth(0.4);
    doc.line(sigLX - 25, sy, sigLX + 25, sy);
    doc.line(sigRX - 25, sy, sigRX + 25, sy);

    sy += 4;

    // Names
    const currentUser = window.store.currentUser;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.DARK);
    doc.text(currentUser?.username || 'Authorized', sigLX, sy, { align: 'center' });
    doc.text('(                                    )', sigRX, sy, { align: 'center' });

    sy += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.SECONDARY);
    doc.text(settings.name || 'PT IDE SOLUSI INTEGRASI', sigLX, sy, { align: 'center' });
    doc.text(client?.name || 'Customer', sigRX, sy, { align: 'center' });

    // ─────────────────────────────────────────────────
    //  FOOTER
    // ─────────────────────────────────────────────────
    const footY = pageH - 10;

    doc.setDrawColor(...C.BORDER);
    doc.setLineWidth(0.3);
    doc.line(mL, footY, pageW - mR, footY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.SECONDARY);
    doc.text('This document constitutes official acceptance of delivered items/services. Retain for your records.', pageW / 2, footY + 3.5, { align: 'center' });

    // Document ID watermark text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(200, 200, 200);
    doc.text(`REF: ${tx.docNumber || '-'}`, pageW / 2, footY + 7, { align: 'center' });

    // ── Save ──
    doc.save(`${tx.docNumber || 'BAST'}.pdf`);
}


// ═══════════════════════════════════════════════════════════
//  INVOICE PDF  — Professional Corporate Layout
// ═══════════════════════════════════════════════════════════

// Helper: Indonesian number to words
function terbilangID(n) {
    const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan',
        'sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas',
        'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas'];
    function ratusan(x) {
        if (x === 0) return '';
        if (x < 20) return satuan[x];
        if (x < 100) return satuan[Math.floor(x / 10)] + ' puluh' + (x % 10 ? ' ' + satuan[x % 10] : '');
        const h = Math.floor(x / 100), r = x % 100;
        return (h === 1 ? 'seratus' : satuan[h] + ' ratus') + (r ? ' ' + ratusan(r) : '');
    }
    n = Math.round(n);
    if (n === 0) return 'Nol Rupiah';
    let res = '';
    const m = Math.floor(n / 1000000000);
    const jt = Math.floor((n % 1000000000) / 1000000);
    const rb = Math.floor((n % 1000000) / 1000);
    const st = n % 1000;
    if (m) res += ratusan(m) + ' miliar ';
    if (jt) res += ratusan(jt) + ' juta ';
    if (rb) res += (rb === 1 ? 'seribu' : ratusan(rb) + ' ribu') + ' ';
    if (st) res += ratusan(st);
    res = res.trim();
    return res.charAt(0).toUpperCase() + res.slice(1) + ' Rupiah';
}

// Helper: generate QR code as PNG data URL
async function genQRDataURL(text) {
    try {
        if (typeof QRCode === 'undefined') return null;
        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, text, { width: 130, margin: 1, color: { dark: '#00529b', light: '#ffffff' } });
        return canvas.toDataURL('image/png');
    } catch (e) { return null; }
}

async function generateInvoicePDF(jsPDF, tx, settings, client) {
    const C = {
        PRIMARY: [0, 82, 155],
        PRIMARY_D: [0, 55, 110],
        DARK: [30, 41, 59],
        SECONDARY: [100, 116, 139],
        LIGHT_BG: [248, 250, 252],
        WHITE: [255, 255, 255],
        BORDER: [226, 232, 240],
        GREEN: [22, 163, 74],
        GREEN_LT: [220, 252, 231],
        AMBER: [180, 83, 9],
    };

    // Parse invoice metadata
    let meta = {};
    try { meta = JSON.parse(tx.invoiceNotes || tx.invoice_notes || '{}'); } catch (e) { }
    const dueDate = meta.dueDate || '';
    const attention = meta.attention || '';
    const doRef = meta.doRef || '';
    const bastRef = meta.bastRef || '';
    const isPaid = (tx.status || '').toLowerCase() === 'paid';

    // Build QR content from bank info
    const bankQrText = [
        settings.bankName ? `Bank: ${settings.bankName}` : '',
        settings.bankAccount ? `No Rek: ${settings.bankAccount}` : '',
        settings.bankHolder ? `A.N: ${settings.bankHolder}` : '',
        `Invoice: ${tx.docNumber || ''}`,
    ].filter(Boolean).join('\n');

    const qrDataUrl = await genQRDataURL(bankQrText || tx.docNumber || 'IDE ERP');

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const mL = 18, mR = 18;
    const W = pageW - mL - mR;
    let y = 18;

    // ── LUNAS WATERMARK (if paid) ──────────────────────────────────
    if (isPaid) {
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.12 }));
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(88);
        doc.setTextColor(...C.GREEN);
        doc.text('LUNAS', pageW / 2, pageH / 2 + 20, { align: 'center', angle: 38 });
        doc.restoreGraphicsState();
    }

    // ── HEADER: Logo + Company Name (left) | "INVOICE" (right) ───
    // Logo height matched to cap-height of 12pt bold (~8mm)
    const logoSz = 8;

    // Logo — left, vertically centered with company name
    if (settings.logo) {
        try { doc.addImage(settings.logo, 'AUTO', mL, y, logoSz, logoSz); } catch (e) { }
    }
    const nameX = settings.logo ? mL + logoSz + 3 : mL;

    // Company name beside logo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...C.PRIMARY);
    doc.text(settings.name || 'PT IDE SOLUSI INTEGRASI', nameX, y + 6);

    // "INVOICE" title — right side, large
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(...C.PRIMARY);
    doc.text('INVOICE', pageW - mR, y + 10, { align: 'right' });

    // Address & phone below company name (aligned to nameX) — all on one line flow
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.SECONDARY);
    let addrStr = (settings.address || '').replace(/\n/g, ' ').trim();
    if (settings.phone) addrStr += `  •  Telp: ${settings.phone}`;
    const addrMaxW = (pageW - mL - mR) / 2 - 4;
    let addrY = y + 11;  // start just below company name text
    const addrWrapped = doc.splitTextToSize(addrStr, addrMaxW);
    doc.text(addrWrapped, nameX, addrY);
    addrY += addrWrapped.length * 3.4;
    if (settings.npwp) {
        doc.text(`NPWP: ${settings.npwp}`, nameX, addrY);
        addrY += 3.4;
    }

    y = Math.max(addrY, y + 16) + 4;

    // ── Accent separator line ────────────────────────────────────
    doc.setDrawColor(...C.PRIMARY);
    doc.setLineWidth(1.0);
    doc.line(mL, y, pageW - mR, y);
    doc.setLineWidth(0.25);
    doc.setDrawColor(...C.BORDER);
    doc.line(mL, y + 1.5, pageW - mR, y + 1.5);
    y += 10;

    // ── BILL FROM (left) | DOC INFO (right) ───────────────────────
    const colMid = pageW / 2 - 5;
    const startInfoY = y;

    // LEFT — BILL TO
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.PRIMARY);
    doc.text('BILL TO', mL, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...C.DARK);
    doc.text(client?.name || tx.clientName || '-', mL, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.SECONDARY);
    if (client?.address) {
        const addrLines = doc.splitTextToSize(client.address, colMid - mL - 6);
        doc.text(addrLines, mL, y);
        y += addrLines.length * 3.8;
    }
    if (attention) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.DARK);
        doc.text(`u.p. ${attention}`, mL, y);
        y += 4.5;
    }

    // RIGHT — Doc Info
    const rLX = colMid + 8;
    const rRX = pageW - mR;
    let ry = startInfoY;

    const drawDocRow = (label, value, bold = false, hilight = false) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...C.SECONDARY);
        doc.text(label, rLX, ry);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(bold ? 10 : 8.5);
        doc.setTextColor(hilight ? C.PRIMARY[0] : C.DARK[0], hilight ? C.PRIMARY[1] : C.DARK[1], hilight ? C.PRIMARY[2] : C.DARK[2]);
        doc.text(value, rRX, ry, { align: 'right' });
        ry += bold ? 7 : 5.5;
    };

    drawDocRow('Invoice No.', tx.docNumber || '-', true, true);
    drawDocRow('Invoice Date', fmtDate(tx.date));
    if (tx.customerPo || tx.customer_po) drawDocRow('PO Reference', tx.customerPo || tx.customer_po);
    if (doRef) drawDocRow('DO Reference', doRef);
    if (bastRef) drawDocRow('BAST Reference', bastRef);

    y = Math.max(y + 6, ry + 4);

    // ── ITEMS TABLE ───────────────────────────────────────────────
    const items = tx.items || [];
    const resolvedItems = items.map(item => {
        let name = item.itemName || item.item_name || '';
        let desc = item.itemDescription || item.item_description || '';
        if (!name && item.itemId) {
            const prod = window.store.products.find(p => p.id === item.itemId);
            if (prod) { name = prod.name; desc = prod.description || ''; }
        }
        const basePrice = Number(item.price) || 0;
        const margin = Number(item.margin) || 0;
        const sellingPrice = basePrice * (1 + margin / 100);
        const qty = Number(item.qty) || 0;
        const amount = sellingPrice * qty;
        return { ...item, resolvedName: name, resolvedDesc: desc, sellingPrice, amount };
    });

    const tableHeaders = [['NO', 'DESCRIPTION', 'QTY', 'UNIT', 'UNIT PRICE', 'AMOUNT']];

    // Group items by category
    const categoryOrder = [];
    const categoryMap = {};
    resolvedItems.forEach(item => {
        const cat = (item.category || 'Lainnya').trim();
        if (!categoryMap[cat]) { categoryMap[cat] = []; categoryOrder.push(cat); }
        categoryMap[cat].push(item);
    });

    // Build body rows: insert a full-span (merged) category header before each group
    const catDisplayName = { 'Barang': 'GOODS', 'Service': 'SERVICE' };
    const tableBody = [];
    const categoryRowIndices = new Set(); // track which row indices are category headers
    let itemNo = 1;
    categoryOrder.forEach(cat => {
        const catLabel = catDisplayName[cat] || cat.toUpperCase();
        categoryRowIndices.add(tableBody.length);
        // colSpan:6 merges across all 6 columns
        tableBody.push([{ content: catLabel, colSpan: 6 }]);
        categoryMap[cat].forEach(item => {
            tableBody.push([
                String(itemNo++),
                item.resolvedName + (item.remarks ? '\n' + item.remarks : ''),
                String(item.qty || 0),
                item.unit || 'Pcs',
                fmtCurrency(item.sellingPrice),
                fmtCurrency(item.amount)
            ]);
        });
    });

    doc.autoTable({
        startY: y,
        head: tableHeaders,
        body: tableBody,
        theme: 'plain',
        margin: { left: mL, right: mR },
        tableWidth: W,
        styles: {
            font: 'helvetica', fontSize: 8.5,
            cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 },
            textColor: C.DARK, lineColor: C.BORDER, lineWidth: 0.1, valign: 'middle'
        },
        headStyles: {
            fillColor: C.PRIMARY, textColor: C.WHITE, fontStyle: 'bold', fontSize: 8, halign: 'center', lineWidth: 0
        },
        columnStyles: {
            0: { cellWidth: 14, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 16, halign: 'center' },
            3: { cellWidth: 18, halign: 'center' },
            4: { cellWidth: 36, halign: 'right' },
            5: { cellWidth: 36, halign: 'right' }
        },
        alternateRowStyles: { fillColor: C.LIGHT_BG },
        didParseCell: (data) => {
            if (data.section === 'body' && categoryRowIndices.has(data.row.index)) {
                // Merged category header: light slate bg, dark bold text, left-aligned
                data.cell.styles.fillColor = [241, 245, 249];
                data.cell.styles.textColor = [30, 41, 59];
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 7.5;
                data.cell.styles.halign = 'left';
                data.cell.styles.cellPadding = { top: 2.5, bottom: 2.5, left: 6, right: 4 };
            }
        }
    });

    y = doc.lastAutoTable.finalY + 8;

    // ── TAX SUMMARY ───────────────────────────────────────────────
    let subtotal = 0;
    let serviceAmt = 0;

    resolvedItems.forEach(item => {
        subtotal += item.amount;
        if ((item.category || '').toLowerCase().includes('service') || (item.category || '').toLowerCase().includes('service')) {
            serviceAmt += item.amount;
        }
    });

    // Correct formula: DPP = Subtotal * 11/12, PPN = DPP * 12%, PPH23 = serviceAmt * 2%
    const dpp = subtotal * 11 / 12;
    const ppn = dpp * 0.12;
    const pph23 = serviceAmt * 0.02;
    const grandTotal = subtotal + ppn + pph23;   // per user spec: Subtotal + PPN + PPH23

    const totX = pageW - mR - 82;
    const totVX = pageW - mR;
    const lineH = 6;

    const drawTaxRow = (label, value, bold = false, highlight = false) => {
        if (highlight) {
            doc.setFillColor(...C.PRIMARY);
            doc.roundedRect(totX - 4, y - 4.5, 86, 9, 1.5, 1.5, 'F');
        }
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(bold ? 9.5 : 8.5);
        doc.setTextColor(highlight ? 255 : (bold ? C.DARK[0] : C.SECONDARY[0]),
            highlight ? 255 : (bold ? C.DARK[1] : C.SECONDARY[1]),
            highlight ? 255 : (bold ? C.DARK[2] : C.SECONDARY[2]));
        doc.text(label, totX, y);
        doc.text(value, totVX, y, { align: 'right' });
        y += lineH;
    };

    const drawTaxDivider = () => {
        doc.setDrawColor(...C.BORDER);
        doc.setLineWidth(0.3);
        doc.line(totX - 4, y - 2, totVX, y - 2);
        y += 2;
    };

    drawTaxRow('Subtotal', fmtCurrency(subtotal));
    drawTaxRow('DPP (11/12)', fmtCurrency(dpp));
    drawTaxRow('PPN 12%', fmtCurrency(ppn));
    if (pph23 > 0) drawTaxRow('PPH23 2% (Service)', fmtCurrency(pph23));
    drawTaxDivider();
    y += 2;
    drawTaxRow('GRAND TOTAL', fmtCurrency(grandTotal), true, true);
    y += 4;

    // ── TERBILANG ─────────────────────────────────────────────────
    const tbText = terbilangID(grandTotal);
    doc.setFillColor(...C.LIGHT_BG);
    doc.setDrawColor(...C.PRIMARY);
    doc.setLineWidth(0.4);
    doc.roundedRect(mL, y, W, 10, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.PRIMARY);
    doc.text('Terbilang:', mL + 4, y + 4);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...C.DARK);
    const tbLines = doc.splitTextToSize(tbText, W - 36);
    doc.text(tbLines, mL + 30, y + 4);
    y += 16;

    // Bank info vars (used below in plain-text payment section)
    const hasBank = settings.bankName || settings.bankAccount || settings.bankHolder;
    const hasBank2 = settings.bank2Name || settings.bank2Account || settings.bank2Holder;

    // ── NOTES ─────────────────────────────────────────────────────
    doc.setDrawColor(...C.BORDER);
    doc.setLineWidth(0.3);
    doc.line(mL, y, pageW - mR, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.PRIMARY);
    doc.text('Catatan:', mL, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(...C.SECONDARY);
    doc.text('1. Mohon lampirkan bukti transfer saat melakukan pembayaran.', mL, y); y += 4;
    doc.text('2. Pembayaran dianggap sah jika dana sudah masuk ke rekening kami.', mL, y); y += 4;
    if (dueDate) { doc.text(`3. Pembayaran paling lambat tanggal ${fmtDate(dueDate)}.`, mL, y); y += 4; }
    y += 4;

    // ── PAYMENT INFORMATION (plain text below catatan) ─────────────
    if (hasBank || hasBank2) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...C.PRIMARY);
        doc.text('Transfer Pembayaran ke:', mL, y);
        y += 4.5;

        const printBank = (bankName, bankAccount, bankHolder, label) => {
            if (!bankName && !bankAccount) return;
            if (label) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.8);
                doc.setTextColor(...C.DARK);
                doc.text(label, mL, y); y += 3.8;
            }
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.8);
            doc.setTextColor(...C.SECONDARY);
            if (bankName) { doc.text(`Bank          : ${bankName}`, mL + 4, y); y += 3.8; }
            if (bankAccount) { doc.text(`No. Rekening  : ${bankAccount}`, mL + 4, y); y += 3.8; }
            if (bankHolder) { doc.text(`Atas Nama     : ${bankHolder}`, mL + 4, y); y += 3.8; }
        };

        if (hasBank && hasBank2) {
            printBank(settings.bankName, settings.bankAccount, settings.bankHolder, 'Rekening 1:');
            y += 2;
            printBank(settings.bank2Name, settings.bank2Account, settings.bank2Holder, 'Rekening 2:');
        } else if (hasBank) {
            printBank(settings.bankName, settings.bankAccount, settings.bankHolder, null);
        } else {
            printBank(settings.bank2Name, settings.bank2Account, settings.bank2Holder, null);
        }
        y += 4;
    }

    // ── SIGNATURE AREA (below notes, right side) ───────────────
    const sigBoxW = 70;
    const sigBoxX = pageW - mR - sigBoxW;
    const sigStartY = y;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.SECONDARY);
    doc.text('Hormat kami,', sigBoxX + sigBoxW / 2, sigStartY, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.DARK);
    doc.text(settings.name || 'PT IDE SOLUSI INTEGRASI', sigBoxX + sigBoxW / 2, sigStartY + 5, { align: 'center' });

    // Empty signature space — cukup untuk materai (~35mm)
    const sigLineY = sigStartY + 43;
    doc.setDrawColor(...C.BORDER);
    doc.setLineWidth(0.4);
    doc.line(sigBoxX + 6, sigLineY, sigBoxX + sigBoxW - 6, sigLineY);

    // Username centered below line
    const currentUser = window.store.currentUser;
    const sigCenterX = sigBoxX + sigBoxW / 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.DARK);
    doc.text(currentUser?.username || 'Authorized', sigCenterX, sigLineY + 5, { align: 'center' });

    y = sigLineY + 10;

    // ── FOOTER ────────────────────────────────────────────────────
    const footY = pageH - 8;
    doc.setFillColor(...C.PRIMARY);
    doc.rect(0, footY - 5, pageW, 1.5, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.SECONDARY);
    doc.text(`${settings.name || 'PT IDE SOLUSI INTEGRASI'}  ·  ${settings.phone || ''}  ·  ${tx.docNumber || ''}`, pageW / 2, footY, { align: 'center' });

    doc.save(`${tx.docNumber || 'Invoice'}.pdf`);
}

window.printPDF = printPDF;
