const { createApp, ref, reactive, onMounted } = Vue;

createApp({
    setup() {
        // State (Data Reaktif)
        const currentKalimat = ref({});
        const showStructure = ref(false);
        const settings = reactive({
            userName: 'Hamba Allah',
            isGundul: false,
            isBlurLatin: false,
            isBlurIndo: false
        });

        // Fungsi Simpan ke LocalStorage
        const save = () => {
            localStorage.setItem('arabicSettings', JSON.stringify(settings));
        };

        // Fungsi Ambil Kalimat Acak
        const tampilkanAcak = () => {
            const db = window.databaseKalimat;
            if (db && db.length > 0) {
                const randomIndex = Math.floor(Math.random() * db.length);
                currentKalimat.value = db[randomIndex];
                showStructure.value = false;
            }
        };

        // Inisialisasi Data saat Aplikasi Dibuka
        const init = () => {
            // Muat setelan lama jika ada
            const saved = localStorage.getItem('arabicSettings');
            if (saved) {
                Object.assign(settings, JSON.parse(saved));
            }

            // Tambahkan versi gundul ke semua data (Regex)
            if (window.databaseKalimat) {
                window.databaseKalimat = window.databaseKalimat.map(item => ({
                    ...item,
                    gundul: item.ar.replace(/[\u064B-\u0652\u0670]/g, '')
                }));
            }

            tampilkanAcak();
        };

        // Fungsi Interaksi
        const changeName = () => {
            let newName = prompt("Masukkan nama kamu:", settings.userName);
            if (newName) {
                settings.userName = newName;
                save();
            }
        };

        const toggleGundul = () => {
            settings.isGundul = !settings.isGundul;
            save();
        };

        const toggleSetting = (key) => {
            settings[key] = !settings[key];
            save();
        };

        // Lifecycle Hook
        onMounted(() => {
            init();
        });

        // Kembalikan data agar bisa dipakai di HTML
        return {
            currentKalimat,
            showStructure,
            settings,
            tampilkanAcak,
            changeName,
            toggleGundul,
            toggleSetting
        };
    }
}).mount('#app');