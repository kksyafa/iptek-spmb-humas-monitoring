// Main Application Script
class DashboardApp {
    constructor() {
        this.currentData = null;
        this.charts = {};
        this.init();
    }
    
    init() {
        this.setupNavigation();
        this.loadInitialData();
        this.setupEventListeners();
    }
    
    setupNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.currentTarget.dataset.page;
                
                // Check permission
                if (!window.auth.hasPermission(page)) {
                    window.auth.showNotification('Anda tidak memiliki akses ke halaman ini', 'error');
                    return;
                }
                
                this.navigateTo(page);
            });
        });
    }
    
    navigateTo(page) {
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === page) {
                link.classList.add('active');
            }
        });
        
        // Load page content
        this.loadPage(page);
    }
    
    async loadInitialData() {
        try {
            // Show loading
            document.getElementById('loading-overlay').style.display = 'flex';
            
            // Load data from Google Sheets or use mock data
            this.currentData = await this.fetchData();
            
            // Load dashboard as default page
            this.loadPage('dashboard');
            
            // Hide loading
            setTimeout(() => {
                document.getElementById('loading-overlay').style.display = 'none';
            }, 1000);
            
        } catch (error) {
            console.error('Error loading data:', error);
            window.auth.showNotification('Gagal memuat data', 'error');
        }
    }
    
    async fetchData() {
        // Try to fetch from Google Sheets
        try {
            const response = await fetch(`${CONFIG.SPREADSHEET.WEB_APP_URL}?action=getAll`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.log('Using mock data:', error);
        }
        
        // Return mock data if fetch fails
        return this.getMockData();
    }
    
    async saveData(sheet, data) {
        try {
            const response = await fetch(CONFIG.SPREADSHEET.WEB_APP_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'save',
                    sheet: sheet,
                    data: data
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                window.auth.showNotification('Data berhasil disimpan', 'success');
                return true;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error saving data:', error);
            window.auth.showNotification('Gagal menyimpan data', 'error');
            return false;
        }
    }
    
    async loadPage(page) {
        const contentArea = document.getElementById('content-area');
        
        switch(page) {
            case 'dashboard':
                contentArea.innerHTML = this.renderDashboard();
                this.initDashboardCharts();
                break;
                
            case 'spmb-smp':
                contentArea.innerHTML = this.renderSPMB('SMP');
                this.initSPMBChart('smp');
                break;
                
            case 'spmb-smk':
                contentArea.innerHTML = this.renderSPMB('SMK');
                this.initSPMBChart('smk');
                break;
                
            case 'spmb-comparison':
                contentArea.innerHTML = this.renderComparison();
                this.initComparisonChart();
                break;
                
            case 'agenda':
                contentArea.innerHTML = this.renderAgendaCalendar();
                this.initCalendar();
                break;
                
            case 'agenda-list':
                contentArea.innerHTML = this.renderAgendaList();
                break;
                
            case 'input-data':
                contentArea.innerHTML = this.renderInputForm();
                this.initInputForm();
                break;
                
            case 'gallery':
                contentArea.innerHTML = this.renderGallery();
                break;
                
            case 'settings':
                contentArea.innerHTML = this.renderSettings();
                break;
        }
    }
    
    // RENDER METHODS
    
    renderDashboard() {
        const stats = this.calculateStats();
        
        return `
            <div class="content-header">
                <h2><i class="fas fa-tachometer-alt"></i> Dashboard Overview</h2>
                <p>Ringkasan data SPMB dan Agenda Humas</p>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card smp">
                    <div class="stat-icon">
                        <i class="fas fa-school"></i>
                    </div>
                    <div class="stat-value">${stats.smp.total}</div>
                    <div class="stat-label">Penerimaan SMP</div>
                    <div class="stat-trend ${stats.smp.trend > 0 ? 'trend-up' : 'trend-down'}">
                        <i class="fas fa-${stats.smp.trend > 0 ? 'arrow-up' : 'arrow-down'}"></i>
                        ${Math.abs(stats.smp.trend)}% dari target
                    </div>
                </div>
                
                <div class="stat-card smk">
                    <div class="stat-icon">
                        <i class="fas fa-graduation-cap"></i>
                    </div>
                    <div class="stat-value">${stats.smk.total}</div>
                    <div class="stat-label">Penerimaan SMK</div>
                    <div class="stat-trend ${stats.smk.trend > 0 ? 'trend-up' : 'trend-down'}">
                        <i class="fas fa-${stats.smk.trend > 0 ? 'arrow-up' : 'arrow-down'}"></i>
                        ${Math.abs(stats.smk.trend)}% dari target
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-calendar-check"></i>
                    </div>
                    <div class="stat-value">${stats.agenda.total}</div>
                    <div class="stat-label">Agenda Bulan Ini</div>
                    <div class="stat-trend trend-up">
                        <i class="fas fa-check-circle"></i>
                        ${stats.agenda.completed} selesai
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-images"></i>
                    </div>
                    <div class="stat-value">${stats.photos.total}</div>
                    <div class="stat-label">Foto Kegiatan</div>
                    <div class="stat-trend trend-up">
                        <i class="fas fa-plus-circle"></i>
                        ${stats.photos.recent} baru
                    </div>
                </div>
            </div>
            
            <div class="charts-container">
                <div class="chart-card">
                    <div class="chart-header">
                        <h3>Trend Penerimaan ${CONFIG.APP.YEAR}</h3>
                    </div>
                    <div class="chart-wrapper">
                        <canvas id="trend-chart"></canvas>
                    </div>
                </div>
                
                <div class="chart-card">
                    <div class="chart-header">
                        <h3>Status Agenda</h3>
                    </div>
                    <div class="chart-wrapper">
                        <canvas id="status-chart"></canvas>
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <h3 style="padding: 20px; margin: 0;">Agenda Terbaru</h3>
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
                        ${this.renderRecentAgendas()}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    renderSPMB(unit) {
        const data = unit === 'SMP' ? this.currentData?.spmbSMP : this.currentData?.spmbSMK;
        const color = unit === 'SMP' ? CONFIG.THEME.COLORS.smp : CONFIG.THEME.COLORS.smk;
        
        return `
            <div class="content-header">
                <h2><i class="fas fa-${unit === 'SMP' ? 'school' : 'graduation-cap'}"></i> Monitoring SPMB ${unit}</h2>
                <p>Tahun Akademik ${CONFIG.APP.YEAR}/${CONFIG.APP.YEAR + 1}</p>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${data?.total || 0}</div>
                    <div class="stat-label">Total Penerimaan</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-value">${CONFIG.SPMB.TARGETS[unit].TOTAL}</div>
                    <div class="stat-label">Target Tahun Ini</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-value">${data?.monthly?.[new Date().getMonth()]?.count || 0}</div>
                    <div class="stat-label">Bulan Ini</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-value">${Math.round((data?.total || 0) / CONFIG.SPMB.TARGETS[unit].TOTAL * 100)}%</div>
                    <div class="stat-label">Pencapaian Target</div>
                </div>
            </div>
            
            <div class="charts-container">
                <div class="chart-card">
                    <div class="chart-header">
                        <h3>Penerimaan per Bulan</h3>
                    </div>
                    <div class="chart-wrapper">
                        <canvas id="monthly-chart"></canvas>
                    </div>
                </div>
                
                <div class="chart-card">
                    <div class="chart-header">
                        <h3>Distribusi Program</h3>
                    </div>
                    <div class="chart-wrapper">
                        <canvas id="program-chart"></canvas>
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <h3 style="padding: 20px; margin: 0; display: flex; justify-content: space-between; align-items: center;">
                    <span>Data Bulanan</span>
                    <button class="btn btn-primary" onclick="app.showInputForm('spmb')">
                        <i class="fas fa-plus"></i> Tambah Data
                    </button>
                </h3>
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
                        ${this.renderMonthlyData(unit)}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    renderComparison() {
        return `
            <div class="content-header">
                <h2><i class="fas fa-chart-bar"></i> Perbandingan SMP vs SMK</h2>
                <p>Analisis perbandingan penerimaan siswa</p>
            </div>
            
            <div class="charts-container">
                <div class="chart-card">
                    <div class="chart-header">
                        <h3>Perbandingan Bulanan</h3>
                    </div>
                    <div class="chart-wrapper">
                        <canvas id="comparison-chart"></canvas>
                    </div>
                </div>
                
                <div class="chart-card">
                    <div class="chart-header">
                        <h3>Persentase Pencapaian</h3>
                    </div>
                    <div class="chart-wrapper">
                        <canvas id="achievement-chart"></canvas>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderAgendaCalendar() {
        return `
            <div class="content-header">
                <h2><i class="fas fa-calendar-alt"></i> Kalender Agenda</h2>
                <p>Jadwal kegiatan humas</p>
            </div>
            
            <div class="calendar-container">
                <div class="calendar-header">
                    <button class="btn btn-secondary" id="prev-month">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <h3 id="current-month">${CONFIG.APP.MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}</h3>
                    <button class="btn btn-secondary" id="next-month">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div id="calendar" style="background: white; border-radius: 12px; padding: 20px; margin-top: 20px;">
                    Kalender akan ditampilkan di sini
                </div>
            </div>
        `;
    }
    
    renderAgendaList() {
        const agendas = this.currentData?.agenda || [];
        
        return `
            <div class="content-header">
                <h2><i class="fas fa-list"></i> Daftar Agenda Kegiatan</h2>
                <p>Manajemen kegiatan humas</p>
            </div>
            
            <div class="table-container">
                <div style="padding: 20px; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">Semua Agenda</h3>
                    <button class="btn btn-primary" onclick="app.showInputForm('agenda')">
                        <i class="fas fa-plus"></i> Tambah Agenda
                    </button>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Tanggal</th>
                            <th>Kegiatan</th>
                            <th>Lokasi</th>
                            <th>Kategori</th>
                            <th>Status</th>
                            <th>PJ</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${agendas.map(agenda => `
                            <tr>
                                <td>${agenda.tanggal}</td>
                                <td>${agenda.kegiatan}</td>
                                <td>${agenda.lokasi}</td>
                                <td>${agenda.kategori}</td>
                                <td>
                                    <span class="status-badge ${CONFIG.AGENDA.STATUS[agenda.status]?.color || ''}">
                                        ${CONFIG.AGENDA.STATUS[agenda.status]?.label || agenda.status}
                                    </span>
                                </td>
                                <td>${agenda.penanggung_jawab}</td>
                                <td>
                                    <button class="btn-icon" onclick="app.editAgenda('${agenda.id}')">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn-icon" onclick="app.deleteAgenda('${agenda.id}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    renderInputForm() {
        return `
            <div class="content-header">
                <h2><i class="fas fa-plus-circle"></i> Input Data</h2>
                <p>Tambah data SPMB atau Agenda</p>
            </div>
            
            <div class="form-container">
                <div class="form-tabs">
                    <button class="tab-btn active" data-form="spmb">Data SPMB</button>
                    <button class="tab-btn" data-form="agenda">Agenda</button>
                    <button class="tab-btn" data-form="foto">Foto Kegiatan</button>
                </div>
                
                <div id="spmb-form" class="form-content active">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="unit"><i class="fas fa-school"></i> Unit</label>
                            <select id="unit" class="form-control">
                                <option value="smp">SMP</option>
                                <option value="smk">SMK</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="bulan"><i class="fas fa-calendar"></i> Bulan</label>
                            <select id="bulan" class="form-control">
                                ${CONFIG.APP.MONTHS.map((month, index) => `
                                    <option value="${index + 1}">${month}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="tahun"><i class="fas fa-calendar-alt"></i> Tahun</label>
                            <input type="number" id="tahun" class="form-control" value="${CONFIG.APP.YEAR}">
                        </div>
                        
                        <div class="form-group">
                            <label for="jumlah"><i class="fas fa-users"></i> Jumlah Siswa</label>
                            <input type="number" id="jumlah" class="form-control" placeholder="Masukkan jumlah siswa">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="keterangan"><i class="fas fa-sticky-note"></i> Keterangan</label>
                        <textarea id="keterangan" class="form-control" rows="3" placeholder="Tambahkan keterangan..."></textarea>
                    </div>
                    
                    <button class="btn btn-primary" onclick="app.saveSPMBData()">
                        <i class="fas fa-save"></i> Simpan Data
                    </button>
                </div>
                
                <div id="agenda-form" class="form-content">
                    <!-- Agenda form will be loaded here -->
                </div>
                
                <div id="foto-form" class="form-content">
                    <!-- Foto form will be loaded here -->
                </div>
            </div>
        `;
    }
    
    renderGallery() {
        const photos = this.currentData?.photos || [];
        
        return `
            <div class="content-header">
                <h2><i class="fas fa-images"></i> Gallery Foto Kegiatan</h2>
                <p>Dokumentasi kegiatan humas</p>
            </div>
            
            <div style="margin-bottom: 30px;">
                <button class="btn btn-primary" onclick="app.showInputForm('foto')">
                    <i class="fas fa-upload"></i> Upload Foto
                </button>
            </div>
            
            <div class="photo-grid">
                ${photos.map(photo => `
                    <div class="photo-card">
                        <img src="${photo.url}" alt="${photo.kegiatan}" class="photo-image" onerror="this.src='https://via.placeholder.com/400x300?text=Gambar+Tidak+Tersedia'">
                        <div class="photo-info">
                            <h4>${photo.kegiatan}</h4>
                            <p class="photo-date">${photo.tanggal}</p>
                            <p style="font-size: 12px; color: #666; margin-top: 5px;">${photo.deskripsi || ''}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    renderSettings() {
        return `
            <div class="content-header">
                <h2><i class="fas fa-cog"></i> Pengaturan Sistem</h2>
                <p>Konfigurasi dashboard monitoring</p>
            </div>
            
            <div class="form-container">
                <div class="form-group">
                    <h3><i class="fas fa-user-cog"></i> Pengaturan Akun</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Username</label>
                            <input type="text" class="form-control" value="${window.auth.currentUser?.username || ''}" readonly>
                        </div>
                        <div class="form-group">
                            <label>Nama Lengkap</label>
                            <input type="text" class="form-control" value="${window.auth.currentUser?.name || ''}">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Password Baru</label>
                            <input type="password" class="form-control" placeholder="Masukkan password baru">
                        </div>
                        <div class="form-group">
                            <label>Konfirmasi Password</label>
                            <input type="password" class="form-control" placeholder="Konfirmasi password baru">
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <h3><i class="fas fa-spreadsheet"></i> Konfigurasi Spreadsheet</h3>
                    <div class="form-group">
                        <label>Google Sheet ID</label>
                        <input type="text" class="form-control" value="${CONFIG.SPREADSHEET.ID}" id="sheet-id">
                    </div>
                    <div class="form-group">
                        <label>Web App URL</label>
                        <input type="text" class="form-control" value="${CONFIG.SPREADSHEET.WEB_APP_URL}" id="webapp-url">
                    </div>
                    <button class="btn btn-primary" onclick="app.saveSettings()">
                        <i class="fas fa-save"></i> Simpan Pengaturan
                    </button>
                </div>
                
                <div class="form-group">
                    <h3><i class="fas fa-database"></i> Data Management</h3>
                    <button class="btn btn-secondary" onclick="app.refreshData()">
                        <i class="fas fa-sync"></i> Refresh Data
                    </button>
                    <button class="btn btn-secondary" onclick="app.exportData()">
                        <i class="fas fa-download"></i> Export Data
                    </button>
                    <button class="btn btn-danger" onclick="app.clearCache()">
                        <i class="fas fa-trash"></i> Clear Cache
                    </button>
                </div>
            </div>
        `;
    }
    
    // HELPER METHODS
    
    calculateStats() {
        const data = this.currentData || this.getMockData();
        
        return {
            smp: {
                total: data.spmbSMP?.total || 0,
                trend: 85
            },
            smk: {
                total: data.spmbSMK?.total || 0,
                trend: 92
            },
            agenda: {
                total: data.agenda?.length || 0,
                completed: data.agenda?.filter(a => a.status === 'completed').length || 0
            },
            photos: {
                total: data.photos?.length || 0,
                recent: data.photos?.filter(p => {
                    const photoDate = new Date(p.tanggal);
                    const monthAgo = new Date();
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    return photoDate > monthAgo;
                }).length || 0
            }
        };
    }
    
    renderRecentAgendas() {
        const agendas = this.currentData?.agenda || [];
        const recent = agendas.slice(0, 5);
        
        if (recent.length === 0) {
            return '<tr><td colspan="5" style="text-align: center;">Tidak ada agenda</td></tr>';
        }
        
        return recent.map(agenda => `
            <tr>
                <td>${agenda.tanggal}</td>
                <td>${agenda.kegiatan}</td>
                <td>${agenda.lokasi}</td>
                <td>
                    <span class="status-badge ${CONFIG.AGENDA.STATUS[agenda.status]?.color || ''}">
                        ${CONFIG.AGENDA.STATUS[agenda.status]?.label || agenda.status}
                    </span>
                </td>
                <td>${agenda.penanggung_jawab}</td>
            </tr>
        `).join('');
    }
    
    renderMonthlyData(unit) {
        const data = unit === 'SMP' ? this.currentData?.spmbSMP?.monthly : this.currentData?.spmbSMK?.monthly;
        const target = unit === 'SMP' ? CONFIG.SPMB.TARGETS.SMP.MONTHLY : CONFIG.SPMB.TARGETS.SMK.MONTHLY;
        
        return CONFIG.APP.MONTHS.map((month, index) => {
            const monthData = data?.find(d => d.bulan === index + 1) || { count: 0 };
            const targetValue = target[index] || 0;
            const achievement = targetValue > 0 ? Math.round((monthData.count / targetValue) * 100) : 0;
            
            return `
                <tr>
                    <td>${month}</td>
                    <td>${targetValue}</td>
                    <td>${monthData.count}</td>
                    <td>${monthData.count - targetValue}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span>${achievement}%</span>
                            <div style="flex: 1; height: 8px; background: #eee; border-radius: 4px; overflow: hidden;">
                                <div style="width: ${Math.min(achievement, 100)}%; height: 100%; background: ${achievement >= 100 ? '#27ae60' : achievement >= 80 ? '#f39c12' : '#e74c3c'};"></div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    // CHART METHODS
    
    initDashboardCharts() {
        this.initTrendChart();
        this.initStatusChart();
    }
    
    initTrendChart() {
        const ctx = document.getElementById('trend-chart');
        if (!ctx) return;
        
        const smpData = this.currentData?.spmbSMP?.monthly || [];
        const smkData = this.currentData?.spmbSMK?.monthly || [];
        
        this.charts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: CONFIG.APP.MONTHS.slice(0, new Date().getMonth() + 1),
                datasets: [
                    {
                        label: 'SMP',
                        data: smpData.map(d => d.count),
                        borderColor: CONFIG.THEME.COLORS.smp,
                        backgroundColor: CONFIG.THEME.COLORS.smp + '20',
                        tension: 0.4
                    },
                    {
                        label: 'SMK',
                        data: smkData.map(d => d.count),
                        borderColor: CONFIG.THEME.COLORS.smk,
                        backgroundColor: CONFIG.THEME.COLORS.smk + '20',
                        tension: 0.4
                    }
                ]
            },
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
        
        const agendas = this.currentData?.agenda || [];
        const statusCount = {
            scheduled: agendas.filter(a => a.status === 'scheduled').length,
            ongoing: agendas.filter(a => a.status === 'ongoing').length,
            completed: agendas.filter(a => a.status === 'completed').length
        };
        
        this.charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Terjadwal', 'Berlangsung', 'Selesai'],
                datasets: [{
                    data: [statusCount.scheduled, statusCount.ongoing, statusCount.completed],
                    backgroundColor: [
                        '#fff3cd',
                        '#d1ecf1',
                        '#d4edda'
                    ],
                    borderColor: [
                        '#856404',
                        '#0c5460',
                        '#155724'
                    ],
                    borderWidth: 1
                }]
            },
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
    
    initSPMBChart(unit) {
        const ctx = document.getElementById('monthly-chart');
        if (!ctx) return;
        
        const data = unit === 'smp' ? this.currentData?.spmbSMP?.monthly : this.currentData?.spmbSMK?.monthly;
        const target = unit === 'smp' ? CONFIG.SPMB.TARGETS.SMP.MONTHLY : CONFIG.SPMB.TARGETS.SMK.MONTHLY;
        const color = unit === 'smp' ? CONFIG.THEME.COLORS.smp : CONFIG.THEME.COLORS.smk;
        
        this.charts.monthly = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: CONFIG.APP.MONTHS.slice(0, new Date().getMonth() + 1),
                datasets: [
                    {
                        label: 'Realisasi',
                        data: data?.map(d => d.count) || [],
                        backgroundColor: color + '80',
                        borderColor: color,
                        borderWidth: 1
                    },
                    {
                        label: 'Target',
                        data: target.slice(0, new Date().getMonth() + 1),
                        type: 'line',
                        borderColor: '#e74c3c',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
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
    
    // MOCK DATA
    
    getMockData() {
        return {
            spmbSMP: {
                total: 245,
                monthly: [
                    { bulan: 1, count: 45, keterangan: 'Januari' },
                    { bulan: 2, count: 38, keterangan: 'Februari' },
                    { bulan: 3, count: 52, keterangan: 'Maret' },
                    { bulan: 4, count: 41, keterangan: 'April' },
                    { bulan: 5, count: 34, keterangan: 'Mei' },
                    { bulan: 6, count: 35, keterangan: 'Juni' }
                ],
                byProgram: [
                    { program: 'Reguler', count: 180 },
                    { program: 'Prestasi', count: 45 },
                    { program: 'Kemitraan', count: 20 }
                ]
            },
            spmbSMK: {
                total: 312,
                monthly: [
                    { bulan: 1, count: 68, keterangan: 'Januari' },
                    { bulan: 2, count: 54, keterangan: 'Februari' },
                    { bulan: 3, count: 72, keterangan: 'Maret' },
                    { bulan: 4, count: 58, keterangan: 'April' },
                    { bulan: 5, count: 42, keterangan: 'Mei' },
                    { bulan: 6, count: 38, keterangan: 'Juni' }
                ],
                byProgram: [
                    { program: 'Teknik Sepeda Motor', count: 120 },
                    { program: 'Desain Komunikasi Visual', count: 195 },
                    { program: 'Akuntansi', count: 167 },
                    { program: 'Perhotelan', count: 130 }
                ]
            },
            agenda: [
                {
                    id: 1,
                    tanggal: '2024-06-15',
                    kegiatan: 'Open House SMP',
                    lokasi: 'Kampus Utama',
                    kategori: 'Open House',
                    status: 'completed',
                    penanggung_jawab: 'Arief Susilo, S.Pd',
                    deskripsi: 'Kegiatan open house untuk calon siswa SMP'
                },
                {
                    id: 2,
                    tanggal: '2024-06-20',
                    kegiatan: 'Workshop Teknologi',
                    lokasi: 'Lab Komputer',
                    kategori: 'Workshop',
                    status: 'ongoing',
                    penanggung_jawab: 'Siti Aisyah',
                    deskripsi: 'Workshop pengenalan teknologi untuk siswa SMK'
                },
                {
                    id: 3,
                    tanggal: '2024-06-25',
                    kegiatan: 'Pameran Pendidikan',
                    lokasi: 'Mall Kota',
                    kategori: 'Pameran',
                    status: 'scheduled',
                    penanggung_jawab: 'Ahmad Fauzi',
                    deskripsi: 'Pameran pendidikan tahunan'
                }
            ],
            photos: [
                {
                    id: 1,
                    tanggal: '2024-06-15',
                    kegiatan: 'Open House SMP',
                    url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&h=300&q=80',
                    deskripsi: 'Sesi presentasi untuk orang tua'
                },
                {
                    id: 2,
                    tanggal: '2024-06-10',
                    kegiatan: 'Workshop Coding',
                    url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&h=300&q=80',
                    deskripsi: 'Siswa belajar pemrograman dasar'
                }
            ]
        };
    }
    
    // EVENT HANDLERS
    
    setupEventListeners() {
        // Tab switching for input form
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn')) {
                const formType = e.target.dataset.form;
                this.switchFormTab(formType);
            }
        });
    }
    
    switchFormTab(formType) {
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Show corresponding form
        document.querySelectorAll('.form-content').forEach(form => {
            form.classList.remove('active');
        });
        document.getElementById(`${formType}-form`).classList.add('active');
    }
    
    async saveSPMBData() {
        const unit = document.getElementById('unit').value;
        const bulan = document.getElementById('bulan').value;
        const tahun = document.getElementById('tahun').value;
        const jumlah = document.getElementById('jumlah').value;
        const keterangan = document.getElementById('keterangan').value;
        
        if (!jumlah) {
            window.auth.showNotification('Jumlah siswa harus diisi', 'error');
            return;
        }
        
        const data = {
            unit: unit.toUpperCase(),
            bulan: bulan,
            tahun: tahun,
            jumlah_siswa: parseInt(jumlah),
            keterangan: keterangan,
            tanggal_input: new Date().toISOString().split('T')[0],
            input_by: window.auth.currentUser?.name || 'Unknown'
        };
        
        const success = await this.saveData('SPMB_' + unit.toUpperCase(), data);
        
        if (success) {
            // Clear form
            document.getElementById('jumlah').value = '';
            document.getElementById('keterangan').value = '';
            
            // Refresh data
            this.currentData = await this.fetchData();
            
            // Navigate back to SPMB page
            this.navigateTo(unit === 'smp' ? 'spmb-smp' : 'spmb-smk');
        }
    }
    
    showInputForm(type) {
        this.navigateTo('input-data');
        
        // Switch to correct tab
        setTimeout(() => {
            const tabBtn = document.querySelector(`.tab-btn[data-form="${type}"]`);
            if (tabBtn) {
                tabBtn.click();
            }
        }, 100);
    }
    
    refreshData() {
        this.loadInitialData();
        window.auth.showNotification('Data berhasil di-refresh', 'success');
    }
    
    exportData() {
        const dataStr = JSON.stringify(this.currentData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `spmb-data-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        window.auth.showNotification('Data berhasil diexport', 'success');
    }
    
    clearCache() {
        localStorage.clear();
        window.auth.showNotification('Cache berhasil dibersihkan', 'success');
        setTimeout(() => {
            location.reload();
        }, 1000);
    }
    
    saveSettings() {
        // In a real app, this would save to localStorage or server
        window.auth.showNotification('Pengaturan berhasil disimpan', 'success');
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DashboardApp();
});
