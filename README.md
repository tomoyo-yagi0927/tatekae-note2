# タテカエNOTE

個人用の立替金メモPWAです。データとレシート写真は利用中のブラウザのIndexedDBに保存され、外部サービスへの同期は行いません。

## 起動

ローカルファイルを直接開かず、次のような静的サーバーで起動してください。

```powershell
py -m http.server 8000
```

ブラウザで `http://localhost:8000/` を開きます。Service Workerとカメラ入力は、HTTPSまたはlocalhostで利用できます。

## 開発環境と公開環境のキャッシュ動作

- `localhost`、`127.0.0.1`、`[::1]`ではService Workerを新規登録しません。
- 開発環境でこのアプリのService Workerが登録済みの場合は登録解除し、`tatekae-note-`で始まるCache Storageだけを削除します。
- 既存のService Workerがページを制御していた場合は、無限リロードを防ぐ印を一時的に使い、一度だけ再読み込みします。IndexedDB、Local Storage、フォームデータは削除しません。
- HTTPSなどの公開環境では、従来どおり `sw.js` を登録し、PWAのオフラインキャッシュを使用します。

## 構成

- `index.html`: 画面の骨格
- `css/style.css`: レスポンシブなUI
- `js/db.js`: IndexedDBの保存・取得処理
- `js/ui.js`: 画面描画と共通UI
- `js/app.js`: ルーティングとイベント処理
- `js/cache-control.js`: 開発環境と公開環境のService Worker制御
- `sw.js`: オフラインキャッシュ
- `manifest.webmanifest`: PWA設定

## 注意

ブラウザのサイトデータを削除すると、登録データと写真も失われます。端末間同期やバックアップ・復元は未実装です。

## レシート登録

利用日、金額、申請名、備考は手動で入力します。写真はカメラ撮影または端末内の画像を選択して添付できます。画像はIndexedDBへ保存し、詳細画面で拡大・変更・削除できます。OCR機能は搭載していません。

