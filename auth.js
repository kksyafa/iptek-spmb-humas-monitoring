// ============================================
// AUTH SYSTEM - TERINTEGRASI DENGAN SPREADSHEET
// ============================================

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.token = null;
        
        this.init();
    }
    
    init() {
        this.checkSession();
        this.setupEventListeners();
    }
    
    checkSession() {
        const savedUser = localStorage.getItem('spmb_user');
        const savedToken = localStorage.getItem('spmb_token');
        
        if (savedUser && savedToken) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.token = savedToken;
                this.isAuthenticated = true;
                
                this.updateUserInfo();
                this.hideLogin();
                
                console.log('✅ Session restored:', this.currentUser.username);
                return true;
            } catch (e) {
                console.error('Error parsing user data:', e);
                this.clearSession();
            }
        }
        return false;
    }
    
    setupEventListeners() {
        // Login button
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleLogin());
        }
        
        // Enter key on password field
        const passwordField = document.getElementById('login-password');
        if (passwordField) {
            passwordField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }
    
    async handleLogin() {
        const username = document.getElementById('login-username')?.value.trim();
        const password = document.getElementById('login-password')?.value;
        
        if (!username || !password) {
            this.showNotification('Username dan password harus diisi', 'error');
            return;
        }
        
        this.showNotification('🔄 Memverifikasi kredensial...', 'info');
        
        try {
            // Try API authentication
            const result = await this.authenticateWithAPI(username, password);
            
            if (result.success) {
                this.loginSuccess(result.user, result.token);
            } else {
                // Fallback to default users
                this.authenticateWithDefaults(username, password);
            }
        } catch (error) {
            console.error('API authentication error:', error);
            this.authenticateWithDefaults(username, password);
        }
    }
    
    async authenticateWithAPI(username, password) {
        try {
            // CEK APAKAH WEB APP URL SUDAH DIKONFIGURASI
            if (!CONFIG.WEB_APP_URL || CONFIG.WEB_APP_URL.includes('YOUR_SCRIPT_ID')) {
                throw new Error('API not configured');
            }
            
            const response = await fetch(CONFIG.WEB_APP_URL, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'authenticate',
                    username: username,
                    password: password
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API authentication failed:', error);
            throw error;
        }
    }
    
    authenticateWithDefaults(username, password) {
        const user = CONFIG.DEFAULT_USERS.find(u => 
            u.username === username && u.password === password
        );
        
        if (user) {
            const token = this.generateToken();
            this.loginSuccess(user, token);
        } else {
            this.showNotification('❌ Username atau password salah', 'error');
        }
    }
    
    loginSuccess(user, token) {
        this.currentUser = user;
        this.token = token;
        this.isAuthenticated = true;
        
        // Save to localStorage
        localStorage.setItem('spmb_user', JSON.stringify(user));
        localStorage.setItem('spmb_token', token);
        
        // Update UI
        this.updateUserInfo();
        this.hideLogin();
        
        this.showNotification(`✅ Selamat datang, ${user.name}!`, 'success');
        
        // Trigger event
        const event = new CustomEvent('auth:login', { detail: { user } });
        window.dispatchEvent(event);
    }
    
    handleLogout() {
        this.clearSession();
        this.showLogin();
        this.showNotification('👋 Anda telah logout', 'info');
        
        const event = new CustomEvent('auth:logout');
        window.dispatchEvent(event);
    }
    
    clearSession() {
        this.currentUser = null;
        this.token = null;
        this.isAuthenticated = false;
        
        localStorage.removeItem('spmb_user');
        localStorage.removeItem('spmb_token');
    }
    
    showLogin() {
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.classList.remove('hidden');
        }
        
        const app = document.getElementById('app');
        if (app) {
            app.style.display = 'none';
        }
    }
    
    hideLogin() {
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.classList.add('hidden');
        }
        
        const app = document.getElementById('app');
        if (app) {
            app.style.display = 'flex';
        }
    }
    
    updateUserInfo() {
        if (!this.currentUser) return;
        
        const userNameElements = [
            document.getElementById('sidebar-user-name'),
            document.getElementById('mobile-user-name')
        ];
        
        const userRoleElements = [
            document.getElementById('sidebar-user-role'),
            document.getElementById('mobile-user-role')
        ];
        
        userNameElements.forEach(el => {
            if (el) el.textContent = this.currentUser.name;
        });
        
        userRoleElements.forEach(el => {
            if (el) el.textContent = this.currentUser.role;
        });
    }
    
    generateToken() {
        return 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 16);
    }
    
    showNotification(message, type = 'info') {
        const container = document.getElementById('notifications');
        if (!container) return;
        
        const icons = {
            success: 'fa-circle-check',
            error: 'fa-circle-exclamation',
            warning: 'fa-triangle-exclamation',
            info: 'fa-circle-info'
        };
        
        const colors = {
            success: 'bg-emerald-50 border-emerald-500 text-emerald-700',
            error: 'bg-red-50 border-red-500 text-red-700',
            warning: 'bg-amber-50 border-amber-500 text-amber-700',
            info: 'bg-blue-50 border-blue-500 text-blue-700'
        };
        
        const notification = document.createElement('div');
        notification.className = `flex items-center gap-3 p-4 rounded-xl border-l-4 ${colors[type]} shadow-lg animate-slide-in`;
        notification.innerHTML = `
            <i class="fas ${icons[type]}"></i>
            <span class="flex-1 text-sm font-medium">${message}</span>
            <button onclick="this.parentElement.remove()" class="hover:opacity-70">
                <i class="fas fa-xmark"></i>
            </button>
        `;
        
        container.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            notification.style.transition = 'all 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

// Initialize auth system
window.auth = new AuthSystem();
