const { createApp, ref, reactive, onMounted, onBeforeUnmount, nextTick, computed } = Vue;

createApp({
    setup() {
        const QURAN_API_BASE = "https://api.quran.com/api/v4";
        const QURAN_DB_NAME = "quran_cache_db";
        const QURAN_DB_VERSION = 2;
        const META_SYNC_KEY = "quran_sync_v2";
        const TOTAL_SURAH = 114;
        const WINDOW_BEHIND = 100;
        const WINDOW_AHEAD = 100;
        const WINDOW_SHIFT_THRESHOLD = 50;

        const currentMode = ref("quran");
        const currentKalimat = ref({});
        const showStructure = ref(false);

        const daftarSurah = ref([]);
        const loading = ref(true);
        const daftarAyat = ref([]);

        const activeAyatInfo = ref(null);
        const activeAyatGlobal = ref(null);
        const ayatScrollContainer = ref(null);

        const quranWindowStart = ref(1);
        const quranWindowEnd = ref(1);
        const quranTotalAyat = ref(6236);
        const isWindowRefreshing = ref(false);

        const syncStatus = ref("");
        const isSyncing = ref(false);
        const syncPercent = ref(0);
        const syncCurrent = ref(0);
        const syncTotal = ref(TOTAL_SURAH);

        const showSplash = ref(false);
        const SPLASH_SESSION_KEY = "quranSplashShownSession";
        const LAST_READ_KEY = "quranLastReadState";
        const onVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                persistCurrentReadPosition();
            }
        };
        const onBeforeUnload = () => {
            persistCurrentReadPosition();
        };

        let focusFrameId = 0;
        let isShiftingWindow = false;

        const settings = reactive({
            userName: "Hamba Allah",
            isGundul: false,
            isBlurLatin: false,
            isBlurIndo: false,
        });

        const activeSurahTitle = computed(() => {
            if (!activeAyatInfo.value?.chapterNumber) return "Al-Qur'anul Karim";
            const surah = daftarSurah.value.find((s) => s.nomor === activeAyatInfo.value.chapterNumber);
            return surah ? surah.namaLatin : `Surah ${activeAyatInfo.value.chapterNumber}`;
        });

        const getSurahByNumber = (nomorSurah) =>
            daftarSurah.value.find((s) => s.nomor === Number(nomorSurah)) || null;

        const getSurahLatinName = (nomorSurah) => {
            const surah = getSurahByNumber(nomorSurah);
            return surah?.namaLatin || `Surah ${nomorSurah}`;
        };

        const getSurahArabicName = (nomorSurah) => {
            const surah = getSurahByNumber(nomorSurah);
            return surah?.nama || "";
        };

        const openQuranDB = () =>
            new Promise((resolve, reject) => {
                const request = indexedDB.open(QURAN_DB_NAME, QURAN_DB_VERSION);

                request.onupgradeneeded = () => {
                    const db = request.result;

                    if (!db.objectStoreNames.contains("surah")) {
                        db.createObjectStore("surah", { keyPath: "nomor" });
                    }

                    let ayatStore;
                    if (!db.objectStoreNames.contains("ayat")) {
                        ayatStore = db.createObjectStore("ayat", { keyPath: "verseKey" });
                    } else {
                        ayatStore = request.transaction.objectStore("ayat");
                    }

                    if (!ayatStore.indexNames.contains("chapterNumber")) {
                        ayatStore.createIndex("chapterNumber", "chapterNumber", { unique: false });
                    }
                    if (!ayatStore.indexNames.contains("chapterAyat")) {
                        ayatStore.createIndex("chapterAyat", ["chapterNumber", "nomorAyat"], { unique: true });
                    }
                    if (!ayatStore.indexNames.contains("globalAyat")) {
                        ayatStore.createIndex("globalAyat", "globalAyat", { unique: true });
                    }

                    if (!db.objectStoreNames.contains("meta")) {
                        db.createObjectStore("meta", { keyPath: "key" });
                    }
                };

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

        const txDone = (tx) =>
            new Promise((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error);
            });

        const reqToPromise = (request) =>
            new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

        const getMeta = async (db, key) => {
            const tx = db.transaction("meta", "readonly");
            const result = await reqToPromise(tx.objectStore("meta").get(key));
            return result || null;
        };

        const putMeta = async (db, record) => {
            const tx = db.transaction("meta", "readwrite");
            tx.objectStore("meta").put(record);
            await txDone(tx);
        };

        const clearStore = async (db, storeName) => {
            const tx = db.transaction(storeName, "readwrite");
            tx.objectStore(storeName).clear();
            await txDone(tx);
        };

        const saveSurahToDB = async (db, surahList) => {
            const tx = db.transaction("surah", "readwrite");
            const store = tx.objectStore("surah");
            surahList.forEach((surah) => store.put(surah));
            await txDone(tx);
        };

        const saveAyatToDB = async (db, ayatList) => {
            const tx = db.transaction("ayat", "readwrite");
            const store = tx.objectStore("ayat");
            ayatList.forEach((ayat) => store.put(ayat));
            await txDone(tx);
        };

        const decodeHtmlText = (htmlText = "") => {
            const el = document.createElement("div");
            el.innerHTML = htmlText;
            return (el.textContent || "").trim();
        };

        const parseAyatNumber = (verse) => {
            if (verse.verse_number) return Number(verse.verse_number);
            if (verse.verse_key) return Number(String(verse.verse_key).split(":")[1]);
            return 0;
        };

        const pickLatinText = (verse) => {
            const translations = Array.isArray(verse.translations) ? verse.translations : [];
            const transliterationTranslation = translations.find((t) => {
                const haystack = `${t.resource_name || ""} ${t.language_name || ""}`.toLowerCase();
                return t.resource_id === 57 || haystack.includes("transliteration");
            });

            if (transliterationTranslation?.text) {
                return decodeHtmlText(transliterationTranslation.text);
            }

            if (Array.isArray(verse.words) && verse.words.length) {
                const fromWords = verse.words
                    .map((word) => word?.transliteration?.text || "")
                    .filter(Boolean)
                    .join(" ")
                    .replace(/\s+/g, " ")
                    .trim();
                if (fromWords) return fromWords;
            }

            return decodeHtmlText(verse?.transliteration?.text || "");
        };

        const pickIndonesianText = (verse) => {
            const translations = Array.isArray(verse.translations) ? verse.translations : [];
            const indo = translations.find((t) => {
                const haystack = `${t.resource_name || ""} ${t.language_name || ""}`.toLowerCase();
                return t.resource_id === 33 || haystack.includes("indones");
            });
            if (indo?.text) return decodeHtmlText(indo.text);
            if (translations[0]?.text) return decodeHtmlText(translations[0].text);
            return "";
        };

        const fetchJson = async (url) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status} - ${url}`);
            return res.json();
        };

        const fetchSurahFromAPI = async () => {
            const json = await fetchJson(`${QURAN_API_BASE}/chapters?language=id`);
            if (!Array.isArray(json?.chapters)) throw new Error("Data surah Quran.com tidak valid");

            return json.chapters.map((surah) => ({
                nomor: Number(surah.id),
                namaLatin: surah.name_simple || `Surah ${surah.id}`,
                nama: surah.name_arabic || "",
                jumlahAyat: Number(surah.verses_count || 0),
            }));
        };

        const fetchAyatChapterFromAPI = async (nomorSurah, startGlobalAyat) => {
            const allVerses = [];
            let page = 1;
            const perPage = 50;

            while (true) {
                const url = `${QURAN_API_BASE}/verses/by_chapter/${nomorSurah}?language=id&words=true&translations=33,57&fields=text_uthmani_tajweed&page=${page}&per_page=${perPage}`;
                const json = await fetchJson(url);
                const verses = Array.isArray(json?.verses) ? json.verses : [];
                allVerses.push(...verses);
                if (verses.length < perPage) break;
                page += 1;
            }

            return allVerses.map((verse, index) => {
                const nomorAyat = parseAyatNumber(verse);
                return {
                    verseKey: verse.verse_key || `${nomorSurah}:${nomorAyat}`,
                    chapterNumber: Number(nomorSurah),
                    nomorAyat,
                    globalAyat: startGlobalAyat + index,
                    teksArab: verse.text_uthmani_tajweed || verse.text_uthmani || "",
                    teksLatin: pickLatinText(verse),
                    teksIndonesia: pickIndonesianText(verse),
                };
            });
        };

        const syncQuranToIndexedDB = async (db) => {
            isSyncing.value = true;
            syncPercent.value = 0;
            syncCurrent.value = 0;
            syncStatus.value = "Sinkronisasi daftar surah...";

            try {
                const surahList = await fetchSurahFromAPI();
                syncTotal.value = surahList.length || TOTAL_SURAH;

                await clearStore(db, "surah");
                await clearStore(db, "ayat");
                await saveSurahToDB(db, surahList);

                let globalCounter = 1;
                for (let i = 0; i < surahList.length; i += 1) {
                    const surah = surahList[i];
                    syncStatus.value = `Sinkronisasi surah ${i + 1}/${surahList.length}: ${surah.namaLatin}`;
                    const ayatList = await fetchAyatChapterFromAPI(surah.nomor, globalCounter);
                    await saveAyatToDB(db, ayatList);
                    globalCounter += ayatList.length;

                    syncCurrent.value = i + 1;
                    syncPercent.value = Math.round((syncCurrent.value / syncTotal.value) * 100);
                }

                await putMeta(db, {
                    key: META_SYNC_KEY,
                    ready: true,
                    schemaVersion: QURAN_DB_VERSION,
                    totalSurah: surahList.length,
                    totalAyat: globalCounter - 1,
                    syncedAt: new Date().toISOString(),
                });

                quranTotalAyat.value = globalCounter - 1;
                syncPercent.value = 100;
                syncStatus.value = "Sinkronisasi selesai.";
            } finally {
                isSyncing.value = false;
            }
        };

        const getAllSurahFromDB = async (db) => {
            const tx = db.transaction("surah", "readonly");
            const result = await reqToPromise(tx.objectStore("surah").getAll());
            return (result || []).sort((a, b) => a.nomor - b.nomor);
        };

        const getAyatByGlobal = async (db, globalAyat) => {
            const tx = db.transaction("ayat", "readonly");
            const idx = tx.objectStore("ayat").index("globalAyat");
            return reqToPromise(idx.get(Number(globalAyat)));
        };

        const getAyatBySurahAyat = async (db, nomorSurah, nomorAyat) => {
            const tx = db.transaction("ayat", "readonly");
            const idx = tx.objectStore("ayat").index("chapterAyat");
            return reqToPromise(idx.get([Number(nomorSurah), Number(nomorAyat)]));
        };

        const getAyatWindowByGlobal = async (db, centerGlobalAyat, beforeCount = WINDOW_BEHIND, afterCount = WINDOW_AHEAD) => {
            const center = Number(centerGlobalAyat || 1);
            const start = Math.max(1, center - beforeCount);
            const end = Math.min(Number(quranTotalAyat.value || 6236), center + afterCount);

            const tx = db.transaction("ayat", "readonly");
            const idx = tx.objectStore("ayat").index("globalAyat");
            const range = IDBKeyRange.bound(start, end);
            const rows = await reqToPromise(idx.getAll(range));

            return {
                start,
                end,
                rows: (rows || []).sort((a, b) => a.globalAyat - b.globalAyat),
            };
        };

        const ensureQuranDataReady = async () => {
            const db = await openQuranDB();
            const meta = await getMeta(db, META_SYNC_KEY);
            const surahList = await getAllSurahFromDB(db);

            const isReady =
                Boolean(meta?.ready) &&
                Number(meta?.schemaVersion || 0) === QURAN_DB_VERSION &&
                Number(meta?.totalSurah || 0) === TOTAL_SURAH &&
                Number(meta?.totalAyat || 0) > 6000 &&
                surahList.length === TOTAL_SURAH;

            if (!isReady) {
                await syncQuranToIndexedDB(db);
            } else {
                quranTotalAyat.value = Number(meta.totalAyat);
            }

            daftarSurah.value = surahList.length ? surahList : await getAllSurahFromDB(db);
            return db;
        };

        const readLastReadState = () => {
            try {
                const raw = localStorage.getItem(LAST_READ_KEY);
                if (!raw) return { bySurah: {} };
                const parsed = JSON.parse(raw);
                return {
                    bySurah: parsed?.bySurah || {},
                    lastSurah: Number(parsed?.lastSurah || 0),
                    lastAyat: Number(parsed?.lastAyat || 0),
                    lastGlobalAyat: Number(parsed?.lastGlobalAyat || 0),
                    updatedAt: parsed?.updatedAt || null,
                };
            } catch (_) {
                return { bySurah: {} };
            }
        };

        const writeLastReadState = (state) => {
            localStorage.setItem(LAST_READ_KEY, JSON.stringify(state));
        };

        const saveLastReadPosition = (ayatRecord) => {
            if (!ayatRecord?.chapterNumber || !ayatRecord?.nomorAyat || !ayatRecord?.globalAyat) return;
            const state = readLastReadState();
            state.bySurah = state.bySurah || {};
            state.bySurah[String(ayatRecord.chapterNumber)] = Number(ayatRecord.nomorAyat);
            state.lastSurah = Number(ayatRecord.chapterNumber);
            state.lastAyat = Number(ayatRecord.nomorAyat);
            state.lastGlobalAyat = Number(ayatRecord.globalAyat);
            state.updatedAt = new Date().toISOString();
            writeLastReadState(state);
        };

        const persistCurrentReadPosition = () => {
            if (activeAyatInfo.value?.globalAyat) {
                saveLastReadPosition(activeAyatInfo.value);
            }
        };

        const getInitialGlobalAyat = async (db) => {
            const state = readLastReadState();
            if (Number(state.lastGlobalAyat || 0) > 0) {
                return Math.min(Number(state.lastGlobalAyat), Number(quranTotalAyat.value || 6236));
            }

            if (Number(state.lastSurah || 0) > 0 && Number(state.lastAyat || 0) > 0) {
                const row = await getAyatBySurahAyat(db, state.lastSurah, state.lastAyat);
                if (row?.globalAyat) return row.globalAyat;
            }

            return 1;
        };

        const scrollToGlobalAyat = (globalAyat, behavior = "auto") => {
            const container = ayatScrollContainer.value;
            if (!container || !globalAyat) return;

            const target = container.querySelector(`.ayat-item[data-global="${globalAyat}"]`);
            if (!target) return;
            target.scrollIntoView({ block: "center", behavior });
        };

        const updateActiveAyat = async (globalAyat, persist = true) => {
            const globalNum = Number(globalAyat || 0);
            if (!globalNum) return;
            const fromWindow = daftarAyat.value.find((a) => Number(a.globalAyat) === globalNum) || null;
            if (!fromWindow) return;

            const isSameAyat = activeAyatGlobal.value === globalNum;
            if (!isSameAyat) {
                activeAyatGlobal.value = globalNum;
                activeAyatInfo.value = fromWindow;
            } else if (!activeAyatInfo.value) {
                activeAyatInfo.value = fromWindow;
            }

            if (persist && fromWindow) {
                saveLastReadPosition(fromWindow);
            }

            if (!isSameAyat) {
                maybeShiftQuranWindow(globalNum);
            }
        };

        const detectFocusedAyat = () => {
            const container = ayatScrollContainer.value;
            if (!container || !daftarAyat.value.length) return;

            const ayatEls = Array.from(container.querySelectorAll(".ayat-item[data-global]"));
            if (!ayatEls.length) return;

            const containerRect = container.getBoundingClientRect();
            const focusY = containerRect.top + container.clientHeight * 0.34;
            let nearestGlobal = null;
            let nearestDistance = Number.POSITIVE_INFINITY;

            ayatEls.forEach((el) => {
                const rect = el.getBoundingClientRect();
                if (rect.bottom < containerRect.top || rect.top > containerRect.bottom) return;

                const markerY = rect.top + Math.min(rect.height * 0.35, 52);
                const distance = Math.abs(markerY - focusY);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestGlobal = Number(el.dataset.global || 0);
                }
            });

            if (nearestGlobal) {
                updateActiveAyat(nearestGlobal, true);
            }
        };

        const onAyatScroll = () => {
            if (focusFrameId) cancelAnimationFrame(focusFrameId);
            focusFrameId = requestAnimationFrame(() => {
                detectFocusedAyat();
                focusFrameId = 0;
            });
        };

        const refreshQuranWindow = async (db, centerGlobalAyat, { initial = false } = {}) => {
            const center = Math.max(1, Math.min(Number(centerGlobalAyat || 1), Number(quranTotalAyat.value || 6236)));

            if (!initial) isWindowRefreshing.value = true;

            try {
                const result = await getAyatWindowByGlobal(db, center, WINDOW_BEHIND, WINDOW_AHEAD);
                daftarAyat.value = result.rows;
                quranWindowStart.value = result.start;
                quranWindowEnd.value = result.end;

                await nextTick();
                scrollToGlobalAyat(center, "auto");
                await updateActiveAyat(center, false);
                detectFocusedAyat();
            } finally {
                isWindowRefreshing.value = false;
            }
        };

        const maybeShiftQuranWindow = async (globalAyat) => {
            const g = Number(globalAyat || 0);
            if (!g || isShiftingWindow || loading.value || !daftarAyat.value.length) return;

            const nearTop = g - quranWindowStart.value <= WINDOW_SHIFT_THRESHOLD && quranWindowStart.value > 1;
            const nearBottom = quranWindowEnd.value - g <= WINDOW_SHIFT_THRESHOLD && quranWindowEnd.value < quranTotalAyat.value;

            if (!nearTop && !nearBottom) return;

            isShiftingWindow = true;
            try {
                const db = await openQuranDB();
                await refreshQuranWindow(db, g, { initial: false });
            } finally {
                isShiftingWindow = false;
            }
        };

        const initQuranReader = async () => {
            let initialGlobal = 1;
            loading.value = true;
            try {
                const db = await ensureQuranDataReady();
                initialGlobal = await getInitialGlobalAyat(db);
                await refreshQuranWindow(db, initialGlobal, { initial: true });
                persistCurrentReadPosition();
            } catch (e) {
                console.error("Gagal menyiapkan data Quran di IndexedDB", e);
                alert("Gagal menyiapkan data Quran offline.");
            } finally {
                loading.value = false;
                await nextTick();
                scrollToGlobalAyat(initialGlobal, "auto");
                detectFocusedAyat();
            }
        };

        const save = () => {
            localStorage.setItem("arabicSettings", JSON.stringify(settings));
        };

        const tampilkanAcak = () => {
            const db = window.databaseKalimat;
            if (db) {
                currentKalimat.value = db[Math.floor(Math.random() * db.length)];
                showStructure.value = false;
            }
        };

        const changeName = () => {
            const n = prompt("Sinten asmane panjenengan? (Nama):", settings.userName);
            if (n) {
                settings.userName = n;
                save();
            }
        };

        const toggleSetting = (k) => {
            settings[k] = !settings[k];
            save();
        };

        const toggleGundul = () => {
            settings.isGundul = !settings.isGundul;
            save();
        };

        const tutupSplash = () => {
            showSplash.value = false;
        };

        onMounted(() => {
            const saved = localStorage.getItem("arabicSettings");
            if (saved) Object.assign(settings, JSON.parse(saved));

            const isSplashShownInSession = sessionStorage.getItem(SPLASH_SESSION_KEY) === "1";
            if (!isSplashShownInSession) {
                showSplash.value = true;
                sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
                setTimeout(() => {
                    showSplash.value = false;
                }, 3000);
            }

            if (window.databaseKalimat) {
                window.databaseKalimat = window.databaseKalimat.map((i) => ({
                    ...i,
                    gundul: i.ar.replace(/[\u064B-\u0652\u0670]/g, ""),
                }));
            }

            tampilkanAcak();
            initQuranReader();

            window.addEventListener("beforeunload", onBeforeUnload);
            document.addEventListener("visibilitychange", onVisibilityChange);
        });

        onBeforeUnmount(() => {
            window.removeEventListener("beforeunload", onBeforeUnload);
            document.removeEventListener("visibilitychange", onVisibilityChange);
        });

        return {
            currentMode,
            currentKalimat,
            showStructure,
            settings,
            loading,
            daftarAyat,
            activeAyatInfo,
            activeAyatGlobal,
            activeSurahTitle,
            getSurahLatinName,
            getSurahArabicName,
            ayatScrollContainer,
            quranWindowStart,
            quranWindowEnd,
            quranTotalAyat,
            isWindowRefreshing,
            syncStatus,
            isSyncing,
            syncPercent,
            syncCurrent,
            syncTotal,
            showSplash,
            tampilkanAcak,
            changeName,
            toggleSetting,
            toggleGundul,
            tutupSplash,
            onAyatScroll,
        };
    },
}).mount("#app");
