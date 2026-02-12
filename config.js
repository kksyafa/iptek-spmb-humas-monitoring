// ============================================
// KONFIGURASI - GANTI DENGAN DATA ANDA!
// ============================================
const CONFIG = {
    // ⚠️ WAJIB GANTI! Spreadsheet ID dari URL
    SPREADSHEET_ID: '1fnk5hFLA9q-ZH9NoGQPD_dP0qIQTAT9piPWLkPbFLNE', // GANTI!
    
    // ⚠️ WAJIB GANTI! Web App URL hasil deploy
    WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbyHfvMbk2LQFdOhvq0Gvxi2qgj_6oDGce6xqCwWvMp3fvkqKO8EAmmDc_vimQTORd7h/exec', // GANTI!
    
    // JANGAN UBAH DI BAWAH INI!
    SHEETS: {
        SPMB_SMP: 'SPMB_SMP',
        SPMB_SMK: 'SPMB_SMK',
        AGENDA: 'Agenda_Humas',
        FOTO: 'Foto_Kegiatan',
        USERS: 'Users'
    },
    
    ACADEMIC_YEARS: ['2025/2026', '2026/2027'],
    DEFAULT_ACADEMIC_YEAR: '2026/2027',
    
    PERIODE_DEFINITIONS: {
        '2026/2027': {
            earlybird: { label: '21 Nov 2025 - 31 Jan 2026' },
            gelombang1: { label: '01 Feb 2026 - 30 Apr 2026' },
            gelombang2: { label: '01 Mei 2026 - 15 Jul 2026' }
        },
        '2025/2026': {
            earlybird: { label: '21 Nov 2024 - 31 Jan 2025' },
            gelombang1: { label: '01 Feb 2025 - 30 Apr 2025' },
            gelombang2: { label: '01 Mei 2025 - 15 Jul 2025' }
        }
    },
    
    DEFAULT_USERS: [
        { username: 'admin', password: 'super123', name: 'Administrator', role: 'Admin', unit: 'all' },
        { username: 'smp', password: 'smp123', name: 'Ketua SMP', role: 'Koordinator SMP', unit: 'smp' },
        { username: 'smk', password: 'smk123', name: 'Ketua SMK', role: 'Koordinator SMK', unit: 'smk' },
        { username: 'humas', password: 'humas123', name: 'Staf Humas', role: 'Staf Humas', unit: 'humas' }
    ]
};

window.CONFIG = CONFIG;
