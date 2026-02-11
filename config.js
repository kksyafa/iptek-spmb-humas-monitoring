// Konfigurasi Dashboard Monitoring SPMB & Humas
// UPDATE DUA VARIABEL INI SETELAH SETUP GOOGLE SHEETS

const CONFIG = {
    // ============================================
    // ⚠️ UPDATE DUA VARIABEL INI SETELAH SETUP ⚠️
    // ============================================
    
    // 1. Google Spreadsheet ID (Dapatkan dari URL Google Sheets)
    SPREADSHEET_ID: '1fnk5hFLA9q-ZH9NoGQPD_dP0qIQTAT9piPWLkPbFLNE',
    
    // 2. Google Apps Script Web App URL (Setelah deploy)
    WEB_APP_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
    
    // ============================================
    // JANGAN UBAH KODE DI BAWAH INI
    // ============================================
    
    // Nama sheet di Google Spreadsheet
    SHEETS: {
        SPMB_SMP: 'SPMB_SMP',
        SPMB_SMK: 'SPMB_SMK',
        AGENDA: 'Agenda_Humas',
        FOTO: 'Foto_Kegiatan',
        USERS: 'Users'
    },
    
    // User accounts (default - bisa diubah di spreadsheet)
    DEFAULT_USERS: [
        {
            username: 'admin',
            password: 'super123',
            name: 'Administrator',
            role: 'admin',
            unit: 'all'
        },
        {
            username: 'smp',
            password: 'smp123',
            name: 'Ketua SMP',
            role: 'coordinator',
            unit: 'smp'
        },
        {
            username: 'smk',
            password: 'smk123',
            name: 'Ketua SMK',
            role: 'coordinator',
            unit: 'smk'
        },
        {
            username: 'humas',
            password: 'humas123',
            name: 'Staf Humas',
            role: 'staff',
            unit: 'humas'
        }
    ],
    
    // Application settings
    APP: {
        NAME: 'SPMB & Humas Monitoring',
        VERSION: '1.0.0',
        AUTHOR: 'Yayasan Insan Pendidikan Teknologi & Kejuruan',
        YEAR: new Date().getFullYear(),
        
        // Indonesian months
        MONTHS: [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ],
        
        // Indonesian days
        DAYS: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    },
    
    // SPMB Targets
    SPMB_TARGETS: {
        SMP: {
            TOTAL: 80,
            MONTHLY: [25, 30, 35, 40, 45, 50, 30, 25, 20, 15, 10, 5]
        },
        SMK: {
            TOTAL: 280,
            MONTHLY: [35, 40, 45, 50, 55, 60, 40, 35, 25, 20, 15, 10]
        }
    },
    
    // Agenda status options
    AGENDA_STATUS: {
        scheduled: { label: 'Terjadwal', color: '#fff3cd', text: '#856404' },
        ongoing: { label: 'Berlangsung', color: '#d1ecf1', text: '#0c5460' },
        completed: { label: 'Selesai', color: '#d4edda', text: '#155724' }
    },
    
    // Agenda categories
    AGENDA_CATEGORIES: [
        'Meeting', 'Event', 'Kunjungan', 'Workshop', 
        'Open House', 'Pelatihan', 'Rapat', 'Lainnya'
    ],
    
    // SPMB programs
    SPMB_PROGRAMS: {
        SMP: ['Reguler', 'Prestasi', 'Kemitraan', 'Beasiswa'],
        SMK: ['Teknik Sepeda  MOtor', 'MDesain Komunikasi Visual', 'Akuntansi', 'Perhotelan']
    },
    
    // Theme colors
    THEME: {
        COLORS: {
            primary: '#2c3e50',
            secondary: '#3498db',
            success: '#27ae60',
            warning: '#f39c12',
            danger: '#e74c3c',
            smp: '#3498db',
            smk: '#9b59b6'
        }
    }
};

// Make config globally available
window.CONFIG = CONFIG;
