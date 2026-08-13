# Gemini Auto Model

[English](README.md) | 日本語

`gemini.google.com` で選んだモデルモードを維持するブラウザ拡張機能です。ProまたはThinkingを一度選ぶと、Gemini内を移動したときも現在の選択を確認し、必要な場合だけ切り替えます。

## 主な機能

- ProまたはThinkingを既定モードとして指定
- Geminiのページ内移動やUI更新後に再確認
- すでに指定モードならモデル選択画面を開かない
- ツールバーポップアップまたは設定画面から変更
- Chrome、Firefox、iOS Safari向けビルド手順に対応

## インストール

### Chrome

1. `chrome://extensions` を開きます。
2. **デベロッパーモード**を有効にします。
3. **パッケージ化されていない拡張機能を読み込む**から、このリポジトリを選びます。

### Firefox

1. `about:debugging#/runtime/this-firefox` を開きます。
2. **一時的なアドオンを読み込む**を選びます。
3. `firefox/manifest.json` を指定します。

パッケージ版は [GitHub Releases](https://github.com/porarrirr/gemini-auto-model/releases) で公開する場合があります。iOS Safari向けの手順は [`docs/ios-safari.md`](docs/ios-safari.md) を参照してください。

## 権限とプライバシー

選択したモードを保存するためにブラウザストレージを使用し、モデル選択UIを操作するために `https://gemini.google.com/*` へのアクセス権限を使います。独自の解析、テレメトリ、外部サーバーは追加しません。

本拡張機能は独立した非公式ツールであり、GoogleまたはGeminiチームが開発・承認・サポートするものではありません。GeminiのUI変更により動作しなくなる可能性があります。

## ライセンス

このリポジトリの独自コードには、現在ライセンスを設定していません。
