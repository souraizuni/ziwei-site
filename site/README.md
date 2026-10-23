# 單頁版（GitHub Pages／claude.ai）

把 `app/` 的 Next.js 頁面打包成一個 HTML 檔：放在 GitHub Pages 等靜態主機，或發布成 claude.ai 的 Artifact。

```bash
npm run build:site        # 產生 dist-site/pages/index.html（GitHub Pages／本機直接打開）與 dist-site/index.html（claude.ai 發布用）
```

| 檔案 | 作用 |
|---|---|
| `entry.tsx` | 入口：主題、繁體轉換、AI 銜接、路由 |
| `router.tsx` / `location.ts` | 路由，對應 `app/` 的檔案路由；一般網址用 `#/chart`，claude.ai 上存在記憶體；`#chart` 等簡寫都可直接開到該頁 |
| `shims/` | `next/link`、`next/navigation`、`server-only` 的單頁版替身 |
| `zh-hant.ts` | 畫面轉繁體（OpenCC），並修正紫微術語：丑、宮干、斗君、相沖、三台 |
| `api-bridge.ts` | 把 `/api/interpret`、`/api/heming` 改由 `lib/ai/client.ts` 回答（claude.ai 上用 Claude，其他地方用自訂端點） |

- 程式與資料維持簡體，排盤引擎與 `npm test` 不受影響；只有顯示層轉繁體。
- 站名在 `lib/site.ts` 的 `SITE_NAME`，改完重新打包即可。
- 一般網址上，AI 使用訪客在「模型設定」填的 OpenAI 相容端點（`lib/ai/settings.ts`、`lib/ai/openai.ts`）。
- 發布到 claude.ai 時要宣告 `capabilities: { sample: {} }`，AI 解讀改用 Claude。
