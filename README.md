# 紫微命盤

繁體中文的紫微斗數網站：即時排盤、合盤、星曜百科、古籍原典，AI 解讀可以接**任何 OpenAI 相容的模型**。整站是一個靜態 HTML 檔，放在 GitHub Pages 就能用，不需要伺服器。

線上網址（啟用 GitHub Pages 後）：<https://souraizuni.github.io/ziwei-site/>

## 功能

| 頁面 | 內容 |
|---|---|
| 排盤 `#/chart` | 出生年月日時＋出生地（真太陽時校正）→ 命盤；本命／大限／流年切換；點宮位看三方四正 |
| AI 解讀 | 命格、感情、事業、財運、健康、性格六個主題，單宮解讀，自由追問 |
| 合盤 `#/heming` | 兩張命盤對照，依倪師「夫妻宮＋福德宮」互參分析 |
| 百科 `#/knowledge` | 14 主星 × 13 宮位，點專題由 AI 即時講解 |
| 古籍 `#/library` | 《紫微斗數全書》《全集》《骨髓賦》全文，可用繁體字搜尋 |

## AI 模型設定

網頁右上角的「模型」（或解讀面板裡的「先設定模型」）打開設定：

1. 選常用服務商（OpenAI、DeepSeek、OpenRouter、Google Gemini、Groq、本機 Ollama），或自己填 **Base URL**（填到 `/v1` 為止）。
2. 填 **API 金鑰**（本機模型可留空）。
3. 按「取得模型清單」挑 **模型**，或直接輸入模型名稱。
4. 按「測試連線」確認，再「儲存」。

- 設定與金鑰只存在訪客自己的瀏覽器（localStorage），由瀏覽器直接送到填的端點，不經過任何伺服器；費用由訪客自己的 API 帳號支付。
- 服務商必須允許瀏覽器直接呼叫（CORS）。測試出現「連不到端點」多半是這個原因；本機 Ollama 要設定環境變數 `OLLAMA_ORIGINS`。
- 在 claude.ai 上以 Artifact 打開時，改用 Claude（claude.ai 的頁面不能連外部網址）。

## 部署到 GitHub Pages

1. repo 的 **Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**。
2. 推到 `main` 後，`.github/workflows/pages.yml` 會自動打包並發布。

## 本機開發

```bash
npm ci
npm run build:site   # 產生 dist-site/pages/index.html，直接用瀏覽器打開即可
npm run typecheck
npm test             # 排盤引擎回歸測試
```

- 站名在 `lib/site.ts` 的 `SITE_NAME`。
- 程式與資料維持簡體（排盤引擎以簡體比對），畫面在 `site/zh-hant.ts` 轉成繁體，並修正紫微術語（丑、宮干、斗君、相沖、三台）。
- 單頁版的架構說明見 [`site/README.md`](./site/README.md)。`npm run dev` 是原本的 Next.js 版，沒有 AI 後端。

| 目錄 | 作用 |
|---|---|
| `lib/ziwei/` | 排盤引擎（安星、四化、格局、真太陽時） |
| `lib/ai/` | AI：模型設定、OpenAI 相容串流、提示詞 |
| `app/`、`components/` | 頁面與元件 |
| `site/` | 打包成單一 HTML 的入口、路由與繁體轉換 |

## 來源與授權

- 排盤引擎與介面改寫自 [Renhuai123/ziwei-doushu](https://github.com/Renhuai123/ziwei-doushu)（MIT，見 [LICENSE](./LICENSE)）。原專案說明保留在 [README.upstream.md](./README.upstream.md)。
- 古籍原文（《紫微斗數全書》《全集》《骨髓賦》）屬公有領域。
- `docs/tianji-ziwei/` 的倪海廈《天紀》原話採 [CC BY-NC-SA 4.0](./docs/tianji-ziwei/LICENSE.md)，不可商用。
- 命理內容僅供學習參考，不構成醫療、投資、法律或重大決策建議。
