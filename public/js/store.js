// Utility Functions
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

// Data Models
const DocumentTypes = {
    QUOTATION: 'QUO',
    DO: 'DO',
    BAP: 'BAP',
    INVOICE: 'INV'
};

const Status = {
    DRAFT: 'Draft',
    SENT: 'Sent',
    PO: 'PO',
    PAID: 'Paid',
    REJECTED: 'Rejected'
};

const API_URL = (window.location.protocol === 'file:') ? 'http://localhost:3020' : '';

class Store {
    constructor() {
        this.clients = [];
        this.products = [];
        this.units = ['Pcs', 'Unit', 'Lot', 'Kg', 'Mtr'];
        this.transactions = [];
        this.transactionItems = [];
        this.companySettings = {
            name: 'PT. IDE SOLUSI INTEGRASI',
            address: "JL. KH. Abdullah Syafe'i no.23A Kebon Baru Tebet, Jakarta Selatan 12830",
            phone: "021-83796630-32",
            logo: null,
            adminName: 'Admin Name',
            adminSignature: null
        };
        this.users = [];
        this.currentUser = null;
    }

    // Helper for fetch with credentials
    async apiFetch(url, options = {}) {
        options.credentials = 'include';
        try {
            const res = await fetch(url, options);
            if (res.status === 401 && !url.includes('/api/login') && !url.includes('/api/me')) {
                // If unauthorized, redirect to login (or re-render login)
                this.logout();
                window.location.reload();
                return null;
            }
            return res;
        } catch (err) {
            console.error("API Fetch Error:", err);
            throw err;
        }
    }

    async init() {
        try {
            // Check if user is already logged in
            const meRes = await this.apiFetch(`${API_URL}/api/me`);
            if (meRes && meRes.ok) {
                this.currentUser = await meRes.json();
            } else {
                this.currentUser = null;
                return; // Stop init if not logged in
            }

            await Promise.all([
                this.loadClients(),
                this.loadProducts(),
                this.loadTransactions(),
                this.loadUnits(),
                this.loadUsers(),
                this.loadSettings()
            ]);
        } catch (err) {
            console.error("Initialization error:", err);
        }
    }

    async loadUsers() {
        try {
            const res = await this.apiFetch(`${API_URL}/api/users`);
            if (res && res.ok) this.users = await res.json();
        } catch (e) { }
    }

    async loadUnits() {
        try {
            const res = await this.apiFetch(`${API_URL}/api/units`);
            if (res && res.ok) this.units = await res.json();
        } catch (e) { }
    }

    async loadClients() {
        const res = await this.apiFetch(`${API_URL}/api/clients`);
        if (res && res.ok) this.clients = await res.json();
    }

    async loadProducts() {
        const res = await this.apiFetch(`${API_URL}/api/products`);
        if (res && res.ok) this.products = await res.json();
    }

    async loadTransactions() {
        const res = await this.apiFetch(`${API_URL}/api/transactions`);
        if (res && res.ok) this.transactions = await res.json();
    }

    async loadSettings() {
        const res = await this.apiFetch(`${API_URL}/api/settings`);
        if (res && res.ok) {
            const data = await res.json();
            if (Object.keys(data).length > 0) {
                this.companySettings = { ...this.companySettings, ...data };
            }
        }
    }

    async login(username, password) {
        const res = await this.apiFetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (res && res.ok) {
            this.currentUser = await res.json();
            return true;
        }
        return false;
    }

    async logout() {
        await this.apiFetch(`${API_URL}/api/logout`, { method: 'POST' });
        this.currentUser = null;
    }

    async saveSettings(settings) {
        await this.apiFetch(`${API_URL}/api/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        await this.loadSettings();
    }

    async addClient(client) {
        const res = await this.apiFetch(`${API_URL}/api/clients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(client)
        });
        await this.loadClients();
        return await (res ? res.json() : null);
    }

    async updateClient(id, data) {
        await this.apiFetch(`${API_URL}/api/clients/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        await this.loadClients();
    }

    async addProduct(product) {
        await this.apiFetch(`${API_URL}/api/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });
        await this.loadProducts();
    }

    async updateProduct(id, data) {
        await this.apiFetch(`${API_URL}/api/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        await this.loadProducts();
    }

    async deleteProduct(id) {
        await this.apiFetch(`${API_URL}/api/products/${id}`, { method: 'DELETE' });
        await this.loadProducts();
    }

    async addUnit(name) {
        await this.apiFetch(`${API_URL}/api/units`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        await this.loadUnits();
    }

    async deleteUnit(name) {
        await this.apiFetch(`${API_URL}/api/units/${name}`, { method: 'DELETE' });
        await this.loadUnits();
    }

    async updateUser(id, newData) {
        await this.apiFetch(`${API_URL}/api/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newData)
        });
        await this.loadUsers();
    }

    async addTransaction(transaction, items) {
        const res = await this.apiFetch(`${API_URL}/api/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...transaction, items })
        });
        await this.loadTransactions();
        return await (res ? res.json() : null);
    }

    async updateTransaction(id, data, items) {
        await this.apiFetch(`${API_URL}/api/transactions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, items })
        });
        await this.loadTransactions();
    }

    async deleteTransaction(id) {
        await this.apiFetch(`${API_URL}/api/transactions/${id}`, { method: 'DELETE' });
        await this.loadTransactions();
    }

    async getTransaction(id) {
        const res = await this.apiFetch(`${API_URL}/api/transactions/${id}`);
        return await (res ? res.json() : null);
    }

    // ... Rest of the helper methods (generateNextDocNumber, calculateTotal, etc) are unchanged
    generateNextDocNumber(type, dateStr) {
        const date = dateStr ? new Date(dateStr) : new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');

        let prefix = '';
        if (type === DocumentTypes.QUOTATION) prefix = `QT${year}${month}`;
        else if (type === DocumentTypes.DO) prefix = `DO#${year}${month}`;
        else if (type === DocumentTypes.BAP) prefix = `HOP${year}${month}`;
        else if (type === DocumentTypes.INVOICE) prefix = `INV${year}${month}`;
        else prefix = `${type}${year}${month}`;

        const matches = this.transactions
            .filter(t => t.type === type && t.docNumber && t.docNumber.startsWith(prefix));

        let sequence = 1;
        if (matches.length > 0) {
            const sequences = matches.map(t => parseInt(t.docNumber.replace(prefix, '')) || 0);
            sequence = Math.max(...sequences) + 1;
        }

        return `${prefix}${String(sequence).padStart(3, '0')}`;
    }

    calculateItemTax(item) {
        const subtotal = item.price * item.qty;
        let dpp, ppn, pph23 = 0;

        if (item.category === 'Barang') {
            const lineTotal = subtotal;
            dpp = (lineTotal * 11) / 12;
            ppn = dpp * 0.12;
        } else {
            dpp = subtotal;
            ppn = dpp * 0.12;
            pph23 = dpp * 0.02;
        }
        return { subtotal, dpp, ppn, pph23 };
    }

    calculateTotal(items, type = null) {
        if (!items) return 0;
        if (type && type !== DocumentTypes.INVOICE) {
            return items.reduce((sum, item) => sum + (item.price * item.qty), 0);
        }

        let grandTotal = 0;
        items.forEach(item => {
            const tax = this.calculateItemTax(item);
            if (item.category === 'Service') {
                grandTotal += (tax.dpp + tax.ppn - tax.pph23);
            } else {
                grandTotal += (tax.dpp + tax.ppn);
            }
        });
        return grandTotal;
    }
}

const store = new Store();
window.store = store;
window.formatDate = formatDate;
window.DocumentTypes = DocumentTypes;
window.Status = Status;
