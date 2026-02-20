class App {
    constructor() {
        this.init();
    }

    async init() {
        await window.store.init();
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
        title.textContent = view.charAt(0).toUpperCase() + view.slice(1);

        // Routing logic
        if (view === 'dashboard') window.ui.renderDashboard();
        // More views will be handled by UI module
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
