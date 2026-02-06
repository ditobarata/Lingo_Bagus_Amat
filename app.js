const { createApp, ref, reactive, onMounted } = Vue;

createApp({
    setup() {
        const currentMode = ref('lingo'); // 'lingo' atau 'quran'
        const currentKalimat = ref({});
        const showStructure = ref(false);
        const daftarSurah = ref([]);
        const loading = ref(true);
        const selectedSurah = ref(null);
        const daftarAyat = ref([]);

        const fetchAyat = async (nomor) => {
            loading.value = true;
            try {
                const res = await fetch(`https://equran.id/api/v2/surat/${nomor}`);
                const json = await res.json();
                selectedSurah.value = json.data;
                daftarAyat.value = json.data.ayat;
            } catch (e) {
                alert("Gagal memuat ayat.");
            } finally {
                loading.value = false;
            }
        };

        const settings = reactive({
            userName: 'Hamba Allah',
            isGundul: false,
            isBlurLatin: false,
            isBlurIndo: false
        });

        const save = () => {
            localStorage.setItem('arabicSettings', JSON.stringify(settings));
        };

        const tampilkanAcak = () => {
            const db = window.databaseKalimat;
            if (db) {
                currentKalimat.value = db[Math.floor(Math.random() * db.length)];
                showStructure.value = false;
            }
        };

        const fetchSurah = async () => {
            try {
                const res = await fetch('https://equran.id/api/v2/surat');
                const json = await res.json();
                daftarSurah.value = json.data;
                loading.value = false;
            } catch (e) { console.error("Gagal load Quran"); }
        };

        const changeName = () => {
            let n = prompt("Sinten asmane panjenengan? (Nama):", settings.userName);
            if (n) { settings.userName = n; save(); }
        };

        const toggleSetting = (k) => { settings[k] = !settings[k]; save(); };
        const toggleGundul = () => { settings.isGundul = !settings.isGundul; save(); };
        const pilihSurah = (n) => alert("Surah " + n + " segera hadir!");

        onMounted(() => {
            const saved = localStorage.getItem('arabicSettings');
            if (saved) Object.assign(settings, JSON.parse(saved));
            
            if (window.databaseKalimat) {
                window.databaseKalimat = window.databaseKalimat.map(i => ({
                    ...i, gundul: i.ar.replace(/[\u064B-\u0652\u0670]/g, '')
                }));
            }
            tampilkanAcak();
            fetchSurah();
        });

        return {
            currentMode, currentKalimat, showStructure, settings,
            daftarSurah, loading, tampilkanAcak, changeName, 
            toggleSetting, toggleGundul, pilihSurah,
            selectedSurah, daftarAyat, fetchAyat,
        };
    }
}).mount('#app');