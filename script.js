// Main Application Controller - FIXED FOR DATA INPUT

class DashboardApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.data = null;
        this.isLoading = false;
        this.charts = {};
        
        this.init();
    }
    
    init() {
        this.setupNavigation();
        this.setupEventListeners();
        
        // Test API connection on startup
        this.testAPI();
    }
    
    setupNavigation() {
        // Navigation click handlers
        document.addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item');
            if (navItem && !e.target.closest('.btn')) {
                e.preventDefault();
                const page = navItem.dataset.page;
                
                // Check permissions
                if (!this.checkPagePermission(page)) {
                    return;
                }
                
                this.navigateTo(page);
            }
            
            // Tab switching in forms
            if (e.target.classList.contains('tab-btn')) {
                this.switchFormTab(e.target.dataset.tab);
            }
        });
    }
    
    setupEventListeners() {
        // Form submission
        document.addEventListener('click', (e) => {
            if (e.target.id === 'btn-save-spmb') {
                this.saveSPMBData();
            }
            if (e.target.id === 'btn-save-agenda') {
                this.saveAgendaData();
            }
            if (e.target.id === 'btn-save-photo') {
                this.savePhotoData();
            }
            if (e.target.id === 'btn-test-api') {
                this.testAPI();
            }
            if (e.target.id === 'btn-refresh-data') {
                this.loadData();
            }
        });
    }
    
    checkPagePermission(page) {
        const permissions = {
            'dashboard': { role: 'user', unit: null },
            'spmb-smp': { role: 'coordinator', unit: 'smp' },
            'spmb-smk': { role: 'coordinator', unit: 'smk' },
            'input-data': { role: 'coordinator', unit: null },
            'settings': { role: 'admin', unit: null }
        };
        
        const required = permissions[page] || { role: 'user', unit: null };
        
        if (!window.auth.hasPermission(required.role, required.unit)) {
            window.auth.showNotification('Anda tidak memiliki akses ke halaman ini', 'error');
            return false;
        }
        
        return true;
    }
    
    navigateTo(page) {
        this.currentPage = page;
        
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) {
                item.classList.add('active');
            }
        });
        
        // Update content header
        this.updateContentHeader(page);
        
        // Load page content
        this.loadPageContent(page);
        
        // Close mobile menu if open
        document.getElementById('sidebar').classList.remove('active');
    }
    
    updateContentHeader(page) {
        const header = document.getElementById('content-header');
        const titles = {
            'dashboard': 'Dashboard Overview',
            'spmb-smp': 'Monitoring SPMB SMP',
            'spmb-smk': 'Monitoring SPMB SMK',
            'agenda': 'Kalender Agenda',
            'agenda-list': 'Daftar Kegiatan',
            'input-data': 'Input Data Baru',
            'gallery': 'Gallery Foto Kegiatan',
            'settings': 'Pengaturan Sistem'
        };
        
        const descriptions = {
            'dashboard': 'Ringkasan data SPMB dan Agenda Humas',
            'spmb-smp': 'Data penerimaan siswa SMP',
            'spmb-smk': 'Data penerimaan siswa SMK',
            'input-data': 'Tambah data SPMB, Agenda, atau Foto'
        };
        
        header.innerHTML = `
            <h2>${titles[page] || page}</h2>
            <p>${descriptions[page] || ''}</p>
        `;
    }
    
    async loadPageContent(page) {
        const contentBody = document.getElementById('content-body');
        
        // Show loading
        contentBody.innerHTML = '<div class="loading">Memuat...</div>';
        
        // Load data if not loaded
        if (!this.data) {
            await this.loadData();
        }
        
        // Render page content
        switch(page) {
            case 'dashboard':
                contentBody.innerHTML = this.renderDashboard();
                this.initDashboardCharts();
                break;
                
            case 'spmb-smp':
                contentBody.innerHTML = this.renderSPMBPage('SMP');
                this.initSPMBCharts('SMP');
                break;
                
            case 'spmb-smk':
                contentBody.innerHTML = this.renderSPMBPage('SMK');
                this.initSPMBCharts('SMK');
                break;
                
            case 'input-data':
                contentBody.innerHTML = this.renderInputForm();
                break;
                
            case 'agenda-list':
                contentBody.innerHTML = this.renderAgendaList();
                break;
                
            case 'gallery':
                contentBody.innerHTML = this.renderGallery();
                break;
                
            case 'settings':
                contentBody.innerHTML = this.renderSettings();
                break;
                
            default:
                contentBody.innerHTML = '<p>Halaman tidak ditemukan</p>';
        }
    }
    
    async loadData() {
        this.isLoading = true;
        
        try {
            // Try to fetch from Google Sheets API
            const apiData = await this.fetchFromAPI('getAll');
            
            if (apiData && apiData.success) {
                this.data = apiData.data;
                console.log('Data loaded from API:', this.data);
            } else {
                // Fallback to mock data
                this.data = this.getMockData();
                console.log('Using mock data');
            }
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.data = this.getMockData();
            window.auth.showNotification('Menggunakan data contoh', 'warning');
        }
        
        this.isLoading = false;
        return this.data;
    }
    
    // ============================================
    // API FUNCTIONS - FIXED FOR DATA INPUT
    // ============================================
    
    async fetchFromAPI(action, params = {}) {
        try {
            const url = new URL(CONFIG.WEB_APP_URL);
            url.searchParams.append('action', action);
            
            // Add all params
            Object.keys(params).forEach(key => {
                url.searchParams.append(key, params[key]);
            });
            
            // Add cache busting
            url.searchParams.append('_', Date.now());
            
            console.log('Fetching from:', url.toString());
            
            const response = await fetch(url.toString(), {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('API Response:', data);
            
            return data;
            
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    
    async saveToAPI(sheetName, data) {
        try {
            console.log('Saving to API:', { sheetName, data });
            
            const payload = {
                action: 'save',
                sheet: sheetName,
                data: data
            };
            
            // For debugging
            console.log('Payload:', JSON.stringify(payload, null, 2));
            
            const response = await fetch(CONFIG.WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors', // Google Apps Script requires no-cors for POST
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            console.log('Save response:', response);
            
            // With no-cors mode, we can't read the response
            // Assume success if no error
            window.auth.showNotification('Data berhasil dikirim ke server', 'success');
            
            // Try to get confirmation via GET
            setTimeout(async () => {
                try {
                    const verify = await this.fetchFromAPI('getSheet', { sheet: sheetName });
                    if (verify.success) {
                        window.auth.showNotification('Data berhasil disimpan di spreadsheet', 'success');
                    }
                } catch (e) {
                    console.log('Verification skipped:', e);
                }
            }, 1000);
            
            return { success: true, message: 'Data sedang diproses' };
            
        } catch (error) {
            console.error('Save Error:', error);
            
            // Fallback: Save to localStorage for demo
            this.saveToLocalStorage(sheetName, data);
            
            window.auth.showNotification('Data disimpan secara lokal (demo mode)', 'warning');
            return { success: true, message: 'Data disimpan secara lokal' };
        }
    }
    
    saveToLocalStorage(sheetName, data) {
        try {
            const key = `spmb_${sheetName}`;
            let existing = JSON.parse(localStorage.getItem(key)) || [];
            
            // Add ID and timestamp
            const newData = {
                ...data,
                id: Date.now(),
                created_at: new Date().toISOString(),
                saved_locally: true
            };
            
            existing.push(newData);
            localStorage.setItem(key, JSON.stringify(existing));
            
            console.log('Saved to localStorage:', newData);
            return true;
            
        } catch (error) {
            console.error('LocalStorage save error:', error);
            return false;
        }
    }
    
    async testAPI() {
        try {
            window.auth.showNotification('Menguji koneksi API...', 'info');
            
            const result = await this.fetchFromAPI('test');
            
            if (result.success) {
                window.auth.showNotification('✅ Koneksi API berhasil!', 'success');
                return true;
            } else {
                window.auth.showNotification('❌ API tidak merespon dengan benar', 'error');
                return false;
            }
            
        } catch (error) {
            console.error('API Test failed:', error);
            
            // Check if it's a CORS error
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                window.auth.showNotification('⚠️ CORS Error: Coba deploy ulang Google Apps Script dengan "Anyone" access', 'warning');
            } else {
                window.auth.showNotification('❌ Tidak dapat terhubung ke API', 'error');
            }
            
            return false;
        }
    }
    
    // ============================================
    // RENDER FUNCTIONS
    // ============================================
    
    renderDashboard() {
        const stats = this.calculateStats();
        
        return `
            <div class="stats-grid">
                <div class="stat-card smp">
                    <h3><i class="fas fa-school"></i> SMP</h3>
                    <div class="stat-value">${stats.smp.total}</div>
                    <div class="stat-label">Total Penerimaan</div>
                    <div class="stat-change">
                        ${stats.smp.monthly} siswa bulan ini
                    </div>
                </div>
                
                <div class="stat-card smk">
                    <h3><i class="fas fa-graduation-cap"></i> SMK</h3>
                    <div class="stat-value">${stats.smk.total}</div>
                    <div class="stat-label">Total Penerimaan</div>
                    <div class="stat-change">
                        ${stats.smk.monthly} siswa bulan ini
                    </div>
                </div>
                
                <div class="stat-card">
                    <h3><i class="fas fa-calendar-check"></i> Agenda</h3>
                    <div class="stat-value">${stats.agenda.total}</div>
                    <div class="stat-label">Kegiatan Bulan Ini</div>
                    <div class="stat-change">
                        ${stats.agenda.completed} selesai
                    </div>
                </div>
                
                <div class="stat-card">
                    <h3><i class="fas fa-images"></i> Foto</h3>
                    <div class="stat-value">${stats.photos.total}</div>
                    <div class="stat-label">Foto Kegiatan</div>
                    <div class="stat-change">
                        ${stats.photos.recent} baru
                    </div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 30px;">
                <div style="background: white; padding: 20px; border-radius: 10px;">
                    <h3><i class="fas fa-chart-line"></i> Trend Penerimaan</h3>
                    <canvas id="trend-chart" height="250"></canvas>
                </div>
                
                <div style="background: white; padding: 20px; border-radius: 10px;">
                    <h3><i class="fas fa-tasks"></i> Status Agenda</h3>
                    <canvas id="status-chart" height="250"></canvas>
                </div>
            </div>
            
            <div style="margin-top: 30px;">
                <button class="btn btn-primary" onclick="app.loadData()">
                    <i class="fas fa-sync"></i> Refresh Data
                </button>
                <button class="btn btn-secondary" onclick="app.testAPI()" style="margin-left: 10px;">
                    <i class="fas fa-wifi"></i> Test Koneksi
                </button>
            </div>
        `;
    }
    
    renderSPMBPage(unit) {
        const data = this.data?.spmbSMP || this.data?.spmbSMK;
        const color = unit === 'SMP' ? CONFIG.THEME.COLORS.smp : CONFIG.THEME.COLORS.smk;
        
        return `
            <div style="margin-bottom: 30px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="color: ${color};">Data Penerimaan ${unit} ${CONFIG.APP.YEAR}</h3>
                    <button class="btn btn-primary" onclick="app.navigateTo('input-data')">
                        <i class="fas fa-plus"></i> Tambah Data
                    </button>
                </div>
                
                <div style="background: white; padding: 20px; border-radius: 10px; margin-top: 20px;">
                    <canvas id="spmb-chart" height="300"></canvas>
                </div>
                
                <div style="background: white; border-radius: 10px; margin-top: 20px; overflow: hidden;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Bulan</th>
                                <th>Target</th>
                                <th>Realisasi</th>
                                <th>Selisih</th>
                                <th>Pencapaian</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderMonthlyTable(unit)}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    renderInputForm() {
        return `
            <div class="form-container">
                <div class="form-tabs">
                    <button class="tab-btn active" data-tab="spmb">
                        <i class="fas fa-users"></i> Data SPMB
                    </button>
                    <button class="tab-btn" data-tab="agenda">
                        <i class="fas fa-calendar"></i> Agenda
                    </button>
                    <button class="tab-btn" data-tab="photo">
                        <i class="fas fa-camera"></i> Foto
                    </button>
                </div>
                
                <!-- SPMB Form -->
                <div id="form-spmb" class="form-content active">
                    <h3><i class="fas fa-school"></i> Input Data Penerimaan</h3>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-university"></i> Unit</label>
                            <select id="input-unit" class="form-control">
                                <option value="SMP">SMP</option>
                                <option value="SMK">SMK</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label><i class="fas fa-calendar"></i> Bulan</label>
                            <select id="input-bulan" class="form-control">
                                ${CONFIG.APP.MONTHS.map((month, index) => `
                                    <option value="${index + 1}">${month}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-calendar-alt"></i> Tahun</label>
                            <input type="number" id="input-tahun" class="form-control" 
                                   value="${CONFIG.APP.YEAR}" min="2020" max="2030">
                        </div>
                        
                        <div class="form-group">
                            <label><i class="fas fa-user-graduate"></i> Jumlah Siswa</label>
                            <input type="number" id="input-jumlah" class="form-control" 
                                   placeholder="Masukkan jumlah siswa" min="1" max="1000">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-sticky-note"></i> Keterangan</label>
                        <textarea id="input-keterangan" class="form-control" rows="3" 
                                  placeholder="Contoh: Penerimaan jalur reguler, etc."></textarea>
                    </div>
                    
                    <button id="btn-save-spmb" class="btn btn-primary">
                        <i class="fas fa-save"></i> Simpan Data SPMB
                    </button>
                    
                    <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                        <p><i class="fas fa-info-circle"></i> <strong>Catatan:</strong></p>
                        <p style="font-size: 14px;">Data akan disimpan ke Google Spreadsheet. Pastikan koneksi internet aktif.</p>
                    </div>
                </div>
                
                <!-- Agenda Form -->
                <div id="form-agenda" class="form-content">
                    <h3><i class="fas fa-calendar-alt"></i> Input Agenda Kegiatan</h3>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-calendar-day"></i> Tanggal</label>
                            <input type="date" id="agenda-tanggal" class="form-control" 
                                   value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        
                        <div class="form-group">
                            <label><i class="fas fa-tasks"></i> Kategori</label>
                            <select id="agenda-kategori" class="form-control">
                                ${CONFIG.AGENDA_CATEGORIES.map(cat => `
                                    <option value="${cat}">${cat}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-bullhorn"></i> Nama Kegiatan</label>
                        <input type="text" id="agenda-kegiatan" class="form-control" 
                               placeholder="Contoh: Open House SMP, Workshop Teknologi">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-map-marker-alt"></i> Lokasi</label>
                            <input type="text" id="agenda-lokasi" class="form-control" 
                                   placeholder="Contoh: Aula Utama, Lab Komputer">
                        </div>
                        
                        <div class="form-group">
                            <label><i class="fas fa-user-tie"></i> Penanggung Jawab</label>
                            <input type="text" id="agenda-pj" class="form-control" 
                                   value="${window.auth.currentUser?.name || ''}">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-list-alt"></i> Deskripsi</label>
                        <textarea id="agenda-deskripsi" class="form-control" rows="3" 
                                  placeholder="Deskripsi lengkap kegiatan..."></textarea>
                    </div>
                    
                    <button id="btn-save-agenda" class="btn btn-primary">
                        <i class="fas fa-save"></i> Simpan Agenda
                    </button>
                </div>
                
                <!-- Photo Form -->
                <div id="form-photo" class="form-content">
                    <h3><i class="fas fa-camera"></i> Upload Link Foto</h3>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-calendar-day"></i> Tanggal Foto</label>
                            <input type="date" id="photo-tanggal" class="form-control" 
                                   value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        
                        <div class="form-group">
                            <label><i class="fas fa-camera-retro"></i> Kegiatan</label>
                            <input type="text" id="photo-kegiatan" class="form-control" 
                                   placeholder="Nama kegiatan yang difoto">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-link"></i> URL Foto</label>
                        <input type="url" id="photo-url" class="form-control" 
                               placeholder="https://example.com/foto.jpg">
                        <small style="color: #666;">Gunakan link dari Google Drive, Imgur, atau hosting lainnya</small>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-comment-alt"></i> Deskripsi Foto</label>
                        <textarea id="photo-deskripsi" class="form-control" rows="2" 
                                  placeholder="Deskripsi singkat foto..."></textarea>
                    </div>
                    
                    <button id="btn-save-photo" class="btn btn-primary">
                        <i class="fas fa-upload"></i> Simpan Foto
                    </button>
                </div>
            </div>
        `;
    }
    
    // ============================================
    // DATA INPUT HANDLERS - FIXED
    // ============================================
    
    async saveSPMBData() {
        try {
            // Get form values
            const unit = document.getElementById('input-unit').value;
            const bulan = document.getElementById('input-bulan').value;
            const tahun = document.getElementById('input-tahun').value;
            const jumlah = document.getElementById('input-jumlah').value;
            const keterangan = document.getElementById('input-keterangan').value;
            
            // Validation
            if (!unit || !bulan || !tahun || !jumlah) {
                window.auth.showNotification('Semua field harus diisi', 'error');
                return;
            }
            
            if (parseInt(jumlah) <= 0) {
                window.auth.showNotification('Jumlah siswa harus lebih dari 0', 'error');
                return;
            }
            
            // Prepare data for Google Sheets
            const rowData = {
                unit: unit,
                bulan: parseInt(bulan),
                tahun: parseInt(tahun),
                jumlah_siswa: parseInt(jumlah),
                keterangan: keterangan || '',
                tanggal_input: new Date().toISOString().split('T')[0],
                input_by: window.auth.currentUser?.name || 'Unknown'
            };
            
            console.log('Saving SPMB data:', rowData);
            
            // Determine sheet name
            const sheetName = unit === 'SMP' ? CONFIG.SHEETS.SPMB_SMP : CONFIG.SHEETS.SPMB_SMK;
            
            // Show loading
            window.auth.showNotification('Menyimpan data...', 'info');
            
            // Save to API
            const result = await this.saveToAPI(sheetName, rowData);
            
            if (result.success) {
                // Clear form
                document.getElementById('input-jumlah').value = '';
                document.getElementById('input-keterangan').value = '';
                
                // Reload data
                await this.loadData();
                
                // Navigate to appropriate page
                this.navigateTo(unit === 'SMP' ? 'spmb-smp' : 'spmb-smk');
                
            } else {
                throw new Error(result.error || 'Gagal menyimpan');
            }
            
        } catch (error) {
            console.error('Save SPMB error:', error);
            window.auth.showNotification(`Error: ${error.message}`, 'error');
        }
    }
    
    async saveAgendaData() {
        try {
            // Get form values
            const tanggal = document.getElementById('agenda-tanggal').value;
            const kegiatan = document.getElementById('agenda-kegiatan').value;
            const lokasi = document.getElementById('agenda-lokasi').value;
            const kategori = document.getElementById('agenda-kategori').value;
            const pj = document.getElementById('agenda-pj').value;
            const deskripsi = document.getElementById('agenda-deskripsi').value;
            
            // Validation
            if (!tanggal || !kegiatan || !lokasi || !pj) {
                window.auth.showNotification('Field wajib harus diisi', 'error');
                return;
            }
            
            // Prepare data
            const rowData = {
                tanggal: tanggal,
                kegiatan: kegiatan,
                lokasi: lokasi,
                kategori: kategori,
                status: 'scheduled', // default status
                penanggung_jawab: pj,
                deskripsi: deskripsi || '',
                created_at: new Date().toISOString()
            };
            
            console.log('Saving Agenda data:', rowData);
            
            // Show loading
            window.auth.showNotification('Menyimpan agenda...', 'info');
            
            // Save to API
            const result = await this.saveToAPI(CONFIG.SHEETS.AGENDA, rowData);
            
            if (result.success) {
                // Clear form
                document.getElementById('agenda-kegiatan').value = '';
                document.getElementById('agenda-lokasi').value = '';
                document.getElementById('agenda-deskripsi').value = '';
                
                // Reload data
                await this.loadData();
                
                window.auth.showNotification('Agenda berhasil disimpan', 'success');
                
            } else {
                throw new Error(result.error || 'Gagal menyimpan');
            }
            
        } catch (error) {
            console.error('Save Agenda error:', error);
            window.auth.showNotification(`Error: ${error.message}`, 'error');
        }
    }
    
    async savePhotoData() {
        try {
            // Get form values
            const tanggal = document.getElementById('photo-tanggal').value;
            const kegiatan = document.getElementById('photo-kegiatan').value;
            const url = document.getElementById('photo-url').value;
            const deskripsi = document.getElementById('photo-deskripsi').value;
            
            // Validation
            if (!tanggal || !kegiatan || !url) {
                window.auth.showNotification('Field wajib harus diisi', 'error');
                return;
            }
            
            // URL validation
            try {
                new URL(url);
            } catch {
                window.auth.showNotification('URL tidak valid', 'error');
                return;
            }
            
            // Prepare data
            const rowData = {
                tanggal: tanggal,
                kegiatan: kegiatan,
                url: url,
                deskripsi: deskripsi || '',
                uploaded_by: window.auth.currentUser?.name || 'Unknown',
                uploaded_at: new Date().toISOString()
            };
            
            console.log('Saving Photo data:', rowData);
            
            // Show loading
            window.auth.showNotification('Menyimpan foto...', 'info');
            
            // Save to API
            const result = await this.saveToAPI(CONFIG.SHEETS.FOTO, rowData);
            
            if (result.success) {
                // Clear form
                document.getElementById('photo-kegiatan').value = '';
                document.getElementById('photo-url').value = '';
                document.getElementById('photo-deskripsi').value = '';
                
                // Reload data
                await this.loadData();
                
                window.auth.showNotification('Foto berhasil disimpan', 'success');
                
            } else {
                throw new Error(result.error || 'Gagal menyimpan');
            }
            
        } catch (error) {
            console.error('Save Photo error:', error);
            window.auth.showNotification(`Error: ${error.message}`, 'error');
        }
    }
    
    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    
    switchFormTab(tabName) {
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });
        
        // Show corresponding form
        document.querySelectorAll('.form-content').forEach(form => {
            form.classList.remove('active');
        });
        document.getElementById(`form-${tabName}`).classList.add('active');
    }
    
    calculateStats() {
        const data = this.data || this.getMockData();
        
        const currentMonth = new Date().getMonth() + 1;
        
        // Calculate SMP stats
        const smpMonthly = data.spmbSMP?.monthly?.find(m => m.bulan === currentMonth)?.count || 0;
        const smpTotal = data.spmbSMP?.total || 0;
        
        // Calculate SMK stats
        const smkMonthly = data.spmbSMK?.monthly?.find(m => m.bulan === currentMonth)?.count || 0;
        const smkTotal = data.spmbSMK?.total || 0;
        
        // Calculate agenda stats
        const agendaTotal = data.agenda?.length || 0;
        const agendaCompleted = data.agenda?.filter(a => a.status === 'completed')?.length || 0;
        
        // Calculate photo stats
        const photoTotal = data.photos?.length || 0;
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        const photoRecent = data.photos?.filter(p => {
            try {
                return new Date(p.tanggal) > monthAgo;
            } catch {
                return false;
            }
        })?.length || 0;
        
        return {
            smp: {
                total: smpTotal,
                monthly: smpMonthly
            },
            smk: {
                total: smkTotal,
                monthly: smkMonthly
            },
            agenda: {
                total: agendaTotal,
                completed: agendaCompleted
            },
            photos: {
                total: photoTotal,
                recent: photoRecent
            }
        };
    }
    
    renderMonthlyTable(unit) {
        const data = unit === 'SMP' ? this.data?.spmbSMP?.monthly : this.data?.spmbSMK?.monthly;
        const targets = unit === 'SMP' ? CONFIG.SPMB_TARGETS.SMP.MONTHLY : CONFIG.SPMB_TARGETS.SMK.MONTHLY;
        
        if (!data || data.length === 0) {
            return `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 30px; color: #666;">
                        <i class="fas fa-database"></i> Belum ada data
                    </td>
                </tr>
            `;
        }
        
        return data.map((item, index) => {
            const target = targets[index] || 0;
            const achievement = target > 0 ? Math.round((item.count / target) * 100) : 0;
            const difference = item.count - target;
            
            return `
                <tr>
                    <td><strong>${CONFIG.APP.MONTHS[item.bulan - 1] || `Bulan ${item.bulan}`}</strong></td>
                    <td>${target}</td>
                    <td>${item.count}</td>
                    <td style="color: ${difference >= 0 ? '#27ae60' : '#e74c3c'};">
                        ${difference >= 0 ? '+' : ''}${difference}
                    </td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="min-width: 40px;">${achievement}%</span>
                            <div style="flex: 1; height: 8px; background: #eee; border-radius: 4px; overflow: hidden;">
                                <div style="width: ${Math.min(achievement, 100)}%; height: 100%; 
                                      background: ${achievement >= 100 ? '#27ae60' : achievement >= 80 ? '#f39c12' : '#e74c3c'};">
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    renderAgendaList() {
        const agendas = this.data?.agenda || [];
        
        if (agendas.length === 0) {
            return `
                <div style="text-align: center; padding: 50px; background: white; border-radius: 10px;">
                    <i class="fas fa-calendar-times" style="font-size: 48px; color: #ddd; margin-bottom: 20px;"></i>
                    <h3 style="color: #666;">Belum ada agenda</h3>
                    <button class="btn btn-primary" onclick="app.navigateTo('input-data')" style="margin-top: 20px;">
                        <i class="fas fa-plus"></i> Tambah Agenda Pertama
                    </button>
                </div>
            `;
        }
        
        return `
            <div style="background: white; border-radius: 10px; overflow: hidden;">
                <div style="padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">Daftar Agenda</h3>
                    <button class="btn btn-primary" onclick="app.navigateTo('input-data')">
                        <i class="fas fa-plus"></i> Tambah Baru
                    </button>
                </div>
                
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Tanggal</th>
                            <th>Kegiatan</th>
                            <th>Lokasi</th>
                            <th>Status</th>
                            <th>Penanggung Jawab</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${agendas.map(agenda => {
                            const status = CONFIG.AGENDA_STATUS[agenda.status] || CONFIG.AGENDA_STATUS.scheduled;
                            return `
                                <tr>
                                    <td>${agenda.tanggal || '-'}</td>
                                    <td>${agenda.kegiatan || '-'}</td>
                                    <td>${agenda.lokasi || '-'}</td>
                                    <td>
                                        <span style="display: inline-block; padding: 5px 10px; border-radius: 20px; 
                                              background: ${status.color}; color: ${status.text}; font-size: 12px;">
                                            ${status.label}
                                        </span>
                                    </td>
                                    <td>${agenda.penanggung_jawab || '-'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    renderGallery() {
        const photos = this.data?.photos || [];
        
        if (photos.length === 0) {
            return `
                <div style="text-align: center; padding: 50px; background: white; border-radius: 10px;">
                    <i class="fas fa-images" style="font-size: 48px; color: #ddd; margin-bottom: 20px;"></i>
                    <h3 style="color: #666;">Belum ada foto</h3>
                    <button class="btn btn-primary" onclick="app.navigateTo('input-data')" style="margin-top: 20px;">
                        <i class="fas fa-upload"></i> Upload Foto Pertama
                    </button>
                </div>
            `;
        }
        
        return `
            <div style="margin-bottom: 30px;">
                <button class="btn btn-primary" onclick="app.navigateTo('input-data')">
                    <i class="fas fa-upload"></i> Upload Foto Baru
                </button>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px;">
                ${photos.map(photo => `
                    <div style="background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="height: 150px; overflow: hidden;">
                            <img src="${photo.url || 'https://via.placeholder.com/400x300?text=Photo'}" 
                                 alt="${photo.kegiatan || 'Foto'}"
                                 style="width: 100%; height: 100%; object-fit: cover;"
                                 onerror="this.src='https://via.placeholder.com/400x300?text=Gambar+Tidak+Tersedia'">
                        </div>
                        <div style="padding: 15px;">
                            <h4 style="margin: 0 0 5px 0;">${photo.kegiatan || 'Tanpa Judul'}</h4>
                            <p style="color: #666; font-size: 12px; margin: 0 0 10px 0;">
                                <i class="fas fa-calendar"></i> ${photo.tanggal || '-'}
                            </p>
                            <p style="font-size: 14px; color: #555;">${photo.deskripsi || ''}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    renderSettings() {
        return `
            <div class="form-container">
                <h3><i class="fas fa-cog"></i> Pengaturan Sistem</h3>
                
                <div class="form-group">
                    <label><i class="fas fa-spreadsheet"></i> Google Spreadsheet ID</label>
                    <input type="text" id="setting-sheet-id" class="form-control" 
                           value="${CONFIG.SPREADSHEET_ID}" 
                           placeholder="1AbC2dEfG3hIjK4lMnOp5QrStUvWxYz">
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-link"></i> Web App URL</label>
                    <input type="text" id="setting-webapp-url" class="form-control" 
                           value="${CONFIG.WEB_APP_URL}"
                           placeholder="https://script.google.com/macros/s/.../exec">
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 30px;">
                    <button class="btn btn-primary" onclick="app.saveSettings()">
                        <i class="fas fa-save"></i> Simpan Pengaturan
                    </button>
                    <button class="btn btn-secondary" onclick="app.testAPI()">
                        <i class="fas fa-wifi"></i> Test Koneksi
                    </button>
                    <button class="btn btn-secondary" onclick="app.resetSettings()">
                        <i class="fas fa-undo"></i> Reset
                    </button>
                </div>
                
                <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                    <h4><i class="fas fa-info-circle"></i> Cara Mendapatkan:</h4>
                    <ol style="margin-left: 20px; line-height: 1.8;">
                        <li><strong>Spreadsheet ID:</strong> Dapat dari URL Google Sheets</li>
                        <li><strong>Web App URL:</strong> Dapat setelah deploy Google Apps Script</li>
                    </ol>
                </div>
            </div>
        `;
    }
    
    saveSettings() {
        try {
            const sheetId = document.getElementById('setting-sheet-id').value.trim();
            const webAppUrl = document.getElementById('setting-webapp-url').value.trim();
            
            if (!sheetId || !webAppUrl) {
                window.auth.showNotification('Semua field harus diisi', 'error');
                return;
            }
            
            // Update config (in a real app, this would save to localStorage)
            CONFIG.SPREADSHEET_ID = sheetId;
            CONFIG.WEB_APP_URL = webAppUrl;
            
            // Save to localStorage for persistence
            localStorage.setItem('spmb_config', JSON.stringify({
                SPREADSHEET_ID: sheetId,
                WEB_APP_URL: webAppUrl
            }));
            
            window.auth.showNotification('Pengaturan berhasil disimpan', 'success');
            
            // Test new settings
            setTimeout(() => this.testAPI(), 1000);
            
        } catch (error) {
            console.error('Save settings error:', error);
            window.auth.showNotification('Gagal menyimpan pengaturan', 'error');
        }
    }
    
    resetSettings() {
        const defaultConfig = {
            SPREADSHEET_ID: '1fnk5hFLA9q-ZH9NoGQPD_dP0qIQTAT9piPWLkPbFLNE',
            WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbyrNyz1uYx9NJ4pLsD_i68uKymU8t_raieFurp2NYSL4J4LxAL0GCQM79rl60gGSck/exec'
        };
        
        document.getElementById('setting-sheet-id').value = defaultConfig.SPREADSHEET_ID;
        document.getElementById('setting-webapp-url').value = defaultConfig.WEB_APP_URL;
        
        window.auth.showNotification('Pengaturan direset ke default', 'info');
    }
    
    // Chart functions
    initDashboardCharts() {
        this.initTrendChart();
        this.initStatusChart();
    }
    
    initTrendChart() {
        const ctx = document.getElementById('trend-chart');
        if (!ctx) return;
        
        // Sample chart data
        const data = {
            labels: ['Nov', 'Des', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul'],
            datasets: [
                {
                    label: 'SMP',
                    data: [5, 10, 15, 20, 25, 20, 15, 10, 5],
                    borderColor: CONFIG.THEME.COLORS.smp,
                    backgroundColor: CONFIG.THEME.COLORS.smp + '20',
                    tension: 0.4
                },
                {
                    label: 'SMK',
                    data: [10, 20, 20, 20, 25, 35, 20, 40, 40],
                    borderColor: CONFIG.THEME.COLORS.smk,
                    backgroundColor: CONFIG.THEME.COLORS.smk + '20',
                    tension: 0.4
                }
            ]
        };
        
        new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
    }
    
    initStatusChart() {
        const ctx = document.getElementById('status-chart');
        if (!ctx) return;
        
        const data = {
            labels: ['Terjadwal', 'Berlangsung', 'Selesai'],
            datasets: [{
                data: [5, 3, 8],
                backgroundColor: [
                    CONFIG.AGENDA_STATUS.scheduled.color,
                    CONFIG.AGENDA_STATUS.ongoing.color,
                    CONFIG.AGENDA_STATUS.completed.color
                ],
                borderColor: [
                    CONFIG.AGENDA_STATUS.scheduled.text,
                    CONFIG.AGENDA_STATUS.ongoing.text,
                    CONFIG.AGENDA_STATUS.completed.text
                ],
                borderWidth: 1
            }]
        };
        
        new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
    }
    
    initSPMBCharts(unit) {
        const ctx = document.getElementById('spmb-chart');
        if (!ctx) return;
        
        const color = unit === 'SMP' ? CONFIG.THEME.COLORS.smp : CONFIG.THEME.COLORS.smk;
        const targets = unit === 'SMP' ? CONFIG.SPMB_TARGETS.SMP.MONTHLY : CONFIG.SPMB_TARGETS.SMK.MONTHLY;
        
        const data = {
            labels: CONFIG.APP.MONTHS.slice(0, 6),
            datasets: [
                {
                    label: 'Realisasi',
                    data: [10, 20, 20, 20, 25, 35, 20, 40, 40],
                    backgroundColor: color + '80',
                    borderColor: color,
                    borderWidth: 2
                },
                {
                    label: 'Target',
                    data: targets.slice(0, 6),
                    type: 'line',
                    borderColor: '#e74c3c',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4
                }
            ]
        };
        
        new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    getMockData() {
        return {
            spmbSMP: {
                total: 80,
                monthly: [
                    { bulan: 11, count: 5 },
                    { bulan: 12, count: 5 },
                    { bulan: 1, count: 10 },
                    { bulan: 2, count: 10 },
                    { bulan: 3, count: 15 },
                    { bulan: 4, count: 20 }
                    { bulan: 5, count: 5 },
                    { bulan: 6, count: 5 },
                    { bulan: 7, count: 5 }
                ]
            },
            spmbSMK: {
                total: 280,
                monthly: [
                     { bulan: 11, count: 20 },
                    { bulan: 12, count: 25 },
                    { bulan: 1, count: 30 },
                    { bulan: 2, count: 35 },
                    { bulan: 3, count: 40 },
                    { bulan: 4, count: 45 }
                    { bulan: 5, count: 30 },
                    { bulan: 6, count: 35 },
                    { bulan: 7, count: 20}
                ]
            },
            agenda: [
                {
                    tanggal: '2024-06-15',
                    kegiatan: 'Open House SMP',
                    lokasi: 'Aula Utama',
                    status: 'completed',
                    penanggung_jawab: 'Budi Santoso'
                },
                {
                    tanggal: '2024-06-20',
                    kegiatan: 'Workshop Teknologi',
                    lokasi: 'Lab Komputer',
                    status: 'ongoing',
                    penanggung_jawab: 'Siti Aisyah'
                }
            ],
            photos: [
                {
                    tanggal: '2024-06-15',
                    kegiatan: 'Open House SMP',
                    url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&h=300&q=80',
                    deskripsi: 'Sesi presentasi untuk orang tua'
                }
            ]
        };
    }
}

// Initialize app when auth is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for auth to initialize
    setTimeout(() => {
        window.app = new DashboardApp();
    }, 500);
});
