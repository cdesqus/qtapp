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
        container.innerHTML = `<div class="card"><h3>Measurements</h3><p>Measurement management coming soon...</p></div>`;
    }

    renderUsers() {
        const container = document.getElementById('content-area');
        container.innerHTML = `<div class="card"><h3>User Management</h3><p>User management coming soon...</p></div>`;
    }

    renderSettings() {
        const container = document.getElementById('content-area');
        container.innerHTML = `<div class="card"><h3>Company Settings</h3><p>Settings coming soon...</p></div>`;
    }

    // Helper stubs
    openClientForm(id) { alert('Form not implemented in this minimal restoration.'); }
    deleteClient(id) { if (confirm('Are you sure?')) window.store.deleteClient(id).then(() => this.renderClients()); }
    openProductForm(id) { alert('Form not implemented.'); }
    openTransactionForm(type, id) { alert(`Form for ${type} not implemented.`); }
    printTransaction(id) { alert('Print not implemented.'); }
}

window.ui = new UI();
