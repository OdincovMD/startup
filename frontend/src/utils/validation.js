/**
 * Валидация email.
 * @param {string} value
 * @returns {boolean}
 */
export function isValidEmail(value) {
  if (!value || typeof value !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Форматирование российского телефона: +7 (999) 123-45-67
 * @param {string} value - ввод пользователя
 * @returns {string} отформатированная строка
 */
export function formatPhoneRU(value) {
  if (!value || typeof value !== "string") return "";
  let digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.startsWith("8")) digits = "7" + digits.slice(1);
  if (!digits.startsWith("7") && digits.length <= 10) digits = "7" + digits;
  digits = digits.slice(0, 11);
  return formatDigits(digits);
}

function formatDigits(digits) {
  if (digits.length <= 1) return digits ? `+${digits}` : "";
  if (digits.length <= 4) return `+${digits[0]} (${digits.slice(1)}`;
  if (digits.length <= 7) return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4)}`;
  const part1 = digits.slice(4, 7);
  const part2 = digits.slice(7, 9);
  const part3 = digits.slice(9, 11);
  let out = `+${digits[0]} (${digits.slice(1, 4)}) ${part1}`;
  if (part2) out += `-${part2}`;
  if (part3) out += `-${part3}`;
  return out;
}

/**
 * Извлечь только цифры телефона для сохранения (10 цифр без 7/8).
 * @param {string} value
 * @returns {string}
 */
export function normalizePhoneRU(value) {
  if (!value || typeof value !== "string") return "";
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("8") || digits.startsWith("7")) {
    return digits.slice(1, 11);
  }
  return digits.slice(0, 10);
}

/**
 * Нормализация URL для href: добавляет https:// если протокол отсутствует.
 * @param {string} url
 * @returns {string}
 */
export function normalizeWebsiteUrl(url) {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Нормализация URL при вводе (для сохранения): добавляет https:// если нужно.
 * @param {string} value
 * @returns {string}
 */
export function normalizeWebsiteInput(value) {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Красивое отображение ссылки: без протокола для компактности.
 * @param {string} url
 * @returns {string}
 */
export function formatWebsiteDisplay(url) {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  return trimmed.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}
