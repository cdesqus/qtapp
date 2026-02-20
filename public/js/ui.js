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

    // Additional UI rendering methods will be moved here
}

window.ui = new UI();
