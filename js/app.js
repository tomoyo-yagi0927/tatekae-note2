import { deleteReceipt, getAllReceipts, getReceipt, saveReceipt } from "./db.js";
import { emptyStateTemplate, escapeHtml, formatCurrency, formatDate, formatDateTime, receiptCardTemplate } from "./ui.js";

const app = document.querySelector("#app");
const modalRoot = document.querySelector("#modal-root");
const appShell = document.querySelector("#app-shell");
const desktopGuide = document.querySelector("#desktop-guide");
let selectedPhoto = "";

function today() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function getRoute() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const [page, id] = hash.split("/");
  return { page: page || "home", id };
}

function updateNavigation(page) {
  document.querySelectorAll("[data-route]").forEach((link) => {
    link.classList.toggle("active", link.dataset.route === page);
  });
}

function isDesktop() {
  return window.matchMedia("(min-width: 800px)").matches;
}

function renderDesktopGuide() {
  desktopGuide.hidden = false;
  desktopGuide.innerHTML = `<div class="guide-card">
    <p class="eyebrow">タテカエNOTE</p>
    <h1>スマートフォンで、<br>立替金をかんたんに記録</h1>
    <p class="muted">このアプリはスマートフォン向けの立替金メモです。データはご利用端末のブラウザ内に保存され、他端末とは同期されません。</p>
    <div class="qr-placeholder" aria-label="公開URL確定前のQRコード仮表示">QR準備中</div>
    <p class="muted">公開URLが確定するまでQRコードは仮表示です。</p>
    <button class="button-secondary" type="button" id="preview-on-pc">PCでUIをプレビューする</button>
  </div>`;
  desktopGuide.querySelector("#preview-on-pc").addEventListener("click", () => {
    appShell.style.display = "block";
    desktopGuide.style.display = "none";
  });
}

function statusBadge(status) {
  return status === "paid"
    ? `<span class="status-badge paid">精算済み</span>`
    : `<span class="status-badge">未精算</span>`;
}

async function renderHome() {
  const receipts = await getAllReceipts();
  const unpaid = receipts.filter((receipt) => receipt.status === "unpaid");
  const total = unpaid.reduce((sum, receipt) => sum + receipt.amount, 0);
  const recent = receipts.slice(0, 3);

  app.innerHTML = `<section>
    <div class="hero-card">
      <p class="eyebrow">立て替えたお金を、かんたんに記録・管理</p>
      <h1>タテカエNOTE</h1>
      <p class="hero-description">自分のための立替金メモ。レシート写真も端末内に保存できます。</p>
      <div class="balance-label">現在の立て替え金額（未精算合計）</div>
      <div class="balance">¥${formatCurrency(total)}<small>円</small></div>
      <a class="button full" href="#/new">▣ レシートを登録する</a>
    </div>
    <div class="section-heading">
      <h2>登録レシート</h2>
      <a class="text-link" href="#/receipts">一覧を見る ›</a>
    </div>
    ${recent.length ? `<div class="receipt-list">${recent.map(receiptCardTemplate).join("")}</div>` : emptyStateTemplate("まだレシートがありません", "最初のレシートを登録", "#/new")}
  </section>`;
  bindReceiptCards();
}

async function renderReceipts(tab = "unpaid") {
  const receipts = await getAllReceipts();
  const filtered = receipts.filter((receipt) => receipt.status === tab);
  const total = filtered.reduce((sum, receipt) => sum + receipt.amount, 0);
  const label = tab === "paid" ? "精算済み" : "未精算";

  app.innerHTML = `<section>
    <p class="eyebrow">登録レシート</p>
    <h1>レシート一覧</h1>
    <div class="tabs" role="tablist">
      <button class="tab ${tab === "unpaid" ? "active" : ""}" type="button" data-tab="unpaid">未精算</button>
      <button class="tab ${tab === "paid" ? "active" : ""}" type="button" data-tab="paid">精算済み</button>
    </div>
    ${tab === "unpaid" ? `<div class="summary-strip"><span>未精算の合計</span><strong>¥${formatCurrency(total)}</strong></div>` : ""}
    ${filtered.length ? `<div class="receipt-list">${filtered.map(receiptCardTemplate).join("")}</div>` : emptyStateTemplate(`${label}のレシートはありません`, tab === "unpaid" ? "レシートを登録する" : "未精算を見る", tab === "unpaid" ? "#/new" : "#/receipts")}
  </section>`;
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => renderReceipts(button.dataset.tab));
  });
  bindReceiptCards();
}

function renderForm(receipt = null) {
  selectedPhoto = receipt?.photo || "";
  const isEdit = Boolean(receipt);
  app.innerHTML = `<section>
    <p class="eyebrow">${isEdit ? "レシートを編集" : "新しい記録"}</p>
    <h1>${isEdit ? "レシートを編集" : "レシートを登録"}</h1>
    <form id="receipt-form" class="card form-card">
      <div class="form-field"><label for="receipt-name">申請名 <span class="required">必須</span></label><input id="receipt-name" name="name" required maxlength="80" value="${escapeHtml(receipt?.name || "")}" placeholder="例：備品の購入"></div>
      <div class="form-field"><label for="used-date">利用日 <span class="required">必須</span></label><input id="used-date" name="usedDate" type="date" required value="${receipt?.usedDate || today()}"></div>
      <div class="form-field"><label for="amount">金額 <span class="required">必須</span></label><input id="amount" name="amount" type="number" min="1" step="1" required value="${receipt?.amount || ""}" placeholder="例：1280"><small class="muted">1円以上で入力してください。</small></div>
      <div class="form-field"><label for="note">備考</label><textarea id="note" name="note" maxlength="500" placeholder="メモを入力（任意）">${escapeHtml(receipt?.note || "")}</textarea></div>
      <div class="form-field"><label>写真添付</label><div class="photo-picker"><div class="photo-preview" id="photo-preview">${selectedPhoto ? `<img src="${selectedPhoto}" alt="レシート写真のプレビュー">` : "写真を追加できます"}</div><input id="photo" type="file" accept="image/*" capture="environment"><button class="button-ghost" id="remove-photo" type="button" ${selectedPhoto ? "" : "hidden"}>写真を削除</button></div></div>
      <div class="button-row"><a class="button-ghost" href="${isEdit ? `#/receipt/${receipt.id}` : "#/home"}">キャンセル</a><button class="button" type="submit">保存する</button></div>
    </form>
  </section>`;

  document.querySelector("#photo").addEventListener("change", handlePhotoChange);
  document.querySelector("#remove-photo").addEventListener("click", () => {
    selectedPhoto = "";
    updatePhotoPreview();
  });
  document.querySelector("#receipt-form").addEventListener("submit", (event) => saveForm(event, receipt));
}

function handlePhotoChange(event) {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    selectedPhoto = reader.result;
    updatePhotoPreview();
  };
  reader.readAsDataURL(file);
}

function updatePhotoPreview() {
  const preview = document.querySelector("#photo-preview");
  const removeButton = document.querySelector("#remove-photo");
  preview.innerHTML = selectedPhoto ? `<img src="${selectedPhoto}" alt="レシート写真のプレビュー">` : "写真を追加できます";
  removeButton.hidden = !selectedPhoto;
}

async function saveForm(event, existingReceipt) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const amount = Number(formData.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) {
    alert("金額は1円以上で入力してください。");
    return;
  }

  const now = Date.now();
  const receipt = {
    id: existingReceipt?.id || crypto.randomUUID(),
    name: String(formData.get("name")).trim(),
    usedDate: formData.get("usedDate"),
    amount,
    note: String(formData.get("note")).trim(),
    photo: selectedPhoto,
    registeredAt: existingReceipt?.registeredAt || now,
    updatedAt: now,
    status: existingReceipt?.status || "unpaid"
  };
  await saveReceipt(receipt);
  window.location.hash = `#/receipt/${receipt.id}`;
}

async function renderDetail(id) {
  const receipt = await getReceipt(id);
  if (!receipt) {
    window.location.hash = "#/receipts";
    return;
  }

  app.innerHTML = `<section>
    <a class="text-link" href="#/receipts">‹ 一覧へ戻る</a>
    <div class="section-heading"><h1>レシート詳細</h1></div>
    <div class="card detail-card">
      ${receipt.photo ? `<button class="photo-button" id="open-photo" type="button"><img class="detail-photo" src="${receipt.photo}" alt="${escapeHtml(receipt.name)}のレシート写真"></button>` : ""}
      <dl>
        <div class="detail-row"><dt>申請名</dt><dd>${escapeHtml(receipt.name)}</dd></div>
        <div class="detail-row"><dt>利用日</dt><dd>${formatDate(receipt.usedDate)}</dd></div>
        <div class="detail-row"><dt>金額</dt><dd>¥${formatCurrency(receipt.amount)}</dd></div>
        <div class="detail-row"><dt>備考</dt><dd>${escapeHtml(receipt.note || "なし")}</dd></div>
        <div class="detail-row"><dt>登録日時</dt><dd>${formatDateTime(receipt.registeredAt)}</dd></div>
        <div class="detail-row"><dt>精算状態</dt><dd>${statusBadge(receipt.status)}</dd></div>
      </dl>
      <div class="button-row"><a class="button-secondary" href="#/edit/${receipt.id}">編集</a><button class="button-danger" id="delete-receipt" type="button">削除</button></div>
      <button class="button ${receipt.status === "paid" ? "button-ghost" : "button"} full" id="toggle-status" type="button">${receipt.status === "paid" ? "未精算に戻す" : "精算済みにする"}</button>
    </div>
  </section>`;
  document.querySelector("#toggle-status").addEventListener("click", async () => {
    receipt.status = receipt.status === "paid" ? "unpaid" : "paid";
    receipt.updatedAt = Date.now();
    await saveReceipt(receipt);
    renderDetail(id);
  });
  document.querySelector("#delete-receipt").addEventListener("click", async () => {
    if (confirm("このレシートを削除しますか？この操作は取り消せません。")) {
      await deleteReceipt(id);
      window.location.hash = "#/receipts";
    }
  });
  document.querySelector("#open-photo")?.addEventListener("click", () => openPhotoModal(receipt));
}

function openPhotoModal(receipt) {
  modalRoot.innerHTML = `<div class="modal-backdrop" id="photo-modal"><div class="modal-card image-modal"><button class="modal-close" type="button" aria-label="閉じる">×</button><img src="${receipt.photo}" alt="${escapeHtml(receipt.name)}のレシート写真"><div class="button-row"><a class="button-secondary" href="#/edit/${receipt.id}" data-close-modal>変更</a><button class="button-danger" type="button" data-delete-photo>削除</button></div></div></div>`;
  const modal = document.querySelector("#photo-modal");
  modal.querySelector(".modal-close").addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });
  modal.querySelector("[data-close-modal]").addEventListener("click", closeModal);
  modal.querySelector("[data-delete-photo]").addEventListener("click", async () => {
    receipt.photo = "";
    receipt.updatedAt = Date.now();
    await saveReceipt(receipt);
    closeModal();
    renderDetail(receipt.id);
  });
}

function closeModal() {
  modalRoot.innerHTML = "";
}

function bindReceiptCards() {
  document.querySelectorAll("[data-receipt-id]").forEach((card) => {
    card.addEventListener("click", () => {
      window.location.hash = `#/receipt/${card.dataset.receiptId}`;
    });
  });
}

async function renderSettings() {
  app.innerHTML = `<section>
    <p class="eyebrow">アプリ情報</p>
    <h1>設定</h1>
    <div class="card">
      <div class="setting-item"><span>アプリ名</span><strong>タテカエNOTE</strong></div>
      <div class="setting-item"><span>データ保存先</span><strong>この端末のブラウザ</strong></div>
      <div class="setting-item"><span>バックアップ・復元</span><span class="muted">今後対応予定</span></div>
    </div>
    <div class="card" style="margin-top: 16px"><p class="muted">ブラウザのサイトデータを削除すると、登録したレシートと写真も失われます。端末間の同期は行いません。</p></div>
  </section>`;
}

async function render() {
  if (isDesktop() && desktopGuide.style.display !== "none") {
    renderDesktopGuide();
  }
  const { page, id } = getRoute();
  updateNavigation(page === "receipt" || page === "edit" ? "receipts" : page);

  if (page === "home") {
    await renderHome();
  } else if (page === "receipts") {
    await renderReceipts("unpaid");
  } else if (page === "new") {
    renderForm();
  } else if (page === "edit" && id) {
    const receipt = await getReceipt(id);
    renderForm(receipt);
  } else if (page === "receipt" && id) {
    await renderDetail(id);
  } else if (page === "settings") {
    await renderSettings();
  } else {
    window.location.hash = "#/home";
  }
  app.focus();
}

window.addEventListener("hashchange", render);
window.addEventListener("resize", () => {
  if (!isDesktop()) {
    appShell.style.display = "block";
    desktopGuide.style.display = "none";
  }
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch((error) => console.warn("Service Worker registration failed", error));
}

render().catch((error) => {
  app.innerHTML = `<div class="card"><h1>読み込みエラー</h1><p class="muted">データベースを開けませんでした。ブラウザの設定を確認してください。</p></div>`;
  console.error(error);
});

