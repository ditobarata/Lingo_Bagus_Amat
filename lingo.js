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

// 2. Inisialisasi Elemen UI (Seperti kode sebelumnya)
const body = document.body;
const card = document.createElement('div');
card.className = 'card';

const arabicDiv = document.createElement('div');
arabicDiv.id = 'arabic';
arabicDiv.className = 'arabic';

const latinDiv = document.createElement('div');
latinDiv.id = 'latin';
latinDiv.className = 'latin';

const indoDiv = document.createElement('div');
indoDiv.id = 'indo';
indoDiv.className = 'indo';

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

// Susun UI
btnGroup.append(btnStruct, btnNext);
card.append(arabicDiv, latinDiv, indoDiv, structureBox, btnGroup);
body.appendChild(card);

// 3. Logika Fungsi
function tampilkanAcak() {
    structureBox.style.display = 'none';
    
    // Pastikan databaseKalimat sudah ada (dimuat dari data.js)
    if (window.databaseKalimat) {
        const indexAcak = Math.floor(Math.random() * window.databaseKalimat.length);
        const item = window.databaseKalimat[indexAcak];

        arabicDiv.innerText = item.ar;
        latinDiv.innerText = item.lat;
        indoDiv.innerText = item.id;
        structureBox.innerText = item.struktur;
    }
}

function toggleStructure() {
    structureBox.style.display = structureBox.style.display === 'none' ? 'block' : 'none';
}

// 4. MULAI PROSES: Muat data dulu
loadData();