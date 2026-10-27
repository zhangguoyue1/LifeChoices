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
  check("已发布目录项 = 12", catItems.length === 12, "实际 " + catItems.length);
  check("目录分组 = 6", hd.querySelectorAll("#catGrid .cat").length === 6, "实际 " + hd.querySelectorAll("#catGrid .cat").length);
  check("首页工具卡 = 4", hd.querySelectorAll(".tool-card").length === 4);
  check("首页 REF 锚点可解析", hd.querySelectorAll("#ref-101").length === 1);
  check("hero 全景图按钮", /view=pano/.test((hd.querySelector(".hero-cta") || {}).getAttribute("href") || ""));
  check("目录区全景图链接", /view=pano/.test((hd.querySelector(".more-link") || {}).getAttribute("href") || ""));

  // 侧边栏
  check("侧栏章节项 = 55", hd.querySelectorAll("#sideNav .snav li").length === 55, "实际 " + hd.querySelectorAll("#sideNav .snav li").length);
  check("侧栏分组 = 11", hd.querySelectorAll("#sideNav .scat").length === 11, "实际 " + hd.querySelectorAll("#sideNav .scat").length);
  check("侧栏筹备中条目 = 43", hd.querySelectorAll("#sideNav .snav a.planned").length === 43, "实际 " + hd.querySelectorAll("#sideNav .snav a.planned").length);
  check("侧栏计数文案", /已发布 12/.test((hd.getElementById("sideCount") || {}).textContent || ""), (hd.getElementById("sideCount") || {}).textContent);
  check("侧栏箭头存在", hd.querySelectorAll("#sideNav .chev").length >= 55);
  check("侧栏等级圆点", hd.querySelectorAll("#sideNav .dot").length === 55);
  check("侧栏全景图入口", /view=pano/.test((hd.getElementById("panoLink") || {}).getAttribute("href") || ""));
  check("顶栏无样板链接", !/要不要转行/.test(hd.querySelector(".topnav").innerHTML));

  // 分类下拉：11 个类别选项
  const sel = hd.getElementById("catSelect");
  check("分类下拉已填充 11 类", sel && sel.options.length === 12, sel && ("实际 " + sel.options.length));
  check("分类下拉默认全部", sel && sel.value === "all");

  // 筛选联动：点「高不可逆」chip
  hd.querySelector('#riskChips .chip[data-risk="高不可逆"]').dispatchEvent(new home.window.MouseEvent("click", { bubbles: true }));
  await wait(120);
  check("筛选「高不可逆」后侧栏 = 25", hd.querySelectorAll("#sideNav .snav li").length === 25, "实际 " + hd.querySelectorAll("#sideNav .snav li").length);
  check("筛选计数切换", /\/ 55/.test((hd.getElementById("sideCount") || {}).textContent || ""), (hd.getElementById("sideCount") || {}).textContent);
  // 复位
  hd.querySelector('#riskChips .chip[data-risk="all"]').dispatchEvent(new home.window.MouseEvent("click", { bubbles: true }));
  await wait(120);
  check("复位后恢复 55 项", hd.querySelectorAll("#sideNav .snav li").length === 55);

  // 分类筛选：选「健康与身体」
  sel.value = "健康与身体";
  sel.dispatchEvent(new home.window.Event("change", { bubbles: true }));
  await wait(120);
  check("分类筛选后侧栏 = 6", hd.querySelectorAll("#sideNav .snav li").length === 6, "实际 " + hd.querySelectorAll("#sideNav .snav li").length);
  check("分类筛选后首页 = 1", hd.querySelectorAll("#catGrid .cat li").length === 1, "实际 " + hd.querySelectorAll("#catGrid .cat li").length);
  sel.value = "all";
  sel.dispatchEvent(new home.window.Event("change", { bubbles: true }));
  await wait(120);

  check("微信互动条存在", /wozz8888/.test(hd.querySelector(".wx-bar").textContent));
  check("侧栏微信复制钮", /wozz8888/.test(hd.querySelector(".side-foot .wx-copy").getAttribute("data-copy") || ""));
  check("页脚年份已填", hd.querySelector("[data-year]").textContent === String(new Date().getFullYear()));
  check("无旧站广告", !/HowToLiveBetter|高性价比/.test(hd.body.innerHTML));

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
  check("TOC = 10", AR.querySelectorAll(".toc li").length === 10, "实际 " + AR.querySelectorAll(".toc li").length);
  check("正文 h2 = 10", AR.querySelectorAll(".md h2").length === 10);
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
  check("URL 占位 = 0", AR.querySelectorAll(".url-ph").length === 0, "实际 " + AR.querySelectorAll(".url-ph").length);
  check("文末微信互动卡", /wozz8888/.test((AR.querySelector(".end-feedback") || {}).textContent || ""));
  check("留言区存在", AR.querySelectorAll("#comments").length === 1);
  check("留言区标题", /留言讨论/.test((AR.querySelector(".comments-title") || {}).textContent || ""));
  const utt = AR.querySelector('#commentsBody script[src*="utteranc.es"]');
  check("Utterances 脚本已挂载", !!utt);
  check("utteranc repo 正确", utt && utt.getAttribute("repo") === "zhangguoyue1/LifeChoices", utt && utt.getAttribute("repo"));
  check("utteranc issue-term=url", utt && utt.getAttribute("issue-term") === "url", utt && utt.getAttribute("issue-term"));
  check("侧栏当前篇高亮", ad.querySelectorAll("#sideNav .snav a.active").length === 1, "实际 " + ad.querySelectorAll("#sideNav .snav a.active").length);
  check("元数据块存在", /主题词：转行/.test((AR.querySelector(".page-meta") || {}).textContent || ""));
  check("无容器指令残留", !/:::[a-z]/.test(AR.querySelector(".md").textContent));
  check("无 HTML 源码泄漏", !/<span|<\/span>/.test(AR.querySelector(".md").textContent), AR.querySelector(".md").textContent.match(/.{0,20}<span.{0,30}/));
  check("无旧站引用", !/HowToLiveBetter|高性价比/.test(AR.textContent));
  check("页面 title 已更新", ad.title === "要不要转行 · 人生抉择参考手册", ad.title);

  /* ---------- 全景图页 ---------- */
  console.log("\n[全景图 ?view=pano]");
  const pano = load("/?view=pano");
  await wait(800);
  const pd = pano.window.document;
  const PA = pd.getElementById("article");
  check("首页已隐藏", pd.getElementById("home").style.display === "none");
  check("H1 = 抉择全景图", (PA.querySelector(".article-head h1") || {}).textContent === "抉择全景图");
  check("分类 section = 11", PA.querySelectorAll(".pano-cat").length === 11, "实际 " + PA.querySelectorAll(".pano-cat").length);
  check("表格行 = 55", PA.querySelectorAll(".pano-table tbody tr").length === 55, "实际 " + PA.querySelectorAll(".pano-table tbody tr").length);
  check("已发布链接 = 12", PA.querySelectorAll("a.pano-title").length === 12, "实际 " + PA.querySelectorAll("a.pano-title").length);
  check("筹备中标记 = 43", PA.querySelectorAll(".pano-state.queue").length === 43, "实际 " + PA.querySelectorAll(".pano-state.queue").length);
  check("筹备中标签 = 43", PA.querySelectorAll(".pano-title-planned .queue-tag").length === 43);
  check("两难描述非空", Array.from(PA.querySelectorAll(".pano-dilemma")).every((td) => td.textContent.trim().length > 8));
  check("全景图页微信按钮", /wozz8888/.test((PA.querySelector(".end-feedback") || {}).textContent || ""));
  check("侧栏全景图入口高亮", pd.querySelectorAll("#panoLink.active").length === 1);
  check("title 已更新", /抉择全景图/.test(pd.title), pd.title);
  const firstPub = PA.querySelector("a.pano-title");
  check("全景图链接指向已发布条目", firstPub && /\?q=/.test(firstPub.getAttribute("href")), firstPub && firstPub.getAttribute("href"));

  /* ---------- 筹备中条目 ---------- */
  console.log("\n[容错 ?q=父母反对（筹备中）]");
  const planned = load("/?q=" + encodeURIComponent("父母反对"));
  await wait(600);
  const pl = planned.window.document;
  check("显示写作队列提示", /写作队列/.test(pl.getElementById("article").textContent), pl.getElementById("article").textContent.slice(0, 60));
  check("催更微信按钮", /wozz8888/.test(pl.getElementById("article").textContent));

  /* ---------- 未知主题 ---------- */
  console.log("\n[容错 ?q=不存在的词]");
  const bad = load("/?q=" + encodeURIComponent("不存在的词"));
  await wait(600);
  const bd = bad.window.document;
  check("显示空状态提示", /暂无该专题/.test(bd.getElementById("article").textContent));

  console.log(fail === 0 ? "\n全部通过 ✓" : "\n失败 " + fail + " 项 ✗");
  process.exit(fail ? 1 : 0);
})();
