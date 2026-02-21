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

const getBaseURL = () => {
    const { protocol, hostname, port } = window.location;
    if (protocol === 'file:') return 'http://localhost:3020';
    if (hostname.includes('kaumtech.com')) return '';
    if (port !== '3020' && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.'))) {
        return `${protocol}//${hostname}:3020`;
    }
    return ''; // Relative path
};

const API_URL = getBaseURL();
console.log("IDE ERP - API URL configured as:", API_URL || "(relative)");

class Store {
    constructor() {
        this.clients = [];
        this.products = [];
        this.units = ['Pcs', 'Unit', 'Lot', 'Kg', 'Mtr'];
        this.transactions = [];
        this.companySettings = {
            name: 'PT. IDE SOLUSI INTEGRASI',
            address: "JL. KH. Abdullah Syafe'i no.23A Kebon Baru Tebet, Jakarta Selatan 12830",
            phone: "021-83796630-32",
            logo: null
        };
        this.users = [];
        this.currentUser = null;
    }

    async apiFetch(url, options = {}) {
        options.credentials = 'include';
        try {
            console.log(`Fetching: ${url}`);
            const res = await fetch(url, options);
            if (res.status === 401 && !url.includes('/api/login') && !url.includes('/api/me')) {
                console.warn("Session expired or unauthorized");
                this.currentUser = null;
                return null;
            }
            return res;
        } catch (err) {
            console.error(`Fetch error for ${url}:`, err);
            throw err;
        }
    }

    async init() {
        try {
            console.log("Store initializing...");
            const meRes = await this.apiFetch(`${API_URL}/api/me`);
            if (meRes && meRes.ok) {
                this.currentUser = await meRes.json();
                console.log("Logged in as:", this.currentUser.username);
            } else {
                console.log("No active session.");
                this.currentUser = null;
                return;
            }

            // Load all data
            const results = await Promise.allSettled([
                this.loadClients(),
                this.loadProducts(),
                this.loadTransactions(),
                this.loadUnits(),
                this.loadUsers(),
                this.loadSettings()
            ]);

            results.forEach((r, i) => {
                if (r.status === 'rejected') console.error(`Failed to load data at index ${i}:`, r.reason);
            });

            console.log("Store init complete.");
        } catch (err) {
            console.error("Initialization error:", err);
        }
    }

    async loadUsers() {
        const res = await this.apiFetch(`${API_URL}/api/users`);
        if (res && res.ok) this.users = await res.json();
    }

    async loadUnits() {
        const res = await this.apiFetch(`${API_URL}/api/units`);
        if (res && res.ok) this.units = await res.json();
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
        try {
            const res = await this.apiFetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (res && res.ok) {
                this.currentUser = await res.json();
                return true;
            }
        } catch (e) { console.error("Login failed:", e); }
        return false;
    }

    async logout() {
        await this.apiFetch(`${API_URL}/api/logout`, { method: 'POST' });
        this.currentUser = null;
    }

    async addUser(data) {
        const res = await this.apiFetch(`${API_URL}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res && !res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to add user');
        }
        await this.loadUsers();
    }

    async deleteUser(id) {
        const res = await this.apiFetch(`${API_URL}/api/users/${id}`, { method: 'DELETE' });
        if (res && !res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to delete user');
        }
        await this.loadUsers();
    }

    async updateUser(id, data) {
        const res = await this.apiFetch(`${API_URL}/api/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res && !res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update user');
        }
        await this.loadUsers();
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

    async deleteClient(id) {
        await this.apiFetch(`${API_URL}/api/clients/${id}`, { method: 'DELETE' });
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

    async addTransaction(transaction, items) {
        const res = await this.apiFetch(`${API_URL}/api/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...transaction, items })
        });
        if (res && !res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Gagal menyimpan transaksi');
        }
        await this.loadTransactions();
        return await (res ? res.json() : null);
    }

    async updateTransaction(id, data, items) {
        const res = await this.apiFetch(`${API_URL}/api/transactions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, items })
        });
        if (res && !res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Gagal mengupdate transaksi');
        }
        await this.loadTransactions();
    }

    async deleteTransaction(id) {
        const res = await this.apiFetch(`${API_URL}/api/transactions/${id}`, { method: 'DELETE' });
        if (res && !res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Gagal menghapus transaksi.');
        }
        await this.loadTransactions();
    }

    async getTransaction(id) {
        const res = await this.apiFetch(`${API_URL}/api/transactions/${id}`);
        return await (res ? res.json() : null);
    }

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

        const matches = (this.transactions || [])
            .filter(t => t.type === type && t.docNumber && t.docNumber.startsWith(prefix));

        let sequence = 1;
        if (matches.length > 0) {
            const sequences = matches.map(t => parseInt(t.docNumber.replace(prefix, '')) || 0);
            sequence = Math.max(...sequences) + 1;
        }

        return `${prefix}${String(sequence).padStart(3, '0')}`;
    }
}

const store = new Store();
window.store = store;
window.formatDate = formatDate;
window.DocumentTypes = DocumentTypes;
window.Status = Status;
