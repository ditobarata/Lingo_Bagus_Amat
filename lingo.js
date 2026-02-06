const { createApp, ref, reactive, onMounted } = Vue;

createApp({
    setup() {
        // 1. State (Data Reaktif)
        const currentKalimat = ref({});
        const showStructure = ref(false);
        const settings = reactive({
            userName: 'Hamba Allah',
            isGundul: false,
            isBlurLatin: false,
            isBlurIndo: false
        });

        // 2. Fungsi Simpan ke LocalStorage
        const save = () => {
            localStorage.setItem('arabicSettings', JSON.stringify(settings));
        };

        // 3. Fungsi Ambil Kalimat Acak
        const tampilkanAcak = () => {
            const db = window.databaseKalimat;
            if (db && db.length > 0) {
                const randomIndex = Math.floor(Math.random() * db.length);
                currentKalimat.value = db[randomIndex];
                showStructure.value = false;
            }
        };

        // 4. Inisialisasi Data
        const init = () => {
            const saved = localStorage.getItem('arabicSettings');
            if (saved) {
                Object.assign(settings, JSON.parse(saved));
            }

            if (window.databaseKalimat) {
                window.databaseKalimat = window.databaseKalimat.map(item => ({
                    ...item,
                    gundul: item.ar.replace(/[\u064B-\u0652\u0670]/g, '')
                }));
            }
            tampilkanAcak();
        };

        // 5. Fungsi Interaksi
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

        const goToQuran = () => {
            alert("Aplikasi Al-Qur'an sedang dalam proses pengembangan!");
        };

        // 6. Jalankan init saat mounted
        onMounted(() => {
            init();
        });

        // 7. RETURN SEMUA ke HTML (Harus di paling bawah setup)
        return {
            currentKalimat,
            showStructure,
            settings,
            tampilkanAcak,
            changeName,
            toggleGundul,
            toggleSetting,
            goToQuran
        };
    }
}).mount('#app');