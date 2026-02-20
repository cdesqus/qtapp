class UI {
    constructor() {
        this.currentItemIndex = 0;
    }

    renderDashboard() {
        const container = document.getElementById('content-area');
        const transactions = window.store.transactions;
        const clients = window.store.clients;

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
                            ${transactions.slice(0, 5).map(t => `
                                <tr>
                                    <td>${window.formatDate(t.date)}</td>
                                    <td>${t.docNumber}</td>
                                    <td>${t.clientName || '-'}</td>
                                    <td>${t.type}</td>
                                    <td><span class="status-badge status-${t.status.toLowerCase()}">${t.status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
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
        const container = document.getElementById('content-area');
        const clients = window.store.clients;
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>Client List</h3>
                    <button class="btn btn-primary" onclick="window.ui.openClientForm()"><i class="fa-solid fa-plus"></i> New Client</button>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr><th>Name</th><th>Email</th><th>NPWP</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            ${clients.map(c => `
                                <tr>
                                    <td>${c.name}</td>
                                    <td>${c.email || '-'}</td>
                                    <td>${c.npwp ? '✅' : '❌'}</td>
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
    }

    renderProducts() {
        const container = document.getElementById('content-area');
        const products = window.store.products;
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
                            ${products.map(p => `
                                <tr>
                                    <td>${p.name}</td>
                                    <td>${p.category}</td>
                                    <td>${Number(p.price).toLocaleString()}</td>
                                    <td>
                                        <button class="btn btn-sm btn-secondary" onclick="window.ui.openProductForm('${p.id}')"><i class="fa-solid fa-edit"></i></button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderTransactions(type) {
        const container = document.getElementById('content-area');
        const txs = window.store.transactions.filter(t => t.type === type);
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>${type} List</h3>
                    <button class="btn btn-primary" onclick="window.ui.openTransactionForm('${type}')"><i class="fa-solid fa-plus"></i> New ${type}</button>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr><th>Date</th><th>Number</th><th>Client</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            ${txs.map(t => `
                                <tr>
                                    <td>${window.formatDate(t.date)}</td>
                                    <td>${t.docNumber}</td>
                                    <td>${t.clientName || '-'}</td>
                                    <td><span class="status-badge status-${t.status.toLowerCase()}">${t.status}</span></td>
                                    <td>
                                        <button class="btn btn-sm btn-secondary" onclick="window.ui.openTransactionForm('${type}', '${t.id}')"><i class="fa-solid fa-edit"></i></button>
                                        <button class="btn btn-sm btn-primary" onclick="window.ui.printTransaction('${t.id}')"><i class="fa-solid fa-print"></i></button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderMeasurements() {
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
                            ${units.map(u => `
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
    }

    async saveUnit() {
        const name = document.getElementById('new-unit-name').value.trim();
        if (!name) return;
        await window.store.addUnit(name);
        this.renderMeasurements();
    }

    async deleteUnit(name) {
        if (confirm(`Delete unit "${name}"?`)) {
            await window.store.deleteUnit(name);
            this.renderMeasurements();
        }
    }

    openClientForm(id = null) {
        const client = id ? window.store.clients.find(c => c.id === id) : { name: '', email: '', address: '', npwp: false, npwpNumber: '' };
        const content = `
            <h3>${id ? 'Edit' : 'New'} Client</h3>
            <form id="client-form">
                <div class="form-group"><label>Name</label><input type="text" name="name" value="${client.name}" required></div>
                <div class="form-group"><label>Email</label><input type="email" name="email" value="${client.email || ''}"></div>
                <div class="form-group"><label>Address</label><textarea name="address">${client.address || ''}</textarea></div>
                <div class="form-group">
                    <label><input type="checkbox" name="npwp" ${client.npwp ? 'checked' : ''} onchange="document.getElementById('npwp-number-group').style.display = this.checked ? 'block' : 'none'"> Has NPWP</label>
                </div>
                <div id="npwp-number-group" class="form-group" style="display: ${client.npwp ? 'block' : 'none'}">
                    <label>NPWP Number</label><input type="text" name="npwpNumber" value="${client.npwpNumber || ''}">
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
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                address: formData.get('address'),
                npwp: formData.get('npwp') === 'on',
                npwpNumber: formData.get('npwpNumber')
            };
            if (id) await window.store.updateClient(id, data);
            else await window.store.addClient(data);
            this.closeModal();
            this.renderClients();
        };
    }

    openProductForm(id = null) {
        const product = id ? window.store.products.find(p => p.id === id) : { name: '', description: '', category: 'Barang', unit: 'Pcs', price: 0 };
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
            if (id) await window.store.updateProduct(id, data);
            else await window.store.addProduct(data);
            this.closeModal();
            this.renderProducts();
        };
    }

    async openTransactionForm(type, id = null) {
        let tx = id ? await window.store.getTransaction(id) : {
            type,
            date: new Date().toISOString().split('T')[0],
            clientId: '',
            docNumber: window.store.generateNextDocNumber(type),
            customerPo: '',
            terms: '',
            status: 'Draft',
            items: []
        };

        const content = `
            <h3>${id ? 'Edit' : 'New'} ${type}</h3>
            <form id="transaction-form">
                <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="form-group"><label>Doc Number</label><input type="text" name="docNumber" value="${tx.docNumber}" required></div>
                    <div class="form-group"><label>Date</label><input type="date" name="date" value="${tx.date.split('T')[0]}" required></div>
                    <div class="form-group">
                        <label>Client</label>
                        <select name="clientId" required>
                            <option value="">Select Client</option>
                            ${window.store.clients.map(c => `<option value="${c.id}" ${tx.clientId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group"><label>Customer PO</label><input type="text" name="customerPo" value="${tx.customerPo || ''}"></div>
                </div>
                
                <h4 style="margin-top: 20px;">Items</h4>
                <div id="tx-items-container">
                    <!-- Items will be added here -->
                </div>
                <button type="button" class="btn btn-sm btn-secondary" onclick="window.ui.addTxItemRow()" style="margin-top: 10px;">+ Add Item</button>

                <div style="margin-top: 20px;">
                    <button type="submit" class="btn btn-primary">Save ${type}</button>
                    <button type="button" class="btn btn-secondary" onclick="window.ui.closeModal()">Cancel</button>
                </div>
            </form>
        `;
        this.openModal(content);
        this.currentItemIndex = 0;
        if (tx.items && tx.items.length > 0) {
            tx.items.forEach(item => this.addTxItemRow(item));
        } else {
            this.addTxItemRow();
        }

        document.getElementById('transaction-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const items = [];
            document.querySelectorAll('.tx-item-row').forEach(row => {
                const idx = row.dataset.index;
                items.push({
                    itemId: row.querySelector(`select[name="items[${idx}][itemId]"]`).value,
                    qty: Number(row.querySelector(`input[name="items[${idx}][qty]"]`).value),
                    price: Number(row.querySelector(`input[name="items[${idx}][price]"]`).value),
                    remarks: row.querySelector(`input[name="items[${idx}][remarks]"]`).value,
                    category: 'Barang', // Default or fetch from product
                    unit: 'Pcs' // Default or fetch from product
                });
            });

            const data = {
                type,
                docNumber: formData.get('docNumber'),
                date: formData.get('date'),
                clientId: formData.get('clientId'),
                customerPo: formData.get('customerPo'),
                status: tx.status,
                items
            };

            if (id) await window.store.updateTransaction(id, data, items);
            else await window.store.addTransaction(data, items);
            this.closeModal();
            this.renderTransactions(type);
        };
    }

    addTxItemRow(item = null) {
        const container = document.getElementById('tx-items-container');
        const idx = this.currentItemIndex++;
        const row = document.createElement('div');
        row.className = 'tx-item-row grid';
        row.style.gridTemplateColumns = '2fr 1fr 1fr 2fr 40px';
        row.style.gap = '10px';
        row.style.marginBottom = '10px';
        row.dataset.index = idx;

        row.innerHTML = `
            <select name="items[${idx}][itemId]" required onchange="window.ui.onItemSelect(this, ${idx})">
                <option value="">Select Product</option>
                ${window.store.products.map(p => `<option value="${p.id}" ${item && (item.itemId === p.id || item.item_id === p.id) ? 'selected' : ''} data-price="${p.price}">${p.name}</option>`).join('')}
            </select>
            <input type="number" name="items[${idx}][qty]" value="${item ? item.qty : 1}" placeholder="Qty" required>
            <input type="number" name="items[${idx}][price]" value="${item ? item.price : 0}" placeholder="Price" required>
            <input type="text" name="items[${idx}][remarks]" value="${item ? item.remarks || '' : ''}" placeholder="Remarks">
            <button type="button" class="btn btn-sm btn-error" onclick="this.parentElement.remove()">&times;</button>
        `;
        container.appendChild(row);
    }

    onItemSelect(select, idx) {
        const price = select.options[select.selectedIndex].dataset.price;
        if (price) {
            const row = select.closest('.tx-item-row');
            row.querySelector(`input[name="items[${idx}][price]"]`).value = price;
        }
    }

    async printTransaction(id) {
        if (window.printPDF) {
            window.printPDF(id);
        } else {
            alert('PDF Generator not loaded.');
        }
    }
}

window.ui = new UI();
