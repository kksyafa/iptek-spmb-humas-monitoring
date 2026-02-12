// ============================================
// KONFIGURASI DASHBOARD MONITORING SPMB & HUMAS
// ============================================

const CONFIG = {
    // ============================================
    // ⚠️ UPDATE DUA VARIABEL INI SETELAH SETUP ⚠️
    // ============================================
    
    // Google Spreadsheet ID (dari URL spreadsheet)
    SPREADSHEET_ID: '1fnk5hFLA9q-ZH9NoGQPD_dP0qIQTAT9piPWLkPbFLNE',
    
    // Google Apps Script Web App URL (setelah deploy)
    WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbzxz0elkrBX1ieKAVFCSS9591iU-9l5YDpe0eW1qf3JtCkQleCct8PwWOwLZ_eZ8bnC/exec',
    
    // ============================================
    // KONFIGURASI APLIKASI - JANGAN DIUBAH
    // ============================================
    
    // Nama sheet di Google Spreadsheet
    SHEETS: {
        SPMB_SMP: 'SPMB_SMP',
        SPMB_SMK: 'SPMB_SMK',
        AGENDA: 'Agenda_Humas',
        FOTO: 'Foto_Kegiatan',
        USERS: 'Users'
    },
    
    // Tahun ajaran yang tersedia
    ACADEMIC_YEARS: ['2025/2026', '2026/2027'],
    
    // Tahun ajaran default
    DEFAULT_ACADEMIC_YEAR: '2026/2027',
    
    // Definisi periode SPMB per tahun ajaran
    PERIODE_DEFINITIONS: {
        '2025/2026': {
            earlybird: { 
                start: '2024-11-21', 
                end: '2025-01-31', 
                label: '21 Nov 2024 - 31 Jan 2025',
                months: [11, 12, 1] // November, Desember, Januari
            },
            gelombang1: { 
                start: '2025-02-01', 
                end: '2025-04-30', 
                label: '01 Feb 2025 - 30 Apr 2025',
                months: [2, 3, 4] // Februari, Maret, April
            },
            gelombang2: { 
                start: '2025-05-01', 
                end: '2025-07-15', 
                label: '01 Mei 2025 - 15 Jul 2025',
                months: [5, 6, 7] // Mei, Juni, Juli
            }
        },
        '2026/2027': {
            earlybird: { 
                start: '2025-11-21', 
                end: '2026-01-31', 
                label: '21 Nov 2025 - 31 Jan 2026',
                months: [11, 12, 1] // November, Desember, Januari
            },
            gelombang1: { 
                start: '2026-02-01', 
                end: '2026-04-30', 
                label: '01 Feb 2026 - 30 Apr 2026',
                months: [2, 3, 4] // Februari, Maret, April
            },
            gelombang2: { 
                start: '2026-05-01', 
                end: '2026-07-15', 
                label: '01 Mei 2026 - 15 Jul 2026',
                months: [5, 6, 7] // Mei, Juni, Juli
            }
        }
    },
    
    // User default (untuk fallback jika sheet Users belum diisi)
    DEFAULT_USERS: [
        { username: 'admin', password: 'super123', name: 'Administrator', role: 'Admin', unit: 'all' },
        { username: 'smp', password: 'smp123', name: 'Ketua SMP', role: 'Koordinator SMP', unit: 'smp' },
        { username: 'smk', password: 'smk123', name: 'Ketua SMK', role: 'Koordinator SMK', unit: 'smk' },
        { username: 'humas', password: 'humas123', name: 'Staf Humas', role: 'Staf Humas', unit: 'humas' }
    ],
    
    // Status agenda
    AGENDA_STATUS: {
        scheduled: { label: 'Terjadwal', color: 'bg-info-light text-info-dark', icon: 'calendar' },
        ongoing: { label: 'Berlangsung', color: 'bg-warning-light text-warning-dark', icon: 'clock' },
        completed: { label: 'Selesai', color: 'bg-success-light text-success-dark', icon: 'check-circle' }
    },
    
    // Kategori agenda
    AGENDA_CATEGORIES: [
        'Meeting', 'Event', 'Workshop', 'Open House', 'Kunjungan', 'Pelatihan', 'Rapat', 'Lainnya'
    ],
    
    // Warna tema
    THEME: {
        primary: '#EF3F09',
        'primary-hover': '#d63608',
        smp: '#3498db',
        smk: '#9b59b6',
        earlybird: '#10B981',
        gelombang1: '#3B82F6',
        gelombang2: '#8B5CF6'
    }
};

// Export untuk digunakan di file lain
window.CONFIG = CONFIG;
