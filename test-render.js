/* 离线渲染自检：node test-render.js
   校验 front-matter 解析、容器渲染、REF 锚点、表格、清单是否正常产出 */
const fs = require("fs");
const path = require("path");
const eng = require("./assets/app.js");

const raw = fs.readFileSync(path.join(__dirname, "data/zhuanxing.md"), "utf8");
const fm = eng.parseFrontMatter(raw);
const r = eng.renderMarkdown(fm.body);

const checks = [
  ["front-matter title", fm.meta.title === "要不要转行"],
  ["front-matter risk", fm.meta.risk_level === "半可逆"],
  ["front-matter cooling", String(fm.meta.cooling_period) === "30"],
  ["front-matter refs 数组", Array.isArray(fm.meta.refs) && fm.meta.refs.length === 10],
  ["front-matter tags 数组", Array.isArray(fm.meta.tags) && fm.meta.tags.length === 3],
  ["h2 数量 = 10", (r.html.match(/<h2 /g) || []).length === 10],
  ["io 卡片存在", /class="io"/.test(r.html)],
  ["check 卡片存在", /class="checklist"/.test(r.html)],
  ["复制按钮存在", /data-copy=/.test(r.html)],
  ["refs 列表存在", /class="refs"/.test(r.html)],
  ["ref 锚点 id 正确", /id="ref-001"/.test(r.html)],
  ["ref 内联链接存在", /class="ref" href="#ref-001"/.test(r.html)],
  ["表格渲染", /<table>/.test(r.html)],
  ["表格数量 = 4", (r.html.match(/<table>/g) || []).length === 4],
  ["case 卡片 = 4", (r.html.match(/class="case /g) || []).length === 4],
  ["信号灯未转义", /<span class="light green">/.test(r.html)],
  ["meta 块存在", /class="page-meta"/.test(r.html)],
  ["无未渲染容器指令", !/:::[a-z]/.test(r.html)],
  ["无残留 @标记", !/@输入|@输出|@依据/.test(r.html)],
  ["TOC 条目 = 10", r.toc.filter(t => t.level === 2).length === 10]
];

let fail = 0;
checks.forEach(([name, ok]) => {
  console.log((ok ? "  PASS  " : "  FAIL  ") + name);
  if (!ok) fail++;
});

// 统计
const text = r.html.replace(/<[^>]+>/g, "");
console.log("\n正文字数（去标签）：" + text.replace(/\s/g, "").length);
console.log("REF 内联引用次数：" + (r.html.match(/class="ref"/g) || []).length);
console.log(fail === 0 ? "\n全部通过 ✓" : "\n失败 " + fail + " 项 ✗");

fs.writeFileSync(path.join(__dirname, ".preview.html"),
  '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><link rel="stylesheet" href="assets/style.css"></head><body><div class="container"><div class="md">' +
  r.html + "</div></div></body></html>");
process.exit(fail ? 1 : 0);
