// ============================================
// SISTEM AUTHENTIKASI - TERINTEGRASI DENGAN SPREADSHEET
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
                
                // Update UI
                this.updateUserInfo();
                this.hideLogin();
                
                console.log('Session restored:', this.currentUser.username);
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
        
        this.showNotification('Memverifikasi kredensial...', 'info');
        
        try {
            // Coba autentikasi melalui Google Sheets API
            const result = await this.authenticateWithAPI(username, password);
            
            if (result.success) {
                this.loginSuccess(result.user, result.token);
            } else {
                // Fallback ke default users jika API gagal
                this.authenticateWithDefaults(username, password);
            }
        } catch (error) {
            console.error('API authentication error:', error);
            // Fallback ke default users
            this.authenticateWithDefaults(username, password);
        }
    }
    
    async authenticateWithAPI(username, password) {
        try {
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
            this.showNotification('Username atau password salah', 'error');
        }
    }
    
    loginSuccess(user, token) {
        this.currentUser = user;
        this.token = token;
        this.isAuthenticated = true;
        
        // Simpan ke localStorage
        localStorage.setItem('spmb_user', JSON.stringify(user));
        localStorage.setItem('spmb_token', token);
        
        // Update UI
        this.updateUserInfo();
        this.hideLogin();
        
        this.showNotification(`Selamat datang, ${user.name}!`, 'success');
        
        // Trigger event untuk aplikasi
        const event = new CustomEvent('auth:login', { detail: { user } });
        window.dispatchEvent(event);
    }
    
    handleLogout() {
        this.clearSession();
        this.showLogin();
        this.showNotification('Anda telah logout', 'info');
        
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
            app.style.display = 'block';
        }
    }
    
    updateUserInfo() {
        if (!this.currentUser) return;
        
        // Update semua elemen user info
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(el => {
            el.textContent = this.currentUser.name;
        });
        
        const userRoleElements = document.querySelectorAll('.user-role');
        userRoleElements.forEach(el => {
            el.textContent = this.currentUser.role;
        });
        
        // Update sidebar user info
        const sidebarUserName = document.getElementById('sidebar-user-name');
        if (sidebarUserName) sidebarUserName.textContent = this.currentUser.name;
        
        const sidebarUserRole = document.getElementById('sidebar-user-role');
        if (sidebarUserRole) sidebarUserRole.textContent = this.currentUser.role;
    }
    
    generateToken() {
        return 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 16);
    }
    
    // Cek permission
    hasPermission(requiredRole, requiredUnit = null) {
        if (!this.isAuthenticated) return false;
        
        // Admin punya akses penuh
        if (this.currentUser.role === 'Admin') return true;
        
        // Cek role
        if (requiredRole) {
            const roleLevel = {
                'Admin': 3,
                'Ketua SMP': 2,
                'Ketua SMK': 2,
                'Staf Humas': 1
            };
            
            const userLevel = roleLevel[this.currentUser.role] || 0;
            const requiredLevel = roleLevel[requiredRole] || 0;
            
            if (userLevel < requiredLevel) return false;
        }
        
        // Cek unit
        if (requiredUnit && this.currentUser.unit !== 'all' && this.currentUser.unit !== requiredUnit) {
            return false;
        }
        
        return true;
    }
    
    // Notifikasi
    showNotification(message, type = 'info') {
        const container = document.getElementById('notifications');
        if (!container) return;
        
        const icons = {
            success: 'check-circle',
            error: 'alert-circle',
            warning: 'alert-triangle',
            info: 'info'
        };
        
        const colors = {
            success: 'bg-success-light text-success-dark border-success',
            error: 'bg-error-light text-error-dark border-error',
            warning: 'bg-warning-light text-warning-dark border-warning',
            info: 'bg-info-light text-info-dark border-info'
        };
        
        const notification = document.createElement('div');
        notification.className = `flex items-center gap-3 p-4 rounded-card border-l-4 ${colors[type]} animate-slide-in`;
        notification.innerHTML = `
            <i data-lucide="${icons[type]}" class="w-5 h-5 flex-shrink-0"></i>
            <span class="flex-1 text-sm font-medium">${message}</span>
            <button onclick="this.parentElement.remove()" class="hover:opacity-70">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        `;
        
        container.appendChild(notification);
        lucide.createIcons();
        
        // Auto remove setelah 5 detik
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            notification.style.transition = 'all 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

// Inisialisasi auth system
window.auth = new AuthSystem();
