class UI {
    constructor() {
        this.currentItemIndex = 0;
    }

    // Map internal type codes to display names
    typeLabel(type) {
        const labels = { QUO: 'Quotation', DO: 'DO', BAP: 'BAST', INV: 'Invoice' };
        return labels[type] || type;
    }

    renderDashboard() {
        console.log("Rendering Dashboard...");
        try {
            const container = document.getElementById('content-area');
            if (!container) return;
            const transactions = window.store.transactions || [];
            const clients = window.store.clients || [];

            container.innerHTML = `
                <div class="dashboard-grid">
                    <div class="stat-card">
                        <h3>Total Quotations</h3>
                        <div class="value">${transactions.filter(t => t.type === 'QUO').length}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Active Clients</h3>
                        <div class="value">${clients.length}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Unpaid Invoices</h3>
                        <div class="value">${transactions.filter(t => t.type === 'INV' && t.status !== 'Paid').length}</div>
                    </div>
                </div>
                <div class="card" style="margin-top:20px;">
                    <h3>Recent Transactions</h3>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Doc Number</th>
                                    <th>Client</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${transactions.length === 0 ? '<tr><td colspan="5" style="text-align:center">No transactions found</td></tr>' :
                    transactions.slice(0, 5).map(t => `
                                    <tr>
                                        <td>${window.formatDate(t.date)}</td>
                                        <td>${t.docNumber || '-'}</td>
                                        <td>${t.clientName || '-'}</td>
                                        <td>${window.ui.typeLabel(t.type) || '-'}</td>
                                        <td><span class="status-badge status-${(t.status || 'Draft').toLowerCase()}">${t.status || 'Draft'}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (err) {
            console.error("Dashboard render error:", err);
            this.showErrorMessage("Gagal memuat dashboard: " + err.message);
        }
    }

    showErrorMessage(msg) {
        const container = document.getElementById('content-area');
        if (container) {
            container.innerHTML = `<div class="card" style="border-left: 4px solid var(--error)">
                <h3><i class="fa-solid fa-triangle-exclamation"></i> Error</h3>
                <p>${msg}</p>
                <button class="btn btn-secondary" onclick="window.location.reload()" style="margin-top:10px;">Reload App</button>
            </div>`;
        }
    }

    openModal(content) {
        const modal = document.getElementById('modal-container');
        document.getElementById('modal-body').innerHTML = content;
        modal.classList.remove('hidden');
    }

    closeModal() {
        document.getElementById('modal-container').classList.add('hidden');
    }

    renderClients() {
        try {
            const container = document.getElementById('content-area');
            const clients = window.store.clients || [];
            container.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3>Client List</h3>
                        <button class="btn btn-primary" onclick="window.ui.openClientForm()"><i class="fa-solid fa-plus"></i> New Client</button>
                    </div>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr><th>Name</th><th>Email</th><th>PIC</th><th>Nomor NPWP</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                ${clients.length === 0 ? '<tr><td colspan="5" style="text-align:center">No clients found</td></tr>' :
                    clients.map(c => `
                                    <tr>
                                        <td>${c.name}</td>
                                        <td>${c.email || '-'}</td>
                                        <td>${c.pic || '-'}</td>
                                        <td>${c.npwpNumber || c.npwp_number || '-'}</td>
                                        <td>
                                            <button class="btn btn-sm btn-secondary" onclick="window.ui.openClientForm('${c.id}')"><i class="fa-solid fa-edit"></i></button>
                                            <button class="btn btn-sm btn-error" onclick="window.ui.deleteClient('${c.id}')"><i class="fa-solid fa-trash"></i></button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (err) {
            this.showErrorMessage("Gagal memuat klien: " + err.message);
        }
    }

    renderProducts() {
        try {
            const container = document.getElementById('content-area');
            const products = window.store.products || [];
            container.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3>Products & Services</h3>
                        <button class="btn btn-primary" onclick="window.ui.openProductForm()"><i class="fa-solid fa-plus"></i> New Product</button>
                    </div>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr><th>Name</th><th>Category</th><th>Price</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                ${products.length === 0 ? '<tr><td colspan="4" style="text-align:center">No products found</td></tr>' :
                    products.map(p => `
                                    <tr>
                                        <td>${p.name}</td>
                                        <td>${p.category}</td>
                                        <td>${Number(p.price).toLocaleString()}</td>
                                        <td>
                                            <button class="btn btn-sm btn-secondary" onclick="window.ui.openProductForm('${p.id}')"><i class="fa-solid fa-edit"></i></button>
                                            <button class="btn btn-sm btn-error" onclick="window.ui.deleteProduct('${p.id}')"><i class="fa-solid fa-trash"></i></button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (err) {
            this.showErrorMessage("Gagal memuat produk: " + err.message);
        }
    }

    renderTransactions(type) {
        try {
            const container = document.getElementById('content-area');
            const txs = (window.store.transactions || []).filter(t => t.type === type);
            const isQuo = type === 'QUO';
            const isDO = type === 'DO';
            const isBAP = type === 'BAP';
            const showPO = isQuo || isDO || isBAP;
            const colCount = showPO ? 6 : 5;
            const label = this.typeLabel(type);
            const hideNewBtn = isDO || isBAP;
            container.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3>${label} List</h3>
                        ${hideNewBtn ? '' : `<button class="btn btn-primary" onclick="window.ui.openTransactionForm('${type}')"><i class="fa-solid fa-plus"></i> New ${label}</button>`}
                    </div>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr><th>Date</th><th>Number</th>${showPO ? '<th>PO Number</th>' : ''}<th>Client</th><th>Status</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                ${txs.length === 0 ? `<tr><td colspan="${colCount}" style="text-align:center">No ${label} found</td></tr>` :
                    txs.map(t => `
                                    <tr>
                                        <td>${window.formatDate(t.date)}</td>
                                        <td>${t.docNumber || '-'}</td>
                                        ${showPO ? `<td>${t.customerPo ? `<span style="padding:3px 8px;border-radius:4px;font-size:0.8rem;font-weight:600;background:rgba(34,197,94,0.15);color:#16a34a;">${t.customerPo}</span>` : '<span style="color:var(--text-secondary);font-size:0.8rem;">-</span>'}</td>` : ''}
                                        <td>${t.clientName || '-'}</td>
                                        <td><span class="status-badge status-${(t.status || 'Draft').toLowerCase()}">${t.status || 'Draft'}</span></td>
                                        <td style="white-space: nowrap;">
                                            <button class="btn btn-sm btn-secondary" onclick="window.ui.openTransactionForm('${type}', '${t.id}')" title="Edit"><i class="fa-solid fa-edit"></i></button>
                                            <button class="btn btn-sm btn-primary" onclick="window.ui.printTransaction('${t.id}')" title="Print"><i class="fa-solid fa-print"></i></button>
                                            ${isQuo ? `
                                                <button class="btn btn-sm" style="background:rgba(34,197,94,0.15);color:#16a34a;border:1px solid rgba(34,197,94,0.3);" onclick="window.ui.confirmPO('${t.id}')" title="Confirm PO"><i class="fa-solid fa-check-circle"></i> PO</button>
                                                <button class="btn btn-sm" style="background:rgba(59,130,246,0.12);color:#3b82f6;border:1px solid rgba(59,130,246,0.3);" onclick="window.ui.convertTransaction('${t.id}', 'DO')" title="To DO">→DO</button>
                                                <button class="btn btn-sm" style="background:rgba(168,85,247,0.12);color:#a855f7;border:1px solid rgba(168,85,247,0.3);" onclick="window.ui.convertTransaction('${t.id}', 'BAP')" title="To BAST">→BAST</button>
                                            ` : ''}
                                            ${isQuo && (t.customerPo || t.customer_po)
                            ? `<button class="btn btn-sm btn-error" disabled title="Quotation dengan PO Confirmed tidak bisa dihapus" style="opacity:0.4;cursor:not-allowed;"><i class="fa-solid fa-lock"></i></button>`
                            : `<button class="btn btn-sm btn-error" onclick="window.ui.deleteTransaction('${t.id}', '${type}')" title="Delete"><i class="fa-solid fa-trash"></i></button>`
                        }
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (err) {
            this.showErrorMessage(`Gagal memuat ${type}: ` + err.message);
        }
    }

    // ══════════════════════════════════════════════════════════
    //  INVOICE MANAGEMENT — Quotation dengan PO Confirmed
    // ══════════════════════════════════════════════════════════
    renderInvoiceManagement() {
        try {
            const container = document.getElementById('content-area');
            const allTx = window.store.transactions || [];
            // Normalize field access helper
            const po = t => t.customerPo || t.customer_po || '';
            const cid = t => t.clientId || t.client_id || '';
            const dn = t => t.docNumber || t.doc_number || '';

            const quos = allTx.filter(t => t.type === 'QUO' && po(t).trim() !== '');
            const doList = allTx.filter(t => t.type === 'DO');
            const bastList = allTx.filter(t => t.type === 'BAP');
            const invList = allTx.filter(t => t.type === 'INV');

            const fmt = (dateStr) => {
                if (!dateStr) return '-';
                const d = new Date(dateStr);
                if (isNaN(d)) return '-';
                return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
            };

            const rows = quos.map(q => {
                const linkedDO = doList.find(d => cid(d) === cid(q) && po(d) === po(q))
                    || doList.find(d => cid(d) === cid(q));
                const linkedBAST = bastList.find(b => cid(b) === cid(q) && po(b) === po(q))
                    || bastList.find(b => cid(b) === cid(q));
                const linkedINV = invList.find(i => cid(i) === cid(q) && po(i) === po(q))
                    || invList.find(i => cid(i) === cid(q));
                const isPaid = linkedINV && (linkedINV.status || '').toLowerCase() === 'paid';
                return { q, linkedDO, linkedBAST, linkedINV, isPaid };
            });

            container.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fa-solid fa-file-invoice-dollar" style="margin-right:8px;color:var(--primary);"></i>Invoice Management</h3>
                        <span style="font-size:0.85rem;color:var(--text-secondary);">${rows.length} Quotation dengan PO Confirmed</span>
                    </div>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>No. Quotation</th>
                                    <th>Client</th>
                                    <th>Status PO</th>
                                    <th>No. DO</th>
                                    <th>Tanggal DO</th>
                                    <th>No. BAST</th>
                                    <th>Tanggal BAST</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows.length === 0
                    ? '<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text-secondary);">Belum ada Quotation dengan PO Confirmed.</td></tr>'
                    : rows.map(({ q, linkedDO, linkedBAST, linkedINV, isPaid }) => `
                                    <tr>
                                        <td>
                                            <span style="font-weight:600;color:var(--primary);">${q.docNumber || q.doc_number || '-'}</span><br>
                                            <span style="font-size:0.75rem;color:var(--text-secondary);">${fmt(q.date)}</span>
                                        </td>
                                        <td>${q.clientName || q.client_name || '-'}</td>
                                        <td>
                                            <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:0.78rem;font-weight:600;background:rgba(34,197,94,0.12);color:#16a34a;border:1px solid rgba(34,197,94,0.25);">
                                                <i class="fa-solid fa-circle-check"></i> ${q.customerPo || q.customer_po}
                                            </span>
                                        </td>
                                        <td>${linkedDO ? `<span style="font-weight:600;">${linkedDO.docNumber || linkedDO.doc_number || '-'}</span>` : '<span style="color:var(--text-secondary);">-</span>'}</td>
                                        <td style="font-size:0.85rem;">${linkedDO ? fmt(linkedDO.date) : '-'}</td>
                                        <td>${linkedBAST ? `<span style="font-weight:600;">${linkedBAST.docNumber || linkedBAST.doc_number || '-'}</span>` : '<span style="color:var(--text-secondary);">-</span>'}</td>
                                        <td style="font-size:0.85rem;">${linkedBAST ? fmt(linkedBAST.date) : '-'}</td>
                                        <td>
                                            ${linkedINV
                            ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:0.78rem;font-weight:600;${isPaid
                                ? 'background:rgba(34,197,94,0.15);color:#16a34a;border:1px solid rgba(34,197,94,0.3);'
                                : 'background:rgba(245,158,11,0.13);color:#d97706;border:1px solid rgba(245,158,11,0.3);'}">
                                                    <i class="fa-solid ${isPaid ? 'fa-circle-check' : 'fa-clock'}"></i>
                                                    ${isPaid ? 'Paid' : 'Unpaid'}
                                                </span>`
                            : `<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:0.78rem;font-weight:500;background:rgba(100,116,139,0.1);color:var(--text-secondary);border:1px solid var(--border-color);">
                                                    <i class="fa-regular fa-file"></i> No Invoice
                                                </span>`}
                                        </td>
                                        <td style="white-space:nowrap;display:flex;gap:5px;flex-wrap:wrap;">
                                            <button class="btn btn-sm btn-secondary" onclick="window.ui.openTransactionForm('QUO','${q.id}')" title="Edit Quotation">
                                                <i class="fa-solid fa-edit"></i>
                                            </button>
                                            <button class="btn btn-sm" style="background:rgba(245,158,11,0.13);color:#d97706;border:1px solid rgba(245,158,11,0.3);font-weight:600;"
                                                onclick="window.ui.convertTransaction('${q.id}','INV')" title="Generate Invoice">
                                                <i class="fa-solid fa-file-invoice-dollar"></i> Invoice
                                            </button>
                                            ${linkedINV ? `
                                            <button class="btn btn-sm btn-primary" onclick="window.ui.printTransaction('${linkedINV.id}')" title="Print Invoice">
                                                <i class="fa-solid fa-print"></i>
                                            </button>
                                            ${isPaid
                                ? `<button class="btn btn-sm" style="background:rgba(245,158,11,0.13);color:#d97706;border:1px solid rgba(245,158,11,0.3);font-weight:600;"
                                                    onclick="window.ui.setInvoiceStatus('${linkedINV.id}','Unpaid')" title="Tandai Unpaid">
                                                    <i class="fa-solid fa-clock"></i> Unpaid
                                                   </button>`
                                : `<button class="btn btn-sm" style="background:rgba(34,197,94,0.15);color:#16a34a;border:1px solid rgba(34,197,94,0.3);font-weight:600;"
                                                    onclick="window.ui.setInvoiceStatus('${linkedINV.id}','Paid')" title="Tandai Paid">
                                                    <i class="fa-solid fa-circle-check"></i> Paid
                                                   </button>`}
                                            ` : ''}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (err) {
            this.showErrorMessage('Gagal memuat Invoice Management: ' + err.message);
        }
    }

    renderMeasurements() {
        try {
            const container = document.getElementById('content-area');
            const units = window.store.units || [];
            container.innerHTML = `
                <div class="card" style="max-width: 500px;">
                    <div class="card-header">
                        <h3>Units of Measurement</h3>
                    </div>
                    <div class="form-group" style="display: flex; gap: 10px; margin-bottom: 20px;">
                        <input type="text" id="new-unit-name" placeholder="New unit name (e.g. Box)" class="form-control">
                        <button class="btn btn-primary" onclick="window.ui.saveUnit()">Add</button>
                    </div>
                    <div class="table-container">
                        <table>
                            <thead><tr><th>Unit Name</th><th>Action</th></tr></thead>
                            <tbody>
                                ${units.length === 0 ? '<tr><td colspan="2" style="text-align:center">No units configured</td></tr>' :
                    units.map(u => `
                                    <tr>
                                        <td>${u}</td>
                                        <td><button class="btn btn-sm btn-error" onclick="window.ui.deleteUnit('${u}')"><i class="fa-solid fa-trash"></i></button></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (err) {
            this.showErrorMessage("Gagal memuat measurements: " + err.message);
        }
    }

    renderUsers() {
        try {
            const container = document.getElementById('content-area');
            const users = window.store.users || [];
            container.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3>User Management</h3>
                        <button class="btn btn-primary" onclick="window.ui.openUserForm()"><i class="fa-solid fa-plus"></i> Add User</button>
                    </div>
                    <div class="table-container">
                        <table>
                            <thead><tr><th>Username</th><th>Role</th><th>Signature</th><th>Actions</th></tr></thead>
                            <tbody>
                                ${users.length === 0 ? '<tr><td colspan="4" style="text-align:center">No users found</td></tr>' :
                    users.map(u => `
                                    <tr>
                                        <td>${u.username}</td>
                                        <td><span style="padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; background: ${u.role === 'admin' ? 'rgba(14,165,233,0.15)' : 'rgba(100,116,139,0.15)'}; color: ${u.role === 'admin' ? '#0ea5e9' : '#64748b'};">${u.role}</span></td>
                                        <td>
                                            ${u.signature ? `<img src="${u.signature}" style="max-height: 36px; max-width: 80px; object-fit: contain; border: 1px solid var(--border-color); border-radius: 4px; padding: 2px; background: white;">` : '<span style="color: var(--text-secondary); font-size: 0.8rem;">No signature</span>'}
                                        </td>
                                        <td style="display: flex; gap: 6px;">
                                            <button class="btn btn-sm btn-secondary" onclick="window.ui.editUserSignature('${u.id}')" title="Edit Signature"><i class="fa-solid fa-pen"></i></button>
                                            <button class="btn btn-sm btn-error" onclick="window.ui.deleteUser('${u.id}', '${u.username}')" ${u.username === (window.store.currentUser?.username) ? 'disabled title="Cannot delete yourself"' : ''} title="Delete"><i class="fa-solid fa-trash"></i></button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (err) {
            this.showErrorMessage("Gagal memuat users: " + err.message);
        }
    }

    openUserForm() {
        const content = `
            <h3>Add New User</h3>
            <form id="user-form">
                <div class="form-group"><label>Username</label><input type="text" name="username" required placeholder="Enter username"></div>
                <div class="form-group"><label>Password</label><input type="password" name="password" required placeholder="Enter password" minlength="4"></div>
                <div class="form-group">
                    <label>Role</label>
                    <select name="role" required>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Signature</label>
                    <div style="display: flex; align-items: center; gap: 15px; margin-top: 6px;">
                        <div id="sig-preview" style="width: 120px; height: 60px; border: 2px dashed var(--border-color); border-radius: 6px; display: flex; align-items: center; justify-content: center; overflow: hidden; background: white;">
                            <span style="color: var(--text-secondary); font-size: 0.75rem;">No signature</span>
                        </div>
                        <div>
                            <input type="file" id="sig-file-input" accept="image/*" style="display:none;" onchange="window.ui.onUserSignatureSelect(this, 'sig-preview', 'sig-data')">
                            <button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById('sig-file-input').click()">
                                <i class="fa-solid fa-upload"></i> Upload
                            </button>
                            <p style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px;">PNG/JPG, max 1MB</p>
                        </div>
                    </div>
                    <input type="hidden" id="sig-data" value="">
                </div>
                <div style="margin-top: 20px;">
                    <button type="submit" class="btn btn-primary">Create User</button>
                    <button type="button" class="btn btn-secondary" onclick="window.ui.closeModal()">Cancel</button>
                </div>
            </form>
        `;
        this.openModal(content);
        document.getElementById('user-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = {
                username: formData.get('username'),
                password: formData.get('password'),
                role: formData.get('role'),
                signature: document.getElementById('sig-data').value || null
            };
            try {
                await window.store.addUser(data);
                this.closeModal();
                this.renderUsers();
            } catch (err) { alert("Gagal menambah user: " + err.message); }
        };
    }

    editUserSignature(userId) {
        const user = (window.store.users || []).find(u => u.id === userId);
        if (!user) return;
        const content = `
            <h3>Edit Signature â€” ${user.username}</h3>
            <div style="margin-top: 15px;">
                <div id="edit-sig-preview" style="width: 200px; height: 100px; border: 2px dashed var(--border-color); border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden; background: white; margin-bottom: 15px;">
                    ${user.signature ? `<img src="${user.signature}" style="max-width: 100%; max-height: 100%; object-fit: contain;">` : '<span style="color: var(--text-secondary); font-size: 0.8rem;">No signature</span>'}
                </div>
                <input type="file" id="edit-sig-file" accept="image/*" style="display:none;" onchange="window.ui.onUserSignatureSelect(this, 'edit-sig-preview', 'edit-sig-data')">
                <input type="hidden" id="edit-sig-data" value="${user.signature || ''}">
                <div style="display: flex; gap: 8px;">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('edit-sig-file').click()">
                        <i class="fa-solid fa-upload"></i> Upload Signature
                    </button>
                    ${user.signature ? '<button type="button" class="btn btn-sm btn-error" onclick="document.getElementById(\'edit-sig-preview\').innerHTML=\'<span style=\\"color:var(--text-secondary);font-size:0.8rem\\"\>No signature</span>\'; document.getElementById(\'edit-sig-data\').value=\'\'"><i class="fa-solid fa-trash"></i> Remove</button>' : ''}
                </div>
                <div style="margin-top: 20px;">
                    <button type="button" class="btn btn-primary" onclick="window.ui.saveUserSignature('${userId}')">Save</button>
                    <button type="button" class="btn btn-secondary" onclick="window.ui.closeModal()">Cancel</button>
                </div>
            </div>
        `;
        this.openModal(content);
    }

    async saveUserSignature(userId) {
        const user = (window.store.users || []).find(u => u.id === userId);
        if (!user) return;
        const sig = document.getElementById('edit-sig-data').value;
        try {
            await window.store.updateUser(userId, { username: user.username, role: user.role, signature: sig || null });
            this.closeModal();
            this.renderUsers();
        } catch (err) { alert('Gagal menyimpan signature: ' + err.message); }
    }

    onUserSignatureSelect(input, previewId, dataId) {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 1024 * 1024) {
            alert('File terlalu besar. Maksimal 1MB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            document.getElementById(previewId).innerHTML = `<img src="${dataUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
            document.getElementById(dataId).value = dataUrl;
        };
        reader.readAsDataURL(file);
    }

    async deleteUser(id, username) {
        if (confirm(`Hapus user "${username}"?`)) {
            try {
                await window.store.deleteUser(id);
                this.renderUsers();
            } catch (err) { alert("Gagal menghapus user: " + err.message); }
        }
    }

    renderSettings() {
        try {
            const container = document.getElementById('content-area');
            const s = window.store.companySettings;
            const logoSrc = s.logo ? (typeof s.logo === 'string' && s.logo.startsWith('data:') ? s.logo : s.logo) : '';
            container.innerHTML = `
                <div class="card">
                    <h3>Company Settings</h3>
                    <form id="settings-form" style="margin-top:20px;">
                        <div class="form-group"><label>Company Name</label><input type="text" name="name" value="${s.name || ''}"></div>
                        <div class="form-group"><label>Address</label><textarea name="address">${s.address || ''}</textarea></div>
                        <div class="form-group"><label>Phone</label><input type="text" name="phone" value="${s.phone || ''}"></div>
                        <div class="form-group"><label>NPWP Perusahaan</label><input type="text" name="npwp" value="${s.npwp || ''}" placeholder="Contoh: 01.234.567.8-901.000"></div>
                        <hr style="margin: 20px 0; border-color: var(--border-color);">
                        <h4 style="margin-bottom: 15px; color: var(--text-secondary);"><i class="fa-solid fa-building-columns" style="margin-right: 8px;"></i>Bank Information (for Invoice)</h4>
                        <div class="grid" style="grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                            <div class="form-group"><label>Nama Bank</label><input type="text" name="bankName" value="${s.bankName || ''}" placeholder="Contoh: Bank BCA"></div>
                            <div class="form-group"><label>Nomor Rekening</label><input type="text" name="bankAccount" value="${s.bankAccount || ''}" placeholder="Contoh: 123-456-7890"></div>
                            <div class="form-group"><label>Atas Nama</label><input type="text" name="bankHolder" value="${s.bankHolder || ''}" placeholder="Nama pemilik rekening"></div>
                        </div>
                        <div class="form-group">
                            <label>Company Logo</label>
                            <div style="display: flex; align-items: center; gap: 20px; margin-top: 8px;">
                                <div id="logo-preview" style="width: 120px; height: 120px; border: 2px dashed var(--border-color); border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #f8fafc;">
                                    ${logoSrc ? `<img src="${logoSrc}" style="max-width: 100%; max-height: 100%; object-fit: contain;">` : '<span style="color: var(--text-secondary); font-size: 0.8rem;">No logo</span>'}
                                </div>
                                <div>
                                    <input type="file" id="logo-file-input" accept="image/*" style="display:none;" onchange="window.ui.onLogoFileSelect(this)">
                                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('logo-file-input').click()" style="margin-bottom: 8px;">
                                        <i class="fa-solid fa-upload"></i> Upload Logo
                                    </button>
                                    ${logoSrc ? '<br><button type="button" class="btn btn-sm btn-error" onclick="window.ui.removeLogo()" style="margin-top: 4px;"><i class="fa-solid fa-trash"></i> Remove</button>' : ''}
                                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 8px;">PNG, JPG, atau SVG. Max 2MB.</p>
                                </div>
                            </div>
                            <input type="hidden" id="logo-data" name="logo" value="">
                        </div>
                        <button type="submit" class="btn btn-primary">Save Settings</button>
                    </form>
                </div>
            `;

            // Wire up settings form submit
            document.getElementById('settings-form').onsubmit = async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const logoData = document.getElementById('logo-data').value;
                const data = {
                    name: formData.get('name'),
                    address: formData.get('address'),
                    phone: formData.get('phone'),
                    npwp: formData.get('npwp'),
                    bankName: formData.get('bankName'),
                    bankAccount: formData.get('bankAccount'),
                    bankHolder: formData.get('bankHolder')
                };
                if (logoData) data.logo = logoData;
                else if (logoData === '__REMOVE__') data.logo = '';
                try {
                    await window.store.saveSettings(data);
                    alert('Settings saved!');
                    this.renderSettings();
                } catch (err) { alert('Gagal menyimpan settings: ' + err.message); }
            };
        } catch (err) {
            this.showErrorMessage("Gagal memuat settings: " + err.message);
        }
    }

    onLogoFileSelect(input) {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            alert('File terlalu besar. Maksimal 2MB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            document.getElementById('logo-preview').innerHTML = `<img src="${dataUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
            document.getElementById('logo-data').value = dataUrl;
        };
        reader.readAsDataURL(file);
    }

    removeLogo() {
        document.getElementById('logo-preview').innerHTML = '<span style="color: var(--text-secondary); font-size: 0.8rem;">No logo</span>';
        document.getElementById('logo-data').value = '__REMOVE__';
    }

    async saveUnit() {
        const name = document.getElementById('new-unit-name').value.trim();
        if (!name) return;
        try {
            await window.store.addUnit(name);
            this.renderMeasurements();
        } catch (err) { alert("Gagal menambah unit: " + err.message); }
    }

    async deleteUnit(name) {
        if (confirm(`Hapus unit "${name}"?`)) {
            try {
                await window.store.deleteUnit(name);
                this.renderMeasurements();
            } catch (err) { alert("Gagal menghapus unit: " + err.message); }
        }
    }

    openClientForm(id = null) {
        const client = id ? window.store.clients.find(c => c.id === id) : { name: '', email: '', address: '', npwpNumber: '', pic: '' };
        if (!client) return;
        const content = `
            <h3>${id ? 'Edit' : 'New'} Client</h3>
            <form id="client-form">
                <div class="form-group"><label>Name</label><input type="text" name="name" value="${client.name}" required></div>
                <div class="form-group"><label>Email</label><input type="email" name="email" value="${client.email || ''}"></div>
                <div class="form-group"><label>PIC (Person In Charge)</label><input type="text" name="pic" value="${client.pic || ''}" placeholder="Nama kontak PIC"></div>
                <div class="form-group"><label>Address</label><textarea name="address">${client.address || ''}</textarea></div>
                <div class="form-group">
                    <label>Nomor NPWP</label>
                    <input type="text" name="npwpNumber" value="${client.npwpNumber || client.npwp_number || ''}" placeholder="Masukkan Nomor NPWP (opsional)">
                </div>
                <div style="margin-top: 20px;">
                    <button type="submit" class="btn btn-primary">Save Client</button>
                    <button type="button" class="btn btn-secondary" onclick="window.ui.closeModal()">Cancel</button>
                </div>
            </form>
        `;
        this.openModal(content);
        document.getElementById('client-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const npwpVal = (formData.get('npwpNumber') || '').trim();
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                address: formData.get('address'),
                pic: formData.get('pic') || '',
                npwp: npwpVal.length > 0,
                npwpNumber: npwpVal
            };
            try {
                if (id) await window.store.updateClient(id, data);
                else await window.store.addClient(data);
                this.closeModal();
                this.renderClients();
            } catch (err) { alert("Gagal menyimpan client: " + err.message); }
        };
    }

    async deleteClient(id) {
        if (confirm("Hapus client ini?")) {
            try {
                await window.store.deleteClient(id);
                this.renderClients();
            } catch (err) { alert("Gagal menghapus client: " + err.message); }
        }
    }

    openProductForm(id = null) {
        const product = id ? window.store.products.find(p => p.id === id) : { name: '', description: '', category: 'Barang', unit: 'Pcs', price: 0 };
        if (!product) return;
        const content = `
            <h3>${id ? 'Edit' : 'New'} Product/Service</h3>
            <form id="product-form">
                <div class="form-group"><label>Name</label><input type="text" name="name" value="${product.name}" required></div>
                <div class="form-group"><label>Description</label><textarea name="description">${product.description || ''}</textarea></div>
                <div class="form-group">
                    <label>Category</label>
                    <select name="category">
                        <option value="Barang" ${product.category === 'Barang' ? 'selected' : ''}>Barang</option>
                        <option value="Service" ${product.category === 'Service' ? 'selected' : ''}>Service</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Unit</label>
                    <select name="unit">
                        ${(window.store.units || []).map(u => `<option value="${u}" ${product.unit === u ? 'selected' : ''}>${u}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label>Price</label><input type="number" name="price" value="${product.price}" required></div>
                <div style="margin-top: 20px;">
                    <button type="submit" class="btn btn-primary">Save Product</button>
                    <button type="button" class="btn btn-secondary" onclick="window.ui.closeModal()">Cancel</button>
                </div>
            </form>
        `;
        this.openModal(content);
        document.getElementById('product-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = {
                name: formData.get('name'),
                description: formData.get('description'),
                category: formData.get('category'),
                unit: formData.get('unit'),
                price: Number(formData.get('price'))
            };
            try {
                if (id) await window.store.updateProduct(id, data);
                else await window.store.addProduct(data);
                this.closeModal();
                this.renderProducts();
            } catch (err) { alert("Gagal menyimpan produk: " + err.message); }
        };
    }

    async deleteProduct(id) {
        if (confirm("Hapus produk ini?")) {
            try {
                await window.store.deleteProduct(id);
                this.renderProducts();
            } catch (err) { alert("Gagal menghapus produk: " + err.message); }
        }
    }

    async openTransactionForm(type, id = null) {
        try {
            let tx = id ? await window.store.getTransaction(id) : {
                type,
                date: new Date().toISOString().split('T')[0],
                clientId: '',
                docNumber: window.store.generateNextDocNumber(type),
                terms: '',
                status: 'Draft',
                items: []
            };

            const isDO = type === 'DO';
            const isBAP = type === 'BAP';
            const isDraftForm = isDO || isBAP;
            const headerStyle = 'font-weight: 600; font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;';

            let itemsHeaderHtml, addRowFn;
            if (isDO) {
                // DO: Category | Product | Qty | SN | Remarks | âœ•
                itemsHeaderHtml = `
                    <div class="tx-items-header" style="display: grid; grid-template-columns: 100px 3fr 80px 2fr 2fr 40px; gap: 10px; padding: 8px 0; border-bottom: 2px solid var(--border-color); margin-bottom: 8px;">
                        <span style="${headerStyle}">Category</span>
                        <span style="${headerStyle}">Product</span>
                        <span style="${headerStyle}">Qty</span>
                        <span style="${headerStyle}">Serial Number</span>
                        <span style="${headerStyle}">Remarks</span>
                        <span></span>
                    </div>`;
                addRowFn = 'addDoItemRow';
            } else if (isBAP) {
                // BAST: Category | Product | Qty | SN | âœ•
                itemsHeaderHtml = `
                    <div class="tx-items-header" style="display: grid; grid-template-columns: 100px 3fr 80px 2fr 40px; gap: 10px; padding: 8px 0; border-bottom: 2px solid var(--border-color); margin-bottom: 8px;">
                        <span style="${headerStyle}">Category</span>
                        <span style="${headerStyle}">Product</span>
                        <span style="${headerStyle}">Qty</span>
                        <span style="${headerStyle}">Serial Number</span>
                        <span></span>
                    </div>`;
                addRowFn = 'addBastItemRow';
            } else {
                // QUO/INV: Category | Product | Qty | Unit | Price | Margin | Remarks | âœ•
                itemsHeaderHtml = `
                    <div class="tx-items-header" style="display: grid; grid-template-columns: 120px 3fr 80px 80px 140px 90px 2fr 40px; gap: 10px; padding: 8px 0; border-bottom: 2px solid var(--border-color); margin-bottom: 8px;">
                        <span style="${headerStyle}">Category</span>
                        <span style="${headerStyle}">Product</span>
                        <span style="${headerStyle}">Qty</span>
                        <span style="${headerStyle}">Unit</span>
                        <span style="${headerStyle}">Price</span>
                        <span style="${headerStyle}">Margin %</span>
                        <span style="${headerStyle}">Remarks</span>
                        <span></span>
                    </div>`;
                addRowFn = 'addTxItemRow';
            }

            const termsSection = isDraftForm ? '' : `
                    <h4 style="margin-top: 25px; margin-bottom: 10px;">Terms & Conditions</h4>
                    <textarea id="tx-terms" name="terms" rows="5" style="width:100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.9rem; line-height: 1.6; resize: vertical;" placeholder="Enter terms & conditions..."></textarea>
            `;

            const content = `
                <h3>${id ? 'Edit' : 'New'} ${this.typeLabel(type)}</h3>
                <form id="transaction-form">
                    <div class="grid" style="grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                        <div class="form-group"><label>Doc Number</label><input type="text" name="docNumber" value="${tx.docNumber}" required ${!id ? 'readonly style="background:#f1f5f9; cursor:not-allowed;"' : ''}></div>
                        <div class="form-group"><label>Date</label><input type="date" name="date" value="${tx.date.split('T')[0]}" required></div>
                        <div class="form-group">
                            <label>Client</label>
                            <select name="clientId" required>
                                <option value="">Select Client</option>
                                ${window.store.clients.map(c => `<option value="${c.id}" ${tx.clientId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    ${isBAP ? `
                    <div class="form-group" style="margin-top: 15px;">
                        <label>PO Number</label>
                        <input type="text" name="customerPo" value="${tx.customerPo || ''}" placeholder="Customer PO Number">
                    </div>` : ''}

                    <h4 style="margin-top: 20px; margin-bottom: 10px;">Items</h4>
                    ${itemsHeaderHtml}
                    <div id="tx-items-container"></div>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="window.ui.${addRowFn}()" style="margin-top: 10px;">+ Add Item</button>

                    ${termsSection}

                    <div style="margin-top: 20px;">
                        <button type="submit" class="btn btn-primary">Save ${this.typeLabel(type)}</button>
                        <button type="button" class="btn btn-secondary" onclick="window.ui.closeModal()">Cancel</button>
                    </div>
                </form>
            `;
            this.openModal(content);
            this.currentItemIndex = 0;
            this.currentTermIndex = 0;

            if (tx.items && tx.items.length > 0) {
                if (isDO) tx.items.forEach(item => this.addDoItemRow(item));
                else if (isBAP) tx.items.forEach(item => this.addBastItemRow(item));
                else tx.items.forEach(item => this.addTxItemRow(item));
            } else {
                if (isDO) this.addDoItemRow();
                else if (isBAP) this.addBastItemRow();
                else this.addTxItemRow();
            }

            // Load terms (only for QUO/INV)
            if (!isDraftForm) {
                const defaultTerms = '1. Prices are quoted excluding VAT\n2. PO that has been received by PT IDE SOLUSI INTEGRASI cannot be canceled';
                const termsEl = document.getElementById('tx-terms');
                if (tx.terms && typeof tx.terms === 'string' && tx.terms.trim().length > 0) {
                    termsEl.value = tx.terms;
                } else {
                    termsEl.value = defaultTerms;
                }
            }

            document.getElementById('transaction-form').onsubmit = async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const items = [];

                if (isDraftForm) {
                    document.querySelectorAll('.tx-item-row').forEach(row => {
                        const idx = row.dataset.index;
                        const lockedCat = isDO ? 'Barang' : 'Service';
                        items.push({
                            itemId: row.querySelector(`input[name="items[${idx}][itemId]"]`).value,
                            qty: Number(row.querySelector(`input[name="items[${idx}][qty]"]`).value),
                            sn: row.querySelector(`input[name="items[${idx}][sn]"]`)?.value || '',
                            remarks: row.querySelector(`input[name="items[${idx}][remarks]"]`)?.value || '',
                            category: lockedCat,
                            price: Number(row.querySelector(`input[name="items[${idx}][price]"]`)?.value) || 0,
                            margin: Number(row.querySelector(`input[name="items[${idx}][margin]"]`)?.value) || 0,
                            unit: 'Pcs'
                        });
                    });
                } else {
                    document.querySelectorAll('.tx-item-row').forEach(row => {
                        const idx = row.dataset.index;
                        items.push({
                            itemId: row.querySelector(`input[name="items[${idx}][itemId]"]`).value,
                            qty: Number(row.querySelector(`input[name="items[${idx}][qty]"]`).value),
                            price: Number(row.querySelector(`input[name="items[${idx}][price]"]`).value),
                            margin: Number(row.querySelector(`input[name="items[${idx}][margin]"]`).value) || 15,
                            remarks: row.querySelector(`input[name="items[${idx}][remarks]"]`).value,
                            category: row.querySelector(`select[name="items[${idx}][category]"]`)?.value || 'Barang',
                            unit: row.querySelector(`select[name="items[${idx}][unit]"]`)?.value || 'Pcs'
                        });
                    });
                }

                const termsEl = document.getElementById('tx-terms');
                const termsText = termsEl ? termsEl.value.trim() : '';

                // For BAST, check duplicate PO number client-side before submission
                const customerPoVal = formData.get('customerPo') || tx.customerPo || '';
                if (isBAP && customerPoVal) {
                    const existing = (window.store.transactions || []).find(
                        t => t.type === 'BAP' && t.customerPo === customerPoVal && t.id !== id
                    );
                    if (existing) {
                        return alert(`PO Number "${customerPoVal}" sudah digunakan di BAST ${existing.docNumber}.`);
                    }
                }

                const data = {
                    type,
                    docNumber: formData.get('docNumber'),
                    customerPo: customerPoVal,
                    date: formData.get('date'),
                    clientId: formData.get('clientId'),
                    status: tx.status || 'Draft',
                    terms: termsText,
                    items
                };

                try {
                    if (id) await window.store.updateTransaction(id, data, items);
                    else await window.store.addTransaction(data, items);
                    this.closeModal();
                    this.renderTransactions(type);
                } catch (err) { alert("Gagal menyimpan transaksi: " + err.message); }
            };
        } catch (err) { alert("Gagal membuka form: " + err.message); }
    }

    addTxItemRow(item = null) {
        const container = document.getElementById('tx-items-container');
        if (!container) return;
        const idx = this.currentItemIndex++;

        // Resolve product name and category for existing items
        let productName = '';
        let productCategory = '';
        let productId = '';
        if (item) {
            const pid = item.itemId || item.item_id;
            productId = pid || '';
            const found = window.store.products.find(p => p.id === pid);
            if (found) {
                productName = found.name;
                productCategory = found.category || item.category || '';
            } else {
                productCategory = item.category || '';
            }
        }

        const row = document.createElement('div');
        row.className = 'tx-item-row';
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '120px 3fr 80px 80px 140px 90px 2fr 40px';
        row.style.gap = '10px';
        row.style.marginBottom = '8px';
        row.style.alignItems = 'center';
        row.dataset.index = idx;

        const activeCat = productCategory || 'Barang';
        const activeUnit = (item ? item.unit : '') || 'Pcs';
        const unitOptions = (window.store.units || ['Pcs', 'Unit', 'Lot', 'Kg', 'Mtr']).map(u => `<option value="${u}" ${u === activeUnit ? 'selected' : ''}>${u}</option>`).join('');

        row.innerHTML = `
            <select name="items[${idx}][category]" onchange="window.ui.onCategoryChange(${idx})" style="width:100%; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.85rem; background: white; cursor: pointer;">
                <option value="Barang" ${activeCat === 'Barang' ? 'selected' : ''}>Barang</option>
                <option value="Service" ${activeCat === 'Service' ? 'selected' : ''}>Service</option>
            </select>
            <div style="position: relative;">
                <input type="text" name="items[${idx}][search]" value="${productName}" placeholder="Search product..." autocomplete="off"
                    oninput="window.ui.onProductSearch(this, ${idx})"
                    onfocus="window.ui.onProductSearch(this, ${idx})"
                    style="width:100%; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.9rem;">
                <input type="hidden" name="items[${idx}][itemId]" value="${productId}">
                <div id="product-dropdown-${idx}" style="display:none; position:absolute; top:100%; left:0; right:0; z-index:100; background:var(--card-bg); border:1px solid var(--border-color); border-radius: 6px; max-height: 200px; overflow-y:auto; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"></div>
            </div>
            <input type="number" name="items[${idx}][qty]" value="${item ? item.qty : 1}" placeholder="Qty" required style="width:100%; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.9rem; text-align: center;">
            <select name="items[${idx}][unit]" style="width:100%; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.85rem; background: white; cursor: pointer;">
                ${unitOptions}
            </select>
            <input type="number" name="items[${idx}][price]" value="${item ? item.price : 0}" placeholder="Price" required style="width:100%; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.9rem;">
            <input type="number" name="items[${idx}][margin]" value="${item && item.margin != null ? item.margin : 15}" placeholder="15" min="0" max="100" step="0.5" style="width:100%; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.9rem; text-align: center;">
            <input type="text" name="items[${idx}][remarks]" value="${item ? item.remarks || '' : ''}" placeholder="Remarks" style="width:100%; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.9rem;">
            <button type="button" class="btn btn-sm btn-error" onclick="this.parentElement.remove()" style="padding: 6px 10px; font-size: 1rem;">&times;</button>
        `;
        container.appendChild(row);

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById(`product-dropdown-${idx}`);
            if (dropdown && !row.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }

    onProductSearch(input, idx) {
        const query = input.value.toLowerCase().trim();
        const dropdown = document.getElementById(`product-dropdown-${idx}`);
        if (!dropdown) return;

        // Get selected category from dropdown
        const row = document.querySelector(`.tx-item-row[data-index="${idx}"]`);
        const catSelect = row?.querySelector(`select[name="items[${idx}][category]"]`);
        const selectedCat = catSelect?.value || '';

        const products = window.store.products || [];
        let filtered = products;

        // Filter by category if selected
        if (selectedCat) {
            filtered = filtered.filter(p => (p.category || '') === selectedCat);
        }

        // Then filter by search query
        if (query.length > 0) {
            filtered = filtered.filter(p => p.name.toLowerCase().includes(query));
        }

        if (filtered.length === 0) {
            dropdown.innerHTML = '<div style="padding: 10px 12px; color: var(--text-secondary); font-size: 0.85rem;">No products found</div>';
            dropdown.style.display = 'block';
            return;
        }

        dropdown.innerHTML = filtered.map(p => `
            <div class="product-search-option" onclick="window.ui.selectProduct(${idx}, '${p.id}')"
                style="padding: 8px 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); transition: background 0.15s;"
                onmouseover="this.style.background='var(--bg-color)'" onmouseout="this.style.background='transparent'">
                <span style="font-size: 0.9rem;">${p.name}</span>
                <span style="font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; background: ${p.category === 'Service' ? 'rgba(139,92,246,0.15)' : 'rgba(14,165,233,0.15)'}; color: ${p.category === 'Service' ? '#8b5cf6' : '#0ea5e9'};">${p.category || '-'}</span>
            </div>
        `).join('');
        dropdown.style.display = 'block';
    }

    onCategoryChange(idx) {
        const row = document.querySelector(`.tx-item-row[data-index="${idx}"]`);
        if (!row) return;
        // Clear selected product when category changes
        row.querySelector(`input[name="items[${idx}][search]"]`).value = '';
        row.querySelector(`input[name="items[${idx}][itemId]"]`).value = '';
        row.querySelector(`input[name="items[${idx}][price]"]`).value = 0;
    }

    selectProduct(idx, productId) {
        const product = window.store.products.find(p => p.id === productId);
        if (!product) return;

        const row = document.querySelector(`.tx-item-row[data-index="${idx}"]`);
        if (!row) return;

        // Set values
        row.querySelector(`input[name="items[${idx}][search]"]`).value = product.name;
        row.querySelector(`input[name="items[${idx}][itemId]"]`).value = product.id;
        row.querySelector(`input[name="items[${idx}][price]"]`).value = product.price || 0;

        // Auto-set category dropdown
        const catSelect = row.querySelector(`select[name="items[${idx}][category]"]`);
        if (catSelect && product.category) {
            catSelect.value = product.category;
        }

        // Close dropdown
        const dropdown = document.getElementById(`product-dropdown-${idx}`);
        if (dropdown) dropdown.style.display = 'none';
    }

    onItemSelect(select, idx) {
        // Legacy - kept for compatibility
    }

    async deleteTransaction(id, type) {
        if (confirm("Hapus transaksi ini?")) {
            try {
                await window.store.deleteTransaction(id);
                this.renderTransactions(type);
            } catch (err) { alert("Gagal menghapus transaksi: " + err.message); }
        }
    }

    async setInvoiceStatus(invId, status) {
        try {
            await window.store.updateTransactionStatus(invId, status);
            this.renderInvoiceManagement();
        } catch (err) { alert('Gagal mengubah status: ' + err.message); }
    }

    async printTransaction(id) {
        if (window.printPDF) {
            try {
                await window.printPDF(id);
            } catch (err) { alert("Gagal membuat PDF: " + err.message); }
        } else {
            alert('PDF Generator not loaded.');
        }
    }

    confirmPO(txId) {
        const tx = (window.store.transactions || []).find(t => t.id === txId);
        const content = `
            <h3>Confirm Purchase Order</h3>
            <p style="margin-bottom:15px; color: var(--text-secondary);">Quotation: <strong>${tx?.docNumber || '-'}</strong></p>
            <form id="confirm-po-form">
                <div class="form-group">
                    <label>Customer PO Number</label>
                    <input type="text" name="poNumber" required placeholder="Enter customer PO number" value="${tx?.customerPo || ''}">
                </div>
                <div style="margin-top: 20px;">
                    <button type="submit" class="btn btn-primary"><i class="fa-solid fa-check-circle"></i> Confirm PO</button>
                    <button type="button" class="btn btn-secondary" onclick="window.ui.closeModal()">Cancel</button>
                </div>
            </form>
        `;
        this.openModal(content);
        document.getElementById('confirm-po-form').onsubmit = async (e) => {
            e.preventDefault();
            const poNumber = new FormData(e.target).get('poNumber').trim();
            if (!poNumber) return alert('PO Number tidak boleh kosong.');

            // Check duplicate PO number client-side
            const existing = (window.store.transactions || []).find(t => t.customerPo === poNumber && t.id !== txId);
            if (existing) {
                return alert(`PO Number "${poNumber}" sudah digunakan di ${this.typeLabel(existing.type)} ${existing.docNumber}.`);
            }

            try {
                const fullTx = await window.store.getTransaction(txId);
                await window.store.updateTransaction(txId, {
                    ...fullTx,
                    customerPo: poNumber,
                    status: 'PO'
                }, fullTx.items);
                this.closeModal();
                this.renderTransactions('QUO');
            } catch (err) { alert('Gagal confirm PO: ' + err.message); }
        };
    }

    async convertTransaction(sourceId, targetType) {
        try {
            const source = await window.store.getTransaction(sourceId);
            if (!source) return alert('Source transaction not found');

            // Filter items: for DO, only category 'Barang'; for BAP, only category 'Service'
            let sourceItems = (source.items || []);
            if (targetType === 'DO' || targetType === 'BAP') {
                const wantedCat = targetType === 'DO' ? 'barang' : 'service';
                const unwantedCat = targetType === 'DO' ? 'service' : 'barang';
                sourceItems = sourceItems.filter(item => {
                    const itemCat = (item.category || '').toLowerCase();
                    const pid = item.itemId || item.item_id;
                    const prod = pid ? (window.store.products || []).find(p => p.id === pid) : null;
                    const prodCat = prod ? (prod.category || '').toLowerCase() : '';
                    if (itemCat === unwantedCat || prodCat === unwantedCat) return false;
                    return itemCat === wantedCat || prodCat === wantedCat;
                });
                if (sourceItems.length === 0) {
                    const label = targetType === 'DO' ? 'Barang' : 'Service';
                    return alert(`Tidak ada item kategori ${label} untuk dibuat ${targetType}.`);
                }
            }

            // Build a virtual transaction as a draft to open in form
            const newDocNumber = window.store.generateNextDocNumber(targetType);

            // Check duplicate PO for DO and BAP
            if ((targetType === 'DO' || targetType === 'BAP') && source.customerPo) {
                const existingDup = (window.store.transactions || []).find(t => t.type === targetType && t.customerPo === source.customerPo);
                if (existingDup) {
                    const label = this.typeLabel(targetType);
                    return alert(`Sudah ada ${label} dengan PO Number "${source.customerPo}" (${existingDup.docNumber}).`);
                }
            }

            const draftTx = {
                type: targetType,
                docNumber: newDocNumber,
                customerPo: source.customerPo || '',
                date: new Date().toISOString().split('T')[0],
                clientId: source.clientId,
                terms: source.terms || '',
                status: 'Draft',
                items: sourceItems.map(item => ({
                    itemId: item.itemId || item.item_id,
                    category: item.category,
                    qty: item.qty,
                    unit: item.unit,
                    sn: item.sn,
                    remarks: item.remarks,
                    cost: item.cost,
                    margin: item.margin,
                    price: item.price
                }))
            };

            // Open the transaction form pre-filled with draft data (not yet saved)
            this._openConvertForm(targetType, draftTx);
        } catch (err) { alert('Gagal convert: ' + err.message); }
    }

    async _openConvertForm(type, tx) {
        try {
            const isDO = type === 'DO';
            const isBAP = type === 'BAP';
            const isINV = type === 'INV';
            const isDraftForm = isDO || isBAP;
            const lockedCat = isDO ? 'Barang' : 'Service';
            const headerStyle = 'font-weight: 600; font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;';

            // ── INV FORM (Invoice from Quotation) ────────────────────────────
            if (isINV) {
                const invoiceDate = tx.date ? tx.date.substring(0, 10) : new Date().toISOString().substring(0, 10);
                const dueDate = new Date(invoiceDate);
                dueDate.setDate(dueDate.getDate() + 30);
                const dueDateStr = dueDate.toISOString().substring(0, 10);

                const allTx = window.store.transactions || [];
                // Normalize helpers (backend uses snake_case)
                const getClientId = t => t.clientId || t.client_id || '';
                const getDocNum = t => t.docNumber || t.doc_number || '';
                const getPO = t => t.customerPo || t.customer_po || '';

                const clientDOs = allTx.filter(t => t.type === 'DO' && getClientId(t) === getClientId(tx));
                const clientBASTs = allTx.filter(t => t.type === 'BAP' && getClientId(t) === getClientId(tx));

                // Auto-detect by matching PO
                const autoMatchDO = clientDOs.find(d => getPO(d) === getPO(tx)) || clientDOs[0];
                const autoMatchBAST = clientBASTs.find(b => getPO(b) === getPO(tx)) || clientBASTs[0];

                const doOptions = clientDOs.map(d => `<option value="${getDocNum(d)}"   ${autoMatchDO && getDocNum(d) === getDocNum(autoMatchDO) ? 'selected' : ''}>${getDocNum(d)}</option>`).join('');
                const bastOptions = clientBASTs.map(b => `<option value="${getDocNum(b)}"   ${autoMatchBAST && getDocNum(b) === getDocNum(autoMatchBAST) ? 'selected' : ''}>${getDocNum(b)}</option>`).join('');

                const hdrS = 'font-weight:600;font-size:0.85rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;';
                // Items header: NO Price, NO Margin
                const itemsHeader = `<div class="tx-items-header" style="display:grid;grid-template-columns:120px 3fr 80px 80px 2fr 40px;gap:10px;padding:8px 0;border-bottom:2px solid var(--border-color);margin-bottom:8px;">
                    <span style="${hdrS}">Category</span><span style="${hdrS}">Product</span><span style="${hdrS}">Qty</span>
                    <span style="${hdrS}">Unit</span><span style="${hdrS}">Remarks</span><span></span></div>`;

                const content = `
                    <h3>New Invoice (from Quotation)</h3>
                    <form id="transaction-form">
                        <div class="grid" style="grid-template-columns:1fr 1fr 1fr;gap:15px;">
                            <div class="form-group"><label>Invoice Number</label><input type="text" name="docNumber" value="${window.store.generateNextDocNumber('INV')}" required readonly style="background:#f1f5f9;cursor:not-allowed;"></div>
                            <div class="form-group"><label>Invoice Date</label><input type="date" name="date" id="inv-date" value="${invoiceDate}" required></div>
                            <div class="form-group"><label>Client</label>
                                <select name="clientId" required>
                                    <option value="">Select Client</option>
                                    ${window.store.clients.map(c => `<option value="${c.id}" ${getClientId(tx) === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="grid" style="grid-template-columns:1fr 1fr 1fr;gap:15px;margin-top:15px;">
                            <div class="form-group"><label>Due Date</label><input type="date" name="dueDate" id="inv-due-date" value="${dueDateStr}" required></div>
                            <div class="form-group"><label>U.P. / Attention (Opsional)</label><input type="text" name="attention" placeholder="Nama PIC klien"></div>
                            <div class="form-group"><label>PO Reference</label><input type="text" name="customerPo" value="${getPO(tx)}" placeholder="Nomor PO"></div>
                        </div>
                        <div class="grid" style="grid-template-columns:1fr 1fr;gap:15px;margin-top:15px;">
                            <div class="form-group">
                                <label>Referensi DO</label>
                                ${doOptions
                        ? `<select name="doRef"><option value="">-- Pilih DO --</option>${doOptions}</select>
                                       ${autoMatchDO ? `<div style="margin-top:6px;padding:6px 10px;background:rgba(59,130,246,0.08);border-radius:6px;font-size:0.82rem;color:#3b82f6;border:1px solid rgba(59,130,246,0.2);">
                                           <i class="fa-solid fa-truck"></i> <strong>${getDocNum(autoMatchDO)}</strong> — terdeteksi otomatis</div>` : ''}`
                        : `<div style="padding:10px;background:rgba(100,116,139,0.08);border-radius:6px;font-size:0.83rem;color:var(--text-secondary);border:1px solid var(--border-color);">
                                           <i class="fa-solid fa-info-circle"></i> Belum ada DO untuk klien ini
                                           <input type="hidden" name="doRef" value=""></div>`}
                            </div>
                            <div class="form-group">
                                <label>Referensi BAST</label>
                                ${bastOptions
                        ? `<select name="bastRef"><option value="">-- Pilih BAST --</option>${bastOptions}</select>
                                       ${autoMatchBAST ? `<div style="margin-top:6px;padding:6px 10px;background:rgba(168,85,247,0.08);border-radius:6px;font-size:0.82rem;color:#a855f7;border:1px solid rgba(168,85,247,0.2);">
                                           <i class="fa-solid fa-file-signature"></i> <strong>${getDocNum(autoMatchBAST)}</strong> — terdeteksi otomatis</div>` : ''}`
                        : `<div style="padding:10px;background:rgba(100,116,139,0.08);border-radius:6px;font-size:0.83rem;color:var(--text-secondary);border:1px solid var(--border-color);">
                                           <i class="fa-solid fa-info-circle"></i> Belum ada BAST untuk klien ini
                                           <input type="hidden" name="bastRef" value=""></div>`}
                            </div>
                        </div>
                        <h4 style="margin-top:20px;margin-bottom:10px;">Items</h4>
                        ${itemsHeader}
                        <div id="tx-items-container"></div>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="window.ui.addInvItemRow()" style="margin-top:10px;">+ Add Item</button>
                        <div style="margin-top:20px;">
                            <button type="submit" class="btn btn-primary">Save Invoice</button>
                            <button type="button" class="btn btn-secondary" onclick="window.ui.closeModal()">Cancel</button>
                        </div>
                    </form>`;
                this.openModal(content);

                document.getElementById('inv-date').addEventListener('change', (e) => {
                    const d = new Date(e.target.value);
                    d.setDate(d.getDate() + 30);
                    document.getElementById('inv-due-date').value = d.toISOString().substring(0, 10);
                });

                this.currentItemIndex = 0;
                if (tx.items && tx.items.length > 0) tx.items.forEach(item => this.addInvItemRow(item));
                else this.addInvItemRow();

                document.getElementById('transaction-form').onsubmit = async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.target);
                    const items = [];
                    document.querySelectorAll('.tx-item-row').forEach(row => {
                        const idx = row.dataset.index;
                        items.push({
                            itemId: row.querySelector(`input[name="items[${idx}][itemId]"]`).value,
                            qty: Number(row.querySelector(`input[name="items[${idx}][qty]"]`).value),
                            remarks: row.querySelector(`input[name="items[${idx}][remarks]"]`)?.value || '',
                            category: row.querySelector(`select[name="items[${idx}][category]"]`)?.value || 'Barang',
                            unit: row.querySelector(`select[name="items[${idx}][unit]"]`)?.value || 'Pcs',
                            // Price carried from source quotation item
                            price: Number(row.querySelector(`input[name="items[${idx}][price]"]`)?.value) || 0,
                            margin: Number(row.querySelector(`input[name="items[${idx}][margin]"]`)?.value) || 0,
                        });
                    });
                    const invMeta = { dueDate: fd.get('dueDate'), attention: fd.get('attention') || '', doRef: fd.get('doRef') || '', bastRef: fd.get('bastRef') || '' };
                    const data = {
                        type: 'INV', docNumber: fd.get('docNumber'), customerPo: fd.get('customerPo') || '',
                        date: fd.get('date'), clientId: fd.get('clientId'), status: 'Unpaid', terms: '',
                        invoiceNotes: JSON.stringify(invMeta), items
                    };
                    try {
                        await window.store.addTransaction(data, items);
                        this.closeModal();
                        this.renderInvoiceManagement();
                    } catch (err) { alert('Gagal menyimpan Invoice: ' + err.message); }
                };
                return; // INV handled
            }
            // ── END INV ──────────────────────────────────────────────────────

            let itemsHeader;
            if (isDO) {
                itemsHeader = `<div class="tx-items-header" style="display: grid; grid-template-columns: 100px 3fr 80px 2fr 2fr 40px; gap: 10px; padding: 8px 0; border-bottom: 2px solid var(--border-color); margin-bottom: 8px;">
                        <span style="${headerStyle}">Category</span>
                        <span style="${headerStyle}">Product</span>
                        <span style="${headerStyle}">Qty</span>
                        <span style="${headerStyle}">Serial Number</span>
                        <span style="${headerStyle}">Remarks</span>
                        <span></span>
                   </div>`;
            } else if (isBAP) {
                itemsHeader = `<div class="tx-items-header" style="display: grid; grid-template-columns: 100px 3fr 80px 2fr 40px; gap: 10px; padding: 8px 0; border-bottom: 2px solid var(--border-color); margin-bottom: 8px;">
                        <span style="${headerStyle}">Category</span>
                        <span style="${headerStyle}">Product</span>
                        <span style="${headerStyle}">Qty</span>
                        <span style="${headerStyle}">Serial Number</span>
                        <span></span>
                   </div>`;
            } else {
                itemsHeader = `<div class="tx-items-header" style="display: grid; grid-template-columns: 120px 3fr 80px 140px 90px 2fr 40px; gap: 10px; padding: 8px 0; border-bottom: 2px solid var(--border-color); margin-bottom: 8px;">
                        <span style="${headerStyle}">Category</span>
                        <span style="${headerStyle}">Product</span>
                        <span style="${headerStyle}">Qty</span>
                        <span style="${headerStyle}">Price</span>
                        <span style="${headerStyle}">Margin %</span>
                        <span style="${headerStyle}">Remarks</span>
                        <span></span>
                   </div>`;
            }

            const termsSection = isDraftForm ? '' : `
                    <h4 style="margin-top: 25px; margin-bottom: 10px;">Terms &amp; Conditions</h4>
                    <textarea id="tx-terms" name="terms" rows="5" style="width:100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.9rem; line-height: 1.6; resize: vertical;" placeholder="Enter terms &amp; conditions...">${tx.terms || ''}</textarea>
            `;

            const addRowFn = isDO ? 'addDoItemRow' : (isBAP ? 'addBastItemRow' : 'addTxItemRow');
            const label = this.typeLabel(type);

            const content = `
                <h3>New ${label} (from Quotation)</h3>
                <form id="transaction-form">
                    <div class="grid" style="grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                        <div class="form-group"><label>Doc Number</label><input type="text" name="docNumber" value="${tx.docNumber}" required readonly style="background:#f1f5f9; cursor:not-allowed;"></div>
                        <div class="form-group"><label>Date</label><input type="date" name="date" value="${tx.date}" required></div>
                        <div class="form-group">
                            <label>Client</label>
                            <select name="clientId" required>
                                <option value="">Select Client</option>
                                ${window.store.clients.map(c => `<option value="${c.id}" ${tx.clientId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    ${isBAP ? `
                    <div class="form-group" style="margin-top: 15px;">
                        <label>PO Number</label>
                        <input type="text" name="customerPo" value="${tx.customerPo || ''}" placeholder="Customer PO Number">
                    </div>` : ''}

                    <h4 style="margin-top: 20px; margin-bottom: 10px;">Items</h4>
                    ${itemsHeader}
                    <div id="tx-items-container"></div>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="window.ui.${addRowFn}()" style="margin-top: 10px;">+ Add Item</button>

                    ${termsSection}

                    <div style="margin-top: 20px;">
                        <button type="submit" class="btn btn-primary">Save ${label}</button>
                        <button type="button" class="btn btn-secondary" onclick="window.ui.closeModal()">Cancel</button>
                    </div>
                </form>
            `;
            this.openModal(content);

            this.currentItemIndex = 0;
            if (tx.items && tx.items.length > 0) {
                if (isDO) tx.items.forEach(item => this.addDoItemRow(item));
                else if (isBAP) tx.items.forEach(item => this.addBastItemRow(item));
                else tx.items.forEach(item => this.addTxItemRow(item));
            } else {
                if (isDO) this.addDoItemRow();
                else if (isBAP) this.addBastItemRow();
                else this.addTxItemRow();
            }

            document.getElementById('transaction-form').onsubmit = async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const items = [];

                if (isDraftForm) {
                    document.querySelectorAll('.tx-item-row').forEach(row => {
                        const idx = row.dataset.index;
                        items.push({
                            itemId: row.querySelector(`input[name="items[${idx}][itemId]"]`).value,
                            qty: Number(row.querySelector(`input[name="items[${idx}][qty]"]`).value),
                            sn: row.querySelector(`input[name="items[${idx}][sn]"]`)?.value || '',
                            remarks: row.querySelector(`input[name="items[${idx}][remarks]"]`)?.value || '',
                            category: lockedCat,
                            price: Number(row.querySelector(`input[name="items[${idx}][price]"]`)?.value) || 0,
                            margin: Number(row.querySelector(`input[name="items[${idx}][margin]"]`)?.value) || 0,
                            unit: 'Pcs'
                        });
                    });
                } else {
                    document.querySelectorAll('.tx-item-row').forEach(row => {
                        const idx = row.dataset.index;
                        items.push({
                            itemId: row.querySelector(`input[name="items[${idx}][itemId]"]`).value,
                            qty: Number(row.querySelector(`input[name="items[${idx}][qty]"]`).value),
                            price: Number(row.querySelector(`input[name="items[${idx}][price]"]`).value),
                            margin: Number(row.querySelector(`input[name="items[${idx}][margin]"]`).value) || 15,
                            remarks: row.querySelector(`input[name="items[${idx}][remarks]"]`).value,
                            category: row.querySelector(`select[name="items[${idx}][category]"]`)?.value || 'Barang',
                            unit: 'Pcs'
                        });
                    });
                }

                const termsEl = document.getElementById('tx-terms');
                const termsText = termsEl ? termsEl.value.trim() : '';

                // For BAST create-from-conversion, check duplicate PO client-side
                const customerPoVal = isBAP ? (formData.get('customerPo') || tx.customerPo || '') : (tx.customerPo || '');
                if (isBAP && customerPoVal) {
                    const existing = (window.store.transactions || []).find(
                        t => t.type === 'BAP' && t.customerPo === customerPoVal
                    );
                    if (existing) {
                        return alert(`PO Number "${customerPoVal}" sudah digunakan di BAST ${existing.docNumber}.`);
                    }
                }

                const data = {
                    type,
                    docNumber: formData.get('docNumber'),
                    customerPo: customerPoVal,
                    date: formData.get('date'),
                    clientId: formData.get('clientId'),
                    status: 'Draft',
                    terms: termsText,
                    items
                };

                try {
                    await window.store.addTransaction(data, items);
                    this.closeModal();
                    this.renderTransactions(type);
                } catch (err) { alert("Gagal menyimpan: " + err.message); }
            };
        } catch (err) { alert("Gagal membuka form: " + err.message); }
    }

    addDoItemRow(item = null) {
        const container = document.getElementById('tx-items-container');
        if (!container) return;
        const idx = this.currentItemIndex++;

        let productName = '';
        let productId = '';
        if (item) {
            const pid = item.itemId || item.item_id;
            productId = pid || '';
            const found = window.store.products.find(p => p.id === pid);
            if (found) productName = found.name;
        }

        const row = document.createElement('div');
        row.className = 'tx-item-row';
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '100px 3fr 80px 2fr 2fr 40px';
        row.style.gap = '10px';
        row.style.marginBottom = '8px';
        row.style.alignItems = 'center';
        row.dataset.index = idx;

        const inputStyle = 'width:100%; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.9rem;';

        row.innerHTML = `
            <select name="items[${idx}][category]" style="width:100%; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.85rem; background: #f1f5f9; cursor:not-allowed;" disabled>
                <option value="Barang" selected>Barang</option>
            </select>
            <div style="position: relative;">
                <input type="text" name="items[${idx}][search]" value="${productName}" placeholder="Search product..." autocomplete="off"
                    oninput="window.ui.onProductSearch(this, ${idx})"
                    onfocus="window.ui.onProductSearch(this, ${idx})"
                    style="${inputStyle}">
                <input type="hidden" name="items[${idx}][itemId]" value="${productId}">
                <input type="hidden" name="items[${idx}][price]" value="${item ? item.price : 0}">
                <input type="hidden" name="items[${idx}][margin]" value="${item ? item.margin || 0 : 0}">
                <div id="product-dropdown-${idx}" style="display:none; position:absolute; top:100%; left:0; right:0; z-index:100; background:var(--card-bg); border:1px solid var(--border-color); border-radius: 6px; max-height: 200px; overflow-y:auto; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"></div>
            </div>
            <input type="number" name="items[${idx}][qty]" value="${item ? item.qty : 1}" placeholder="Qty" required style="${inputStyle} text-align: center;">
            <input type="text" name="items[${idx}][sn]" value="${item ? item.sn || '' : ''}" placeholder="Serial Number" style="${inputStyle}">
            <input type="text" name="items[${idx}][remarks]" value="${item ? item.remarks || '' : ''}" placeholder="Remarks" style="${inputStyle}">
            <button type="button" class="btn btn-sm btn-error" onclick="this.parentElement.remove()" style="padding: 6px 10px; font-size: 1rem;">&times;</button>
        `;
        container.appendChild(row);

        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById(`product-dropdown-${idx}`);
            if (dropdown && !row.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }

    addBastItemRow(item = null) {
        const container = document.getElementById('tx-items-container');
        if (!container) return;
        const idx = this.currentItemIndex++;

        let productName = '';
        let productId = '';
        if (item) {
            const pid = item.itemId || item.item_id;
            productId = pid || '';
            const found = window.store.products.find(p => p.id === pid);
            if (found) productName = found.name;
        }

        const row = document.createElement('div');
        row.className = 'tx-item-row';
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '100px 3fr 80px 2fr 40px';
        row.style.gap = '10px';
        row.style.marginBottom = '8px';
        row.style.alignItems = 'center';
        row.dataset.index = idx;

        const inputStyle = 'width:100%; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.9rem;';

        row.innerHTML = `
            <select name="items[${idx}][category]" style="width:100%; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.85rem; background: #f1f5f9; cursor:not-allowed;" disabled>
                <option value="Service" selected>Service</option>
            </select>
            <div style="position: relative;">
                <input type="text" name="items[${idx}][search]" value="${productName}" placeholder="Search product..." autocomplete="off"
                    oninput="window.ui.onProductSearch(this, ${idx})"
                    onfocus="window.ui.onProductSearch(this, ${idx})"
                    style="${inputStyle}">
                <input type="hidden" name="items[${idx}][itemId]" value="${productId}">
                <input type="hidden" name="items[${idx}][price]" value="${item ? item.price : 0}">
                <input type="hidden" name="items[${idx}][margin]" value="${item ? item.margin || 0 : 0}">
                <div id="product-dropdown-${idx}" style="display:none; position:absolute; top:100%; left:0; right:0; z-index:100; background:var(--card-bg); border:1px solid var(--border-color); border-radius: 6px; max-height: 200px; overflow-y:auto; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"></div>
            </div>
            <input type="number" name="items[${idx}][qty]" value="${item ? item.qty : 1}" placeholder="Qty" required style="${inputStyle} text-align: center;">
            <input type="text" name="items[${idx}][sn]" value="${item ? item.sn || '' : ''}" placeholder="Serial Number" style="${inputStyle}">
            <button type="button" class="btn btn-sm btn-error" onclick="this.parentElement.remove()" style="padding: 6px 10px; font-size: 1rem;">&times;</button>
        `;
        container.appendChild(row);

        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById(`product-dropdown-${idx}`);
            if (dropdown && !row.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }

    // ── Invoice item row: Category | Product | Qty | Unit | Remarks (no Price/Margin) ──
    addInvItemRow(item = null) {
        const container = document.getElementById('tx-items-container');
        if (!container) return;
        const idx = this.currentItemIndex++;

        let productName = '';
        let productId = '';
        let unitVal = 'Pcs';
        let priceVal = 0;
        let marginVal = 0;
        if (item) {
            const pid = item.itemId || item.item_id;
            productId = pid || '';
            priceVal = item.price || 0;
            marginVal = item.margin || 0;
            unitVal = item.unit || 'Pcs';
            const found = window.store.products.find(p => p.id === pid);
            if (found) productName = found.name;
        }

        const units = window.store.units || ['Pcs', 'Unit', 'Lot'];
        const unitOptions = units.map(u => `<option value="${u}" ${unitVal === u ? 'selected' : ''}>${u}</option>`).join('');

        const row = document.createElement('div');
        row.className = 'tx-item-row';
        row.style.cssText = 'display:grid;grid-template-columns:120px 3fr 80px 80px 2fr 40px;gap:10px;margin-bottom:8px;align-items:center;';
        row.dataset.index = idx;

        const inputStyle = 'width:100%;padding:8px 10px;border:1px solid var(--border-color);border-radius:6px;font-size:0.9rem;';

        const catOptions = ['Barang', 'Service'].map(c => `<option value="${c}" ${(item?.category || 'Barang') === c ? 'selected' : ''}>${c}</option>`).join('');

        row.innerHTML = `
            <select name="items[${idx}][category]" style="${inputStyle}font-size:0.85rem;">${catOptions}</select>
            <div style="position:relative;">
                <input type="text" name="items[${idx}][search]" value="${productName}" placeholder="Search product..." autocomplete="off"
                    oninput="window.ui.onProductSearch(this,${idx})"
                    onfocus="window.ui.onProductSearch(this,${idx})"
                    style="${inputStyle}">
                <input type="hidden" name="items[${idx}][itemId]"  value="${productId}">
                <input type="hidden" name="items[${idx}][price]"   value="${priceVal}">
                <input type="hidden" name="items[${idx}][margin]"  value="${marginVal}">
                <div id="product-dropdown-${idx}" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:100;background:var(--card-bg);border:1px solid var(--border-color);border-radius:6px;max-height:200px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,0.15);"></div>
            </div>
            <input type="number" name="items[${idx}][qty]"     value="${item ? item.qty : 1}" placeholder="Qty" required style="${inputStyle}text-align:center;">
            <select name="items[${idx}][unit]" style="${inputStyle}font-size:0.85rem;">${unitOptions}</select>
            <input type="text"   name="items[${idx}][remarks]" value="${item ? item.remarks || '' : ''}" placeholder="Remarks" style="${inputStyle}">
            <button type="button" class="btn btn-sm btn-error" onclick="this.parentElement.remove()" style="padding:6px 10px;font-size:1rem;">&times;</button>
        `;
        container.appendChild(row);

        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById(`product-dropdown-${idx}`);
            if (dropdown && !row.contains(e.target)) dropdown.style.display = 'none';
        });
    }
}

window.ui = new UI();
