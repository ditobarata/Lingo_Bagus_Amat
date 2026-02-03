// 1. Fungsi untuk memuat data.js secara otomatis
function loadData() {
    const script = document.createElement('script');
    script.src = 'data.js';
    script.onload = () => {
        console.log("Data berhasil dimuat!");
        // Tambahkan pengecekan ini untuk memastikan data ada
        if (window.databaseKalimat) {
            tampilkanAcak(); 
        } else {
            console.error("Database tidak ditemukan! Pastikan di data.js menggunakan window.databaseKalimat");
        }
    };
    document.head.appendChild(script);
}

// Fungsi untuk menghapus harakat dari teks Arab
function hapusHarkat(text) {
    // Menghapus diakritik Arab (fathatan, dammatan, kasratan, fatha, damma, kasra, sukun, shadda, alif khanjar)
    return text.replace(/[\u064B-\u0652\u0670]/g, '');
}

// Variabel untuk menyimpan state teks Arab
let kalimatArabBerharkat = '';
let kalimatArabGundul = '';

// Konfigurasi dengan nilai default
let config = {
    userName: 'Pengguna',
    defaultArabGundul: true,
    defaultBlurLatin: true,
    defaultBlurIndo: true,
};

function saveConfig() {
    localStorage.setItem('lingoConfig', JSON.stringify(config));
}

function loadConfig() {
    const savedConfig = localStorage.getItem('lingoConfig');
    if (savedConfig) {
        config = JSON.parse(savedConfig);
    }
}

// 2. Inisialisasi Elemen UI (Seperti kode sebelumnya)
const body = document.body;
const card = document.createElement('div');
card.className = 'card';

const arabicDiv = document.createElement('div');
const welcomeHeader = document.createElement('h2');
welcomeHeader.id = 'welcome-header';
welcomeHeader.style.marginBottom = '20px';
arabicDiv.id = 'arabic';
arabicDiv.className = 'arabic';
arabicDiv.onclick = toggleHarkat; // Tambahkan event klik

const latinDiv = document.createElement('div');
latinDiv.id = 'latin';
latinDiv.className = 'latin blur';
latinDiv.onclick = () => latinDiv.classList.toggle('blur');

const indoDiv = document.createElement('div');
indoDiv.id = 'indo';
indoDiv.className = 'indo blur';
indoDiv.onclick = () => indoDiv.classList.toggle('blur');

const structureBox = document.createElement('div');
structureBox.id = 'structure';
structureBox.className = 'structure-box';

const btnGroup = document.createElement('div');
btnGroup.className = 'btn-group';

const btnStruct = document.createElement('button');
btnStruct.className = 'btn-struct';
btnStruct.innerText = 'Cek Struktur SPOK';
btnStruct.onclick = toggleStructure;

const btnNext = document.createElement('button');
btnNext.className = 'btn-next';
btnNext.innerText = 'Kalimat Acak';
btnNext.onclick = tampilkanAcak;

const btnConfig = document.createElement('button');
btnConfig.className = 'btn-config';
btnConfig.innerText = '⚙️';
btnConfig.onclick = toggleConfigModal;

// Susun UI
btnGroup.append(btnStruct, btnNext);
card.append(btnConfig, welcomeHeader, arabicDiv, latinDiv, indoDiv, structureBox, btnGroup);
body.appendChild(card);

// --- UI Modal Konfigurasi ---
const configModal = document.createElement('div');
configModal.id = 'config-modal';
configModal.className = 'config-modal';

const configForm = document.createElement('div');
configForm.className = 'config-form';
configForm.innerHTML = `
    <h3>Konfigurasi</h3>
    <div class="form-group">
        <label for="userNameInput">Nama Pengguna:</label>
        <input type="text" id="userNameInput" name="userName">
    </div>
    <div class="form-group">
        <label for="defaultArabGundulInput">Default Arab Gundul:</label>
        <input type="checkbox" id="defaultArabGundulInput" name="defaultArabGundul">
    </div>
    <div class="form-group">
        <label for="defaultBlurLatinInput">Default Blur Tulisan Latin:</label>
        <input type="checkbox" id="defaultBlurLatinInput" name="defaultBlurLatin">
    </div>
    <div class="form-group">
        <label for="defaultBlurIndoInput">Default Blur Terjemahan:</label>
        <input type="checkbox" id="defaultBlurIndoInput" name="defaultBlurIndo">
    </div>
    <div class="btn-group" style="margin-top: 25px;">
        <button id="saveConfigBtn" class="btn-next">Simpan</button>
        <button id="closeConfigBtn" class="btn-struct">Tutup</button>
    </div>
`;

configModal.appendChild(configForm);
body.appendChild(configModal);

// Event listeners untuk modal
document.getElementById('saveConfigBtn').onclick = handleSaveConfig;
document.getElementById('closeConfigBtn').onclick = toggleConfigModal;

// 3. Logika Fungsi
function updateWelcomeMessage() {
    welcomeHeader.innerText = `Selamat Belajar, ${config.userName}!`;
}

function tampilkanAcak() {
    structureBox.style.display = 'none';
    // Terapkan konfigurasi blur
    latinDiv.classList.toggle('blur', config.defaultBlurLatin);
    indoDiv.classList.toggle('blur', config.defaultBlurIndo);

    // Pastikan databaseKalimat sudah ada (dimuat dari data.js)
    if (window.databaseKalimat) {
        const indexAcak = Math.floor(Math.random() * window.databaseKalimat.length);
        const item = window.databaseKalimat[indexAcak];

        // Simpan kedua versi teks Arab
        kalimatArabBerharkat = item.ar;
        kalimatArabGundul = hapusHarkat(item.ar);

        // Terapkan konfigurasi Arab gundul
        arabicDiv.innerText = config.defaultArabGundul ? kalimatArabGundul : kalimatArabBerharkat;
        latinDiv.innerText = item.lat;
        indoDiv.innerText = item.id;
        structureBox.innerText = item.struktur;
    }
}

function toggleHarkat() {
    // Beralih antara teks dengan harakat dan teks gundul
    arabicDiv.innerText = (arabicDiv.innerText === kalimatArabGundul) ? kalimatArabBerharkat : kalimatArabGundul;
}

function toggleStructure() {
    structureBox.style.display = structureBox.style.display === 'none' ? 'block' : 'none';
}

function populateConfigForm() {
    document.getElementById('userNameInput').value = config.userName;
    document.getElementById('defaultArabGundulInput').checked = config.defaultArabGundul;
    document.getElementById('defaultBlurLatinInput').checked = config.defaultBlurLatin;
    document.getElementById('defaultBlurIndoInput').checked = config.defaultBlurIndo;
}

function toggleConfigModal() {
    if (configModal.style.display === 'flex') {
        configModal.style.display = 'none';
    } else {
        populateConfigForm();
        configModal.style.display = 'flex';
    }
}

function handleSaveConfig() {
    config.userName = document.getElementById('userNameInput').value || 'Pengguna';
    config.defaultArabGundul = document.getElementById('defaultArabGundulInput').checked;
    config.defaultBlurLatin = document.getElementById('defaultBlurLatinInput').checked;
    config.defaultBlurIndo = document.getElementById('defaultBlurIndoInput').checked;

    saveConfig();
    updateWelcomeMessage();
    toggleConfigModal();
    tampilkanAcak(); // Langsung perbarui kartu saat ini untuk menerapkan setelan
}

// 4. MULAI PROSES: Muat data dulu
loadConfig();
updateWelcomeMessage();
loadData();