// Language Database: ISO code to Language Name
const languages = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ru": "Russian",
    "zh-CN": "Chinese (Simplified)",
    "zh-TW": "Chinese (Traditional)",
    "ja": "Japanese",
    "ko": "Korean",
    "ar": "Arabic",
    "hi": "Hindi",
    "bn": "Bengali",
    "nl": "Dutch",
    "tr": "Turkish",
    "vi": "Vietnamese",
    "pl": "Polish",
    "sv": "Swedish",
    "el": "Greek",
    "ur": "Urdu"
};
// DOM References
const sourceLangSelect = document.getElementById("source-lang");
const targetLangSelect = document.getElementById("target-lang");
const sourceTextarea = document.getElementById("source-text");
const targetTextarea = document.getElementById("target-text");
const swapBtn = document.getElementById("swap-langs");
const clearTextBtn = document.getElementById("clear-text");
const translateBtn = document.getElementById("translate-btn");
const autoTranslateToggle = document.getElementById("auto-translate-toggle");
const loader = document.getElementById("loader");
const srcVoiceBtn = document.getElementById("src-voice-btn");
const srcSpeakBtn = document.getElementById("src-speak-btn");
const tgtSpeakBtn = document.getElementById("tgt-speak-btn");
const srcCopyBtn = document.getElementById("src-copy-btn");
const tgtCopyBtn = document.getElementById("tgt-copy-btn");
const charCountSpan = document.getElementById("char-count");
const translationStatus = document.getElementById("translation-status");
const historyList = document.getElementById("history-list");
const clearHistoryBtn = document.getElementById("clear-history-btn");
const themeToggle = document.getElementById("theme-toggle");
const toast = document.getElementById("toast");
const toastMessage = document.getElementById("toast-message");
// New DOM References for Enhancements
const voiceWaveContainer = document.getElementById("voice-wave-container");
const wordCountSpan = document.getElementById("word-count");
const sentenceCountSpan = document.getElementById("sentence-count");
const readingTimeSpan = document.getElementById("reading-time");
const pinTranslationBtn = document.getElementById("pin-translation-btn");
const downloadBtn = document.getElementById("download-btn");
const shareBtn = document.getElementById("share-btn");
const phrasebookList = document.getElementById("phrasebook-list");
const clearPhrasebookBtn = document.getElementById("clear-phrasebook-btn");
const alternativesContainer = document.getElementById("alternatives-container");
const alternativesList = document.getElementById("alternatives-list");
const translationEngineSelect = document.getElementById("translation-engine");
// State variables
let debounceTimeout = null;
let recognition = null;
let isListening = false;
let appTheme = localStorage.getItem("lingopulse_theme") || "dark";
let translationRequestSeq = 0; // used to prevent out-of-order responses updating the UI
let detectedLangCode = ""; // stores the ISO code of detected language for speech synthesis
// Initialize Theme
document.documentElement.setAttribute("data-theme", appTheme);
updateThemeIcon();
// Initialize Speech Recognition (if browser supports it)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => {
        isListening = true;
        srcVoiceBtn.classList.add("listening");
        srcVoiceBtn.innerHTML = '<i class="fa-solid fa-microphone-lines"></i>';
        voiceWaveContainer.classList.remove("hidden");
        showToast("Listening... Speak now.", "success");
    };
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (sourceTextarea.value.trim() === "") {
            sourceTextarea.value = transcript;
        } else {
            sourceTextarea.value = sourceTextarea.value.trim() + " " + transcript;
        }
        sourceTextarea.dispatchEvent(new Event("input"));
    };
    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        showToast(`Speech recognition error: ${event.error}`, "error");
        stopListening();
    };
    recognition.onend = () => {
        stopListening();
    };
} else {
    srcVoiceBtn.style.opacity = "0.5";
    srcVoiceBtn.title = "Speech Recognition not supported in this browser";
}
// ----------------------------------------------------
// Event Listeners & Bootstrapping
// ----------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
    populateLanguageSelectors();
    loadHistory();
    loadPinned();
    loadParamsFromUrl();
    checkTextareaControls();
});
// Auto-Translate or Manual Translate Setup
sourceTextarea.addEventListener("input", () => {
    const text = sourceTextarea.value;
    charCountSpan.textContent = text.length;
    
    updateAnalytics(text);
    checkTextareaControls();
    
    if (autoTranslateToggle.checked) {
        if (debounceTimeout) clearTimeout(debounceTimeout);
        if (text.trim() === "") {
            targetTextarea.value = "";
            updateStatus("Ready", "");
            resetAutoDetectLabel();
            alternativesContainer.classList.add("hidden");
            return;
        }
        updateStatus("Typing...", "translating");
        debounceTimeout = setTimeout(() => {
            performTranslation();
        }, 600);
    }
});
// Manual Translate Trigger
translateBtn.addEventListener("click", () => {
    performTranslation();
});
// Clear Text Action
clearTextBtn.addEventListener("click", () => {
    sourceTextarea.value = "";
    targetTextarea.value = "";
    charCountSpan.textContent = "0";
    updateAnalytics("");
    checkTextareaControls();
    updateStatus("Ready", "");
    resetAutoDetectLabel();
    alternativesContainer.classList.add("hidden");
    if (debounceTimeout) clearTimeout(debounceTimeout);
    window.speechSynthesis.cancel();
    resetSpeakButtons();
});
// Swap Languages Action
swapBtn.addEventListener("click", () => {
    swapBtn.classList.add("clicked");
    setTimeout(() => swapBtn.classList.remove("clicked"), 400);
    const tempLang = sourceLangSelect.value;
    const newTarget = (tempLang === "auto" && detectedLangCode) ? detectedLangCode : tempLang;
    
    sourceLangSelect.value = targetLangSelect.value;
    targetLangSelect.value = newTarget;
    const sourceVal = sourceTextarea.value;
    const targetVal = targetTextarea.value;
    if (targetVal.startsWith("[Error]")) {
        sourceTextarea.value = "";
        targetTextarea.value = sourceVal;
    } else {
        sourceTextarea.value = targetVal;
        targetTextarea.value = sourceVal;
    }
    charCountSpan.textContent = sourceTextarea.value.length;
    updateAnalytics(sourceTextarea.value);
    checkTextareaControls();
    resetAutoDetectLabel();
    if (sourceTextarea.value.trim() !== "") {
        performTranslation();
    }
});
// Change Language selection triggers translation if text exists
sourceLangSelect.addEventListener("change", () => {
    resetAutoDetectLabel();
    if (sourceTextarea.value.trim() !== "") {
        performTranslation();
    }
});
targetLangSelect.addEventListener("change", () => {
    if (sourceTextarea.value.trim() !== "") {
        performTranslation();
    }
});
// Speech Recognition Trigger
srcVoiceBtn.addEventListener("click", () => {
    if (!recognition) {
        showToast("Voice input is not supported in this browser. Try Chrome/Edge.", "error");
        return;
    }
    if (isListening) {
        recognition.stop();
    } else {
        recognition.lang = sourceLangSelect.value === "auto" ? "en-US" : sourceLangSelect.value;
        recognition.start();
    }
});
// Text-to-Speech Speakers
srcSpeakBtn.addEventListener("click", () => {
    speakText(sourceTextarea.value, sourceLangSelect.value, srcSpeakBtn);
});
tgtSpeakBtn.addEventListener("click", () => {
    speakText(targetTextarea.value, targetLangSelect.value, tgtSpeakBtn);
});
// Copy Buttons
srcCopyBtn.addEventListener("click", () => {
    copyToClipboard(sourceTextarea.value, "Source text copied!");
});
tgtCopyBtn.addEventListener("click", () => {
    copyToClipboard(targetTextarea.value, "Translation copied!");
});
// Pin Translation Button
pinTranslationBtn.addEventListener("click", () => {
    togglePin();
});
// Download Translation Button
downloadBtn.addEventListener("click", () => {
    downloadTranslation();
});
// Share Link Button
shareBtn.addEventListener("click", () => {
    shareTranslation();
});
// Theme Toggle Action
themeToggle.addEventListener("click", () => {
    appTheme = appTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", appTheme);
    localStorage.setItem("lingopulse_theme", appTheme);
    updateThemeIcon();
});
// Clear History Action
clearHistoryBtn.addEventListener("click", () => {
    localStorage.removeItem("lingopulse_history");
    loadHistory();
    showToast("History cleared!", "success");
});
// Clear Phrasebook Action
clearPhrasebookBtn.addEventListener("click", () => {
    localStorage.removeItem("lingopulse_pinned");
    loadPinned();
    checkPinStatus();
    showToast("Phrasebook cleared!", "success");
});
// ----------------------------------------------------
// Core Functions
// ----------------------------------------------------
// Populate Language Dropdowns
function populateLanguageSelectors() {
    let sourceHtml = `<option value="auto">Auto-Detect Language</option>`;
    let targetHtml = "";
    const sortedLangs = Object.entries(languages).sort((a, b) => a[1].localeCompare(b[1]));
    sortedLangs.forEach(([code, name]) => {
        sourceHtml += `<option value="${code}">${name}</option>`;
        targetHtml += `<option value="${code}">${name}</option>`;
    });
    sourceLangSelect.innerHTML = sourceHtml;
    targetLangSelect.innerHTML = targetHtml;
    // Set defaults
    sourceLangSelect.value = "auto"; // Default to auto-detect
    targetLangSelect.value = "es"; // Spanish
}
// Reset Auto-Detect dropdown label
function resetAutoDetectLabel() {
    const autoOpt = sourceLangSelect.querySelector('option[value="auto"]');
    if (autoOpt) {
        autoOpt.textContent = "Auto-Detect Language";
    }
}
// Helper to decode HTML entities returned by MyMemory API (e.g. &#39; to ')
function decodeHtml(html) {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}
// Heuristic to detect crowdsourced translation memory spam/low-quality matches
function isTranslationSpam(input, translation) {
    if (!translation) return true;
    
    // 1. If translation is disproportionately longer than the input (e.g. 5x longer for short strings)
    if (input.length < 15 && translation.length > input.length * 4 + 12) {
        return true;
    }
    
    // 2. Typical MyMemory crowdsourced spam strings
    const spamPatterns = [
        "http", "www.", "click here", "free translation", "machine translation", 
        "translated by", "contribute to", "please translate", "mymemory"
    ];
    const transLower = translation.toLowerCase();
    const inputLower = input.toLowerCase();
    
    // If the input doesn't contain the spam pattern but translation does, it is likely spam
    for (const pat of spamPatterns) {
        if (transLower.includes(pat) && !inputLower.includes(pat)) {
            return true;
        }
    }
    
    return false;
}
// Select the best translation from MyMemory API matches to prevent crowdsourced spam
function getBestTranslation(data, inputText) {
    const defaultText = data.responseData ? data.responseData.translatedText : "";
    
    if (!data.matches || data.matches.length === 0) {
        return defaultText;
    }
    // Filter Machine Translation (MT) matches
    const mtMatches = data.matches.filter(m => {
        const creator = m["created-by"] || m.createdBy || "";
        return creator === "MT" || 
               creator === "mymemory-mt" || 
               creator === "Machine Translation" || 
               creator === "MT!" ||
               m.id === "0" || 
               m.id === 0;
    });
    // Check if the API's default translation is clean and non-spam
    if (defaultText && !isTranslationSpam(inputText, defaultText) && !defaultText.startsWith("MYMEMORY WARNING")) {
        return defaultText;
    }
    // If default is spam or missing, pick the highest quality MT match
    if (mtMatches.length > 0) {
        const sortedMT = [...mtMatches].sort((a, b) => {
            const qA = parseFloat(a.quality) || 0;
            const qB = parseFloat(b.quality) || 0;
            return qB - qA;
        });
        return sortedMT[0].translation;
    }
    // If no MT match, pick the highest quality match that isn't spam
    const sortedAll = [...data.matches].sort((a, b) => {
        const qA = parseFloat(a.quality) || 0;
        const qB = parseFloat(b.quality) || 0;
        return qB - qA;
    });
    for (const match of sortedAll) {
        if (!isTranslationSpam(inputText, match.translation)) {
            return match.translation;
        }
    }
    return defaultText; // absolute fallback
}
// Populate alternative translations chips
function populateAlternatives(data, inputText, currentTranslation) {
    alternativesList.innerHTML = "";
    
    if (!data.matches || data.matches.length <= 1) {
        alternativesContainer.classList.add("hidden");
        return;
    }
    // Filter unique translation matches
    const uniqueAlts = [];
    data.matches.forEach(match => {
        const altText = decodeHtml(match.translation).trim();
        if (altText && 
            altText.toLowerCase() !== currentTranslation.toLowerCase() && 
            !altText.startsWith("MYMEMORY WARNING") &&
            !isTranslationSpam(inputText, altText) &&
            !uniqueAlts.includes(altText)) {
            uniqueAlts.push(altText);
        }
    });
    if (uniqueAlts.length === 0) {
        alternativesContainer.classList.add("hidden");
        return;
    }
    // Display top 3 alternatives as chips
    uniqueAlts.slice(0, 3).forEach(altText => {
        const chip = document.createElement("button");
        chip.className = "alt-chip";
        chip.textContent = altText;
        chip.title = "Click to use this translation";
        chip.addEventListener("click", () => {
            targetTextarea.value = altText;
            checkTextareaControls();
            showToast("Alternative translation selected!", "success");
            saveToHistory(inputText, altText, sourceLangSelect.value, targetLangSelect.value);
        });
        alternativesList.appendChild(chip);
    });
    alternativesContainer.classList.remove("hidden");
}
// Lightweight meaning-drift heuristic for back-translation validation.
// Score range: 0 (perfect) .. 1 (very different)
function computeMeaningDriftScore(originalEn, backTranslatedEn) {
    if (!originalEn || !backTranslatedEn) return 1;
    const norm = (s) => s.toLowerCase().trim().replace(/\s+/g, ' ');
    const a = norm(originalEn);
    const b = norm(backTranslatedEn);
    if (!a || !b) return 1;

    // Token Jaccard similarity (higher is better)
    const tokens = (s) => s.split(/[^a-z0-9]+/).filter(Boolean);
    const ta = tokens(a);
    const tb = tokens(b);
    if (ta.length === 0 || tb.length === 0) return 1;

    const setA = new Set(ta);
    const setB = new Set(tb);
    const inter = [...setA].filter(x => setB.has(x)).length;
    const union = new Set([...ta, ...tb]).size || 1;
    const jaccard = inter / union; // 0..1

    // Penalize length divergence
    const lenRatio = Math.max(ta.length, tb.length) / Math.max(1, Math.min(ta.length, tb.length));
    const lenPenalty = Math.min(1, (lenRatio - 1) / 3); // 0..1 (soft)

    // Drift = 1 - similarity with extra penalty
    const similarity = Math.min(1, jaccard * 1.1);
    const drift = Math.max(0, Math.min(1, (1 - similarity) + lenPenalty * 0.35));
    return drift;
}

function shouldTryRetry(driftScore) {
    // Tunable threshold.
    return driftScore >= 0.35;
}

async function translateWithEngine(engine, text, sourceLang, targetLang) {
    // Currently:
    // - mymemory: existing MyMemory endpoint
    // - llm/deepl/gemini: use backend if configured, otherwise throw.

    if (engine === 'mymemory') {
        const queryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}&de=lingopulse_app@gmail.com`;
        const response = await fetch(queryUrl);
        if (!response.ok) throw new Error(`Server returned status ${response.status}`);
        const data = await response.json();
        if (data.responseStatus && data.responseStatus !== 200) {
            throw new Error(data.responseDetails || `API Error: Status ${data.responseStatus}`);
        }
        const translatedRaw = getBestTranslation(data, text);
        const translated = decodeHtml(translatedRaw);
        return { translated, data };
    }

    // Premium engines: call local backend (if running)
    const backendBase = 'http://localhost:3000';
    const res = await fetch(`${backendBase}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            engine,
            text,
            sourceLang,
            targetLang,
            glossaryTerms: []
        })
    });
    if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Backend translate failed (HTTP ${res.status})`);
    }
    const out = await res.json();
    if (!out.translated) throw new Error('Backend did not return translated text');
    return { translated: decodeHtml(out.translated), data: out };
}

async function backTranslate(engine, text, sourceLang, targetLang) {
    // We back-translate from targetLang -> sourceLang.
    // The drift heuristic is implemented over English back-translation.
    // For non-English sourceLang, you still get an EN drift check only if your pipeline returns EN.

    if (engine === 'mymemory') {
        const queryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${targetLang}|${sourceLang}&de=lingopulse_app@gmail.com`;
        const response = await fetch(queryUrl);
        if (!response.ok) throw new Error(`Server returned status ${response.status}`);
        const data = await response.json();
        if (data.responseStatus && data.responseStatus !== 200) {
            throw new Error(data.responseDetails || `API Error: Status ${data.responseStatus}`);
        }
        const translatedRaw = getBestTranslation(data, text);
        return decodeHtml(translatedRaw);
    }

    const backendBase = 'http://localhost:3000';
    const res = await fetch(`${backendBase}/backtranslate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            engine,
            text,
            sourceLang,
            targetLang
        })
    });
    if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Backend backtranslate failed (HTTP ${res.status})`);
    }
    const out = await res.json();
    if (!out.translated) throw new Error('Backend did not return back-translated text');
    return decodeHtml(out.translated);
}

// Perform Translation Request
async function performTranslation() {
    const requestSeq = ++translationRequestSeq;
    const text = sourceTextarea.value.trim();
    const sourceLang = sourceLangSelect.value;
    const targetLang = targetLangSelect.value;
    if (!text) {
        targetTextarea.value = "";
        updateStatus("Ready", "");
        alternativesContainer.classList.add("hidden");
        return;
    }

    loader.classList.remove("hidden");
    updateStatus("Translating...", "translating");
    translateBtn.disabled = true;

    // Engine routing (use dropdown)
    // UI options are currently: google, mymemory. We map them.
    const uiEngine = translationEngineSelect ? translationEngineSelect.value : 'mymemory';
    const primaryEngine = (uiEngine === 'google') ? 'mymemory' : uiEngine;
    const retryEngine = 'mymemory';

    try {
        // 1) Candidate translation
        const { translated, data } = await translateWithEngine(primaryEngine, text, sourceLang, targetLang);
        if (requestSeq !== translationRequestSeq) return;

        updateStatus("Validating (back-translation)...", "translating");

        // 2) Back-translation (best effort)
        // Only meaningful drift check when original sourceLang is English.
        let driftScore = null;
        let finalTranslation = translated;
        let didRetry = false;

        try {
            // Heuristic: if sourceLang is auto, we can’t reliably back-translate.
            if (sourceLang !== 'auto' && sourceLang === 'en') {
                const back = await backTranslate(primaryEngine, finalTranslation, sourceLang, targetLang);
                driftScore = computeMeaningDriftScore(text, back);
            }
        } catch (btErr) {
            // Validation is best-effort; don’t fail the whole translation.
            console.warn('Back-translation validation failed:', btErr);
        }

        // 3) Decide accept vs retry
        if (driftScore !== null && shouldTryRetry(driftScore) && retryEngine !== primaryEngine) {
            didRetry = true;
            updateStatus('Low confidence — trying alternate engine...', 'translating');
            const retryOut = await translateWithEngine(retryEngine, text, sourceLang, targetLang);
            finalTranslation = retryOut.translated;
        }

        // 4) Finalize UI
        targetTextarea.value = finalTranslation;
        checkTextareaControls();
        updateStatus('Success' + (didRetry ? ' (validated)' : ''), 'success');

        // Populate alternatives only for MyMemory response format.
        if (primaryEngine === 'mymemory' && data && data.matches) {
            populateAlternatives(data, text, finalTranslation);
        } else {
            alternativesContainer.classList.add('hidden');
        }

        saveToHistory(text, finalTranslation, sourceLang, targetLang);

        if (driftScore !== null && driftScore >= 0.35) {
            showToast('Accuracy warning: meaning drift detected. Used validation/retry.', 'info');
        }
    } catch (error) {
        if (requestSeq !== translationRequestSeq) return;
        console.error('Translation failed:', error);
        targetTextarea.value = `[Error]: ${error.message}. Please check your connection or wait before translating again.`;
        updateStatus('Failed', 'error');
        alternativesContainer.classList.add('hidden');
        checkTextareaControls();
    } finally {
        if (requestSeq !== translationRequestSeq) return;
        loader.classList.add('hidden');
        translateBtn.disabled = false;
    }
}

// Check buttons visibility and disabled status
function checkTextareaControls() {
    const srcText = sourceTextarea.value.trim();
    const tgtText = targetTextarea.value.trim();
    // Clear Button
    if (sourceTextarea.value.length > 0) {
        clearTextBtn.style.opacity = "1";
        clearTextBtn.style.pointerEvents = "auto";
        srcSpeakBtn.disabled = false;
    } else {
        clearTextBtn.style.opacity = "0";
        clearTextBtn.style.pointerEvents = "none";
        srcSpeakBtn.disabled = true;
    }
    // Target controls activation
    const hasTranslation = tgtText.length > 0 && !tgtText.startsWith("[Error]");
    tgtSpeakBtn.disabled = !hasTranslation;
    downloadBtn.disabled = !hasTranslation;
    pinTranslationBtn.disabled = !hasTranslation;
    checkPinStatus();
}
// Update translation status indicator
function updateStatus(message, className) {
    translationStatus.textContent = message;
    translationStatus.className = "";
    if (className) {
        translationStatus.classList.add(className);
    }
}
// Copy Text to Clipboard
function copyToClipboard(text, message) {
    if (!text.trim() || text.startsWith("[Error]")) return;
    navigator.clipboard.writeText(text)
        .then(() => {
            showToast(message, "success");
        })
        .catch(err => {
            console.error("Clipboard copy failed: ", err);
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand("copy");
                showToast(message, "success");
            } catch (err2) {
                showToast("Failed to copy text", "error");
            }
            document.body.removeChild(textArea);
        });
}
// Speech Recognition Helper
function stopListening() {
    isListening = false;
    srcVoiceBtn.classList.remove("listening");
    srcVoiceBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
    voiceWaveContainer.classList.add("hidden");
}
// Text-to-Speech Engine
function speakText(text, langCode, button) {
    if (!text.trim() || text.startsWith("[Error]")) return;
    if (!('speechSynthesis' in window)) {
        showToast("Text-to-speech not supported in this browser", "error");
        return;
    }
    // Toggle speech: if already speaking, cancel and check if it's the same button clicked
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        if (button.classList.contains("speaking")) {
            resetSpeakButtons();
            return;
        }
    }
    resetSpeakButtons();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Fallback for auto language code
    let activeLang = langCode;
    if (langCode === "auto") {
        activeLang = detectedLangCode || "en";
    }
    let voices = window.speechSynthesis.getVoices();
    let matchingVoice = voices.find(voice => 
        voice.lang.toLowerCase() === activeLang.toLowerCase() || 
        voice.lang.toLowerCase().startsWith(activeLang.toLowerCase() + "-")
    );
    
    if (matchingVoice) {
        utterance.voice = matchingVoice;
    }
    utterance.lang = activeLang;
    
    utterance.onstart = () => {
        button.classList.add("speaking");
        button.innerHTML = '<i class="fa-solid fa-stop"></i>';
        button.title = "Stop listening";
    };
    utterance.onend = () => {
        button.classList.remove("speaking");
        button.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        button.title = "Listen";
    };
    utterance.onerror = () => {
        button.classList.remove("speaking");
        button.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        button.title = "Listen";
    };
    window.speechSynthesis.speak(utterance);
}
function resetSpeakButtons() {
    [srcSpeakBtn, tgtSpeakBtn].forEach(btn => {
        btn.classList.remove("speaking");
        btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        btn.title = "Listen";
    });
}
// Theme Icon updating helper
function updateThemeIcon() {
    const icon = themeToggle.querySelector("i");
    if (appTheme === "dark") {
        icon.className = "fa-solid fa-sun";
    } else {
        icon.className = "fa-solid fa-moon";
    }
}
// Toast Display Notification helper
function showToast(message, type = "success") {
    toastMessage.textContent = message;
    const icon = toast.querySelector(".toast-icon");
    
    if (type === "success") {
        icon.className = "fa-solid fa-check-circle toast-icon";
        icon.style.color = "var(--success-color)";
    } else if (type === "error") {
        icon.className = "fa-solid fa-triangle-exclamation toast-icon";
        icon.style.color = "var(--danger-color)";
    } else {
        icon.className = "fa-solid fa-info-circle toast-icon";
        icon.style.color = "var(--accent-secondary)";
    }
    toast.classList.remove("hidden");
    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    
    window.toastTimeout = setTimeout(() => {
        toast.classList.add("hidden");
    }, 2500);
}
// ----------------------------------------------------
// History Management
// ----------------------------------------------------
function saveToHistory(sourceText, targetText, sourceLang, targetLang) {
    if (sourceText.length < 2 || targetText.startsWith("[Error]")) return;
    let history = JSON.parse(localStorage.getItem("lingopulse_history")) || [];
    const exists = history.some(item => 
        item.sourceText.toLowerCase() === sourceText.toLowerCase() && 
        item.sourceLang === sourceLang && 
        item.targetLang === targetLang
    );
    if (exists) return;
    const newItem = {
        id: Date.now(),
        sourceText,
        targetText,
        sourceLang,
        targetLang,
        sourceLangName: languages[sourceLang] || "Auto-Detected",
        targetLangName: languages[targetLang] || targetLang
    };
    history.unshift(newItem);
    if (history.length > 10) {
        history.pop();
    }
    localStorage.setItem("lingopulse_history", JSON.stringify(history));
    loadHistory();
}
function loadHistory() {
    const history = JSON.parse(localStorage.getItem("lingopulse_history")) || [];
    
    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="history-empty">
                <i class="fa-solid fa-clock-rotate-left"></i>
                <p>Your translation history is empty. Start translating to see records here!</p>
            </div>
        `;
        clearHistoryBtn.disabled = true;
        return;
    }
    clearHistoryBtn.disabled = false;
    let listHtml = "";
    history.forEach(item => {
        const escSrc = escapeHtml(item.sourceText);
        const escTgt = escapeHtml(item.targetText);
        listHtml += `
            <div class="history-item" 
                 data-src-text="${escSrc}" 
                 data-tgt-text="${escTgt}" 
                 data-src-lang="${item.sourceLang}" 
                 data-tgt-lang="${item.targetLang}">
                <div class="hist-left">
                    <span class="hist-lang">${item.sourceLangName}</span>
                    <span class="hist-text" title="${escSrc}">${escSrc}</span>
                </div>
                <div class="hist-arrow">
                    <i class="fa-solid fa-angles-right"></i>
                </div>
                <div class="hist-right">
                    <span class="hist-lang">${item.targetLangName}</span>
                    <span class="hist-text" title="${escTgt}">${escTgt}</span>
                </div>
            </div>
        `;
    });
    historyList.innerHTML = listHtml;
    const items = historyList.querySelectorAll(".history-item");
    items.forEach(item => {
        item.addEventListener("click", () => {
            const srcText = item.getAttribute("data-src-text");
            const tgtText = item.getAttribute("data-tgt-text");
            const srcLang = item.getAttribute("data-src-lang");
            const tgtLang = item.getAttribute("data-tgt-lang");
            sourceLangSelect.value = srcLang;
            targetLangSelect.value = tgtLang;
            sourceTextarea.value = srcText;
            targetTextarea.value = tgtText;
            charCountSpan.textContent = srcText.length;
            updateAnalytics(srcText);
            checkTextareaControls();
            resetAutoDetectLabel();
            updateStatus("Restored", "success");
            showToast("Translation restored from history!", "success");
        });
    });
}
// ----------------------------------------------------
// Phrasebook Management (Pinned Translations)
// ----------------------------------------------------
function loadPinned() {
    const pinned = JSON.parse(localStorage.getItem("lingopulse_pinned")) || [];
    
    if (pinned.length === 0) {
        phrasebookList.innerHTML = `
            <div class="phrasebook-empty">
                <i class="fa-solid fa-star"></i>
                <p>Your phrasebook is empty. Pin translations to save them here!</p>
            </div>
        `;
        clearPhrasebookBtn.disabled = true;
        return;
    }
    clearPhrasebookBtn.disabled = false;
    let listHtml = "";
    pinned.forEach(item => {
        const escSrc = escapeHtml(item.sourceText);
        const escTgt = escapeHtml(item.targetText);
        listHtml += `
            <div class="history-item phrase-item" 
                 data-src-text="${escSrc}" 
                 data-tgt-text="${escTgt}" 
                 data-src-lang="${item.sourceLang}" 
                 data-tgt-lang="${item.targetLang}">
                <div class="hist-left">
                    <span class="hist-lang">${item.sourceLangName}</span>
                    <span class="hist-text" title="${escSrc}">${escSrc}</span>
                </div>
                <div class="hist-arrow" style="display: flex; flex-direction: column; gap: 0.5rem; align-items: center; justify-content: center;">
                    <i class="fa-solid fa-angles-right"></i>
                    <button class="unpin-btn" data-id="${item.id}" title="Remove from Phrasebook" style="background: none; border: none; color: var(--danger-color); cursor: pointer; font-size: 0.8rem; padding: 2px;">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
                <div class="hist-right">
                    <span class="hist-lang">${item.targetLangName}</span>
                    <span class="hist-text" title="${escTgt}">${escTgt}</span>
                </div>
            </div>
        `;
    });
    phrasebookList.innerHTML = listHtml;
    const items = phrasebookList.querySelectorAll(".phrase-item");
    items.forEach(item => {
        item.addEventListener("click", (e) => {
            if (e.target.closest(".unpin-btn")) return;
            
            const srcText = item.getAttribute("data-src-text");
            const tgtText = item.getAttribute("data-tgt-text");
            const srcLang = item.getAttribute("data-src-lang");
            const tgtLang = item.getAttribute("data-tgt-lang");
            sourceLangSelect.value = srcLang;
            targetLangSelect.value = tgtLang;
            sourceTextarea.value = srcText;
            targetTextarea.value = tgtText;
            charCountSpan.textContent = srcText.length;
            updateAnalytics(srcText);
            checkTextareaControls();
            resetAutoDetectLabel();
            updateStatus("Restored", "success");
            showToast("Translation restored from phrasebook!", "success");
        });
    });
    const unpinBtns = phrasebookList.querySelectorAll(".unpin-btn");
    unpinBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const id = parseInt(btn.getAttribute("data-id"));
            removePin(id);
        });
    });
}
function removePin(id) {
    let pinned = JSON.parse(localStorage.getItem("lingopulse_pinned")) || [];
    pinned = pinned.filter(item => item.id !== id);
    localStorage.setItem("lingopulse_pinned", JSON.stringify(pinned));
    loadPinned();
    checkPinStatus();
    showToast("Removed from phrasebook", "success");
}
function checkPinStatus() {
    const srcText = sourceTextarea.value.trim();
    const tgtText = targetTextarea.value.trim();
    const srcLang = sourceLangSelect.value;
    const tgtLang = targetLangSelect.value;
    if (!srcText || !tgtText || tgtText.startsWith("[Error]")) {
        pinTranslationBtn.disabled = true;
        pinTranslationBtn.classList.remove("pinned");
        pinTranslationBtn.querySelector("i").className = "fa-regular fa-star";
        return;
    }
    pinTranslationBtn.disabled = false;
    const pinned = JSON.parse(localStorage.getItem("lingopulse_pinned")) || [];
    const isPinned = pinned.some(item => 
        item.sourceText.toLowerCase() === srcText.toLowerCase() &&
        item.sourceLang === srcLang &&
        item.targetLang === tgtLang
    );
    if (isPinned) {
        pinTranslationBtn.classList.add("pinned");
        pinTranslationBtn.querySelector("i").className = "fa-solid fa-star";
        pinTranslationBtn.title = "Pinned! Click to unpin";
    } else {
        pinTranslationBtn.classList.remove("pinned");
        pinTranslationBtn.querySelector("i").className = "fa-regular fa-star";
        pinTranslationBtn.title = "Pin to Phrasebook";
    }
}
function togglePin() {
    const srcText = sourceTextarea.value.trim();
    const tgtText = targetTextarea.value.trim();
    const srcLang = sourceLangSelect.value;
    const tgtLang = targetLangSelect.value;
    if (!srcText || !tgtText || tgtText.startsWith("[Error]")) return;
    let pinned = JSON.parse(localStorage.getItem("lingopulse_pinned")) || [];
    const index = pinned.findIndex(item => 
        item.sourceText.toLowerCase() === srcText.toLowerCase() &&
        item.sourceLang === srcLang &&
        item.targetLang === tgtLang
    );
    if (index > -1) {
        pinned.splice(index, 1);
        localStorage.setItem("lingopulse_pinned", JSON.stringify(pinned));
        showToast("Removed from phrasebook", "success");
    } else {
        const newItem = {
            id: Date.now(),
            sourceText: srcText,
            targetText: tgtText,
            sourceLang: srcLang,
            targetLang: tgtLang,
            sourceLangName: languages[srcLang] || "Auto-Detected",
            targetLangName: languages[tgtLang] || targetLang
        };
        pinned.unshift(newItem);
        localStorage.setItem("lingopulse_pinned", JSON.stringify(pinned));
        showToast("Pinned to phrasebook!", "success");
    }
    loadPinned();
    checkPinStatus();
}
// ----------------------------------------------------
// Share & Download Management
// ----------------------------------------------------
function shareTranslation() {
    const srcText = sourceTextarea.value.trim();
    const srcLang = sourceLangSelect.value;
    const tgtLang = targetLangSelect.value;
    if (!srcText) {
        showToast("Please enter some text to share", "error");
        return;
    }
    const shareUrl = new URL(window.location.origin + window.location.pathname);
    shareUrl.searchParams.set("src", srcLang);
    shareUrl.searchParams.set("tgt", tgtLang);
    shareUrl.searchParams.set("text", srcText);
    copyToClipboard(shareUrl.toString(), "Shareable link copied to clipboard!");
}
function downloadTranslation() {
    const tgtText = targetTextarea.value.trim();
    if (!tgtText || tgtText.startsWith("[Error]")) return;
    const blob = new Blob([tgtText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lingopulse_translation_${targetLangSelect.value}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Download started!", "success");
}
function loadParamsFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const src = urlParams.get("src");
    const tgt = urlParams.get("tgt");
    const text = urlParams.get("text");
    if (src && (languages[src] || src === "auto")) {
        sourceLangSelect.value = src;
    }
    if (tgt && languages[tgt]) {
        targetLangSelect.value = tgt;
    }
    if (text) {
        sourceTextarea.value = text;
        charCountSpan.textContent = text.length;
        updateAnalytics(text);
        checkTextareaControls();
        performTranslation();
    }
}
// ----------------------------------------------------
// Analytics Helper
// ----------------------------------------------------
function updateAnalytics(text) {
    const trimmed = text.trim();
    if (trimmed === "") {
        wordCountSpan.textContent = "0";
        sentenceCountSpan.textContent = "0";
        readingTimeSpan.textContent = "0";
        return;
    }
    const words = trimmed.split(/\s+/).filter(w => w.length > 0);
    wordCountSpan.textContent = words.length;
    const sentences = trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0);
    sentenceCountSpan.textContent = sentences.length;
    const readTimeSec = Math.max(1, Math.round(words.length / 3.3));
    readingTimeSpan.textContent = readTimeSec;
}
// HTML Escaping Helper to prevent XSS in DOM generation
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
// In some browsers, speechSynthesis voices load asynchronously
if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
    };
}
