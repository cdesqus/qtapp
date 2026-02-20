class App {
    constructor() {
        this.init();
    }

    async init() {
        console.log("App initializing...");
        const contentArea = document.getElementById('content-area');
        if (contentArea) contentArea.innerHTML = '<div class="loading">Loading application data...</div>';

        try {
            await window.store.init();
            console.log("Store initialization finished. User:", window.store.currentUser ? window.store.currentUser.username : "None");
        } catch (err) {
            console.error("Critical error during store init:", err);
        }

        if (!window.store.currentUser) {
            console.log("No user found, showing login screen.");
            this.renderLogin();
        } else {
            console.log("User authenticated, setting up UI.");
            this.initEventListeners();
            window.ui.renderDashboard();
        }
    }

    initEventListeners() {
        console.log("Initializing Event Listeners...");
        // Sidebar Navigation
        document.querySelectorAll('.sidebar nav button[data-view]').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const view = btn.dataset.view;
                this.navigateTo(view);
            };
        });

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = async () => {
                await window.store.logout();
                window.location.reload();
            };
        }

        // User Profile
        if (window.store.currentUser) {
            const nameEl = document.getElementById('user-display-name');
            const avatarEl = document.getElementById('user-avatar');
            if (nameEl) nameEl.textContent = window.store.currentUser.username;
            if (avatarEl) avatarEl.textContent = window.store.currentUser.username.charAt(0).toUpperCase();

            if (window.store.currentUser.role === 'admin') {
                const settingsNav = document.getElementById('nav-settings');
                const usersNav = document.getElementById('nav-users');
                if (settingsNav) settingsNav.style.display = 'block';
                if (usersNav) usersNav.style.display = 'block';
            }
        }

        // Modal Close
        const closeBtn = document.querySelector('.close-modal');
        if (closeBtn) closeBtn.onclick = () => window.ui.closeModal();
    }

    navigateTo(view) {
        console.log("Navigating to:", view);
        document.querySelectorAll('.sidebar nav button').forEach(b => {
            if (b.dataset.view === view) b.classList.add('active');
            else b.classList.remove('active');
        });

        const title = document.getElementById('page-title');
        if (title) title.textContent = view.charAt(0).toUpperCase() + view.slice(1).replace('-', ' ');

        // Routing logic
        try {
            switch (view) {
                case 'dashboard': window.ui.renderDashboard(); break;
                case 'clients': window.ui.renderClients(); break;
                case 'products': window.ui.renderProducts(); break;
                case 'measurements': window.ui.renderMeasurements(); break;
                case 'quotations': window.ui.renderTransactions('QUO'); break;
                case 'delivery-orders': window.ui.renderTransactions('DO'); break;
                case 'bap': window.ui.renderTransactions('BAP'); break;
                case 'invoices': window.ui.renderTransactions('INV'); break;
                case 'users': window.ui.renderUsers(); break;
                case 'settings': window.ui.renderSettings(); break;
                default: console.warn("View not found:", view);
            }
        } catch (err) {
            console.error(`Error navigating to ${view}:`, err);
            window.ui.showErrorMessage(`Gagal memuat halaman ${view}: ` + err.message);
        }
    }

    renderLogin() {
        document.body.innerHTML = `
            <div class="login-container">
                <form id="login-form" class="login-card">
                    <h1 style="text-align:center; margin-bottom: 20px;">IDE ERP Login</h1>
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" name="username" placeholder="Enter username" required autofocus>
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" name="password" placeholder="Enter password" required>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width:100%; padding: 12px; margin-top: 10px;">Login</button>
                    <div id="login-error" style="color:var(--error); margin-top:15px; text-align:center; display:none; padding: 10px; background: rgba(255,0,0,0.1); border-radius: 4px;"></div>
                </form>
            </div>
        `;

        const form = document.getElementById('login-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const btn = form.querySelector('button');
                btn.disabled = true;
                btn.textContent = "Logging in...";

                const formData = new FormData(e.target);
                const success = await window.store.login(formData.get('username'), formData.get('password'));

                if (success) {
                    window.location.reload();
                } else {
                    btn.disabled = false;
                    btn.textContent = "Login";
                    const err = document.getElementById('login-error');
                    err.textContent = "Invalid username or password or server unreachable";
                    err.style.display = 'block';
                }
            };
        }
    }
}

window.onload = () => {
    window.app = new App();
};

// Global Error Handling
window.onerror = function (msg, url, lineNo, columnNo, error) {
    console.error("Window Error:", msg, error);
    return false;
};

window.addEventListener('unhandledrejection', function (event) {
    console.error('Unhandled Rejection:', event.reason);
});
