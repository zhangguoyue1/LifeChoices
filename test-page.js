/* 页面级验证：jsdom 加载真实 index.html + app.js，跑通 fetch 全链路
   前置：本地已启动 http://127.0.0.1:8899 服务
   运行：NODE_PATH=<workspace>/node_modules node test-page.js */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const ORIGIN = "http://127.0.0.1:8899";
const HTML = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const JS = fs.readFileSync(path.join(__dirname, "assets", "app.js"), "utf8");

function load(url) {
  const dom = new JSDOM(HTML, {
    url: ORIGIN + url,
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  dom.window.fetch = (u, o) => fetch(new URL(u, ORIGIN + "/").href, o);
  dom.window.eval(JS);
  return dom;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let fail = 0;
function check(name, ok, extra) {
  console.log((ok ? "  PASS  " : "  FAIL  ") + name + (extra && !ok ? "  →  " + extra : ""));
  if (!ok) fail++;
}

(async () => {
  /* ---------- 首页 ---------- */
  console.log("\n[首页]");
  const home = load("/");
  await wait(600);
  const hd = home.window.document;
  check("首页可见", hd.getElementById("home").style.display !== "none");
  check("专题容器隐藏", hd.getElementById("article").style.display === "none");
  const catItems = hd.querySelectorAll("#catGrid .cat li");
  check("目录项 = 12", catItems.length === 12, "实际 " + catItems.length);
  check("目录分组 = 4", hd.querySelectorAll("#catGrid .cat").length === 4, "实际 " + hd.querySelectorAll("#catGrid .cat").length);
  check("首页工具卡 = 4", hd.querySelectorAll(".tool-card").length === 4);
  check("首页 REF 锚点可解析", hd.querySelectorAll("#ref-101").length === 1);
  check("互通跳转存在", /HowToLiveBetter/.test(hd.querySelector(".crossnav").innerHTML));
  check("页脚年份已填", hd.querySelector("[data-year]").textContent === String(new Date().getFullYear()));

  /* ---------- 专题页 ---------- */
  console.log("\n[专题页 ?q=转行]");
  const art = load("/?q=" + encodeURIComponent("转行"));
  await wait(800);
  const ad = art.window.document;
  const AR = ad.getElementById("article");
  check("首页已隐藏", ad.getElementById("home").style.display === "none");
  check("专题容器可见", ad.getElementById("article").style.display === "block");
  const h1 = AR.querySelector(".article-head h1");
  check("H1 = 要不要转行", h1 && h1.textContent === "要不要转行", h1 && h1.textContent);
  check("摘要非空", (AR.querySelector(".article-summary") || {}).textContent.length > 10);
  check("前置声明存在", /不构成法律/.test((AR.querySelector(".warning") || {}).textContent || ""));
  check("徽章 = 3+tags", AR.querySelectorAll(".badge").length === 6, "实际 " + AR.querySelectorAll(".badge").length);
  check("TOC = 11", AR.querySelectorAll(".toc li").length === 11, "实际 " + AR.querySelectorAll(".toc li").length);
  check("正文 h2 = 11", AR.querySelectorAll(".md h2").length === 11);
  check("h2 自动编号", /01/.test((AR.querySelector(".md h2 .h2num") || {}).textContent || ""));
  check("io 卡片 ≥ 8", AR.querySelectorAll(".md .io").length >= 8, "实际 " + AR.querySelectorAll(".md .io").length);
  check("check 清单 = 3", AR.querySelectorAll(".md .checklist").length === 3, "实际 " + AR.querySelectorAll(".md .checklist").length);
  check("复制按钮可用", AR.querySelectorAll(".md .copy-btn").length === 3);
  check("案例卡 = 4", AR.querySelectorAll(".md .case").length === 4);
  check("表格 = 4", AR.querySelectorAll(".md table").length === 4);
  check("证据条目 = 12", AR.querySelectorAll(".refs li").length === 12, "实际 " + AR.querySelectorAll(".refs li").length);
  check("内联 REF 可点击", AR.querySelectorAll("a.ref").length >= 12, "实际 " + AR.querySelectorAll("a.ref").length);
  check("REF 锚点全部有落点", Array.from(AR.querySelectorAll("a.ref")).every((a) => {
    const id = a.getAttribute("data-ref").toLowerCase();
    return !!ad.getElementById(id);
  }));
  check("信号灯渲染", AR.querySelectorAll(".light").length >= 6, "实际 " + AR.querySelectorAll(".light").length);
  check("URL 占位 = 12", AR.querySelectorAll(".url-ph").length === 12, "实际 " + AR.querySelectorAll(".url-ph").length);
  check("跨站跳转链接", AR.querySelectorAll(".md .crossnav a").length === 6, "实际 " + AR.querySelectorAll(".md .crossnav a").length);
  check("元数据块存在", /主题词：转行/.test((AR.querySelector(".page-meta") || {}).textContent || ""));
  check("无容器指令残留", !/:::[a-z]/.test(AR.querySelector(".md").textContent));
  check("无 HTML 源码泄漏", !/<span|<\/span>/.test(AR.querySelector(".md").textContent), AR.querySelector(".md").textContent.match(/.{0,20}<span.{0,30}/));
  check("页面 title 已更新", ad.title === "要不要转行 · 人生抉择参考手册", ad.title);

  /* ---------- 未知主题 ---------- */
  console.log("\n[容错 ?q=不存在的词]");
  const bad = load("/?q=" + encodeURIComponent("不存在的词"));
  await wait(600);
  const bd = bad.window.document;
  check("显示空状态提示", /暂无该专题/.test(bd.getElementById("article").textContent));

  console.log(fail === 0 ? "\n全部通过 ✓" : "\n失败 " + fail + " 项 ✗");
  process.exit(fail ? 1 : 0);
})();
