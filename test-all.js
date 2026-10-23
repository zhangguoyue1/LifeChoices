/* 全站批量校验：node test-all.js
   校验 data/ 下全部 .md 的 front-matter、模块结构、语法完整性 */
const fs = require("fs");
const path = require("path");
const eng = require("./assets/app.js");

const idx = JSON.parse(fs.readFileSync(path.join(__dirname, "data/index.json"), "utf8"));
const EXPECT_H2 = ["概念祛魅", "两条路线：收益与代价盘点", "核心自检工具包", "高频思维陷阱黑名单",
  "非二元：分步折中方案库", "暂缓决策红灯判定", "适配人群参考", "兜底退出预案模板",
  "脱敏真实案例库", "参考资料与证据索引"];

let totalFail = 0;

for (const item of idx.items) {
  const file = path.join(__dirname, "data", item.slug + ".md");
  const label = item.q + " (" + item.slug + ")";
  if (!fs.existsSync(file)) {
    console.log("FAIL  " + label + "  文件不存在");
    totalFail++;
    continue;
  }
  const raw = fs.readFileSync(file, "utf8");
  const fm = eng.parseFrontMatter(raw);
  const r = eng.renderMarkdown(fm.body);
  const errors = [];

  // front-matter
  if (!fm.meta.title) errors.push("缺 title");
  if (!["可逆", "半可逆", "高不可逆"].includes(fm.meta.risk_level)) errors.push("risk_level 异常: " + fm.meta.risk_level);
  if (!/^\d+$/.test(String(fm.meta.cooling_period))) errors.push("cooling_period 异常");
  if (!Array.isArray(fm.meta.refs) || fm.meta.refs.length < 8) errors.push("refs 少于 8 条");
  if (!Array.isArray(fm.meta.tags) || fm.meta.tags.length < 2) errors.push("tags 异常");
  if (fm.meta.q !== item.q) errors.push("q 与 index.json 不一致: " + fm.meta.q);

  // h2 模块
  const h2s = r.toc.filter(t => t.level === 2).map(t => t.text);
  if (h2s.length !== 10) errors.push("h2 = " + h2s.length);
  EXPECT_H2.forEach((t, i) => {
    if (h2s[i] !== t) errors.push("第" + (i + 1) + "模块异常: " + h2s[i]);
  });

  // 结构统计
  const tables = (r.html.match(/<table>/g) || []).length;
  const cases = (r.html.match(/class="case /g) || []).length;
  const checks = (r.html.match(/class="checklist"/g) || []).length;
  const refs = (r.html.match(/id="ref-\d+"/g) || []).length;
  const inlineRefs = (r.html.match(/class="ref"/g) || []).length;

  if (tables < 4) errors.push("表格 = " + tables);
  if (cases < 4) errors.push("案例卡 = " + cases);
  if (checks < 2) errors.push("清单 = " + checks);
  if (refs < 8) errors.push("证据条目 = " + refs);
  if (inlineRefs < 12) errors.push("内联引用 = " + inlineRefs);
  // 下线项硬断言：跨站跳转与 URL 占位一律不得出现
  if (/crossnav/.test(r.html)) errors.push("残留跨站跳转模块");
  if (/\{\{URL\}\}/.test(fm.body)) errors.push("残留 {{URL}} 占位");
  if (/HowToLiveBetter|高性价比/.test(fm.body)) errors.push("残留旧站引用");

  // 语法残留（查源文件而非渲染结果：渲染结果本身全是 HTML 标签）
  const srcTags = (fm.body.match(/<[a-zA-Z\/][^>\n]*>/g) || []).filter(function (t) {
    return !/^<\/?span class="(light (?:red|amber|green)|arrow)"(?:\s*\/)?>$|^<\/span>$|^<br\s*\/?>$/i.test(t);
  });
  if (srcTags.length) errors.push("白名单外 HTML: " + srcTags.slice(0, 3).join(", "));
  if (/:::[a-z]/.test(r.html)) errors.push("存在未解析容器指令");
  if (/@输入|@输出|@依据/.test(r.html)) errors.push("存在残留 @ 标记");

  // 站内链接的 q 是否都能在 index.json 中路由
  (fm.body.match(/\?q=[^)&\s"<>]+/g) || []).forEach(function (q) {
    var val = decodeURIComponent(q.slice(3));
    if (val && !idx.items.some(function (it) { return it.q === val; })) {
      errors.push("站内链接 q 未登记: " + val);
    }
  });

  const words = r.html.replace(/<[^>]+>/g, "").replace(/\s/g, "").length;

  if (errors.length) {
    totalFail++;
    console.log("FAIL  " + label + "  → " + errors.join("; "));
  } else {
    console.log("PASS  " + label.padEnd(14) + " 字数 " + words + "  表格 " + tables + "  案例 " + cases + "  清单 " + checks + "  证据 " + refs + "  内联 " + inlineRefs);
  }
}

console.log(totalFail === 0 ? "\n全部 12 篇通过 ✓" : "\n失败 " + totalFail + " 篇 ✗");
process.exit(totalFail ? 1 : 0);
