class App {
    constructor() {
        this.init();
    }

    async init() {
        try {
            await window.store.init();
        } catch (err) {
            console.error("Store initialization failed:", err);
            // Even if it fails, we want UI logic to bind if possible
        }

        if (!window.store.currentUser) {
            this.renderLogin();
        } else {
            this.initEventListeners();
            window.ui.renderDashboard();
        }
    }

    initEventListeners() {
        // Sidebar Navigation
        document.querySelectorAll('.sidebar nav button[data-view]').forEach(btn => {
            btn.onclick = () => {
                const view = btn.dataset.view;
                this.navigateTo(view);
            };
        });

        // Logout
        document.getElementById('logout-btn').onclick = async () => {
            await window.store.logout();
            window.location.reload();
        };

        // User Profile
        if (window.store.currentUser) {
            document.getElementById('user-display-name').textContent = window.store.currentUser.username;
            document.getElementById('user-avatar').textContent = window.store.currentUser.username.charAt(0).toUpperCase();

            if (window.store.currentUser.role === 'admin') {
                document.getElementById('nav-settings').style.display = 'block';
                document.getElementById('nav-users').style.display = 'block';
            }
        }

        // Modal Close
        document.querySelector('.close-modal').onclick = () => window.ui.closeModal();
    }

    navigateTo(view) {
        document.querySelectorAll('.sidebar nav button').forEach(b => {
            if (b.dataset.view === view) b.classList.add('active');
            else b.classList.remove('active');
        });

        const title = document.getElementById('page-title');
        title.textContent = view.charAt(0).toUpperCase() + view.slice(1).replace('-', ' ');

        // Routing logic
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
    }

    renderLogin() {
        document.body.innerHTML = `
            <div class="login-container">
                <form id="login-form" class="login-card">
                    <h1>IDE ERP Login</h1>
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" name="username" required>
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" name="password" required>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width:100%">Login</button>
                    <div id="login-error" style="color:red; margin-top:10px; display:none;"></div>
                </form>
            </div>
        `;

        document.getElementById('login-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const success = await window.store.login(formData.get('username'), formData.get('password'));
            if (success) window.location.reload();
            else {
                const err = document.getElementById('login-error');
                err.textContent = "Invalid username or password";
                err.style.display = 'block';
            }
        };
    }
}

window.onload = () => {
    window.app = new App();
};

// Global Error Handling
window.onerror = function (msg, url, lineNo, columnNo, error) {
    console.error("Window Error:", msg, error);
    // Don't alert for common minor errors, but log them
    return false;
};

window.addEventListener('unhandledrejection', function (event) {
    console.error('Unhandled Rejection:', event.reason);
});
