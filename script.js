// ============================================
// SPMB APP - DENGAN DEBUGGING LENGKAP
// ============================================

class SPMBApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.currentYear = CONFIG.DEFAULT_ACADEMIC_YEAR || '2026/2027';
        
        // Data awal kosong
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
        this.debugMode = true; // DEBUG MODE ON
        
        this.init();
    }
    
    init() {
        console.log('%c🚀 SPMB App Initialized', 'color: orange; font-size: 16px; font-weight: bold');
        console.log('📋 CONFIG:', CONFIG);
        console.log('📋 Web App URL:', CONFIG.WEB_APP_URL);
        console.log('📋 Spreadsheet ID:', CONFIG.SPREADSHEET_ID);
        
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
    
    // ============================================
    // API FUNCTIONS - DENGAN DEBUGGING
    // ============================================
    
    async fetchFromAPI(action, params = {}) {
        try {
            // CEK APAKAH WEB APP URL SUDAH DIKONFIGURASI
            if (!CONFIG.WEB_APP_URL || CONFIG.WEB_APP_URL.includes('YOUR_SCRIPT_ID')) {
                console.error('❌ WEB_APP_URL belum dikonfigurasi!');
                console.error('   Buka config.js dan ganti YOUR_SCRIPT_ID dengan URL Web App Anda');
                return { success: false, error: 'API not configured' };
            }
            
            const url = new URL(CONFIG.WEB_APP_URL);
            url.searchParams.append('action', action);
            
            Object.keys(params).forEach(key => {
                url.searchParams.append(key, params[key]);
            });
            
            // Cache busting
            url.searchParams.append('_', Date.now());
            
            console.log(`📡 Fetching from API: ${action}`);
            console.log(`   URL: ${url.toString()}`);
            
            const response = await fetch(url.toString(), {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            console.log(`📡 Response status: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('📦 API Response:', data);
            
            if (data.success) {
                this.apiAvailable = true;
                console.log('✅ API connected successfully!');
            } else {
                console.error('❌ API returned error:', data.error);
                this.apiAvailable = false;
            }
            
            return data;
            
        } catch (error) {
            console.error('❌ API Fetch Error:', error);
            console.error('   Possible causes:');
            console.error('   1. Web App URL salah atau belum di-deploy');
            console.error('   2. CORS issue - pastikan Web App di-set ke "Anyone" access');
            console.error('   3. Spreadsheet ID salah');
            console.error('   4. Script error di Google Apps Script');
            
            this.apiAvailable = false;
            return { success: false, error: error.message };
        }
    }
    
    async loadData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading(true);
        
        console.log('%c📊 LOADING DATA FROM SPREADSHEET...', 'color: blue; font-weight: bold');
        console.log(`   Tahun Ajaran: ${this.currentYear}`);
        
        try {
            // RESET DATA KE 0
            this.resetData();
            
            // Ambil data dari spreadsheet
            const response = await this.fetchFromAPI('getAll');
            
            if (response && response.success && response.data) {
                console.log('%c✅ Data successfully loaded from spreadsheet!', 'color: green; font-weight: bold');
                console.log('📊 Raw data from spreadsheet:', response.data);
                
                // CEK DATA SPMB SMP
                if (response.data.spmb_smp && Array.isArray(response.data.spmb_smp)) {
                    console.log(`   📊 SPMB SMP: ${response.data.spmb_smp.length} rows`);
                    console.log('   Sample:', response.data.spmb_smp.slice(0, 2));
                    this.processSPMBData('SMP', response.data.spmb_smp);
                } else {
                    console.warn('   ⚠️ No SPMB SMP data found or wrong format');
                    console.warn('      Expected sheet name: SPMB_SMP');
                    console.warn('      Expected fields: unit, tahun_ajaran, periode, jumlah_pendaftar, dll');
                }
                
                // CEK DATA SPMB SMK
                if (response.data.spmb_smk && Array.isArray(response.data.spmb_smk)) {
                    console.log(`   📊 SPMB SMK: ${response.data.spmb_smk.length} rows`);
                    this.processSPMBData('SMK', response.data.spmb_smk);
                } else {
                    console.warn('   ⚠️ No SPMB SMK data found or wrong format');
                }
                
                // CEK DATA AGENDA
                if (response.data.agenda_humas && Array.isArray(response.data.agenda_humas)) {
                    console.log(`   📅 Agenda: ${response.data.agenda_humas.length} rows`);
                    this.data.agenda = response.data.agenda_humas.sort((a, b) => 
                        new Date(b.tanggal) - new Date(a.tanggal)
                    );
                } else {
                    console.warn('   ⚠️ No Agenda data found or wrong format');
                }
                
                // CEK DATA FOTO
                if (response.data.foto_kegiatan && Array.isArray(response.data.foto_kegiatan)) {
                    console.log(`   🖼️ Photos: ${response.data.foto_kegiatan.length} rows`);
                    this.data.photos = response.data.foto_kegiatan.sort((a, b) => 
                        new Date(b.tanggal) - new Date(a.tanggal)
                    );
                } else {
                    console.warn('   ⚠️ No Photo data found or wrong format');
                }
                
                this.showNotification('✅ Data berhasil dimuat dari spreadsheet', 'success');
            } else {
                console.error('%c❌ Failed to load data from spreadsheet!', 'color: red; font-weight: bold');
                console.error('   Response:', response);
                
                if (response && response.error) {
                    console.error('   Error message:', response.error);
                    this.showNotification(`❌ Error: ${response.error}`, 'error');
                } else {
                    this.showNotification('❌ Gagal memuat data dari spreadsheet', 'error');
                }
            }
            
        } catch (error) {
            console.error('%c❌ Critical error loading data:', 'color: red; font-weight: bold', error);
            this.showNotification('❌ Error: ' + error.message, 'error');
        }
        
        // Refresh current page
        this.refreshCurrentPage();
        
        this.isLoading = false;
        this.showLoading(false);
    }
    
    processSPMBData(unit, data) {
        if (!data || !Array.isArray(data)) {
            console.warn(`⚠️ processSPMBData: no data for ${unit}`);
            return;
        }
        
        console.log(`📊 Processing ${unit} data for ${this.currentYear}...`);
        
        // Filter berdasarkan tahun ajaran yang dipilih
        const filteredData = data.filter(item => 
            item.tahun_ajaran === this.currentYear
        );
        
        console.log(`   Found ${filteredData.length} rows for ${this.currentYear}`);
        
        // Reset data untuk unit ini
        this.data.spmb[unit] = {
            earlybird: { pendaftar: 0, formulir: 0, dsp: 0 },
            gelombang1: { pendaftar: 0, formulir: 0, dsp: 0 },
            gelombang2: { pendaftar: 0, formulir: 0, dsp: 0 },
            total: { pendaftar: 0, formulir: 0, dsp: 0 }
        };
        
        // Hitung total per periode
        filteredData.forEach((item, index) => {
            const periode = item.periode;
            const pendaftar = parseInt(item.jumlah_pendaftar) || 0;
            const formulir = parseInt(item.jumlah_bayar_formulir) || 0;
            const dsp = parseInt(item.jumlah_bayar_dsp) || 0;
            
            console.log(`   Row ${index + 1}: ${periode}, pendaftar: ${pendaftar}, formulir: ${formulir}, dsp: ${dsp}`);
            
            if (this.data.spmb[unit][periode]) {
                this.data.spmb[unit][periode].pendaftar += pendaftar;
                this.data.spmb[unit][periode].formulir += formulir;
                this.data.spmb[unit][periode].dsp += dsp;
                
                this.data.spmb[unit].total.pendaftar += pendaftar;
                this.data.spmb[unit].total.formulir += formulir;
                this.data.spmb[unit].total.dsp += dsp;
            } else {
                console.warn(`   ⚠️ Unknown periode: ${periode}. Expected: earlybird, gelombang1, gelombang2`);
            }
        });
        
        console.log(`📊 ${unit} processed:`, this.data.spmb[unit]);
    }
    
    resetData() {
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
    
    async testConnection() {
        console.log('%c🔍 TESTING API CONNECTION...', 'color: purple; font-weight: bold');
        
        try {
            const result = await this.fetchFromAPI('test');
            
            if (result && result.success) {
                console.log('%c✅ CONNECTION SUCCESSFUL!', 'color: green; font-size: 14px; font-weight: bold');
                console.log('   Message:', result.message);
                console.log('   Sheets:', result.sheets);
                this.showNotification('✅ Koneksi berhasil!', 'success');
                return true;
            } else {
                console.error('%c❌ CONNECTION FAILED!', 'color: red; font-size: 14px; font-weight: bold');
                this.showNotification('❌ Koneksi gagal!', 'error');
                return false;
            }
        } catch (error) {
            console.error('❌ Test connection error:', error);
            this.showNotification('❌ Error: ' + error.message, 'error');
            return false;
        }
    }
    
    // ============================================
    // NAVIGATION & RENDER (SINGKAT)
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
        
        this.loadPageContent(page);
    }
    
    refreshCurrentPage() {
        this.loadPageContent(this.currentPage);
    }
    
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
    }
    
    renderDashboard() {
        // ... (render dashboard sama seperti sebelumnya, tidak diubah)
        // Untuk menghemat space, gunakan render dashboard dari kode sebelumnya
        return this._renderDashboard();
    }
    
    _renderDashboard() {
        const smp = this.data.spmb.SMP;
        const smk = this.data.spmb.SMK;
        const periodeDef = CONFIG.PERIODE_DEFINITIONS[this.currentYear] || 
                         CONFIG.PERIODE_DEFINITIONS['2026/2027'];
        
        const hasData = smp.total.pendaftar > 0 || smk.total.pendaftar > 0;
        
        // API Status Banner
        const apiStatusBanner = !this.apiAvailable ? `
            <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
                <div class="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-exclamation-triangle text-amber-600"></i>
                </div>
                <div class="flex-1">
                    <h4 class="font-semibold text-amber-800 text-sm mb-1">⚠️ API Belum Terhubung</h4>
                    <p class="text-xs text-amber-700 mb-2">Spreadsheet belum terhubung. Periksa:</p>
                    <ul class="text-xs text-amber-700 list-disc list-inside">
                        <li>Web App URL di config.js sudah benar</li>
                        <li>Google Apps Script sudah di-deploy dengan akses "Anyone"</li>
                        <li>Spreadsheet ID sudah benar</li>
                    </ul>
                    <button onclick="app.testConnection()" class="mt-2 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-medium hover:bg-amber-700">
                        <i class="fas fa-wifi mr-1"></i> Test Koneksi
                    </button>
                </div>
            </div>
        ` : '';
        
        return `
            <div class="space-y-8">
                ${apiStatusBanner}
                
                <!-- Header -->
                <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <div class="flex items-center gap-3 mb-2">
                            <span class="text-xs font-semibold text-[#f97316] bg-orange-100 px-3 py-1.5 rounded-full">
                                <i class="fas fa-circle-nodes mr-1"></i> REAL-TIME DATA
                            </span>
                            <span class="text-xs text-gray-500 bg-white px-3 py-1.5 rounded-full shadow-sm">
                                <i class="far fa-clock mr-1"></i> ${new Date().toLocaleTimeString('id-ID')}
                            </span>
                            ${this.apiAvailable ? 
                                '<span class="text-xs text-emerald-600 bg-emerald-100 px-3 py-1.5 rounded-full"><i class="fas fa-circle-check mr-1"></i> Terhubung</span>' : 
                                '<span class="text-xs text-amber-600 bg-amber-100 px-3 py-1.5 rounded-full"><i class="fas fa-circle-exclamation mr-1"></i> Tidak Terhubung</span>'}
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

                <!-- Data Summary -->
                <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <i class="fas fa-database text-[#f97316]"></i>
                        Ringkasan Data SPMB ${this.currentYear}
                    </h3>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- SMP Summary -->
                        <div class="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-5">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                                    <i class="fas fa-school text-white"></i>
                                </div>
                                <h4 class="font-bold text-gray-900">SMP</h4>
                            </div>
                            <div class="grid grid-cols-3 gap-2 text-center">
                                <div class="bg-white/80 rounded-xl p-3">
                                    <p class="text-xs text-gray-500 mb-1">Pendaftar</p>
                                    <p class="text-2xl font-bold text-gray-900">${smp.total.pendaftar}</p>
                                </div>
                                <div class="bg-white/80 rounded-xl p-3">
                                    <p class="text-xs text-gray-500 mb-1">Formulir</p>
                                    <p class="text-2xl font-bold text-amber-600">${smp.total.formulir}</p>
                                </div>
                                <div class="bg-white/80 rounded-xl p-3">
                                    <p class="text-xs text-gray-500 mb-1">DSP</p>
                                    <p class="text-2xl font-bold text-emerald-600">${smp.total.dsp}</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- SMK Summary -->
                        <div class="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-5">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                                    <i class="fas fa-graduation-cap text-white"></i>
                                </div>
                                <h4 class="font-bold text-gray-900">SMK</h4>
                            </div>
                            <div class="grid grid-cols-3 gap-2 text-center">
                                <div class="bg-white/80 rounded-xl p-3">
                                    <p class="text-xs text-gray-500 mb-1">Pendaftar</p>
                                    <p class="text-2xl font-bold text-gray-900">${smk.total.pendaftar}</p>
                                </div>
                                <div class="bg-white/80 rounded-xl p-3">
                                    <p class="text-xs text-gray-500 mb-1">Formulir</p>
                                    <p class="text-2xl font-bold text-amber-600">${smk.total.formulir}</p>
                                </div>
                                <div class="bg-white/80 rounded-xl p-3">
                                    <p class="text-xs text-gray-500 mb-1">DSP</p>
                                    <p class="text-2xl font-bold text-emerald-600">${smk.total.dsp}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    ${!hasData ? `
                    <div class="mt-6 p-8 bg-gray-50 rounded-2xl text-center">
                        <div class="w-20 h-20 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-database text-3xl text-gray-400"></i>
                        </div>
                        <h3 class="text-gray-900 text-lg font-semibold mb-2">Belum Ada Data</h3>
                        <p class="text-gray-500 text-sm mb-4">Spreadsheet masih kosong untuk tahun ajaran ${this.currentYear}.</p>
                        <button onclick="app.navigateTo('input-data')" 
                                class="px-6 py-3 bg-gradient-to-r from-[#f97316] to-[#f59e0b] text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 inline-flex items-center gap-2">
                            <i class="fas fa-plus-circle"></i>
                            Input Data Sekarang
                        </button>
                    </div>
                    ` : ''}
                </div>
                
                ${hasData ? `
                <!-- SMP Periode Cards -->
                <div>
                    <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <i class="fas fa-school text-[#3b82f6]"></i>
                        SMP - Detail per Periode
                    </h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                        ${this._renderPeriodeCard('Early Bird', smp.earlybird, 'emerald')}
                        ${this._renderPeriodeCard('Gelombang 1', smp.gelombang1, 'blue')}
                        ${this._renderPeriodeCard('Gelombang 2', smp.gelombang2, 'purple')}
                    </div>
                </div>
                
                <!-- SMK Periode Cards -->
                <div>
                    <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <i class="fas fa-graduation-cap text-[#8b5cf6]"></i>
                        SMK - Detail per Periode
                    </h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                        ${this._renderPeriodeCard('Early Bird', smk.earlybird, 'emerald')}
                        ${this._renderPeriodeCard('Gelombang 1', smk.gelombang1, 'blue')}
                        ${this._renderPeriodeCard('Gelombang 2', smk.gelombang2, 'purple')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }
    
    _renderPeriodeCard(title, data, color) {
        const colors = {
            emerald: 'border-emerald-200 bg-emerald-50',
            blue: 'border-blue-200 bg-blue-50',
            purple: 'border-purple-200 bg-purple-50'
        };
        
        return `
            <div class="bg-white rounded-2xl p-5 border ${colors[color]} shadow-sm">
                <div class="flex items-center gap-2 mb-4">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-white">
                        <i class="fas fa-calendar-check text-${color}-600"></i>
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
    
    renderSPMBPage(unit) {
        // Sama seperti sebelumnya
        const data = this.data.spmb[unit];
        
        return `
            <div class="space-y-6">
                <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">Monitoring SPMB ${unit}</h1>
                        <p class="text-gray-500 text-sm mt-2">Tahun Ajaran ${this.currentYear}</p>
                    </div>
                    <button onclick="app.navigateTo('input-data')" 
                            class="px-6 py-3 bg-gradient-to-r from-[#f97316] to-[#f59e0b] text-white rounded-xl font-medium hover:shadow-lg flex items-center gap-2">
                        <i class="fas fa-plus-circle"></i>
                        Input Data ${unit}
                    </button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                    ${this._renderPeriodeCard('Early Bird', data.earlybird, 'emerald')}
                    ${this._renderPeriodeCard('Gelombang 1', data.gelombang1, 'blue')}
                    ${this._renderPeriodeCard('Gelombang 2', data.gelombang2, 'purple')}
                </div>
            </div>
        `;
    }
    
    renderInputForm() {
        // Sama seperti sebelumnya
        const today = new Date().toISOString().split('T')[0];
        
        return `
            <div class="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">Input Data Baru</h1>
                    <p class="text-gray-500 text-sm">Data akan langsung tersimpan ke Google Spreadsheet</p>
                </div>
                
                <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
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
                                    ${CONFIG.AGENDA_CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
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
                                    class="px-6 py-3 bg-gradient-to-r from-[#f97316] to-[#f59e0b] text-white rounded-xl font-medium hover:shadow-lg flex items-center gap-2">
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
                                    class="px-6 py-3 bg-gradient-to-r from-[#f97316] to-[#f59e0b] text-white rounded-xl font-medium hover:shadow-lg flex items-center gap-2">
                                <i class="fas fa-upload"></i>
                                Upload Foto
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
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
    
    async saveSPMBData() {
        const unit = document.getElementById('input-unit')?.value;
        const tahunAjaran = document.getElementById('input-tahun-ajaran')?.value;
        const periode = document.getElementById('input-periode')?.value;
        const tanggal = document.getElementById('input-tanggal')?.value;
        const pendaftar = document.getElementById('input-pendaftar')?.value;
        const formulir = document.getElementById('input-formulir')?.value;
        const dsp = document.getElementById('input-dsp')?.value;
        const keterangan = document.getElementById('input-keterangan')?.value;
        
        if (!pendaftar || parseInt(pendaftar) <= 0) {
            this.showNotification('❌ Jumlah pendaftar harus diisi', 'error');
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
        
        this.showNotification('📤 Menyimpan data...', 'info');
        
        const result = await this.saveToAPI(sheetName, data);
        
        if (result.success) {
            document.getElementById('input-pendaftar').value = '';
            document.getElementById('input-formulir').value = '';
            document.getElementById('input-dsp').value = '';
            document.getElementById('input-keterangan').value = '';
            
            this.showNotification('✅ Data berhasil disimpan', 'success');
            setTimeout(() => this.loadData(), 1000);
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
        
        this.showNotification('📤 Menyimpan agenda...', 'info');
        
        const result = await this.saveToAPI(CONFIG.SHEETS.AGENDA, data);
        
        if (result.success) {
            document.getElementById('agenda-kegiatan').value = '';
            document.getElementById('agenda-lokasi').value = '';
            document.getElementById('agenda-deskripsi').value = '';
            this.showNotification('✅ Agenda berhasil disimpan', 'success');
            setTimeout(() => this.loadData(), 1000);
        }
    }
    
    async savePhotoData() {
        const tanggal = document.getElementById('photo-tanggal')?.value;
        const kegiatan = document.getElementById('photo-kegiatan')?.value;
        const url = document.getElementById('photo-url')?.value;
        const deskripsi = document.getElementById('photo-deskripsi')?.value;
        
        if (!tanggal || !kegiatan || !url) {
            this.showNotification('❌ Tanggal, kegiatan, dan URL wajib diisi', 'error');
            return;
        }
        
        const data = {
            tanggal: tanggal,
            kegiatan: kegiatan,
            url: url,
            deskripsi: deskripsi || ''
        };
        
        this.showNotification('📤 Menyimpan foto...', 'info');
        
        const result = await this.saveToAPI(CONFIG.SHEETS.FOTO, data);
        
        if (result.success) {
            document.getElementById('photo-kegiatan').value = '';
            document.getElementById('photo-url').value = '';
            document.getElementById('photo-deskripsi').value = '';
            this.showNotification('✅ Foto berhasil disimpan', 'success');
            setTimeout(() => this.loadData(), 1000);
        }
    }
    
    async saveToAPI(sheetName, data) {
        try {
            if (!CONFIG.WEB_APP_URL || CONFIG.WEB_APP_URL.includes('YOUR_SCRIPT_ID')) {
                this.showNotification('⚠️ API belum dikonfigurasi', 'warning');
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
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Save error:', error);
            this.showNotification('❌ Gagal menyimpan', 'error');
            return { success: false };
        }
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
        this.showNotification('🔄 Menyegarkan data...', 'info');
        this.loadData();
    }
}

// Initialize app
window.app = new SPMBApp();
