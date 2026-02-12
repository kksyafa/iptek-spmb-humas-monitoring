// ============================================
// MAIN APPLICATION - TERINTEGRASI DENGAN SPREADSHEET
// ============================================

class SPMBApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.currentYear = CONFIG.DEFAULT_ACADEMIC_YEAR;
        this.data = {
            spmb: [],
            agenda: [],
            photos: []
        };
        this.charts = {};
        this.isLoading = false;
        
        this.init();
    }
    
    init() {
        // Setup event listeners
        this.setupEventListeners();
        
        // Listen for auth events
        window.addEventListener('auth:login', () => this.loadData());
        
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
    // API FUNCTIONS - KONEKSI KE GOOGLE SPREADSHEET
    // ============================================
    
    async fetchFromAPI(action, params = {}) {
        try {
            const url = new URL(CONFIG.WEB_APP_URL);
            url.searchParams.append('action', action);
            
            Object.keys(params).forEach(key => {
                url.searchParams.append(key, params[key]);
            });
            
            // Cache busting
            url.searchParams.append('_', Date.now());
            
            console.log(`Fetching from API: ${action}`, params);
            
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
            return data;
            
        } catch (error) {
            console.error('API Fetch Error:', error);
            throw error;
        }
    }
    
    async saveToAPI(sheetName, data) {
        try {
            console.log(`Saving to ${sheetName}:`, data);
            
            const response = await fetch(CONFIG.WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors', // Google Apps Script requires no-cors for POST
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'save',
                    sheet: sheetName,
                    data: {
                        ...data,
                        id: Date.now(),
                        created_at: new Date().toISOString(),
                        created_by: window.auth?.currentUser?.name || 'Unknown'
                    }
                })
            });
            
            // Karena mode no-cors, kita asumsikan sukses
            this.showNotification('Data berhasil dikirim ke spreadsheet', 'success');
            
            // Trigger refresh setelah save
            setTimeout(() => this.loadData(), 1000);
            
            return { success: true };
            
        } catch (error) {
            console.error('API Save Error:', error);
            this.showNotification('Gagal menyimpan data ke spreadsheet', 'error');
            return { success: false, error };
        }
    }
    
    async testConnection() {
        try {
            this.showNotification('Menguji koneksi ke spreadsheet...', 'info');
            
            const result = await this.fetchFromAPI('test');
            
            if (result && result.success) {
                this.showNotification('✅ Koneksi berhasil! Spreadsheet terhubung.', 'success');
                return true;
            } else {
                this.showNotification('❌ Koneksi gagal. Periksa Web App URL.', 'error');
                return false;
            }
        } catch (error) {
            this.showNotification('❌ Tidak dapat terhubung ke API', 'error');
            return false;
        }
    }
    
    // ============================================
    // DATA MANAGEMENT - DARI SPREADSHEET
    // ============================================
    
    async loadData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading(true);
        
        try {
            // Ambil semua data dari spreadsheet
            const response = await this.fetchFromAPI('getAll');
            
            if (response && response.success && response.data) {
                // Proses data SPMB
                this.data.spmb = this.processSPMBData(response.data.spmb_smp || [], response.data.spmb_smk || []);
                
                // Proses data Agenda
                this.data.agenda = response.data.agenda_humas || [];
                
                // Proses data Foto
                this.data.photos = response.data.foto_kegiatan || [];
                
                console.log('Data loaded from spreadsheet:', this.data);
                this.showNotification('Data berhasil dimuat dari spreadsheet', 'success');
            } else {
                // Fallback ke mock data jika API gagal
                this.loadMockData();
                this.showNotification('Menggunakan data contoh (spreadsheet tidak terhubung)', 'warning');
            }
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.loadMockData();
            this.showNotification('Gagal memuat data dari spreadsheet', 'error');
        }
        
        // Refresh current page
        this.refreshCurrentPage();
        
        this.isLoading = false;
        this.showLoading(false);
    }
    
    processSPMBData(smpData = [], smkData = []) {
        // Gabungkan data SMP dan SMK
        const allData = [...smpData, ...smkData];
        
        // Filter berdasarkan tahun ajaran yang dipilih
        const filteredData = allData.filter(item => 
            item.tahun_ajaran === this.currentYear
        );
        
        // Kelompokkan berdasarkan unit dan periode
        const result = {
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
        };
        
        // Hitung total per kategori
        filteredData.forEach(item => {
            const unit = item.unit;
            const periode = item.periode;
            const pendaftar = parseInt(item.jumlah_pendaftar) || 0;
            const formulir = parseInt(item.jumlah_bayar_formulir) || 0;
            const dsp = parseInt(item.jumlah_bayar_dsp) || 0;
            
            if (result[unit] && result[unit][periode]) {
                result[unit][periode].pendaftar += pendaftar;
                result[unit][periode].formulir += formulir;
                result[unit][periode].dsp += dsp;
                
                result[unit].total.pendaftar += pendaftar;
                result[unit].total.formulir += formulir;
                result[unit].total.dsp += dsp;
            }
        });
        
        return result;
    }
    
    loadMockData() {
        // Mock data untuk testing jika spreadsheet tidak terhubung
        this.data = {
            spmb: {
                SMP: {
                    earlybird: { pendaftar: 45, formulir: 42, dsp: 38 },
                    gelombang1: { pendaftar: 58, formulir: 54, dsp: 50 },
                    gelombang2: { pendaftar: 48, formulir: 45, dsp: 42 },
                    total: { pendaftar: 151, formulir: 141, dsp: 130 }
                },
                SMK: {
                    earlybird: { pendaftar: 68, formulir: 62, dsp: 58 },
                    gelombang1: { pendaftar: 78, formulir: 74, dsp: 70 },
                    gelombang2: { pendaftar: 58, formulir: 54, dsp: 50 },
                    total: { pendaftar: 204, formulir: 190, dsp: 178 }
                }
            },
            agenda: [
                {
                    id: 1,
                    tanggal: '2026-06-15',
                    kegiatan: 'Open House SMP',
                    lokasi: 'Aula Utama',
                    kategori: 'Event',
                    status: 'completed',
                    penanggung_jawab: 'Budi Santoso'
                },
                {
                    id: 2,
                    tanggal: '2026-06-20',
                    kegiatan: 'Workshop Teknologi',
                    lokasi: 'Lab Komputer',
                    kategori: 'Workshop',
                    status: 'ongoing',
                    penanggung_jawab: 'Siti Aisyah'
                },
                {
                    id: 3,
                    tanggal: '2026-06-25',
                    kegiatan: 'Pameran Pendidikan',
                    lokasi: 'Mall Kota',
                    kategori: 'Event',
                    status: 'scheduled',
                    penanggung_jawab: 'Ahmad Fauzi'
                }
            ],
            photos: [
                {
                    id: 1,
                    tanggal: '2026-06-15',
                    kegiatan: 'Open House SMP',
                    url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400',
                    deskripsi: 'Sesi presentasi untuk orang tua'
                },
                {
                    id: 2,
                    tanggal: '2026-06-10',
                    kegiatan: 'Workshop Coding',
                    url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400',
                    deskripsi: 'Siswa belajar pemrograman dasar'
                }
            ]
        };
    }
    
    // ============================================
    // NAVIGATION
    // ============================================
    
    navigateTo(page) {
        this.currentPage = page;
        
        // Update active nav
        document.querySelectorAll('[data-page]').forEach(el => {
            el.classList.remove('active', 'bg-[#276874]', 'text-white');
            el.classList.add('hover:bg-gray-100');
        });
        
        const activeNav = document.querySelector(`[data-page="${page}"]`);
        if (activeNav) {
            activeNav.classList.add('active', 'bg-[#276874]', 'text-white');
            activeNav.classList.remove('hover:bg-gray-100');
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
    
    loadPageContent(page) {
        const contentArea = document.getElementById('content-area');
        if (!contentArea) return;
        
        switch(page) {
            case 'dashboard':
                contentArea.innerHTML = this.renderDashboard();
                setTimeout(() => this.initDashboardCharts(), 100);
                break;
            case 'spmb-smp':
                contentArea.innerHTML = this.renderSPMBPage('SMP');
                break;
            case 'spmb-smk':
                contentArea.innerHTML = this.renderSPMBPage('SMK');
                break;
            case 'spmb-comparison':
                contentArea.innerHTML = this.renderComparisonPage();
                break;
            case 'agenda-list':
                contentArea.innerHTML = this.renderAgendaList();
                break;
            case 'input-data':
                contentArea.innerHTML = this.renderInputForm();
                break;
            case 'gallery':
                contentArea.innerHTML = this.renderGallery();
                break;
            case 'data-spmb':
                contentArea.innerHTML = this.renderSPMBDataTable();
                break;
            case 'settings':
                contentArea.innerHTML = this.renderSettings();
                break;
            default:
                contentArea.innerHTML = this.renderDashboard();
        }
        
        // Refresh Lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }
    }
    
    // ============================================
    // RENDER FUNCTIONS - DASHBOARD
    // ============================================
    
    renderDashboard() {
        const smpData = this.data.spmb?.SMP || { total: { pendaftar: 0, formulir: 0, dsp: 0 } };
        const smkData = this.data.spmb?.SMK || { total: { pendaftar: 0, formulir: 0, dsp: 0 } };
        const periodeDef = CONFIG.PERIODE_DEFINITIONS[this.currentYear];
        
        return `
            <div class="space-y-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 class="text-foreground text-2xl md:text-3xl font-bold mb-1">
                            Dashboard Monitoring SPMB
                        </h1>
                        <p class="text-gray-500 text-sm md:text-base">
                            Data real-time dari Google Spreadsheet • Update terakhir: ${new Date().toLocaleString('id-ID')}
                        </p>
                    </div>
                    <div class="flex items-center gap-3">
                        <select id="academic-year-select" class="px-4 py-2.5 border border-border rounded-button text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none">
                            ${CONFIG.ACADEMIC_YEARS.map(year => `
                                <option value="${year}" ${year === this.currentYear ? 'selected' : ''}>
                                    Tahun Ajaran ${year}
                                </option>
                            `).join('')}
                        </select>
                        <button onclick="app.testConnection()" class="flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-button text-foreground font-medium hover:border-primary transition-all duration-200">
                            <i data-lucide="wifi" class="w-4 h-4"></i>
                            <span class="hidden md:inline">Test Koneksi</span>
                        </button>
                    </div>
                </div>

                <!-- Periode Info Card -->
                <div class="bg-gradient-to-r from-primary/10 to-primary/5 rounded-card p-5">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                            <i data-lucide="calendar" class="w-6 h-6 text-white"></i>
                        </div>
                        <div class="flex-1">
                            <h3 class="text-foreground font-bold">Tahun Ajaran ${this.currentYear}</h3>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-sm">
                                <div class="flex items-center gap-2">
                                    <span class="w-2 h-2 bg-earlybird rounded-full"></span>
                                    <span>Early Bird: ${periodeDef?.earlybird.label || '21 Nov - 31 Jan'}</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="w-2 h-2 bg-gel1 rounded-full"></span>
                                    <span>Gelombang 1: ${periodeDef?.gelombang1.label || '01 Feb - 30 Apr'}</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="w-2 h-2 bg-gel2 rounded-full"></span>
                                    <span>Gelombang 2: ${periodeDef?.gelombang2.label || '01 Mei - 15 Jul'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SMP Stats -->
                <div>
                    <h3 class="text-foreground text-lg font-bold mb-4 flex items-center gap-2">
                        <i data-lucide="school" class="w-5 h-5 text-smp"></i>
                        SMP - Total Penerimaan
                    </h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        ${this.renderStatCard('Total Pendaftar', smpData.total.pendaftar, `${smpData.total.pendaftar} calon siswa`, 'users', 'smp')}
                        ${this.renderStatCard('Bayar Formulir', smpData.total.formulir, `${smpData.total.pendaftar > 0 ? Math.round((smpData.total.formulir / smpData.total.pendaftar) * 100) : 0}% dari pendaftar`, 'file-text', 'warning')}
                        ${this.renderStatCard('Bayar DSP', smpData.total.dsp, `${smpData.total.pendaftar > 0 ? Math.round((smpData.total.dsp / smpData.total.pendaftar) * 100) : 0}% dari pendaftar`, 'credit-card', 'success')}
                        ${this.renderStatCard('Konversi ke DSP', smpData.total.formulir > 0 ? Math.round((smpData.total.dsp / smpData.total.formulir) * 100) + '%' : '0%', `${smpData.total.dsp} dari ${smpData.total.formulir} formulir`, 'trending-up', 'info')}
                    </div>
                </div>

                <!-- SMK Stats -->
                <div class="mt-6">
                    <h3 class="text-foreground text-lg font-bold mb-4 flex items-center gap-2">
                        <i data-lucide="graduation-cap" class="w-5 h-5 text-smk"></i>
                        SMK - Total Penerimaan
                    </h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        ${this.renderStatCard('Total Pendaftar', smkData.total.pendaftar, `${smkData.total.pendaftar} calon siswa`, 'users', 'smk')}
                        ${this.renderStatCard('Bayar Formulir', smkData.total.formulir, `${smkData.total.pendaftar > 0 ? Math.round((smkData.total.formulir / smkData.total.pendaftar) * 100) : 0}% dari pendaftar`, 'file-text', 'warning')}
                        ${this.renderStatCard('Bayar DSP', smkData.total.dsp, `${smkData.total.pendaftar > 0 ? Math.round((smkData.total.dsp / smkData.total.pendaftar) * 100) : 0}% dari pendaftar`, 'credit-card', 'success')}
                        ${this.renderStatCard('Konversi ke DSP', smkData.total.formulir > 0 ? Math.round((smkData.total.dsp / smkData.total.formulir) * 100) + '%' : '0%', `${smkData.total.dsp} dari ${smkData.total.formulir} formulir`, 'trending-up', 'info')}
                    </div>
                </div>

                <!-- Periode Breakdown -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    ${this.renderPeriodeBreakdown('SMP', this.data.spmb?.SMP)}
                    ${this.renderPeriodeBreakdown('SMK', this.data.spmb?.SMK)}
                </div>

                <!-- Recent Agenda -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                    <div class="lg:col-span-2">
                        ${this.renderRecentAgenda()}
                    </div>
                    <div>
                        ${this.renderRecentPhotos()}
                    </div>
                </div>
            </div>
        `;
    }
    
    renderStatCard(label, value, subtitle, icon, colorClass) {
        const colors = {
            smp: 'bg-smp/10 text-smp',
            smk: 'bg-smk/10 text-smk',
            warning: 'bg-warning/10 text-warning',
            success: 'bg-success/10 text-success',
            info: 'bg-info/10 text-info',
            primary: 'bg-primary/10 text-primary'
        };
        
        return `
            <div class="bg-muted rounded-card pt-5 px-3 pb-3">
                <h3 class="text-foreground text-sm font-semibold ml-3 mb-3">${label}</h3>
                <div class="bg-white rounded-card p-5">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-foreground text-3xl font-extrabold">${value.toLocaleString()}</p>
                            <p class="text-gray-500 text-xs mt-1">${subtitle}</p>
                        </div>
                        <div class="w-14 h-14 ${colors[colorClass] || 'bg-gray-100 text-gray-600'} rounded-icon flex items-center justify-center">
                            <i data-lucide="${icon}" class="w-6 h-6"></i>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderPeriodeBreakdown(unit, data) {
        if (!data) return '';
        
        const colors = {
            earlybird: 'bg-earlybird',
            gelombang1: 'bg-gel1',
            gelombang2: 'bg-gel2'
        };
        
        const periodeLabels = {
            earlybird: 'Early Bird',
            gelombang1: 'Gelombang 1',
            gelombang2: 'Gelombang 2'
        };
        
        const periodeDates = {
            earlybird: CONFIG.PERIODE_DEFINITIONS[this.currentYear]?.earlybird.label || '21 Nov - 31 Jan',
            gelombang1: CONFIG.PERIODE_DEFINITIONS[this.currentYear]?.gelombang1.label || '01 Feb - 30 Apr',
            gelombang2: CONFIG.PERIODE_DEFINITIONS[this.currentYear]?.gelombang2.label || '01 Mei - 15 Jul'
        };
        
        return `
            <div class="bg-muted rounded-card pt-5 px-3 pb-3">
                <h3 class="text-foreground text-lg font-bold ml-3 mb-4 flex items-center gap-2">
                    <i data-lucide="${unit === 'SMP' ? 'school' : 'graduation-cap'}" class="w-5 h-5 text-${unit === 'SMP' ? 'smp' : 'smk'}"></i>
                    ${unit} - Per Periode
                </h3>
                <div class="bg-white rounded-card p-5">
                    <div class="space-y-4">
                        ${['earlybird', 'gelombang1', 'gelombang2'].map(periode => `
                            <div>
                                <div class="flex items-center justify-between mb-2">
                                    <div class="flex items-center gap-2">
                                        <span class="w-3 h-3 ${colors[periode]} rounded-full"></span>
                                        <span class="text-foreground font-medium">${periodeLabels[periode]}</span>
                                    </div>
                                    <span class="text-sm text-gray-500">${periodeDates[periode]}</span>
                                </div>
                                <div class="grid grid-cols-3 gap-2 text-center">
                                    <div class="bg-gray-50 p-2 rounded">
                                        <p class="text-xs text-gray-500">Pendaftar</p>
                                        <p class="text-foreground font-bold">${data[periode]?.pendaftar || 0}</p>
                                    </div>
                                    <div class="bg-gray-50 p-2 rounded">
                                        <p class="text-xs text-gray-500">Formulir</p>
                                        <p class="text-foreground font-bold">${data[periode]?.formulir || 0}</p>
                                    </div>
                                    <div class="bg-gray-50 p-2 rounded">
                                        <p class="text-xs text-gray-500">DSP</p>
                                        <p class="text-foreground font-bold">${data[periode]?.dsp || 0}</p>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    renderRecentAgenda() {
        const agendas = this.data.agenda || [];
        const recent = agendas.slice(0, 5);
        
        return `
            <div class="bg-muted rounded-card pt-5 px-3 pb-3 h-full">
                <div class="flex items-center justify-between mb-4 px-3">
                    <h3 class="text-foreground text-lg font-bold">Agenda Terbaru</h3>
                    <a href="#" data-page="agenda-list" onclick="app.navigateTo('agenda-list'); return false;" class="text-sm text-primary hover:underline cursor-pointer">
                        Lihat Semua
                    </a>
                </div>
                <div class="bg-white rounded-card overflow-hidden">
                    <div class="divide-y divide-gray-100">
                        ${recent.length > 0 ? recent.map(agenda => {
                            const status = CONFIG.AGENDA_STATUS[agenda.status] || CONFIG.AGENDA_STATUS.scheduled;
                            return `
                                <div class="p-4 hover:bg-gray-50 transition-all duration-200">
                                    <div class="flex items-start gap-3">
                                        <div class="w-10 h-10 ${status.color} rounded-lg flex items-center justify-center flex-shrink-0">
                                            <i data-lucide="${status.icon}" class="w-5 h-5"></i>
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <h4 class="text-foreground font-semibold text-sm mb-1">${agenda.kegiatan || 'Tanpa Judul'}</h4>
                                            <div class="flex items-center gap-3 text-xs text-gray-500">
                                                <span class="flex items-center gap-1">
                                                    <i data-lucide="calendar" class="w-3 h-3"></i>
                                                    ${agenda.tanggal || '-'}
                                                </span>
                                                <span class="flex items-center gap-1">
                                                    <i data-lucide="map-pin" class="w-3 h-3"></i>
                                                    ${agenda.lokasi || '-'}
                                                </span>
                                            </div>
                                        </div>
                                        <span class="px-2 py-1 text-xs rounded-full ${status.color}">
                                            ${status.label}
                                        </span>
                                    </div>
                                </div>
                            `;
                        }).join('') : `
                            <div class="p-8 text-center text-gray-500">
                                <i data-lucide="calendar" class="w-12 h-12 mx-auto mb-3 text-gray-300"></i>
                                <p>Belum ada agenda</p>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }
    
    renderRecentPhotos() {
        const photos = this.data.photos || [];
        const recent = photos.slice(0, 4);
        
        return `
            <div class="bg-muted rounded-card pt-5 px-3 pb-3 h-full">
                <div class="flex items-center justify-between mb-4 px-3">
                    <h3 class="text-foreground text-lg font-bold">Foto Terbaru</h3>
                    <a href="#" data-page="gallery" onclick="app.navigateTo('gallery'); return false;" class="text-sm text-primary hover:underline cursor-pointer">
                        Lihat Semua
                    </a>
                </div>
                <div class="bg-white rounded-card p-4">
                    <div class="grid grid-cols-2 gap-3">
                        ${recent.length > 0 ? recent.map(photo => `
                            <div class="relative group cursor-pointer" onclick="app.showPhoto('${photo.url}')">
                                <img src="${photo.url}" alt="${photo.kegiatan}" class="w-full h-24 object-cover rounded-lg" onerror="this.src='https://via.placeholder.com/400x300?text=Foto+Tidak+Tersedia'">
                                <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-lg flex items-center justify-center">
                                    <i data-lucide="zoom-in" class="w-5 h-5 text-white"></i>
                                </div>
                            </div>
                        `).join('') : `
                            <div class="col-span-2 p-8 text-center text-gray-500">
                                <i data-lucide="images" class="w-12 h-12 mx-auto mb-3 text-gray-300"></i>
                                <p>Belum ada foto</p>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }
    
    // ============================================
    // SPMB PAGES
    // ============================================
    
    renderSPMBPage(unit) {
        const data = this.data.spmb?.[unit] || { 
            earlybird: { pendaftar: 0, formulir: 0, dsp: 0 },
            gelombang1: { pendaftar: 0, formulir: 0, dsp: 0 },
            gelombang2: { pendaftar: 0, formulir: 0, dsp: 0 },
            total: { pendaftar: 0, formulir: 0, dsp: 0 }
        };
        
        const periodeDef = CONFIG.PERIODE_DEFINITIONS[this.currentYear];
        
        return `
            <div class="space-y-6">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 class="text-foreground text-2xl md:text-3xl font-bold mb-1">
                            Monitoring SPMB ${unit}
                        </h1>
                        <p class="text-gray-500 text-sm md:text-base">
                            Tahun Ajaran ${this.currentYear} • Data real-time dari spreadsheet
                        </p>
                    </div>
                    <div class="flex items-center gap-3">
                        <button onclick="app.navigateTo('input-data')" class="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-button font-medium hover:bg-primary-hover transition-all duration-200">
                            <i data-lucide="plus" class="w-4 h-4"></i>
                            <span>Tambah Data</span>
                        </button>
                        <button onclick="app.exportData('spmb-${unit.toLowerCase()}')" class="flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-button text-foreground font-medium hover:border-primary transition-all duration-200">
                            <i data-lucide="download" class="w-4 h-4"></i>
                            <span class="hidden md:inline">Export</span>
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    ${this.renderStatCard('Total Pendaftar', data.total.pendaftar, `${data.total.pendaftar} calon siswa`, 'users', unit === 'SMP' ? 'smp' : 'smk')}
                    ${this.renderStatCard('Bayar Formulir', data.total.formulir, `${data.total.pendaftar > 0 ? Math.round((data.total.formulir / data.total.pendaftar) * 100) : 0}% dari pendaftar`, 'file-text', 'warning')}
                    ${this.renderStatCard('Bayar DSP', data.total.dsp, `${data.total.pendaftar > 0 ? Math.round((data.total.dsp / data.total.pendaftar) * 100) : 0}% dari pendaftar`, 'credit-card', 'success')}
                    ${this.renderStatCard('Konversi ke DSP', data.total.formulir > 0 ? Math.round((data.total.dsp / data.total.formulir) * 100) + '%' : '0%', `${data.total.dsp} dari ${data.total.formulir} formulir`, 'trending-up', 'info')}
                </div>

                <div class="bg-muted rounded-card pt-5 px-3 pb-3">
                    <h3 class="text-foreground text-lg font-bold ml-3 mb-4">Detail per Periode</h3>
                    <div class="bg-white rounded-card p-5">
                        <div class="space-y-6">
                            ${['earlybird', 'gelombang1', 'gelombang2'].map(periode => {
                                const periodeLabels = {
                                    earlybird: 'Early Bird',
                                    gelombang1: 'Gelombang 1',
                                    gelombang2: 'Gelombang 2'
                                };
                                const periodeDates = {
                                    earlybird: periodeDef?.earlybird.label || '21 Nov - 31 Jan',
                                    gelombang1: periodeDef?.gelombang1.label || '01 Feb - 30 Apr',
                                    gelombang2: periodeDef?.gelombang2.label || '01 Mei - 15 Jul'
                                };
                                const colors = {
                                    earlybird: 'bg-earlybird',
                                    gelombang1: 'bg-gel1',
                                    gelombang2: 'bg-gel2'
                                };
                                
                                return `
                                    <div>
                                        <div class="flex items-center justify-between mb-3">
                                            <div class="flex items-center gap-2">
                                                <span class="w-3 h-3 ${colors[periode]} rounded-full"></span>
                                                <h4 class="text-foreground font-semibold">${periodeLabels[periode]}</h4>
                                            </div>
                                            <span class="text-sm text-gray-500">${periodeDates[periode]}</span>
                                        </div>
                                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div class="bg-gray-50 rounded-lg p-4">
                                                <p class="text-xs text-gray-500 mb-1">Total Pendaftar</p>
                                                <p class="text-2xl font-bold text-foreground">${data[periode]?.pendaftar || 0}</p>
                                            </div>
                                            <div class="bg-gray-50 rounded-lg p-4">
                                                <p class="text-xs text-gray-500 mb-1">Bayar Formulir</p>
                                                <p class="text-2xl font-bold text-warning">${data[periode]?.formulir || 0}</p>
                                                <p class="text-xs text-gray-500 mt-1">${data[periode]?.pendaftar > 0 ? Math.round((data[periode]?.formulir / data[periode]?.pendaftar) * 100) : 0}%</p>
                                            </div>
                                            <div class="bg-gray-50 rounded-lg p-4">
                                                <p class="text-xs text-gray-500 mb-1">Bayar DSP</p>
                                                <p class="text-2xl font-bold text-success">${data[periode]?.dsp || 0}</p>
                                                <p class="text-xs text-gray-500 mt-1">${data[periode]?.pendaftar > 0 ? Math.round((data[periode]?.dsp / data[periode]?.pendaftar) * 100) : 0}%</p>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // ============================================
    // INPUT FORM
    // ============================================
    
    renderInputForm() {
        const today = new Date().toISOString().split('T')[0];
        
        return `
            <div class="space-y-6">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 class="text-foreground text-2xl md:text-3xl font-bold mb-1">Input Data Baru</h1>
                        <p class="text-gray-500 text-sm md:text-base">
                            Tambah data akan langsung tersimpan ke Google Spreadsheet
                        </p>
                    </div>
                </div>

                <div class="bg-muted rounded-card pt-5 px-3 pb-3">
                    <div class="bg-white rounded-card p-5">
                        <div class="flex flex-wrap gap-2 border-b border-gray-200 pb-4">
                            <button onclick="app.switchTab('spmb')" id="tab-spmb" class="tab-btn px-5 py-2.5 rounded-button bg-primary text-white font-medium" data-tab="spmb">
                                <i data-lucide="users" class="w-4 h-4 inline mr-2"></i>
                                Data SPMB
                            </button>
                            <button onclick="app.switchTab('agenda')" id="tab-agenda" class="tab-btn px-5 py-2.5 rounded-button border border-border text-foreground font-medium hover:border-primary" data-tab="agenda">
                                <i data-lucide="calendar" class="w-4 h-4 inline mr-2"></i>
                                Agenda Kegiatan
                            </button>
                            <button onclick="app.switchTab('photo')" id="tab-photo" class="tab-btn px-5 py-2.5 rounded-button border border-border text-foreground font-medium hover:border-primary" data-tab="photo">
                                <i data-lucide="camera" class="w-4 h-4 inline mr-2"></i>
                                Foto Kegiatan
                            </button>
                        </div>

                        <!-- Form SPMB -->
                        <div id="form-spmb" class="mt-6">
                            <h3 class="text-foreground text-lg font-bold mb-4">Form Input Data SPMB</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="space-y-2">
                                    <label class="block text-foreground text-sm font-medium">Unit</label>
                                    <select id="input-unit" class="w-full px-4 py-3 border border-border rounded-button focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none">
                                        <option value="SMP">SMP</option>
                                        <option value="SMK">SMK</option>
                                    </select>
                                </div>
                                <div class="space-y-2">
                                    <label class="block text-foreground text-sm font-medium">Tahun Ajaran</label>
                                    <select id="input-tahun-ajaran" class="w-full px-4 py-3 border border-border rounded-button focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none">
                                        ${CONFIG.ACADEMIC_YEARS.map(year => `
                                            <option value="${year}" ${year === this.currentYear ? 'selected' : ''}>${year}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="space-y-2">
                                    <label class="block text-foreground text-sm font-medium">Periode</label>
                                    <select id="input-periode" class="w-full px-4 py-3 border border-border rounded-button focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none">
                                        <option value="earlybird">Early Bird</option>
                                        <option value="gelombang1">Gelombang 1</option>
                                        <option value="gelombang2">Gelombang 2</option>
                                    </select>
                                </div>
                                <div class="space-y-2">
                                    <label class="block text-foreground text-sm font-medium">Tanggal Input</label>
                                    <input type="date" id="input-tanggal" value="${today}" class="w-full px-4 py-3 border border-border rounded-button focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none">
                                </div>
                                <div class="space-y-2">
                                    <label class="block text-foreground text-sm font-medium">Jumlah Pendaftar</label>
                                    <input type="number" id="input-pendaftar" min="0" placeholder="0" class="w-full px-4 py-3 border border-border rounded-button focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none">
                                </div>
                                <div class="space-y-2">
                                    <label class="block text-foreground text-sm font-medium">Bayar Formulir</label>
                                    <input type="number" id="input-formulir" min="0" placeholder="0" class="w-full px-4 py-3 border border-border rounded-button focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none">
                                </div>
                                <div class="space-y-2">
                                    <label class="block text-foreground text-sm font-medium">Bayar DSP</label>
                                    <input type="number" id="input-dsp" min="0" placeholder="0" class="w-full px-4 py-3 border border-border rounded-button focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none">
                                </div>
                                <div class="space-y-2 md:col-span-2">
                                    <label class="block text-foreground text-sm font-medium">Keterangan</label>
                                    <textarea id="input-keterangan" rows="3" placeholder="Contoh: Pendaftar jalur reguler, prestasi, dll." class="w-full px-4 py-3 border border-border rounded-button focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"></textarea>
                                </div>
                            </div>
                            <div class="mt-6">
                                <button id="btn-save-spmb" class="w-full md:w-auto px-6 py-3 bg-primary text-white rounded-button font-medium hover:bg-primary-hover transition-all duration-200 flex items-center justify-center gap-2">
                                    <i data-lucide="save" class="w-5 h-5"></i>
                                    Simpan Data SPMB ke Spreadsheet
                                </button>
                            </div>
                        </div>

                        <!-- Form Agenda (Hidden by default) -->
                        <div id="form-agenda" class="mt-6 hidden">
                            <h3 class="text-foreground text-lg font-bold mb-4">Form Input Agenda</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="space-y-2">
                                    <label class="block text-foreground text-sm font-medium">Tanggal</label>
                                    <input type="date" id="agenda-tanggal" value="${today}" class="w-full px-4 py-3 border border-border rounded-button focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none">
                                </div>
                                <div class="space-y-2">
                                    <label class="block text-foreground text-sm font-medium">Kategori</label>
                                    <select id="agenda-kategori" class="w-full px-4 py-3 border border-border rounded-button focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none">
                                        ${CONFIG.AGENDA_CATEGORIES.map(cat => `
                                            <option value="${cat}">${cat}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="space-y-2 md:col-span-2">
                                    <label class="block text-foreground text-sm font-medium">Nama Kegiatan</label>
                                    <input type="text" id="agenda-kegiatan" placeholder="Contoh: Open House SMP" class="w-full px-4 py-3 border border-border rounded-button focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none">
                                </div>
                                <div class="space-y-2">
                                    <label class="block text-foreground text-sm font-medium">Lokasi</label>
                                    <input type="text" id="agenda-lokasi" placeholder="Contoh: Aula Utama" class="w-full px-4 py-3 border border-border rounded-button focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none">
                                </div>
                                <div class="space-y-2">
                                    <label class="block text-foreground text-sm font-medium">Penanggung Jawab</label>
                                    <input type="text" id="agenda-pj" value="${window.auth?.currentUser?.name || ''}" class="w-full px-4 py-3 border border-border rounded-button focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none">
                                </div>
                                <div class="space-y-2 md:col-span-2">
                                    <label class="block text-foreground text-sm font-medium">Deskripsi</label>
                                    <textarea id="agenda-deskripsi" rows="3" placeholder="Deskripsi lengkap kegiatan..." class="w-full px-4 py-3 border border-border rounded-button focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"></textarea>
                                </div>
                            </div>
                            <div class="mt-6">
                                <button id="btn-save-agenda" class="w-full md:w-auto px-6 py-3 bg-primary text-white rounded-button font-medium hover:bg-primary-hover transition-all duration-200 flex items-center justify-center gap-2">
                                    <i data-lucide="save" class="w-5 h-5"></i>
                                    Simpan Agenda ke Spreadsheet
                                </button>
                            </div>
                        </div>

                        <!-- Form Foto (Hidden by default) -->
                        <div id="form-photo" class="mt-6 hidden">
                            <h3 class="text-foreground text-lg font-bold mb-4">Form Upload Foto</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="space-y-2">
                                    <label class="block text-foreground text-sm font-medium">Tanggal</label>
                                    <input type="date" id="photo-tanggal" value="${today}" class="w-full px-4 py-3 border border-border rounded-button focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none">
                                </div>
                                <div class="space-y-2">
                                    <label class="block text-foreground text-sm font-medium">Kegiatan</label>
                                    <input type="text" id="photo-kegiatan" placeholder="Nama kegiatan" class="w-full px-4 py-3 border border-border rounded-button focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none">
                                </div>
                                <div class="space-y-2 md:col-span-2">
                                    <label class="block text-foreground text-sm font-medium">URL Foto</label>
                                    <input type="url" id="photo-url" placeholder="https://example.com/foto.jpg" class="w-full px-4 py-3 border border-border rounded-button focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none">
                                    <p class="text-xs text-gray-500 mt-1">Gunakan link dari Google Drive, Imgur, atau hosting lainnya</p>
                                </div>
                                <div class="space-y-2 md:col-span-2">
                                    <label class="block text-foreground text-sm font-medium">Deskripsi</label>
                                    <textarea id="photo-deskripsi" rows="2" placeholder="Deskripsi foto..." class="w-full px-4 py-3 border border-border rounded-button focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"></textarea>
                                </div>
                            </div>
                            <div class="mt-6">
                                <button id="btn-save-photo" class="w-full md:w-auto px-6 py-3 bg-primary text-white rounded-button font-medium hover:bg-primary-hover transition-all duration-200 flex items-center justify-center gap-2">
                                    <i data-lucide="upload" class="w-5 h-5"></i>
                                    Upload Foto ke Spreadsheet
                                </button>
                            </div>
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
        
        if (!unit || !tahunAjaran || !periode || !pendaftar) {
            this.showNotification('Data pendaftar wajib diisi', 'error');
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
        
        this.showNotification('Menyimpan data ke spreadsheet...', 'info');
        
        const result = await this.saveToAPI(sheetName, data);
        
        if (result.success) {
            // Clear form
            document.getElementById('input-pendaftar').value = '';
            document.getElementById('input-formulir').value = '';
            document.getElementById('input-dsp').value = '';
            document.getElementById('input-keterangan').value = '';
            
            this.showNotification('Data SPMB berhasil disimpan ke spreadsheet', 'success');
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
            this.showNotification('Semua field wajib diisi', 'error');
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
        
        this.showNotification('Menyimpan agenda ke spreadsheet...', 'info');
        
        const result = await this.saveToAPI(CONFIG.SHEETS.AGENDA, data);
        
        if (result.success) {
            document.getElementById('agenda-kegiatan').value = '';
            document.getElementById('agenda-lokasi').value = '';
            document.getElementById('agenda-deskripsi').value = '';
            
            this.showNotification('Agenda berhasil disimpan ke spreadsheet', 'success');
        }
    }
    
    async savePhotoData() {
        const tanggal = document.getElementById('photo-tanggal')?.value;
        const kegiatan = document.getElementById('photo-kegiatan')?.value;
        const url = document.getElementById('photo-url')?.value;
        const deskripsi = document.getElementById('photo-deskripsi')?.value;
        
        if (!tanggal || !kegiatan || !url) {
            this.showNotification('Tanggal, kegiatan, dan URL foto wajib diisi', 'error');
            return;
        }
        
        const data = {
            tanggal: tanggal,
            kegiatan: kegiatan,
            url: url,
            deskripsi: deskripsi || ''
        };
        
        this.showNotification('Menyimpan foto ke spreadsheet...', 'info');
        
        const result = await this.saveToAPI(CONFIG.SHEETS.FOTO, data);
        
        if (result.success) {
            document.getElementById('photo-kegiatan').value = '';
            document.getElementById('photo-url').value = '';
            document.getElementById('photo-deskripsi').value = '';
            
            this.showNotification('Foto berhasil disimpan ke spreadsheet', 'success');
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
                    btn.className = 'tab-btn px-5 py-2.5 rounded-button bg-primary text-white font-medium';
                }
                if (form) {
                    form.classList.remove('hidden');
                }
            } else {
                if (btn) {
                    btn.className = 'tab-btn px-5 py-2.5 rounded-button border border-border text-foreground font-medium hover:border-primary';
                }
                if (form) {
                    form.classList.add('hidden');
                }
            }
        });
        
        lucide.createIcons();
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
                loading.classList.remove('hidden');
            } else {
                loading.classList.add('hidden');
            }
        }
    }
    
    refreshData() {
        this.loadData();
        this.showNotification('Menyegarkan data dari spreadsheet...', 'info');
    }
    
    testConnection() {
        return this.testConnection();
    }
    
    exportData(type) {
        this.showNotification('Fitur export dalam pengembangan', 'info');
    }
    
    showPhoto(url) {
        window.open(url, '_blank');
    }
    
    // ============================================
    // PLACEHOLDER FUNCTIONS
    // ============================================
    
    renderComparisonPage() {
        return `<div class="p-8 text-center text-gray-500">Halaman perbandingan dalam pengembangan</div>`;
    }
    
    renderAgendaList() {
        return `<div class="p-8 text-center text-gray-500">Halaman daftar agenda dalam pengembangan</div>`;
    }
    
    renderGallery() {
        return `<div class="p-8 text-center text-gray-500">Halaman galeri foto dalam pengembangan</div>`;
    }
    
    renderSPMBDataTable() {
        return `<div class="p-8 text-center text-gray-500">Halaman data SPMB dalam pengembangan</div>`;
    }
    
    renderSettings() {
        return `<div class="p-8 text-center text-gray-500">Halaman pengaturan dalam pengembangan</div>`;
    }
    
    initDashboardCharts() {
        // Chart implementation
    }
}

// Inisialisasi aplikasi
window.app = new SPMBApp();
