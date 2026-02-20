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
        generateInvoicePDF(jsPDF, tx, settings, client);
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
    const logoH = 22;
    if (settings.logo) {
        try { doc.addImage(settings.logo, 'AUTO', marginL, y, 22, logoH); } catch (e) { }
    }

    const infoX = settings.logo ? marginL + 28 : marginL;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...DO_COLORS.PRIMARY);
    doc.text(settings.name || 'PT IDE SOLUSI INTEGRASI', infoX, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...DO_COLORS.SECONDARY);

    let companyLine = (settings.address || '').replace(/Tebet,\s*/i, 'Tebet,\n');
    if (settings.phone) companyLine += `  \u2022  Phone: ${settings.phone}`;
    if (settings.email) companyLine += `  \u2022  ${settings.email}`;
    const companyLines = doc.splitTextToSize(companyLine, 100);
    doc.text(companyLines, infoX, y + 13);

    // Title "DELIVERY ORDER" – large, bold, right-aligned
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...DO_COLORS.PRIMARY);
    doc.text('DELIVERY ORDER', pageW - marginR, y + 8, { align: 'right' });


    y += Math.max(logoH, 22) + 8;

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

    const tableHeaders = [['NO', 'DESCRIPTION', 'QTY', 'UNIT', 'REMARKS']];

    const tableBody = resolvedItems.map((item, i) => {
        const qty = Number(item.qty) || 0;
        const descText = item.resolvedName + (item.resolvedDesc ? '\n' + item.resolvedDesc : '');
        return [
            String(i + 1),
            descText,
            String(qty),
            item.unit || 'Pcs',
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
            cellPadding: { top: 5, bottom: 5, left: 5, right: 5 },
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
            0: { cellWidth: 14, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 22, halign: 'center' },
            3: { cellWidth: 22, halign: 'center' },
            4: { cellWidth: 50 }
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

    y += 30;

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
    //  HUD corner accents (decorative)
    // ─────────────────────────────────────────────────
    const hudLen = 12;
    doc.setDrawColor(...C.PRIMARY);
    doc.setLineWidth(0.5);
    // Top-left
    doc.line(mL, y - 4, mL + hudLen, y - 4);
    doc.line(mL, y - 4, mL, y - 4 + hudLen);
    // Top-right
    doc.line(pageW - mR - hudLen, y - 4, pageW - mR, y - 4);
    doc.line(pageW - mR, y - 4, pageW - mR, y - 4 + hudLen);

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
    if (settings.phone) addrText += `  ·  ${settings.phone}`;
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

    const tableHeaders = [['NO', 'DESCRIPTION', 'QTY', 'S/N', 'REMARKS', 'STATUS']];
    const tableBody = resolvedItems.map((item, i) => [
        String(i + 1),
        item.resolvedName || '-',
        String(item.qty || 0),
        item.sn || '-',
        item.remarks || '-',
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
            2: { cellWidth: 16, halign: 'center' },
            3: { cellWidth: 32 },
            4: { cellWidth: 34 },
            5: { cellWidth: 24, halign: 'center', fontStyle: 'bold' }
        },
        alternateRowStyles: {
            fillColor: C.LIGHT_BG
        },
        didParseCell: (data) => {
            // Style the STATUS column with badge colors
            if (data.section === 'body' && data.column.index === 5) {
                data.cell.styles.textColor = C.SUCCESS;
                data.cell.styles.fillColor = C.SUCCESS_BG;
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 7;
            }
        },
        didDrawCell: (data) => {
            // HUD-style corner ticks on header cells
            if (data.section === 'head') {
                const { x, y: cy, width: cw, height: ch } = data.cell;
                doc.setDrawColor(...C.ACCENT2);
                doc.setLineWidth(0.3);
                const tk = 2;
                // top-left tick
                doc.line(x, cy, x + tk, cy);
                doc.line(x, cy, x, cy + tk);
                // top-right tick
                doc.line(x + cw, cy, x + cw - tk, cy);
                doc.line(x + cw, cy, x + cw, cy + tk);
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

    // HUD corner marks on left box
    doc.setDrawColor(...C.PRIMARY);
    doc.setLineWidth(0.6);
    const bk = 5;
    doc.line(mL, y, mL + bk, y);
    doc.line(mL, y, mL, y + bk);
    doc.line(mL + sigBoxW, y, mL + sigBoxW - bk, y);
    doc.line(mL + sigBoxW, y, mL + sigBoxW, y + bk);

    // Right signature box
    const rBoxX = pageW - mR - sigBoxW;
    doc.setDrawColor(...C.BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(rBoxX, y, sigBoxW, sigBoxH, 2, 2, 'S');

    // HUD corner marks on right box
    doc.setDrawColor(...C.PRIMARY);
    doc.setLineWidth(0.6);
    doc.line(rBoxX, y, rBoxX + bk, y);
    doc.line(rBoxX, y, rBoxX, y + bk);
    doc.line(rBoxX + sigBoxW, y, rBoxX + sigBoxW - bk, y);
    doc.line(rBoxX + sigBoxW, y, rBoxX + sigBoxW, y + bk);

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
    //  FOOTER – HUD accent line
    // ─────────────────────────────────────────────────
    const footY = pageH - 10;

    // HUD footer corners
    doc.setDrawColor(...C.PRIMARY);
    doc.setLineWidth(0.5);
    // Bottom-left
    doc.line(mL, footY + 5, mL + hudLen, footY + 5);
    doc.line(mL, footY + 5, mL, footY + 5 - hudLen);
    // Bottom-right
    doc.line(pageW - mR - hudLen, footY + 5, pageW - mR, footY + 5);
    doc.line(pageW - mR, footY + 5, pageW - mR, footY + 5 - hudLen);

    doc.setDrawColor(...C.BORDER);
    doc.setLineWidth(0.3);
    doc.line(mL + hudLen + 2, footY, pageW - mR - hudLen - 2, footY);

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
