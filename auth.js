// Authentication System for SPMB Monitoring

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.sessionToken = null;
        
        this.init();
    }
    
    init() {
        this.checkExistingSession();
        this.setupEventListeners();
    }
    
    checkExistingSession() {
        // Check if user is already logged in
        const userData = localStorage.getItem('spmb_user');
        const token = localStorage.getItem('spmb_token');
        
        if (userData && token) {
            try {
                this.currentUser = JSON.parse(userData);
                this.sessionToken = token;
                this.isAuthenticated = true;
                
                // Show app and hide login
                this.showApp();
                this.updateUserInfo();
                
                console.log('User session restored:', this.currentUser.username);
            } catch (error) {
                console.error('Error parsing user data:', error);
                this.clearSession();
            }
        }
    }
    
    setupEventListeners() {
        // Login button
        document.getElementById('btn-login')?.addEventListener('click', () => this.handleLogin());
        
        // Logout button
        document.getElementById('btn-logout')?.addEventListener('click', () => this.handleLogout());
        
        // Enter key in password field
        document.getElementById('login-password')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        
        // Mobile menu toggle
        document.getElementById('menu-toggle')?.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });
    }
    
    async handleLogin() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        
        // Validation
        if (!username || !password) {
            this.showNotification('Username dan password harus diisi', 'error');
            return;
        }
        
        // Try to authenticate with Google Sheets first
        try {
            const authResult = await this.authenticateWithAPI(username, password);
            
            if (authResult.success) {
                this.loginSuccess(authResult.user, authResult.token);
            } else {
                // Fallback to default users
                this.authenticateWithDefaults(username, password);
            }
        } catch (error) {
            console.error('API authentication failed:', error);
            // Fallback to default users
            this.authenticateWithDefaults(username, password);
        }
    }
    
    async authenticateWithAPI(username, password) {
        try {
            const response = await fetch(CONFIG.WEB_APP_URL, {
                method: 'POST',
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
                throw new Error('Network response was not ok');
            }
            
            return await response.json();
        } catch (error) {
            console.error('API authentication error:', error);
            throw error;
        }
    }
    
    authenticateWithDefaults(username, password) {
        const user = CONFIG.DEFAULT_USERS.find(u => 
            u.username === username && u.password === password
        );
        
        if (user) {
            // Generate mock token for default users
            const token = this.generateToken(user.username);
            this.loginSuccess(user, token);
        } else {
            this.showNotification('Username atau password salah', 'error');
        }
    }
    
    loginSuccess(user, token) {
        this.currentUser = user;
        this.sessionToken = token;
        this.isAuthenticated = true;
        
        // Save to localStorage
        localStorage.setItem('spmb_user', JSON.stringify(user));
        localStorage.setItem('spmb_token', token);
        
        // Update UI
        this.showApp();
        this.updateUserInfo();
        
        // Show success message
        this.showNotification(`Selamat datang, ${user.name}!`, 'success');
        
        // Load initial data
        if (window.app) {
            window.app.loadInitialData();
        }
    }
    
    handleLogout() {
        this.clearSession();
        this.showLogin();
        this.showNotification('Anda telah logout', 'info');
    }
    
    clearSession() {
        this.currentUser = null;
        this.sessionToken = null;
        this.isAuthenticated = false;
        
        localStorage.removeItem('spmb_user');
        localStorage.removeItem('spmb_token');
    }
    
    showApp() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app').style.display = 'grid';
    }
    
    showLogin() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
        
        // Clear login form
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
    }
    
    updateUserInfo() {
        if (this.currentUser) {
            document.getElementById('current-user').textContent = this.currentUser.name;
            document.getElementById('current-role').textContent = this.currentUser.role;
        }
    }
    
    generateToken(username) {
        return 'token_' + Date.now() + '_' + username + '_' + Math.random().toString(36).substr(2);
    }
    
    showNotification(message, type = 'info') {
        const notifications = document.getElementById('notifications');
        const notification = document.createElement('div');
        
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        if (type === 'warning') icon = 'exclamation-triangle';
        
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;
        
        notifications.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
    
    // Check if user has permission for specific action
    hasPermission(requiredRole, requiredUnit = null) {
        if (!this.isAuthenticated) return false;
        
        // Admin has all permissions
        if (this.currentUser.role === 'admin') return true;
        
        // Check role
        const roleHierarchy = {
            'admin': 3,
            'coordinator': 2,
            'staff': 1,
            'user': 0
        };
        
        const userRoleLevel = roleHierarchy[this.currentUser.role] || 0;
        const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
        
        if (userRoleLevel < requiredRoleLevel) return false;
        
        // Check unit if specified
        if (requiredUnit && this.currentUser.unit !== 'all' && this.currentUser.unit !== requiredUnit) {
            return false;
        }
        
        return true;
    }
}

// Initialize auth system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.auth = new AuthSystem();
});
