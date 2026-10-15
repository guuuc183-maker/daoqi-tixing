# 到期提醒 PWA —— 第一阶段 MVP（本地版）
原生 JS（ES Modules）+ localStorage，无构建步骤、无依赖。

运行：`cd app && python3 -m http.server 5173` 后打开 http://localhost:5173/ （加 `?demo=1` 写入演示数据，会覆盖本地数据）。

- `index.html` 外壳；`js/app.js` 路由与 4 个页面（#/ 列表、#/new、#/edit/:id、#/item/:id、#/settings）
- `js/store.js` 存储层（第二阶段换 Firestore）；`js/dates.js` 到期计算；`js/csv.js` CSV 导入导出；`js/templates.js` 分类模板
- `manifest.json`（standalone）+ `sw.js`（网络优先缓存）
