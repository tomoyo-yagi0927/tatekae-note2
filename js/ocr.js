const TESSERACT_MODULE_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/+esm";

let tesseractModulePromise;

function loadTesseract() {
  if (!tesseractModulePromise) {
    tesseractModulePromise = import(TESSERACT_MODULE_URL);
  }

  return tesseractModulePromise;
}

function normalizeText(text) {
  return text
    .replace(/[０-９]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0xfee0))
    .replace(/[／]/g, "/")
    .replace(/[－−]/g, "-")
    .replace(/[，、]/g, ",")
    .replace(/[￥]/g, "¥");
}

function isValidDate(year, month, day) {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day;
}

function dateFromMatch(match) {
  const year = match[1].length === 2 ? 2000 + Number(match[1]) : Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!isValidDate(year, month, day)) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function findDateCandidates(line) {
  const pattern = /(20\d{2}|\d{2})[\s年./-]+(\d{1,2})[\s月./-]+(\d{1,2})日?/g;
  const candidates = [];
  let match;

  while ((match = pattern.exec(line)) !== null) {
    const date = dateFromMatch(match);
    if (date) {
      candidates.push(date);
    }
  }

  return candidates;
}

function extractUsageDate(text) {
  const lines = normalizeText(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const priorityWords = /(購入|取引|利用|お買上|買上|日付|日時|年月日)/;
  const excludedWords = /(発行|有効期限|期限|賞味期限|消費期限|登録)/;
  const priorityCandidates = [];

  lines.forEach((line) => {
    const candidates = findDateCandidates(line);
    if (candidates.length === 1 && priorityWords.test(line) && !excludedWords.test(line)) {
      priorityCandidates.push(candidates[0]);
    }
  });

  if (new Set(priorityCandidates).size === 1) {
    return priorityCandidates[0];
  }

  const generalCandidates = lines
    .filter((line) => !excludedWords.test(line))
    .flatMap(findDateCandidates);

  if (new Set(generalCandidates).size === 1) {
    return generalCandidates[0];
  }

  return "";
}

function parseAmount(value) {
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) {
    return null;
  }

  const amount = Number(digits);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function findAmounts(line) {
  const matches = line.match(/(?:¥\s*)?\d{1,3}(?:,\d{3})+|(?:¥\s*)?\d+/g) || [];
  return matches.map(parseAmount).filter((amount) => amount !== null);
}

function extractTotalAmount(text) {
  const lines = normalizeText(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const totalWords = /(合計|お買上合計|お支払金額|ご請求額|領収金額|支払合計|支払金額)/;
  const excludedWords = /(小計|税|消費税|預り|預かり|お釣り|釣銭|ポイント|残高)/;
  const candidates = [];

  lines.forEach((line) => {
    if (!totalWords.test(line) || excludedWords.test(line)) {
      return;
    }

    const amounts = findAmounts(line);
    if (amounts.length === 1) {
      candidates.push(amounts[0]);
    }
  });

  if (new Set(candidates).size === 1) {
    return candidates[0];
  }

  return null;
}

export function extractReceiptFields(text) {
  return {
    usedDate: extractUsageDate(text),
    amount: extractTotalAmount(text)
  };
}

export async function recognizeReceipt(image, onProgress = () => {}) {
  const tesseract = await loadTesseract();
  const result = await tesseract.recognize(image, "jpn+eng", {
    logger: (message) => {
      if (message.status === "recognizing text" && typeof message.progress === "number") {
        onProgress(Math.round(message.progress * 100));
      }
    }
  });

  return {
    ...extractReceiptFields(result.data.text),
    text: result.data.text
  };
}

