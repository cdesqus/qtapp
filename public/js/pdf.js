// Simplified PDF generation constants
const PDF_COLORS = {
    NAVY: [0, 51, 102],
    SLATE: [112, 128, 144],
    LIGHT_BG: [248, 250, 252],
    BORDER: [226, 232, 240]
};

const printPDF = async (id) => {
    const { jsPDF } = window.jspdf;
    const store = window.store;
    const tx = await store.getTransaction(id);
    if (!tx) return;
    const doc = new jsPDF();
    const settings = store.companySettings;
    const client = store.clients.find(c => c.id === tx.clientId);

    if (tx.type === 'INV') {
        const navy = PDF_COLORS.NAVY;
        const slate = PDF_COLORS.SLATE;
        let currentY = 20;

        if (settings.logo) {
            try {
                doc.addImage(settings.logo, 'PNG', 20, currentY, 25, 25);
            } catch (e) { }
        }
        doc.setFontSize(14);
        doc.setTextColor(...navy);
        doc.setFont(undefined, 'bold');
        doc.text(settings.name || 'Ide Solusi Integrasi', 50, currentY + 10);

        doc.setFontSize(9);
        doc.setTextColor(...slate);
        doc.setFont(undefined, 'normal');
        doc.text(settings.address || '', 50, currentY + 16, { maxWidth: 130 });

        doc.setFontSize(24);
        doc.setTextColor(...navy);
        doc.setFont(undefined, 'bold');
        doc.text('INVOICE', 190, currentY + 10, { align: 'right' });
        currentY += 40;

        doc.setDrawColor(200);
        doc.line(20, currentY, 190, currentY);
        currentY += 8;

        doc.setFontSize(9);
        doc.setTextColor(0);
        doc.setFont(undefined, 'bold'); doc.text('Invoice No:', 20, currentY);
        doc.setFont(undefined, 'normal'); doc.text(tx.docNumber || '-', 50, currentY);
        doc.setFont(undefined, 'bold'); doc.text('Date:', 120, currentY);
        doc.setFont(undefined, 'normal'); doc.text(window.formatDate(tx.date), 140, currentY);
        currentY += 15;

        const headers = [['Description', 'Qty', 'Unit Price', 'Total']];
        const body = tx.items.map(item => [
            item.itemName + (item.description ? '\n' + item.description : ''),
            item.qty,
            `Rp ${parseInt(item.price).toLocaleString('id-ID')}`,
            `Rp ${(item.price * item.qty).toLocaleString('id-ID')}`
        ]);

        doc.autoTable({
            startY: currentY,
            head: headers,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: navy, textColor: 255 },
            styles: { fontSize: 9 },
            columnStyles: { 0: { cellWidth: 80 }, 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
        });

        doc.save(`${tx.docNumber}.pdf`);
    } else {
        // Simple fallback for other types
        doc.text(`${tx.type}: ${tx.docNumber}`, 20, 20);
        doc.save(`${tx.docNumber}.pdf`);
    }
};

window.printPDF = printPDF;
