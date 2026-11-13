const STORAGE_REAL = "calc_sys_cache_v1";
const STORAGE_DECOY = "calc_sys_cache_v2";

// Настройки облачного шлюза Google Диска
const CLOUD_API_URL = "https://script.google.com/macros/s/AKfycbxNWg3hawGwR6sPU1brjV7JqU5YI2hHLiBRphFjQ_n9OYSURPNIKvVzPTnbxMh0ng2Nig/exec";
const CLOUD_TOKEN = "cbi_secret_777";
const CLOUD_FILE_NAME = "cbi_calculator_backup.json";

let currentInput = "";
let activeMode = null;
let activeKey = null;
let vaultData = { passwords: [], notes: [] };

const displayEl = document.getElementById("calc-display");
const historyEl = document.getElementById("calc-history");
const vaultScreenEl = document.getElementById("vault-screen");
const screens = {
    calc: document.getElementById("calc-screen"),
    vault: vaultScreenEl,
    backup: document.getElementById("backup-screen")
};

function switchScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove("active"));
    screens[name].classList.add("active");
}

function updateDisplay() {
    displayEl.textContent = currentInput || "0";
}

function lockAll() {
    activeMode = null;
    activeKey = null;
    vaultData = { passwords: [], notes: [] };
    currentInput = "";
    historyEl.textContent = "";
    updateDisplay();
    document.getElementById("passwords-list").innerHTML = "";
    document.getElementById("notes-list").innerHTML = "";
    document.getElementById("modal-password").classList.remove("active");
    document.getElementById("modal-note").classList.remove("active");
    switchScreen("calc");
}

document.addEventListener("visibilitychange", () => { if (document.hidden) lockAll(); });
window.addEventListener("blur", lockAll);
document.getElementById("lock-vault-btn").addEventListener("click", lockAll);
document.getElementById("close-backup-btn").addEventListener("click", lockAll);

function generateFakeFbiData() {
    const r = () => Math.floor(1000 + Math.random() * 9000);
    return {
        passwords: [
            { service: "Пентагон (Гостевой Wi-Fi)", login: "agent_mulder_99", secret: "AliensExist!" + r() },
            { service: "Секретный бункер Зоны 51", login: "ufo_driver@fbi.gov", secret: "DontTouchRedBtn_" + r() },
            { service: "Клуб любителей голубей", login: "kurlik_boss", secret: "SemechkiTop2026_" + r() },
            { service: "Отдел по борьбе с ленью", login: "rabotyaga_pro", secret: "ZavtraNachnu_" + r() }
        ],
        notes: [
            { title: "ДЕЛО №404: ПРОПАВШИЙ НОСОК", body: "Подозреваемый — стиральная машина. Левый носок исчез в 03:14 ночи без следов взлома. Ведётся скрытое наблюдение за сушилкой.", date: "01.04.2026" },
            { title: "ОПЕРАЦИЯ «ПЕЛЬМЕНЬ»", body: "Агент Смит доложил: если варить пельмени 7 минут вместо 5, они обретают коллективный разум. Срочно съесть все улики со сметаной.", date: "19.07.2026" },
            { title: "ДОСЬЕ НА ГОЛУБЯ ГЕННАДИЯ", body: "Птица подозрительно долго смотрела в окно штаб-квартиры. Пробить по базе: либо шпион, либо просто выпрашивает хлеб.", date: "02.09.2026" },
            { title: "ПЛАН ЗАХВАТА ДИВАНА", body: "Этап 1: прилечь ровно на 5 минут. Этап 2: проснуться через 4 часа и пытаться вспомнить, какой сейчас век.", date: "13.11.2026" }
        ]
    };
}

document.querySelector(".calc-keypad").addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const val = btn.dataset.val;
    const action = btn.dataset.action;

    if (val) {
        if (currentInput === "Error") currentInput = "";
        currentInput += val;
        updateDisplay();
        return;
    }
    if (action === "clear") {
        currentInput = "";
        historyEl.textContent = "";
        updateDisplay();
    } else if (action === "backspace") {
        currentInput = currentInput === "Error" ? "" : currentInput.slice(0, -1);
        updateDisplay();
    } else if (action === "equals") {
        await handleEquals();
    }
});

async function handleEquals() {
    if (!currentInput) return;
    if (typeof VaultCrypto !== "undefined") {
        const trigger = VaultCrypto.checkTrigger(currentInput);
        if (trigger === "real") return openVault("real", currentInput);
        if (trigger === "decoy") return openVault("decoy", currentInput);
        if (trigger === "backup") {
            currentInput = "";
            updateDisplay();
            return switchScreen("backup");
        }
    }
    try {
        if (!/^[0-9+\-*/().\s]+$/.test(currentInput)) throw new Error();
        const result = Function('"use strict";return (' + currentInput + ')')();
        if (!isFinite(result)) throw new Error();
        historyEl.textContent = currentInput + " =";
        currentInput = String(Number(result.toFixed(8)));
        updateDisplay();
    } catch {
        historyEl.textContent = currentInput;
        currentInput = "Error";
        updateDisplay();
    }
}

async function openVault(mode, phrase) {
    activeMode = mode;
    activeKey = phrase;
    const raw = localStorage.getItem(mode === "real" ? STORAGE_REAL : STORAGE_DECOY);

    if (raw) {
        vaultData = (await VaultCrypto.decryptData(raw, phrase)) || { passwords: [], notes: [] };
    } else {
        vaultData = { passwords: [], notes: [] };
    }

    if (mode === "decoy" && vaultData.passwords.length === 0 && vaultData.notes.length === 0) {
        vaultData = generateFakeFbiData();
        await saveVault();
    } else if (!raw) {
        await saveVault();
    }

    const label = document.getElementById("vault-mode-label");
    const sub = document.getElementById("vault-sub-label");
    if (mode === "real") {
        vaultScreenEl.classList.remove("fbi-theme");
        label.textContent = "КОНСУЛЬТАНТ КБР";
        sub.textContent = "ЧАЙНЫЙ АРХИВ // ДОПУСК №1";
    } else {
        vaultScreenEl.classList.add("fbi-theme");
        label.textContent = "FBI DATABASE // PUBLIC";
        sub.textContent = "CLEARANCE: GUEST-1 [MONITORED]";
    }

    currentInput = "";
    updateDisplay();
    renderVault();
    switchScreen("vault");
}

async function saveVault() {
    if (!activeMode || !activeKey) return;
    const encrypted = await VaultCrypto.encryptData(vaultData, activeKey);
    localStorage.setItem(activeMode === "real" ? STORAGE_REAL : STORAGE_DECOY, encrypted);
}

const tabPass = document.getElementById("tab-passwords");
const tabNotes = document.getElementById("tab-notes");
const secPass = document.getElementById("section-passwords");
const secNotes = document.getElementById("section-notes");

tabPass.addEventListener("click", () => {
    tabPass.classList.add("active"); tabNotes.classList.remove("active");
    secPass.classList.add("active"); secNotes.classList.remove("active");
});
tabNotes.addEventListener("click", () => {
    tabNotes.classList.add("active"); tabPass.classList.remove("active");
    secNotes.classList.add("active"); secPass.classList.remove("active");
});

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

function renderVault() {
    const passList = document.getElementById("passwords-list");
    const notesList = document.getElementById("notes-list");
    passList.innerHTML = "";
    notesList.innerHTML = "";

    vaultData.passwords.forEach((item, index) => {
        const card = document.createElement("div");
        card.className = "pass-card";
        card.innerHTML = `
            <div class="pass-card-top">
                <span class="pass-service">${escapeHtml(item.service)}</span>
                <button class="mini-btn del" data-del-pass="${index}">Удалить</button>
            </div>
            <div class="pass-row"><span>${escapeHtml(item.login)}</span><button class="mini-btn" data-copy="${escapeHtml(item.login)}">Копия</button></div>
            <div class="pass-row"><span>${escapeHtml(item.secret)}</span><button class="mini-btn" data-copy="${escapeHtml(item.secret)}">Копия</button></div>
        `;
        passList.appendChild(card);
    });

    vaultData.notes.forEach((item, index) => {
        const note = document.createElement("div");
        note.className = "note-card";
        note.innerHTML = `
            <div class="note-title">${escapeHtml(item.title)}</div>
            <div class="note-date">DATE: ${escapeHtml(item.date)}</div>
            <div class="note-body">${escapeHtml(item.body)}</div>
            <button class="mini-btn del" data-del-note="${index}">Уничтожить улику</button>
        `;
        notesList.appendChild(note);
    });
}

vaultScreenEl.addEventListener("click", async (e) => {
    if (e.target.dataset.copy !== undefined) {
        await navigator.clipboard.writeText(e.target.dataset.copy);
        const orig = e.target.textContent;
        e.target.textContent = "ОК";
        setTimeout(() => e.target.textContent = orig, 900);
    } else if (e.target.dataset.delPass !== undefined) {
        vaultData.passwords.splice(Number(e.target.dataset.delPass), 1);
        await saveVault(); renderVault();
    } else if (e.target.dataset.delNote !== undefined) {
        vaultData.notes.splice(Number(e.target.dataset.delNote), 1);
        await saveVault(); renderVault();
    }
});

const modalPass = document.getElementById("modal-password");
document.getElementById("open-pass-modal").addEventListener("click", () => modalPass.classList.add("active"));
document.getElementById("cancel-pass-btn").addEventListener("click", () => modalPass.classList.remove("active"));
document.getElementById("save-pass-btn").addEventListener("click", async () => {
    const service = document.getElementById("pass-service").value.trim();
    const login = document.getElementById("pass-login").value.trim();
    const secret = document.getElementById("pass-secret").value.trim();
    if (!service || !secret) return;
    vaultData.passwords.unshift({ service, login, secret });
    await saveVault(); renderVault();
    document.getElementById("pass-service").value = "";
    document.getElementById("pass-login").value = "";
    document.getElementById("pass-secret").value = "";
    modalPass.classList.remove("active");
});

const modalNote = document.getElementById("modal-note");
document.getElementById("open-note-modal").addEventListener("click", () => modalNote.classList.add("active"));
document.getElementById("cancel-note-btn").addEventListener("click", () => modalNote.classList.remove("active"));
document.getElementById("save-note-btn").addEventListener("click", async () => {
    const title = document.getElementById("note-title").value.trim() || "БЕЗ НАЗВАНИЯ";
    const body = document.getElementById("note-body").value.trim();
    if (!body) return;
    vaultData.notes.unshift({ title, body, date: new Date().toLocaleDateString("ru-RU") });
    await saveVault(); renderVault();
    document.getElementById("note-title").value = "";
    document.getElementById("note-body").value = "";
    modalNote.classList.remove("active");
});

// === ОБЛАЧНЫЙ БЭКАП НА GOOGLE ДИСК ===
const statusEl = document.getElementById("cloud-status");

document.getElementById("cloud-save-btn").addEventListener("click", async () => {
    statusEl.textContent = "Шифрование и отправка на Google Диск...";
    try {
        const payload = JSON.stringify({
            v: 1,
            updated: new Date().toISOString(),
            real: localStorage.getItem(STORAGE_REAL),
            decoy: localStorage.getItem(STORAGE_DECOY)
        });
        const res = await fetch(CLOUD_API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                token: CLOUD_TOKEN,
                action: "save",
                fileName: CLOUD_FILE_NAME,
                data: payload
            })
        });
        const json = await res.json();
        statusEl.textContent = json.ok
            ? "Успешно сохранено в папку PWA_Backups!"
            : "Ошибка: " + (json.error || "сбой");
    } catch {
        statusEl.textContent = "Ошибка сети. Проверь интернет.";
    }
});

document.getElementById("cloud-load-btn").addEventListener("click", async () => {
    statusEl.textContent = "Поиск слепка на Google Диске...";
    try {
        const res = await fetch(CLOUD_API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                token: CLOUD_TOKEN,
                action: "load",
                fileName: CLOUD_FILE_NAME
            })
        });
        const json = await res.json();
        if (!json.ok) {
            statusEl.textContent = "Ошибка: " + (json.error || "файл не найден");
            return;
        }
        const data = JSON.parse(json.data);
        if (data.real) localStorage.setItem(STORAGE_REAL, data.real);
        if (data.decoy) localStorage.setItem(STORAGE_DECOY, data.decoy);
        statusEl.textContent = "База успешно восстановлена из облака!";
    } catch {
        statusEl.textContent = "Ошибка загрузки. Проверь интернет.";
    }
});

// Локальный экспорт / импорт
document.getElementById("export-btn").addEventListener("click", () => {
    const payload = { v: 1, real: localStorage.getItem(STORAGE_REAL), decoy: localStorage.getItem(STORAGE_DECOY) };
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `calc_backup_${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
});

document.getElementById("import-input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            if (data.real) localStorage.setItem(STORAGE_REAL, data.real);
            if (data.decoy) localStorage.setItem(STORAGE_DECOY, data.decoy);
            statusEl.textContent = "База восстановлена из файла.";
        } catch { statusEl.textContent = "Ошибка чтения файла."; }
    };
    reader.readAsText(file);
});

if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist();
}
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
}
// END_APP
