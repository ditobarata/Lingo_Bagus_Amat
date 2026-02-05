document.addEventListener('alpine:init', () => {
    Alpine.data('lingoApp', () => ({
        currentKalimat: {},
        showStructure: false,
        
        // State yang akan disimpan di LocalStorage
        settings: {
            userName: 'Hamba Allah',
            isGundul: false,
            isBlurLatin: false,
            isBlurIndo: false
        },

        init() {
            // Muat setelan dari penyimpanan jika ada
            const saved = localStorage.getItem('arabicSettings');
            if (saved) {
                this.settings = JSON.parse(saved);
            }

            // Siapkan data gundul
            window.databaseKalimat = window.databaseKalimat.map(item => ({
                ...item,
                gundul: item.ar.replace(/[\u064B-\u0652\u0670]/g, '')
            }));

            this.tampilkanAcak();
        },

        tampilkanAcak() {
            const randomIndex = Math.floor(Math.random() * window.databaseKalimat.length);
            this.currentKalimat = window.databaseKalimat[randomIndex];
            this.showStructure = false;
            // Status blur/gundul tidak di-reset, tapi mengikuti this.settings
        },

        // Fungsi simpan otomatis setiap ada perubahan
        save() {
            localStorage.setItem('arabicSettings', JSON.stringify(this.settings));
        },

        changeName() {
            let newName = prompt("Masukkan nama kamu:", this.settings.userName);
            if (newName) {
                this.settings.userName = newName;
                this.save();
            }
        },

        toggleGundul() {
            this.settings.isGundul = !this.settings.isGundul;
            this.save();
        },

        toggleSetting(key) {
            this.settings[key] = !this.settings[key];
            this.save();
        }
    }));
});