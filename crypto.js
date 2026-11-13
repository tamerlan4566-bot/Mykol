const VaultCrypto = (() => {
    // Автономное шифрование (работает и по HTTP в TrebEdit, и по HTTPS на GitHub)
    function cipherText(text, key) {
        let out = [];
        for (let i = 0; i < text.length; i++) {
            const tCode = text.charCodeAt(i);
            const kCode = key.charCodeAt(i % key.length) + (i % 13);
            out.push((tCode ^ kCode).toString(16).padStart(4, "0"));
        }
        return out.join("");
    }

    function decipherText(hex, key) {
        let out = "";
        for (let i = 0; i < hex.length; i += 4) {
            const cCode = parseInt(hex.substr(i, 4), 16);
            const idx = i / 4;
            const kCode = key.charCodeAt(idx % key.length) + (idx % 13);
            out += String.fromCharCode(cCode ^ kCode);
        }
        return out;
    }

    async function encryptData(dataObj, secretPhrase) {
        const json = JSON.stringify({ check: "CBI_OK", payload: dataObj });
        return cipherText(json, secretPhrase);
    }

    async function decryptData(packedString, secretPhrase) {
        if (!packedString) return null;
        try {
            const raw = decipherText(packedString, secretPhrase);
            const parsed = JSON.parse(raw);
            if (parsed.check !== "CBI_OK") return null;
            return parsed.payload;
        } catch {
            return null;
        }
    }

    // Проверка секретных комбинаций без хранения их открытым текстом
    function checkTrigger(input) {
        const codes = Array.from(input).map(c => c.charCodeAt(0)).join(",");
        if (codes === "54,55,43,53,50,43,51,51,41") return "real";   // 67+52+33)
        if (codes === "54,55,43,54,55") return "decoy";              // 67+67
        if (codes === "55,55,55,43,55,55,55") return "backup";       // 777+777
        return null;
    }

    return { encryptData, decryptData, checkTrigger };
})();
