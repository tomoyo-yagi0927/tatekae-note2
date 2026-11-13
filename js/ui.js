export function formatCurrency(amount) {
  return new Intl.NumberFormat("ja-JP").format(amount);
}

export function formatDate(dateText) {
  if (!dateText) {
    return "—";
  }

  const [year, month, day] = dateText.split("-");
  return `${year}/${month}/${day}`;
}

export function formatDateTime(timestamp) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp));
}

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[character]));
}

export function receiptCardTemplate(receipt) {
  const image = receipt.photo
    ? `<img class="receipt-thumb" src="${receipt.photo}" alt="${escapeHtml(receipt.name)}のレシート写真">`
    : `<span class="receipt-placeholder" aria-hidden="true">▧</span>`;
  const statusLabel = receipt.status === "paid" ? "精算済み" : "未精算";
  const statusClass = receipt.status === "paid" ? " paid" : "";

  return `<button class="receipt-card" type="button" data-receipt-id="${receipt.id}">
    ${image}
    <span class="receipt-content">
      <strong>${escapeHtml(receipt.name)}</strong>
      <span>${formatDate(receipt.usedDate)}</span>
    </span>
    <span class="receipt-amount">
      <strong>¥${formatCurrency(receipt.amount)}</strong>
      <span class="status-badge${statusClass}">${statusLabel}</span>
    </span>
  </button>`;
}

export function emptyStateTemplate(message, linkText, href) {
  return `<div class="card empty-state">
    <strong>${message}</strong>
    <p>登録したレシートはここに表示されます。</p>
    ${linkText ? `<a class="button" href="${href}">${linkText}</a>` : ""}
  </div>`;
}

