// Konfigurasi Dashboard Monitoring SPMB & Humas
const CONFIG = {
    // Google Spreadsheet Configuration
    SPREADSHEET: {
        ID: '1fnk5hFLA9q-ZH9NoGQPD_dP0qIQTAT9piPWLkPbFLNE', // Ganti dengan ID Google Sheet Anda
        SHEETS: {
            SPMB_SMP: 'SPMB_SMP',
            SPMB_SMK: 'SPMB_SMK',
            AGENDA: 'Agenda_Humas',
            FOTO: 'Foto_Kegiatan',
            USERS: 'Users'
        },
        // URL Web App Google Apps Script
        WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbxIMOTgcbLsZGU4cmbpOOvGaxiuc2ISbeaQaangfjMS9YF-BZ0wf9plMS9E7e5B0vHw/exec'
    },
    
    // Authentication Configuration
    USERS: [
        {
            username: 'admin',
            password: 'super123',
            name: 'Administrator',
            role: 'admin',
            unit: 'all',
            email: 'adm.smkiptektangsel@gmail.com'
        },
        {
            username: 'smp',
            password: 'smp123',
            name: 'Ketua SMP',
            role: 'coordinator',
            unit: 'smp',
            email: 'badrus.setiawan@iptek.sch.id'
        },
        {
            username: 'smk',
            password: 'smk123',
            name: 'Ketua SMK',
            role: 'coordinator',
            unit: 'smk',
            email: 'arif.hakim@iptek.sch.id'
        },
        {
            username: 'humas',
            password: 'humas123',
            name: 'Staf Humas',
            role: 'staff',
            unit: 'humas',
            email: 'humas@iptek.sch.id'
        }
    ],
    
    // Application Settings
    APP: {
        NAME: 'SPMB & Humas Monitoring',
        VERSION: '1.0.0',
        AUTHOR: 'Yayasan Insan Pendidikan Teknologi dan Kejuruan',
        YEAR: new Date().getFullYear(),
        MONTHS: [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ],
        DAYS: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    },
    
    // SPMB Configuration
    SPMB: {
        TARGETS: {
            SMP: {
                TOTAL: 300,
                MONTHLY: [25, 30, 35, 40, 45, 50, 30, 25, 20, 15, 10, 5]
            },
            SMK: {
                TOTAL: 400,
                MONTHLY: [35, 40, 45, 50, 55, 60, 40, 35, 25, 20, 15, 10]
            }
        },
        PROGRAM_SMP: ['Reguler', 'Prestasi', 'Kemitraan', 'Beasiswa'],
        PROGRAM_SMK: ['Teknik Komputer', 'Multimedia', 'Akuntansi', 'Tata Boga', 'Perhotelan']
    },
    
    // Agenda Configuration
    AGENDA: {
        STATUS: {
            scheduled: { label: 'Terjadwal', color: 'status-scheduled' },
            ongoing: { label: 'Berlangsung', color: 'status-ongoing' },
            completed: { label: 'Selesai', color: 'status-completed' }
        },
        CATEGORIES: ['Meeting', 'Event', 'Visit', 'Workshop', 'Open House', 'Lainnya']
    },
    
    // Theme Configuration
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

// Export for global use
window.CONFIG = CONFIG;
