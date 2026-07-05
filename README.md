# NEON KEEP // SECURE

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**NEON KEEP** は、ネオンに光るサイバーパンク調の美しいデザインと、強固なアクセス制限を備えたセルフホスト（自己所有）型の Web メモ帳アプリケーションです。

Google Keep のような軽快な操作感を持ちながら、ガラスマテリアル（Glassmorphism）のサイバーな世界観でデスクトップとモバイルの双方に最適化されています。

---

## 🚀 主な機能

* **🔐 簡易認証機能を内蔵**
  - 初回起動時に管理者アカウント（ユーザー名＆パスワード）を画面上で登録。
  - `bcrypt` による強固なパスワードハッシュ化と、`JWT` (JSON Web Token) を使ったセキュアな HTTPOnly クッキー認証。
* **🎨 ネオン＆ガラスマテリアルUI**
  - 美しいグロー（光彩）エフェクトとカードのテーマカラーに連動するカラーチップ。
  - テキスト検索（`//_SEARCH`）と、検索ワードによるリアルタイムフィルタリング。
* **📦 直感的なドラッグ＆ドロップ**
  - カードを掴んで自由に並び替え（ドラッグ順は自動的に SQLite データベースに永続化されます）。
  - タッチデバイス（スマホ）でのスクロール誤動作を防ぐ長押し（200ms）ディレイ制御。
* **🐳 Docker / Docker Compose 対応**
  - 依存環境を気にせず、コマンド一発で立ち上げ可能。

---

## ⚡ クイックスタート (Docker Compose)

最も推奨される起動方法です。サーバー上に以下の `docker-compose.yml` を作成します。

```yaml
version: '3.8'

services:
  neonkeep:
    image: ghcr.io/yourusername/neonkeep-pub:latest  # ビルドされたイメージ名に置き換えてください
    container_name: neonkeep
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
    environment:
      - DATABASE_URL=sqlite:////app/data/sql_app.db
      - JWT_SECRET=change_this_to_a_secure_random_string_in_production  # 独自の長いランダム文字列に変更してください
    restart: always
```

設定ファイルを配置したディレクトリで以下のコマンドを実行します。

```bash
docker compose up -d
```

起動後、ブラウザで `http://localhost:8000` にアクセスすると、自動的に初期セットアップ画面へ誘導されます。

---

## 🛠️ ローカル開発環境での起動

Python と `uv` を使用してローカル環境で起動・調整する場合の手順です。

### 1. 依存関係のセットアップ
```bash
git clone https://github.com/yourusername/neonkeep-pub.git
cd neonkeep-pub
uv sync
```

### 2. アプリの起動
```bash
uv run uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

---

## 📄 ライセンス

このプロジェクトは **MIT ライセンス** の下で提供されています。自由にカスタマイズして、あなた専用のメモサーバーを構築してください。
