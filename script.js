// ============================================
// SPMB APP - MURNI DARI SPREADSHEET
// TANPA MOCK DATA - SEMUA KOSONG SAMPAI USER INPUT
// ============================================

class SPMBApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.currentYear = CONFIG.DEFAULT_ACADEMIC_YEAR || '2026/2027';
        
        // ============================================
        // DATA AWAL BENAR-BENAR KOSONG
        // TIDAK ADA SATUPUN MOCK DATA
        // ============================================
        this.data = {
            spmb: {
                SMP: {
                    earlybird: { pendaftar: 0, formulir: 0, dsp: 0 },
                    gelombang1: { pendaftar: 0, formulir: 0, dsp: 0 },
                    gelombang2: { pendaftar: 0, formulir: 0, dsp: 0 },
                    total: { pendaftar: 0, formulir: 0, dsp: 0 }
                },
                SMK: {
                    earlybird: { pendaftar: 0, formulir: 0, dsp: 0 },
                    gelombang1: { pendaftar: 0, formulir: 0, dsp: 0 },
                    gelombang2: { pendaftar: 0, formulir: 0, dsp: 0 },
                    total: { pendaftar: 0, formulir: 0, dsp: 0 }
                }
            },
            agenda: [],
            photos: []
        };
        
        this.charts = {};
        this.isLoading = false;
        this.apiAvailable = false;
        
        this.init();
    }
    
    init() {
        console.log('🚀 SPMB App initialized - NO MOCK DATA - ALL ZERO');
        this.setupEventListeners();
        
        // Listen for auth events
        window.addEventListener('auth:login', () => {
            console.log('👤 User logged in, loading data from spreadsheet...');
            this.loadData();
        });
        
        // Load data if already authenticated
        if (window.auth && window.auth.isAuthenticated) {
            this.loadData();
        }
    }
    
    setupEventListeners() {
        // Navigation
        document.addEventListener('click', (e) => {
            const navLink = e.target.closest('[data-page]');
            if (navLink) {
                e.preventDefault();
                const page = navLink.dataset.page;
                this.navigateTo(page);
            }
            
            // Tab switching
            if (e.target.classList.contains('tab-btn')) {
                this.switchTab(e.target.dataset.tab);
            }
            
            // Save buttons
            if (e.target.id === 'btn-save-spmb') {
                this.saveSPMBData();
            }
            if (e.target.id === 'btn-save-agenda') {
                this.saveAgendaData();
            }
            if (e.target.id === 'btn-save-photo') {
                this.savePhotoData();
            }
        });
        
        // Academic year change
        document.addEventListener('change', (e) => {
            if (e.target.id === 'academic-year-select') {
                this.currentYear = e.target.value;
                this.refreshData();
            }
        });
    }
    
    // ============================================
    // API FUNCTIONS - KONEKSI KE SPREADSHEET
    // ============================================
    
    async fetchFromAPI(action, params = {}) {
        try {
            // CEK APAKAH WEB APP URL SUDAH DIKONFIGURASI
            if (!CONFIG.WEB_APP_URL || CONFIG.WEB_APP_URL.includes('YOUR_SCRIPT_ID')) {
                console.warn('⚠️ WEB_APP_URL belum dikonfigurasi');
                return { success: false, error: 'API not configured' };
            }
            
            const url = new URL(CONFIG.WEB_APP_URL);
            url.searchParams.append('action', action);
            
            Object.keys(params).forEach(key => {
                url.searchParams.append(key, params[key]);
            });
            
            // Cache busting
            url.searchParams.append('_', Date.now());
            
            console.log(`📡 Fetching from API: ${action}`, url.toString());
            
            const response = await fetch(url.toString(), {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📦 API Response:', data);
            
            if (data.success) {
                this.apiAvailable = true;
            }
            
            return data;
            
        } catch (error) {
            console.error('❌ API Fetch Error:', error);
            this.apiAvailable = false;
            return { success: false, error: error.message };
        }
    }
    
    async saveToAPI(sheetName, data) {
        try {
            // CEK APAKAH WEB APP URL SUDAH DIKONFIGURASI
            if (!CONFIG.WEB_APP_URL || CONFIG.WEB_APP_URL.includes('YOUR_SCRIPT_ID')) {
                this.showNotification('⚠️ API belum dikonfigurasi. Edit config.js terlebih dahulu.', 'warning');
                return { success: false };
            }
            
            console.log(`💾 Saving to ${sheetName}:`, data);
            
            const payload = {
                action: 'save',
                sheet: sheetName,
                data: {
                    ...data,
                    id: Date.now(),
                    created_at: new Date().toISOString(),
                    created_by: window.auth?.currentUser?.name || 'Unknown'
                }
            };
            
            const response = await fetch(CONFIG.WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors', // Google Apps Script requires no-cors
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            
            this.showNotification('✅ Data berhasil dikirim ke spreadsheet', 'success');
            
            // Reload data setelah 1 detik
            setTimeout(() => this.loadData(), 1000);
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ API Save Error:', error);
            this.showNotification('❌ Gagal menyimpan data ke spreadsheet', 'error');
            return { success: false, error };
        }
    }
    
    async testConnection() {
        this.showNotification('🔄 Menguji koneksi ke spreadsheet...', 'info');
        
        try {
            const result = await this.fetchFromAPI('test');
            
            if (result && result.success) {
                this.showNotification('✅ Koneksi berhasil! Spreadsheet terhubung.', 'success');
                return true;
            } else {
                this.showNotification('❌ Koneksi gagal. Periksa Web App URL di config.js', 'error');
                return false;
            }
        } catch (error) {
            this.showNotification('❌ Tidak dapat terhubung ke API', 'error');
            return false;
        }
    }
    
    // ============================================
    // LOAD DATA - MURNI DARI SPREADSHEET
    // ============================================
    
    async loadData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading(true);
        
        try {
            // RESET DATA KE 0 SEBELUM LOAD
            this.resetData();
            
            // Ambil data dari spreadsheet
            const response = await this.fetchFromAPI('getAll');
            
            if (response && response.success && response.data) {
                console.log('📊 Data dari spreadsheet:', response.data);
                
                // Proses data SPMB SMP
                if (response.data.spmb_smp && Array.isArray(response.data.spmb_smp)) {
                    this.processSPMBData('SMP', response.data.spmb_smp);
                }
                
                // Proses data SPMB SMK
                if (response.data.spmb_smk && Array.isArray(response.data.spmb_smk)) {
                    this.processSPMBData('SMK', response.data.spmb_smk);
                }
                
                // Proses agenda
                if (response.data.agenda_humas && Array.isArray(response.data.agenda_humas)) {
                    this.data.agenda = response.data.agenda_humas.sort((a, b) => 
                        new Date(b.tanggal) - new Date(a.tanggal)
                    );
                }
                
                // Proses foto
                if (response.data.foto_kegiatan && Array.isArray(response.data.foto_kegiatan)) {
                    this.data.photos = response.data.foto_kegiatan.sort((a, b) => 
                        new Date(b.tanggal) - new Date(a.tanggal)
                    );
                }
                
                this.showNotification('✅ Data berhasil dimuat dari spreadsheet', 'success');
            } else {
                // TIDAK ADA MOCK DATA - TETAP TAMPILKAN KOSONG
                console.log('⚠️ Tidak ada data dari spreadsheet, menampilkan data kosong');
                this.showNotification('⚠️ Spreadsheet kosong atau tidak terhubung', 'warning');
            }
            
        } catch (error) {
            console.error('❌ Error loading data:', error);
            this.showNotification('❌ Gagal memuat data dari spreadsheet', 'error');
        }
        
        // Refresh current page
        this.refreshCurrentPage();
        
        this.isLoading = false;
        this.showLoading(false);
    }
    
    resetData() {
        // RESET SEMUA DATA KE 0
        this.data = {
            spmb: {
                SMP: {
                    earlybird: { pendaftar: 0, formulir: 0, dsp: 0 },
                    gelombang1: { pendaftar: 0, formulir: 0, dsp: 0 },
                    gelombang2: { pendaftar: 0, formulir: 0, dsp: 0 },
                    total: { pendaftar: 0, formulir: 0, dsp: 0 }
                },
                SMK: {
                    earlybird: { pendaftar: 0, formulir: 0, dsp: 0 },
                    gelombang1: { pendaftar: 0, formulir: 0, dsp: 0 },
                    gelombang2: { pendaftar: 0, formulir: 0, dsp: 0 },
                    total: { pendaftar: 0, formulir: 0, dsp: 0 }
                }
            },
            agenda: [],
            photos: []
        };
    }
    
    processSPMBData(unit, data) {
        if (!data || !Array.isArray(data)) return;
        
        // Filter berdasarkan tahun ajaran yang dipilih
        const filteredData = data.filter(item => 
            item.tahun_ajaran === this.currentYear
        );
        
        console.log(`📊 Processing ${unit} data for ${this.currentYear}:`, filteredData);
        
        // Reset data untuk unit ini
        this.data.spmb[unit] = {
            earlybird: { pendaftar: 0, formulir: 0, dsp: 0 },
            gelombang1: { pendaftar: 0, formulir: 0, dsp: 0 },
            gelombang2: { pendaftar: 0, formulir: 0, dsp: 0 },
            total: { pendaftar: 0, formulir: 0, dsp: 0 }
        };
        
        // Hitung total per periode
        filteredData.forEach(item => {
            const periode = item.periode;
            const pendaftar = parseInt(item.jumlah_pendaftar) || 0;
            const formulir = parseInt(item.jumlah_bayar_formulir) || 0;
            const dsp = parseInt(item.jumlah_bayar_dsp) || 0;
            
            if (this.data.spmb[unit][periode]) {
                this.data.spmb[unit][periode].pendaftar += pendaftar;
                this.data.spmb[unit][periode].formulir += formulir;
                this.data.spmb[unit][periode].dsp += dsp;
                
                this.data.spmb[unit].total.pendaftar += pendaftar;
                this.data.spmb[unit].total.formulir += formulir;
                this.data.spmb[unit].total.dsp += dsp;
            }
        });
        
        console.log(`📊 ${unit} data processed:`, this.data.spmb[unit]);
    }
    
    // ============================================
    // NAVIGATION
    // ============================================
    
    navigateTo(page) {
        this.currentPage = page;
        
        // Update active navigation
        const navItems = ['dashboard', 'spmb-smp', 'spmb-smk', 'spmb-comparison', 
                         'agenda', 'agenda-list', 'input-data', 'gallery', 'data-spmb', 'settings'];
        
        navItems.forEach(item => {
            const el = document.getElementById(`nav-${item}`);
            if (el) {
                el.className = 'flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/10 text-white/70 hover:text-white transition-all duration-200';
            }
        });
        
        const activeNav = document.getElementById(`nav-${page}`);
        if (activeNav) {
            activeNav.className = 'flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#f97316] text-white transition-all duration-200';
        }
        
        // Close mobile sidebar
        if (window.innerWidth < 1024) {
            document.getElementById('sidebar')?.classList.add('-translate-x-full');
            document.getElementById('sidebar-overlay')?.classList.add('hidden');
        }
        
        // Load page content
        this.loadPageContent(page);
    }
    
    refreshCurrentPage() {
        this.loadPageContent(this.currentPage);
    }
    
    // ============================================
    // RENDER DASHBOARD - MODERN CARDS
    // ============================================
    
    loadPageContent(page) {
        const contentArea = document.getElementById('content-area');
        if (!contentArea) return;
        
        switch(page) {
            case 'dashboard':
                contentArea.innerHTML = this.renderDashboard();
                break;
            case 'spmb-smp':
                contentArea.innerHTML = this.renderSPMBPage('SMP');
                break;
            case 'spmb-smk':
                contentArea.innerHTML = this.renderSPMBPage('SMK');
                break;
            case 'input-data':
                contentArea.innerHTML = this.renderInputForm();
                break;
            default:
                contentArea.innerHTML = this.renderDashboard();
        }
        
        // Re-initialize icons and charts
        setTimeout(() => {
            if (window.FontAwesome) {
                // Font Awesome already loaded via CDN
            }
        }, 100);
    }
    
    renderDashboard() {
        const smp = this.data.spmb.SMP;
        const smk = this.data.spmb.SMK;
        const periodeDef = CONFIG.PERIODE_DEFINITIONS[this.currentYear] || 
                         CONFIG.PERIODE_DEFINITIONS['2026/2027'];
        
        // Cek apakah ada data
        const hasData = smp.total.pendaftar > 0 || smk.total.pendaftar > 0;
        
        return `
            <div class="space-y-8">
                <!-- HEADER SECTION -->
                <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <div class="flex items-center gap-3 mb-2">
                            <span class="text-xs font-semibold text-[#f97316] bg-orange-100 px-3 py-1.5 rounded-full">
                                <i class="fas fa-circle-nodes mr-1"></i> REAL-TIME DATA
                            </span>
                            <span class="text-xs text-gray-500 bg-white px-3 py-1.5 rounded-full shadow-sm">
                                <i class="far fa-clock mr-1"></i> ${new Date().toLocaleTimeString('id-ID')}
                            </span>
                        </div>
                        <h1 class="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
                            Dashboard <span class="gradient-text">Monitoring</span>
                        </h1>
                        <p class="text-gray-500 text-sm mt-2 flex items-center gap-2">
                            <i class="fas fa-circle-info text-[#f97316]"></i>
                            Tahun Ajaran ${this.currentYear} • Data dari Google Spreadsheet
                            ${!hasData ? '<span class="text-orange-600 bg-orange-50 px-3 py-1 rounded-full text-xs font-medium ml-2">Belum ada data</span>' : ''}
                        </p>
                    </div>
                    
                    <div class="flex items-center gap-3">
                        <select id="academic-year-select" 
                                class="px-5 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium focus:border-[#f97316] focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all duration-200 shadow-sm">
                            ${CONFIG.ACADEMIC_YEARS.map(year => `
                                <option value="${year}" ${year === this.currentYear ? 'selected' : ''}>
                                    TA ${year}
                                </option>
                            `).join('')}
                        </select>
                        
                        <button onclick="app.testConnection()" 
                                class="px-5 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:border-[#f97316] hover:text-[#f97316] transition-all duration-200 shadow-sm flex items-center gap-2">
                            <i class="fas fa-wifi"></i>
                            <span class="hidden md:inline">Test Koneksi</span>
                        </button>
                        
                        <button onclick="app.refreshData()" 
                                class="px-5 py-3 bg-gradient-to-r from-[#f97316] to-[#f59e0b] text-white rounded-xl font-medium hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-200 flex items-center gap-2">
                            <i class="fas fa-rotate"></i>
                            <span class="hidden md:inline">Refresh</span>
                        </button>
                    </div>
                </div>

                <!-- PERIODE INFO CARD -->
                <div class="bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-3xl p-6 text-white shadow-2xl">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                            <i class="fas fa-calendar-alt text-2xl text-[#f97316]"></i>
                        </div>
                        <div class="flex-1">
                            <h3 class="text-lg font-semibold mb-2">Tahun Ajaran ${this.currentYear}</h3>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div class="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2">
                                    <span class="w-2 h-2 bg-emerald-400 rounded-full"></span>
                                    <span class="text-gray-300">Early Bird:</span>
                                    <span class="font-medium text-white">${periodeDef?.earlybird?.label || '21 Nov - 31 Jan'}</span>
                                </div>
                                <div class="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2">
                                    <span class="w-2 h-2 bg-blue-400 rounded-full"></span>
                                    <span class="text-gray-300">Gelombang 1:</span>
                                    <span class="font-medium text-white">${periodeDef?.gelombang1?.label || '01 Feb - 30 Apr'}</span>
                                </div>
                                <div class="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2">
                                    <span class="w-2 h-2 bg-purple-400 rounded-full"></span>
                                    <span class="text-gray-300">Gelombang 2:</span>
                                    <span class="font-medium text-white">${periodeDef?.gelombang2?.label || '01 Mei - 15 Jul'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SMP STATS CARDS -->
                <div>
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <i class="fas fa-school text-[#3b82f6]"></i>
                            SMP
                        </h2>
                        <span class="text-sm text-gray-500">
                            <i class="fas fa-users mr-1"></i> Total Pendaftar: ${smp.total.pendaftar}
                        </span>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        ${this.renderStatCard(
                            'Total Pendaftar', 
                            smp.total.pendaftar, 
                            'Calon siswa',
                            'fas fa-users',
                            'from-blue-500 to-blue-600',
                            'blue'
                        )}
                        ${this.renderStatCard(
                            'Bayar Formulir', 
                            smp.total.formulir, 
                            `${smp.total.pendaftar > 0 ? ((smp.total.formulir / smp.total.pendaftar) * 100).toFixed(1) : 0}% dari pendaftar`,
                            'fas fa-file-invoice',
                            'from-yellow-500 to-orange-500',
                            'yellow'
                        )}
                        ${this.renderStatCard(
                            'Bayar DSP', 
                            smp.total.dsp, 
                            `${smp.total.pendaftar > 0 ? ((smp.total.dsp / smp.total.pendaftar) * 100).toFixed(1) : 0}% dari pendaftar`,
                            'fas fa-credit-card',
                            'from-emerald-500 to-teal-500',
                            'emerald'
                        )}
                        ${this.renderStatCard(
                            'Konversi ke DSP', 
                            smp.total.formulir > 0 ? ((smp.total.dsp / smp.total.formulir) * 100).toFixed(1) + '%' : '0%', 
                            `${smp.total.dsp} dari ${smp.total.formulir} formulir`,
                            'fas fa-chart-line',
                            'from-purple-500 to-pink-500',
                            'purple'
                        )}
                    </div>
                    
                    <!-- SMP Periode Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
                        ${this.renderPeriodeCard('Early Bird', 'earlybird', smp.earlybird, 'emerald')}
                        ${this.renderPeriodeCard('Gelombang 1', 'gelombang1', smp.gelombang1, 'blue')}
                        ${this.renderPeriodeCard('Gelombang 2', 'gelombang2', smp.gelombang2, 'purple')}
                    </div>
                </div>

                <!-- SMK STATS CARDS -->
                <div class="mt-8">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <i class="fas fa-graduation-cap text-[#8b5cf6]"></i>
                            SMK
                        </h2>
                        <span class="text-sm text-gray-500">
                            <i class="fas fa-users mr-1"></i> Total Pendaftar: ${smk.total.pendaftar}
                        </span>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        ${this.renderStatCard(
                            'Total Pendaftar', 
                            smk.total.pendaftar, 
                            'Calon siswa',
                            'fas fa-users',
                            'from-purple-500 to-pink-600',
                            'purple'
                        )}
                        ${this.renderStatCard(
                            'Bayar Formulir', 
                            smk.total.formulir, 
                            `${smk.total.pendaftar > 0 ? ((smk.total.formulir / smk.total.pendaftar) * 100).toFixed(1) : 0}% dari pendaftar`,
                            'fas fa-file-invoice',
                            'from-yellow-500 to-orange-500',
                            'yellow'
                        )}
                        ${this.renderStatCard(
                            'Bayar DSP', 
                            smk.total.dsp, 
                            `${smk.total.pendaftar > 0 ? ((smk.total.dsp / smk.total.pendaftar) * 100).toFixed(1) : 0}% dari pendaftar`,
                            'fas fa-credit-card',
                            'from-emerald-500 to-teal-500',
                            'emerald'
                        )}
                        ${this.renderStatCard(
                            'Konversi ke DSP', 
                            smk.total.formulir > 0 ? ((smk.total.dsp / smk.total.formulir) * 100).toFixed(1) + '%' : '0%', 
                            `${smk.total.dsp} dari ${smk.total.formulir} formulir`,
                            'fas fa-chart-line',
                            'from-indigo-500 to-blue-600',
                            'indigo'
                        )}
                    </div>
                    
                    <!-- SMK Periode Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
                        ${this.renderPeriodeCard('Early Bird', 'earlybird', smk.earlybird, 'emerald')}
                        ${this.renderPeriodeCard('Gelombang 1', 'gelombang1', smk.gelombang1, 'blue')}
                        ${this.renderPeriodeCard('Gelombang 2', 'gelombang2', smk.gelombang2, 'purple')}
                    </div>
                </div>

                <!-- RECENT AGENDA & PHOTOS -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                    ${this.renderRecentAgenda()}
                    ${this.renderRecentPhotos()}
                </div>
                
                <!-- NO DATA MESSAGE -->
                ${!hasData ? `
                <div class="no-data p-12 text-center">
                    <div class="w-20 h-20 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-database text-3xl text-[#f97316]"></i>
                    </div>
                    <h3 class="text-gray-900 text-lg font-semibold mb-2">Belum Ada Data</h3>
                    <p class="text-gray-500 text-sm mb-4">Spreadsheet masih kosong. Silakan input data SPMB pertama Anda.</p>
                    <button onclick="app.navigateTo('input-data')" 
                            class="px-6 py-3 bg-gradient-to-r from-[#f97316] to-[#f59e0b] text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 inline-flex items-center gap-2">
                        <i class="fas fa-plus-circle"></i>
                        Input Data Sekarang
                    </button>
                </div>
                ` : ''}
            </div>
        `;
    }
    
    renderStatCard(title, value, subtitle, icon, gradient, color) {
        const colorClasses = {
            blue: 'text-blue-600 bg-blue-100',
            yellow: 'text-yellow-600 bg-yellow-100',
            emerald: 'text-emerald-600 bg-emerald-100',
            purple: 'text-purple-600 bg-purple-100',
            indigo: 'text-indigo-600 bg-indigo-100'
        };
        
        return `
            <div class="stat-card p-6 flex flex-col">
                <div class="flex items-start justify-between mb-3">
                    <span class="text-gray-500 text-sm font-medium">${title}</span>
                    <div class="w-10 h-10 ${colorClasses[color]} rounded-xl flex items-center justify-center">
                        <i class="${icon}"></i>
                    </div>
                </div>
                <div class="mt-2">
                    <span class="text-3xl font-bold text-gray-900">${typeof value === 'number' ? value.toLocaleString() : value}</span>
                    <span class="text-xs text-gray-500 ml-2">${subtitle}</span>
                </div>
                <div class="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r ${gradient} rounded-full" style="width: ${title.includes('Konversi') ? value : (value > 0 ? Math.min(100, value) : 0)}%"></div>
                </div>
            </div>
        `;
    }
    
    renderPeriodeCard(title, periode, data, color) {
        const colorClasses = {
            emerald: 'border-emerald-200 bg-emerald-50',
            blue: 'border-blue-200 bg-blue-50',
            purple: 'border-purple-200 bg-purple-50'
        };
        
        const iconColors = {
            emerald: 'text-emerald-600',
            blue: 'text-blue-600',
            purple: 'text-purple-600'
        };
        
        return `
            <div class="bg-white rounded-2xl p-5 border ${colorClasses[color]} shadow-sm hover:shadow-md transition-all duration-200">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-8 h-8 ${iconColors[color]} bg-white rounded-lg flex items-center justify-center">
                        <i class="fas fa-calendar-check"></i>
                    </div>
                    <h4 class="font-semibold text-gray-900">${title}</h4>
                </div>
                <div class="grid grid-cols-3 gap-2 text-center">
                    <div class="p-2">
                        <p class="text-xs text-gray-500 mb-1">Pendaftar</p>
                        <p class="text-lg font-bold text-gray-900">${data.pendaftar}</p>
                    </div>
                    <div class="p-2">
                        <p class="text-xs text-gray-500 mb-1">Formulir</p>
                        <p class="text-lg font-bold text-amber-600">${data.formulir}</p>
                    </div>
                    <div class="p-2">
                        <p class="text-xs text-gray-500 mb-1">DSP</p>
                        <p class="text-lg font-bold text-emerald-600">${data.dsp}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderRecentAgenda() {
        const agendas = this.data.agenda || [];
        const recent = agendas.slice(0, 5);
        
        return `
            <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <i class="fas fa-calendar-alt text-[#f97316]"></i>
                        Agenda Terbaru
                    </h3>
                    <a href="#" data-page="agenda-list" onclick="app.navigateTo('agenda-list'); return false;" 
                       class="text-sm text-[#f97316] hover:text-[#f59e0b] font-medium flex items-center gap-1">
                        Lihat Semua
                        <i class="fas fa-arrow-right text-xs"></i>
                    </a>
                </div>
                
                ${recent.length > 0 ? `
                <div class="space-y-4">
                    ${recent.map(agenda => {
                        const statusColors = {
                            completed: 'bg-emerald-100 text-emerald-700',
                            ongoing: 'bg-blue-100 text-blue-700',
                            scheduled: 'bg-gray-100 text-gray-700'
                        };
                        const statusIcons = {
                            completed: 'fa-circle-check',
                            ongoing: 'fa-spinner',
                            scheduled: 'fa-clock'
                        };
                        const statusText = {
                            completed: 'Selesai',
                            ongoing: 'Berlangsung',
                            scheduled: 'Terjadwal'
                        };
                        const status = agenda.status || 'scheduled';
                        
                        return `
                            <div class="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition-all duration-200">
                                <div class="w-10 h-10 ${statusColors[status]} rounded-xl flex items-center justify-center flex-shrink-0">
                                    <i class="fas ${statusIcons[status]}"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="font-semibold text-gray-900 text-sm mb-1">${agenda.kegiatan || 'Tanpa Judul'}</p>
                                    <div class="flex items-center gap-3 text-xs text-gray-500">
                                        <span><i class="far fa-calendar mr-1"></i>${agenda.tanggal || '-'}</span>
                                        <span><i class="far fa-location-dot mr-1"></i>${agenda.lokasi || '-'}</span>
                                    </div>
                                </div>
                                <span class="text-xs px-2 py-1 rounded-full ${statusColors[status]}">${statusText[status]}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
                ` : `
                <div class="text-center py-12">
                    <div class="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <i class="fas fa-calendar-xmark text-2xl text-gray-400"></i>
                    </div>
                    <p class="text-gray-500 text-sm">Belum ada agenda</p>
                    <p class="text-xs text-gray-400 mt-1">Agenda akan muncul setelah diinput</p>
                </div>
                `}
            </div>
        `;
    }
    
    renderRecentPhotos() {
        const photos = this.data.photos || [];
        const recent = photos.slice(0, 4);
        
        return `
            <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <i class="fas fa-images text-[#f97316]"></i>
                        Foto Terbaru
                    </h3>
                    <a href="#" data-page="gallery" onclick="app.navigateTo('gallery'); return false;" 
                       class="text-sm text-[#f97316] hover:text-[#f59e0b] font-medium flex items-center gap-1">
                        Lihat Semua
                        <i class="fas fa-arrow-right text-xs"></i>
                    </a>
                </div>
                
                ${recent.length > 0 ? `
                <div class="grid grid-cols-2 gap-3">
                    ${recent.map(photo => `
                        <div class="relative group cursor-pointer rounded-xl overflow-hidden" onclick="window.open('${photo.url}', '_blank')">
                            <img src="${photo.url}" alt="${photo.kegiatan}" 
                                 class="w-full h-28 object-cover group-hover:scale-110 transition-all duration-300"
                                 onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
                            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end p-3">
                                <p class="text-white text-xs font-medium truncate">${photo.kegiatan || 'Foto'}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ` : `
                <div class="text-center py-12">
                    <div class="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <i class="fas fa-image text-2xl text-gray-400"></i>
                    </div>
                    <p class="text-gray-500 text-sm">Belum ada foto</p>
                    <p class="text-xs text-gray-400 mt-1">Foto akan muncul setelah diupload</p>
                </div>
                `}
            </div>
        `;
    }
    
    renderSPMBPage(unit) {
        const data = this.data.spmb[unit];
        const periodeDef = CONFIG.PERIODE_DEFINITIONS[this.currentYear];
        
        return `
            <div class="space-y-6">
                <!-- Header -->
                <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <div class="flex items-center gap-3 mb-2">
                            <span class="text-xs font-semibold text-[#f97316] bg-orange-100 px-3 py-1.5 rounded-full">
                                <i class="fas fa-circle-nodes mr-1"></i> SPMB ${unit}
                            </span>
                        </div>
                        <h1 class="text-3xl font-bold text-gray-900 tracking-tight">
                            Monitoring Penerimaan ${unit}
                        </h1>
                        <p class="text-gray-500 text-sm mt-2">
                            Tahun Ajaran ${this.currentYear} • Data dari Google Spreadsheet
                        </p>
                    </div>
                    
                    <button onclick="app.navigateTo('input-data')" 
                            class="px-6 py-3 bg-gradient-to-r from-[#f97316] to-[#f59e0b] text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 flex items-center gap-2">
                        <i class="fas fa-plus-circle"></i>
                        Input Data ${unit}
                    </button>
                </div>
                
                <!-- Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    ${this.renderStatCard(
                        'Total Pendaftar', 
                        data.total.pendaftar, 
                        'Calon siswa',
                        'fas fa-users',
                        unit === 'SMP' ? 'from-blue-500 to-blue-600' : 'from-purple-500 to-pink-600',
                        unit === 'SMP' ? 'blue' : 'purple'
                    )}
                    ${this.renderStatCard(
                        'Bayar Formulir', 
                        data.total.formulir, 
                        `${data.total.pendaftar > 0 ? ((data.total.formulir / data.total.pendaftar) * 100).toFixed(1) : 0}% dari pendaftar`,
                        'fas fa-file-invoice',
                        'from-yellow-500 to-orange-500',
                        'yellow'
                    )}
                    ${this.renderStatCard(
                        'Bayar DSP', 
                        data.total.dsp, 
                        `${data.total.pendaftar > 0 ? ((data.total.dsp / data.total.pendaftar) * 100).toFixed(1) : 0}% dari pendaftar`,
                        'fas fa-credit-card',
                        'from-emerald-500 to-teal-500',
                        'emerald'
                    )}
                    ${this.renderStatCard(
                        'Konversi ke DSP', 
                        data.total.formulir > 0 ? ((data.total.dsp / data.total.formulir) * 100).toFixed(1) + '%' : '0%', 
                        `${data.total.dsp} dari ${data.total.formulir} formulir`,
                        'fas fa-chart-line',
                        'from-indigo-500 to-blue-600',
                        'indigo'
                    )}
                </div>
                
                <!-- Periode Details -->
                <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                    <h3 class="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <i class="fas fa-calendar-alt text-[#f97316]"></i>
                        Detail per Periode
                    </h3>
                    
                    <div class="space-y-6">
                        ${['earlybird', 'gelombang1', 'gelombang2'].map(periode => {
                            const periodeLabels = {
                                earlybird: 'Early Bird',
                                gelombang1: 'Gelombang 1',
                                gelombang2: 'Gelombang 2'
                            };
                            const periodeDates = {
                                earlybird: periodeDef?.earlybird?.label || '21 Nov - 31 Jan',
                                gelombang1: periodeDef?.gelombang1?.label || '01 Feb - 30 Apr',
                                gelombang2: periodeDef?.gelombang2?.label || '01 Mei - 15 Jul'
                            };
                            const colors = {
                                earlybird: 'border-emerald-200 bg-emerald-50',
                                gelombang1: 'border-blue-200 bg-blue-50',
                                gelombang2: 'border-purple-200 bg-purple-50'
                            };
                            
                            return `
                                <div class="border ${colors[periode]} rounded-2xl p-5">
                                    <div class="flex items-center justify-between mb-4">
                                        <div class="flex items-center gap-2">
                                            <span class="font-semibold text-gray-900">${periodeLabels[periode]}</span>
                                            <span class="text-xs text-gray-500">${periodeDates[periode]}</span>
                                        </div>
                                    </div>
                                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div class="bg-gray-50 rounded-xl p-4">
                                            <p class="text-xs text-gray-500 mb-1">Total Pendaftar</p>
                                            <p class="text-2xl font-bold text-gray-900">${data[periode]?.pendaftar || 0}</p>
                                        </div>
                                        <div class="bg-gray-50 rounded-xl p-4">
                                            <p class="text-xs text-gray-500 mb-1">Bayar Formulir</p>
                                            <p class="text-2xl font-bold text-amber-600">${data[periode]?.formulir || 0}</p>
                                            <p class="text-xs text-gray-500 mt-1">
                                                ${data[periode]?.pendaftar > 0 ? ((data[periode]?.formulir / data[periode]?.pendaftar) * 100).toFixed(1) : 0}%
                                            </p>
                                        </div>
                                        <div class="bg-gray-50 rounded-xl p-4">
                                            <p class="text-xs text-gray-500 mb-1">Bayar DSP</p>
                                            <p class="text-2xl font-bold text-emerald-600">${data[periode]?.dsp || 0}</p>
                                            <p class="text-xs text-gray-500 mt-1">
                                                ${data[periode]?.pendaftar > 0 ? ((data[periode]?.dsp / data[periode]?.pendaftar) * 100).toFixed(1) : 0}%
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    renderInputForm() {
        const today = new Date().toISOString().split('T')[0];
        
        return `
            <div class="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900 tracking-tight mb-2">Input Data Baru</h1>
                    <p class="text-gray-500 text-sm">Data akan langsung tersimpan ke Google Spreadsheet</p>
                </div>
                
                <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                    <!-- Tabs -->
                    <div class="flex flex-wrap gap-2 border-b border-gray-200 pb-4 mb-6">
                        <button onclick="app.switchTab('spmb')" id="tab-spmb" 
                                class="tab-btn px-5 py-2.5 rounded-xl bg-[#f97316] text-white font-medium flex items-center gap-2">
                            <i class="fas fa-users"></i>
                            Data SPMB
                        </button>
                        <button onclick="app.switchTab('agenda')" id="tab-agenda" 
                                class="tab-btn px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:border-[#f97316] hover:text-[#f97316] flex items-center gap-2">
                            <i class="fas fa-calendar"></i>
                            Agenda
                        </button>
                        <button onclick="app.switchTab('photo')" id="tab-photo" 
                                class="tab-btn px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:border-[#f97316] hover:text-[#f97316] flex items-center gap-2">
                            <i class="fas fa-camera"></i>
                            Foto
                        </button>
                    </div>
                    
                    <!-- Form SPMB -->
                    <div id="form-spmb">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Form Input SPMB</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                                <select id="input-unit" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#f97316] focus:ring-2 focus:ring-orange-500/20 focus:outline-none">
                                    <option value="SMP">SMP</option>
                                    <option value="SMK">SMK</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Tahun Ajaran</label>
                                <select id="input-tahun-ajaran" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#f97316] focus:ring-2 focus:ring-orange-500/20 focus:outline-none">
                                    ${CONFIG.ACADEMIC_YEARS.map(year => `
                                        <option value="${year}" ${year === this.currentYear ? 'selected' : ''}>${year}</option>
                                    `).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Periode</label>
                                <select id="input-periode" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#f97316] focus:ring-2 focus:ring-orange-500/20 focus:outline-none">
                                    <option value="earlybird">Early Bird</option>
                                    <option value="gelombang1">Gelombang 1</option>
                                    <option value="gelombang2">Gelombang 2</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal Input</label>
                                <input type="date" id="input-tanggal" value="${today}" 
                                       class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#f97316] focus:ring-2 focus:ring-orange-500/20 focus:outline-none">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <span class="text-red-500">*</span> Jumlah Pendaftar
                                </label>
                                <input type="number" id="input-pendaftar" min="0" placeholder="0" 
                                       class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#f97316] focus:ring-2 focus:ring-orange-500/20 focus:outline-none">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Bayar Formulir</label>
                                <input type="number" id="input-formulir" min="0" placeholder="0" 
                                       class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#f97316] focus:ring-2 focus:ring-orange-500/20 focus:outline-none">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Bayar DSP</label>
                                <input type="number" id="input-dsp" min="0" placeholder="0" 
                                       class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#f97316] focus:ring-2 focus:ring-orange-500/20 focus:outline-none">
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Keterangan</label>
                                <textarea id="input-keterangan" rows="3" placeholder="Contoh: Pendaftar jalur reguler, prestasi, dll." 
                                          class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#f97316] focus:ring-2 focus:ring-orange-500/20 focus:outline-none"></textarea>
                            </div>
                        </div>
                        
                        <div class="mt-6 flex gap-3">
                            <button id="btn-save-spmb" 
                                    class="px-6 py-3 bg-gradient-to-r from-[#f97316] to-[#f59e0b] text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 flex items-center gap-2">
                                <i class="fas fa-save"></i>
                                Simpan ke Spreadsheet
                            </button>
                            <button type="button" onclick="this.form.reset()" 
                                    class="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200">
                                Reset
                            </button>
                        </div>
                    </div>
                    
                    <!-- Form Agenda (Hidden) -->
                    <div id="form-agenda" class="hidden">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Form Input Agenda</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal</label>
                                <input type="date" id="agenda-tanggal" value="${today}" 
                                       class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#f97316] focus:ring-2 focus:ring-orange-500/20 focus:outline-none">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                                <select id="agenda-kategori" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#f97316] focus:ring-2 focus:ring-orange-500/20 focus:outline-none">
                                    ${CONFIG.AGENDA_CATEGORIES.map(cat => `
                                        <option value="${cat}">${cat}</option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Nama Kegiatan</label>
                                <input type="text" id="agenda-kegiatan" placeholder="Contoh: Open House SMP" 
                                       class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#f97316] focus:ring-2 focus:ring-orange-500/20 focus:outline-none">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Lokasi</label>
                                <input type="text" id="agenda-lokasi" placeholder="Contoh: Aula Utama" 
                                       class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#f97316] focus:ring-2 focus:ring-orange-500/20 focus:outline-none">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Penanggung Jawab</label>
                                <input type="text" id="agenda-pj" value="${window.auth?.currentUser?.name || ''}" 
                                       class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#f97316] focus:ring-2 focus:ring-orange-500/20 focus:outline-none">
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                                <textarea id="agenda-deskripsi" rows="3" placeholder="Deskripsi lengkap kegiatan..." 
                                          class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#f97316] focus:ring-2 focus:ring-orange-500/20 focus:outline-none"></textarea>
                            </div>
                        </div>
                        <div class="mt-6">
                            <button id="btn-save-agenda" 
                                    class="px-6 py-3 bg-gradient-to-r from-[#f97316] to-[#f59e0b] text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 flex items-center gap-2">
                                <i class="fas fa-save"></i>
                                Simpan Agenda
                            </button>
                        </div>
                    </div>
                    
                    <!-- Form Foto (Hidden) -->
                    <div id="form-photo" class="hidden">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Form Upload Foto</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal</label>
                                <input type="date" id="photo-tanggal" value="${today}" 
                                       class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#f97316] focus:ring-2 focus:ring-orange-500/20 focus:outline-none">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Kegiatan</label>
                                <input type="text" id="photo-kegiatan" placeholder="Nama kegiatan" 
                                       class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#f97316] focus:ring-2 focus:ring-orange-500/20 focus:outline-none">
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 mb-2">URL Foto</label>
                                <input type="url" id="photo-url" placeholder="https://example.com/foto.jpg" 
                                       class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#f97316] focus:ring-2 focus:ring-orange-500/20 focus:outline-none">
                                <p class="text-xs text-gray-500 mt-1">Gunakan link dari Google Drive, Imgur, atau hosting lainnya</p>
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                                <textarea id="photo-deskripsi" rows="2" placeholder="Deskripsi foto..." 
                                          class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#f97316] focus:ring-2 focus:ring-orange-500/20 focus:outline-none"></textarea>
                            </div>
                        </div>
                        <div class="mt-6">
                            <button id="btn-save-photo" 
                                    class="px-6 py-3 bg-gradient-to-r from-[#f97316] to-[#f59e0b] text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 flex items-center gap-2">
                                <i class="fas fa-upload"></i>
                                Upload Foto
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- API Status Card -->
                <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                    <div class="flex items-start gap-4">
                        <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <i class="fas fa-cloud text-blue-600 text-xl"></i>
                        </div>
                        <div>
                            <h4 class="font-semibold text-gray-900 mb-1">Status Koneksi Spreadsheet</h4>
                            <p class="text-sm text-gray-500 mb-2">
                                ${this.apiAvailable ? 
                                    '<span class="text-emerald-600"><i class="fas fa-circle-check mr-1"></i> Terhubung</span>' : 
                                    '<span class="text-amber-600"><i class="fas fa-circle-exclamation mr-1"></i> Belum terkonfigurasi</span>'}
                            </p>
                            <p class="text-xs text-gray-400">
                                Web App URL: ${CONFIG.WEB_APP_URL && !CONFIG.WEB_APP_URL.includes('YOUR_SCRIPT_ID') ? 
                                    '<span class="text-gray-600">✓ Terkonfigurasi</span>' : 
                                    '<span class="text-red-500">⚠️ Edit config.js terlebih dahulu</span>'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // ============================================
    // DATA SAVE FUNCTIONS - KIRIM KE SPREADSHEET
    // ============================================
    
    async saveSPMBData() {
        const unit = document.getElementById('input-unit')?.value;
        const tahunAjaran = document.getElementById('input-tahun-ajaran')?.value;
        const periode = document.getElementById('input-periode')?.value;
        const tanggal = document.getElementById('input-tanggal')?.value;
        const pendaftar = document.getElementById('input-pendaftar')?.value;
        const formulir = document.getElementById('input-formulir')?.value;
        const dsp = document.getElementById('input-dsp')?.value;
        const keterangan = document.getElementById('input-keterangan')?.value;
        
        // Validasi
        if (!pendaftar || parseInt(pendaftar) <= 0) {
            this.showNotification('❌ Jumlah pendaftar harus diisi dan lebih dari 0', 'error');
            return;
        }
        
        const data = {
            unit: unit,
            tahun_ajaran: tahunAjaran,
            periode: periode,
            tanggal_input: tanggal,
            jumlah_pendaftar: parseInt(pendaftar) || 0,
            jumlah_bayar_formulir: parseInt(formulir) || 0,
            jumlah_bayar_dsp: parseInt(dsp) || 0,
            keterangan: keterangan || ''
        };
        
        const sheetName = unit === 'SMP' ? CONFIG.SHEETS.SPMB_SMP : CONFIG.SHEETS.SPMB_SMK;
        
        this.showNotification('📤 Menyimpan data ke spreadsheet...', 'info');
        
        const result = await this.saveToAPI(sheetName, data);
        
        if (result.success) {
            // Clear form
            document.getElementById('input-pendaftar').value = '';
            document.getElementById('input-formulir').value = '';
            document.getElementById('input-dsp').value = '';
            document.getElementById('input-keterangan').value = '';
            
            this.showNotification('✅ Data SPMB berhasil disimpan ke spreadsheet', 'success');
        }
    }
    
    async saveAgendaData() {
        const tanggal = document.getElementById('agenda-tanggal')?.value;
        const kegiatan = document.getElementById('agenda-kegiatan')?.value;
        const lokasi = document.getElementById('agenda-lokasi')?.value;
        const kategori = document.getElementById('agenda-kategori')?.value;
        const pj = document.getElementById('agenda-pj')?.value;
        const deskripsi = document.getElementById('agenda-deskripsi')?.value;
        
        if (!tanggal || !kegiatan || !lokasi || !pj) {
            this.showNotification('❌ Semua field wajib diisi', 'error');
            return;
        }
        
        const data = {
            tanggal: tanggal,
            kegiatan: kegiatan,
            lokasi: lokasi,
            kategori: kategori,
            status: 'scheduled',
            penanggung_jawab: pj,
            deskripsi: deskripsi || ''
        };
        
        this.showNotification('📤 Menyimpan agenda ke spreadsheet...', 'info');
        
        const result = await this.saveToAPI(CONFIG.SHEETS.AGENDA, data);
        
        if (result.success) {
            document.getElementById('agenda-kegiatan').value = '';
            document.getElementById('agenda-lokasi').value = '';
            document.getElementById('agenda-deskripsi').value = '';
            
            this.showNotification('✅ Agenda berhasil disimpan ke spreadsheet', 'success');
        }
    }
    
    async savePhotoData() {
        const tanggal = document.getElementById('photo-tanggal')?.value;
        const kegiatan = document.getElementById('photo-kegiatan')?.value;
        const url = document.getElementById('photo-url')?.value;
        const deskripsi = document.getElementById('photo-deskripsi')?.value;
        
        if (!tanggal || !kegiatan || !url) {
            this.showNotification('❌ Tanggal, kegiatan, dan URL foto wajib diisi', 'error');
            return;
        }
        
        const data = {
            tanggal: tanggal,
            kegiatan: kegiatan,
            url: url,
            deskripsi: deskripsi || ''
        };
        
        this.showNotification('📤 Menyimpan foto ke spreadsheet...', 'info');
        
        const result = await this.saveToAPI(CONFIG.SHEETS.FOTO, data);
        
        if (result.success) {
            document.getElementById('photo-kegiatan').value = '';
            document.getElementById('photo-url').value = '';
            document.getElementById('photo-deskripsi').value = '';
            
            this.showNotification('✅ Foto berhasil disimpan ke spreadsheet', 'success');
        }
    }
    
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    switchTab(tab) {
        const tabs = ['spmb', 'agenda', 'photo'];
        
        tabs.forEach(t => {
            const btn = document.getElementById(`tab-${t}`);
            const form = document.getElementById(`form-${t}`);
            
            if (t === tab) {
                if (btn) {
                    btn.className = 'tab-btn px-5 py-2.5 rounded-xl bg-[#f97316] text-white font-medium flex items-center gap-2';
                }
                if (form) {
                    form.classList.remove('hidden');
                }
            } else {
                if (btn) {
                    btn.className = 'tab-btn px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:border-[#f97316] hover:text-[#f97316] flex items-center gap-2';
                }
                if (form) {
                    form.classList.add('hidden');
                }
            }
        });
    }
    
    showNotification(message, type = 'info') {
        if (window.auth) {
            window.auth.showNotification(message, type);
        } else {
            alert(message);
        }
    }
    
    showLoading(show) {
        const loading = document.getElementById('loading-screen');
        if (loading) {
            if (show) {
                loading.style.opacity = '1';
                loading.style.display = 'flex';
            } else {
                loading.style.opacity = '0';
                setTimeout(() => {
                    loading.style.display = 'none';
                }, 500);
            }
        }
    }
    
    refreshData() {
        this.showNotification('🔄 Menyegarkan data dari spreadsheet...', 'info');
        this.loadData();
    }
    
    testConnection() {
        return this.testConnection();
    }
    
    handleLogout() {
        if (window.auth) {
            window.auth.handleLogout();
        }
    }
}

// ============================================
// INITIALIZE APP
// ============================================
window.app = new SPMBApp();
