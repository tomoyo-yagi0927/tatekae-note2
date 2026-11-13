# タテカエNOTE

個人用の立替金メモPWAです。データとレシート写真は利用中のブラウザのIndexedDBに保存され、外部サービスへの同期は行いません。

## 起動

ローカルファイルを直接開かず、次のような静的サーバーで起動してください。

```powershell
py -m http.server 8000
```

ブラウザで `http://localhost:8000/` を開きます。Service Workerとカメラ入力は、HTTPSまたはlocalhostで利用できます。

## 構成

- `index.html`: 画面の骨格
- `css/style.css`: レスポンシブなUI
- `js/db.js`: IndexedDBの保存・取得処理
- `js/ui.js`: 画面描画と共通UI
- `js/app.js`: ルーティングとイベント処理
- `sw.js`: オフラインキャッシュ
- `manifest.webmanifest`: PWA設定

## 注意

ブラウザのサイトデータを削除すると、登録データと写真も失われます。端末間同期やバックアップ・復元は未実装です。

