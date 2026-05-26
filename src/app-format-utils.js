export function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function compactCurrency(value) {
  const amount = Number(value) || 0;
  const absAmount = Math.abs(amount);
  if (absAmount >= 1000000) {
    const compact = Math.round((amount / 1000000) * 10) / 10;
    return `$${compact}M`;
  }
  if (absAmount >= 1000) {
    return `$${Math.round(amount / 1000)}k`;
  }
  return currency(amount);
}

export function formatDateTime(value) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

export function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function toDateTimeInputValue(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const localOffsetMs = parsed.getTimezoneOffset() * 60000;
  return new Date(parsed.getTime() - localOffsetMs).toISOString().slice(0, 16);
}

export function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}
