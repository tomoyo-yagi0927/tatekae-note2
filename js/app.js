import { deleteReceipt, getAllReceipts, getReceipt, saveReceipt } from "./db.js";
import { emptyStateTemplate, escapeHtml, formatCurrency, formatDate, formatDateTime, receiptCardTemplate } from "./ui.js";
import { initializeServiceWorker } from "./cache-control.js";
import { showOnboarding } from "./onboarding.js";

const app = document.querySelector("#app");
const modalRoot = document.querySelector("#modal-root");
const appShell = document.querySelector("#app-shell");
const desktopGuide = document.querySelector("#desktop-guide");
let selectedPhoto = "";

function getRoute() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const [route] = hash.split("?");
  const [page, id] = route.split("/");
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
    <div class="desktop-qr-section">
      <h2>スマートフォンで使う</h2>
      <p class="muted">QRコードを読み取ると、スマートフォンでタテカエNOTEを開けます。</p>
      <a class="desktop-qr-link" href="https://tomoyo-yagi0927.github.io/tatekae-note2/" target="_blank" rel="noopener" aria-label="タテカエNOTEをスマートフォンで開く">
        <img class="desktop-qr-image" src="assets/images/qr-tatekae-note.png" alt="タテカエNOTE公開アプリのQRコード">
      </a>
    </div>
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

  app.innerHTML = `<section class="home-page">
    <div class="home-brand" aria-label="タテカエNOTE">
      <p>立て替えたお金を、かんたんに記録・管理</p>
    </div>

    <a class="home-register-button" href="#/new">
      <svg class="home-camera-icon" viewBox="0 0 48 40" aria-hidden="true">
        <path d="M15 9 19 4h10l4 5h7c2 0 4 2 4 4v19c0 2-2 4-4 4H8c-2 0-4-2-4-4V13c0-2 2-4 4-4h7Z" />
        <circle cx="24" cy="23" r="8" />
      </svg>
      <strong>レシートを登録する</strong>
      <span aria-hidden="true">›</span>
    </a>

    <div class="home-balance-card">
      <div class="home-balance-label">現在の立て替え金額（未精算の合計）</div>
      <div class="home-balance-content">
        <svg class="home-coins-icon" viewBox="0 0 52 48" aria-hidden="true">
          <ellipse cx="35" cy="10" rx="13" ry="5" />
          <path d="M22 10v9c0 3 6 5 13 5s13-2 13-5v-9" />
          <path d="M22 19c0 3 6 5 13 5s13-2 13-5M22 27c0 3 6 5 13 5s13-2 13-5v-8" />
          <ellipse cx="17" cy="26" rx="13" ry="5" />
          <path d="M4 26v10c0 3 6 5 13 5s13-2 13-5v-10M4 36c0 3 6 5 13 5s13-2 13-5" />
        </svg>
        <div class="home-balance">¥${formatCurrency(total)}</div>
      </div>
    </div>

    <a class="home-action-card" href="#/receipts">
      <svg class="home-action-icon" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="8" cy="12" r="3" />
        <circle cx="8" cy="24" r="3" />
        <circle cx="8" cy="36" r="3" />
        <path d="M17 12h23M17 24h23M17 36h23" />
      </svg>
      <span class="home-action-copy"><strong>登録レシート</strong><small>登録したレシートの一覧を見る</small></span>
      <span class="home-action-arrow" aria-hidden="true">›</span>
    </a>

    <img class="home-eyecatch" src="assets/images/eyecatch.png" alt="タテカエNOTEで立替金の管理がもっとラクになるメリット紹介">

    <div class="home-recent" aria-live="polite">
      ${recent.length ? `<p class="home-recent-label">最近の登録</p><div class="receipt-list">${recent.map(receiptCardTemplate).join("")}</div>` : ""}
    </div>
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
  app.innerHTML = `<section class="receipt-register-page">
    <div class="form-page-titlebar">
      <a class="form-back-link" href="${isEdit ? `#/receipt/${receipt.id}` : "#/home"}" aria-label="戻る">‹</a>
      <h1>${isEdit ? "レシートを編集" : "レシートを登録"}</h1>
      <span aria-hidden="true"></span>
    </div>
    <form id="receipt-form" class="receipt-register-form">
      <div class="register-field">
        <label for="receipt-name">申請名 <span class="required">必須</span></label>
        <input id="receipt-name" name="name" required maxlength="80" value="${escapeHtml(receipt?.name || "")}" placeholder="例：備品の購入、金曜のお飲み物 など">
      </div>
      <div class="register-field">
        <label for="used-date">利用日 <span class="required">必須</span></label>
        <input id="used-date" name="usedDate" type="date" required value="${receipt?.usedDate || ""}">
      </div>
      <div class="register-field">
        <label for="amount">金額 <span class="required">必須</span></label>
        <div class="register-input-with-prefix">
          <span aria-hidden="true">¥</span>
          <input id="amount" name="amount" type="number" min="1" step="1" required value="${receipt?.amount || ""}" placeholder="例：1,280">
        </div>
      </div>
      <div class="register-field">
        <label for="note">備考 <span class="optional">（任意）</span></label>
        <textarea id="note" name="note" maxlength="500" placeholder="メモを入力（店舗名、用途など）">${escapeHtml(receipt?.note || "")}</textarea>
      </div>
      <div class="register-field register-photo-field">
        <label>写真添付</label>
        <div class="register-photo-actions">
          <label class="photo-source-button" for="photo-camera">
            <span class="photo-source-icon" aria-hidden="true">▣</span>
            <strong>カメラで撮影</strong>
          </label>
          <label class="photo-source-button" for="photo-gallery">
            <span class="photo-source-icon" aria-hidden="true">▧</span>
            <strong>写真から選択</strong>
          </label>
          <input class="form-file-input" id="photo-camera" type="file" accept="image/*" capture="environment">
          <input class="form-file-input" id="photo-gallery" type="file" accept="image/*">
        </div>
        <div class="photo-preview${selectedPhoto ? " has-photo" : ""}" id="photo-preview">${selectedPhoto ? `<img src="${selectedPhoto}" alt="レシート写真のプレビュー">` : ""}</div>
        <button class="photo-remove-button" id="remove-photo" type="button" ${selectedPhoto ? "" : "hidden"} aria-label="写真を削除">×</button>
      </div>
      <button class="register-save-button" type="submit"><span aria-hidden="true">✓</span> 保存する</button>
    </form>
  </section>`;

  document.querySelector("#photo-camera").addEventListener("change", handlePhotoChange);
  document.querySelector("#photo-gallery").addEventListener("change", handlePhotoChange);
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
  preview.innerHTML = selectedPhoto ? `<img src="${selectedPhoto}" alt="レシート写真のプレビュー">` : "";
  preview.classList.toggle("has-photo", Boolean(selectedPhoto));
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
  appShell.classList.toggle("home-active", page === "home");
  appShell.classList.toggle("form-active", page === "new" || page === "edit");
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

async function startApp() {
  const shouldReload = await initializeServiceWorker();

  if (shouldReload) {
    return;
  }

  await showOnboarding();

  render().catch((error) => {
    app.innerHTML = `<div class="card"><h1>読み込みエラー</h1><p class="muted">データベースを開けませんでした。ブラウザの設定を確認してください。</p></div>`;
    console.error(error);
  });
}

startApp();

