const { createApp, ref, reactive, onMounted } = Vue;

createApp({
    setup() {
        const daftarSurah = ref([]);
        const loading = ref(true);
        const settings = reactive({
            userName: 'Hamba Allah'
        });

        // Ambil data nama dari LocalStorage (Biar sinkron dengan Lingo)
        const loadSettings = () => {
            const saved = localStorage.getItem('arabicSettings');
            if (saved) {
                const data = JSON.parse(saved);
                settings.userName = data.userName;
            }
        };

        // Ambil daftar surah dari API Kemenag/Public
        const fetchSurah = async () => {
            try {
                const response = await fetch('https://equran.id/api/v2/surat');
                const resData = await response.json();
                daftarSurah.value = resData.data;
                loading.value = false;
            } catch (error) {
                alert("Gagal mengambil data Al-Qur'an. Cek koneksi internet.");
                console.error(error);
            }
        };

        const pilihSurah = (nomor) => {
            alert("Kamu memilih surah nomor " + nomor + ". Fitur baca ayat segera hadir!");
        };

        onMounted(() => {
            loadSettings();
            fetchSurah();
        });

        return {
            daftarSurah,
            loading,
            settings,
            pilihSurah
        };
    }
}).mount('#app');