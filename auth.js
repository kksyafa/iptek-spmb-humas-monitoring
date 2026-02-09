// Authentication System
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.init();
    }
    
    init() {
        this.loadSession();
        this.setupEventListeners();
    }
    
    loadSession() {
        const userData = localStorage.getItem('spmb_user');
        const token = localStorage.getItem('spmb_token');
        
        if (userData && token) {
            this.currentUser = JSON.parse(userData);
            this.token = token;
            this.showApp();
        } else {
            this.showLogin();
        }
    }
    
    setupEventListeners() {
        document.getElementById('login-btn')?.addEventListener('click', () => this.handleLogin());
        document.getElementById('logout-btn')?.addEventListener('click', () => this.handleLogout());
        
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });
        }
    }
    
    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            this.showNotification('Username dan password harus diisi', 'error');
            return;
        }
        
        const user = this.authenticate(username, password);
        
        if (user) {
            this.currentUser = user;
            this.token = this.generateToken();
            
            // Save to localStorage
            localStorage.setItem('spmb_user', JSON.stringify(user));
            localStorage.setItem('spmb_token', this.token);
            
            // Hide login, show app
            this.hideLogin();
            this.showApp();
            this.updateUserInfo();
            
            this.showNotification(`Selamat datang, ${user.name}!`, 'success');
            
            // Load initial data
            if (typeof window.loadInitialData === 'function') {
                window.loadInitialData();
            }
        } else {
            this.showNotification('Username atau password salah', 'error');
        }
    }
    
    authenticate(username, password) {
        return CONFIG.USERS.find(user => 
            user.username === username && user.password === password
        );
    }
    
    generateToken() {
        return 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2);
    }
    
    handleLogout() {
        localStorage.removeItem('spmb_user');
        localStorage.removeItem('spmb_token');
        
        this.currentUser = null;
        this.token = null;
        
        this.hideApp();
        this.showLogin();
        
        this.showNotification('Anda telah logout', 'info');
    }
    
    showLogin() {
        document.getElementById('login-modal').style.display = 'flex';
        document.getElementById('loading-overlay').style.display = 'none';
    }
    
    hideLogin() {
        document.getElementById('login-modal').style.display = 'none';
    }
    
    showApp() {
        document.getElementById('app').style.display = 'block';
        document.getElementById('loading-overlay').style.display = 'none';
    }
    
    hideApp() {
        document.getElementById('app').style.display = 'none';
    }
    
    updateUserInfo() {
        if (this.currentUser) {
            document.getElementById('user-name').textContent = this.currentUser.name;
            document.getElementById('user-role').textContent = this.currentUser.role;
        }
    }
    
    hasPermission(page) {
        if (!this.currentUser) return false;
        
        if (this.currentUser.role === 'admin') return true;
        
        switch(page) {
            case 'spmb-smp':
                return this.currentUser.unit === 'smp' || this.currentUser.role === 'coordinator';
            case 'spmb-smk':
                return this.currentUser.unit === 'smk' || this.currentUser.role === 'coordinator';
            case 'input-data':
                return this.currentUser.role !== 'staff';
            default:
                return true;
        }
    }
    
    showNotification(message, type = 'info') {
        const notifications = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        notifications.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

// Initialize Auth System
document.addEventListener('DOMContentLoaded', () => {
    window.auth = new AuthSystem();
});