# 到期提醒 PWA（v1，本地版）
纯静态，无构建。数据存浏览器 localStorage。
- 本地预览：`python3 -m http.server 8765`，打开 http://localhost:8765/ （加 `?demo=1` 首次载入示例数据）
- 所有路径为相对路径，可直接部署到 GitHub Pages 子路径（如 /daoqi-tixing/）。
- 文件：index.html / style.css / js/{app,store,dates,templates,io}.js / sw.js / manifest.json
- 字体：Barlow Condensed（SIL OFL）。

## v1.1
- 测试：`node tests/logic.test.mjs`（逻辑单测）；`tests/e2e.cjs` 需 playwright-core + 预览服务器在 /daoqi-tixing/ 子路径。
- round1 回归：`node tests/round1.test.mjs`；e2e 中「R#」开头的用例。
