# 人生抉择参考手册 · LifeChoices

与《高性价比人生指南》（`HowToLiveBetter/`）同体系的静态站点，处理**拐点抉择**：转行、婚育、迁移、止损。
不提供结论，只提供框架、自检清单与成本核算方法。

- **12 篇专题全部就绪**：亲密家庭 3 篇 / 事业城市 5 篇 / 自我价值 3 篇 / 健康取舍 1 篇，合计约 13.8 万字
- 零依赖、零构建：纯静态 HTML + CSS + 原生 JS，直接丢进 GitHub Pages 就能跑
- 内容与版式分离：写作只写 `.md`，版式由 `assets/` 统一控制
- 每条论点绑定可查证来源，`[REF-00x]` 自动转成页内锚点

## 全部专题

| 分类 | 专题 | 不可逆等级 |
| --- | --- | --- |
| 事业城市 | 转行 / 裸辞 / 考公 / 留大城市还是回老家 / 买房 | 半可逆 ×3 · 高不可逆 ×2 |
| 亲密家庭 | 结婚 / 生孩子 / 离婚 | 高不可逆 ×3 |
| 自我价值 | 辞职读研 / 创业 / 副业 | 半可逆 · 高不可逆 · 可逆 |
| 健康取舍 | 用健康换收入 | 高不可逆 |

---

## 目录结构

```
LifeChoices/
├── index.html              首页（宣言 / 系列定位 / 底层工具箱 / 目录 / 使用说明 / 依据索引）
├── assets/
│   ├── style.css           全部样式（含响应式、打印样式）
│   └── app.js              渲染引擎：mini-markdown + 容器解析 + REF 锚点 + 清单复制 + 路由
├── data/
│   ├── index.json          专题索引（q / slug / 分类 / 不可逆等级 / 状态）
│   └── zhuanxing.md        样板专题：要不要转行
├── 提示词手册.md            给 AI 的主提示词 + 4 个子提示词 + 语法速查 + 验收清单
└── test-render.js          离线渲染自检（node test-render.js）
```

---

## 本地预览

直接双击 `index.html` 只能看到首页 —— 因为浏览器会拦截 `file://` 下的 `fetch` 读取 `data/*.md`。
要用完整功能，起一个本地服务：

```bash
cd LifeChoices
python -m http.server 8000
# 打开 http://localhost:8000/
# 专题页：http://localhost:8000/?q=转行
```

---

## 部署到 GitHub Pages

假设仓库是 `eternity4719.github.io`：

```bash
cd eternity4719.github.io
cp -r /path/to/LifeChoices ./LifeChoices
git add LifeChoices && git commit -m "add LifeChoices" && git push
```

访问 `https://eternity4719.github.io/LifeChoices/`。
`assets/app.js` 会自动识别子路径，不需要改任何配置。

**跨站链接需要确认**：站内跳转用的是相对路径 `../HowToLiveBetter/?q=...&sec=...`。
如果你的原站实际目录名不同，全局替换 `HowToLiveBetter/` 即可（涉及 `index.html` 与各篇 `.md` 的 `:::cross` 段）。

---

## 渲染规则（前端怎么处理你写的内容）

### 1. 路由

| 参数 | 作用 |
| --- | --- |
| `?q=转行` | 从 `data/index.json` 找到 slug，加载 `data/zhuanxing.md` |
| `&sec=4` | 渲染完成后滚动到第 4 个 `##` 标题（`#sec-4`） |
| 无参数 | 显示首页，并从 `index.json` 渲染目录 |

新增一篇专题＝加一个 `.md` + 在 `index.json` 的 `items` 里加一条。不需要改 HTML。

### 2. REF 引用锚点

正文写 `[REF-001]` → 渲染为：

```html
<a class="ref" href="#ref-001" data-ref="REF-001">REF-001</a>
```

页尾 `:::refs` 容器里的 `[REF-001]｜类型｜标题｜机构｜年份｜{{URL}}｜strong` 渲染为：

```html
<li id="ref-001">
  <span class="rid">REF-001</span>
  <span class="rtype strong">官方法规 · 强证据</span>
  <span class="rtitle">《中华人民共和国劳动合同法》第三十七条…</span>
  <span class="ryear">全国人民代表大会 · 2007</span>
  <span class="rlink url-ph">{{URL}}</span>
</li>
```

点击正文小标 → 平滑跳转 → 目标条目闪一次底色（`@keyframes` 用 class `.flash` 实现，1.6 秒后自动移除）。

**`{{URL}}` 的两种状态**：留着就是黄色虚线占位块；换成 `https://...` 后自动变成可点击外链，加 `target="_blank"`。不用改任何代码。

### 3. 自检清单一键复制

`:::check 名称` 容器渲染成带复选框的卡片，右上角「复制清单」按钮会把条目导出为纯文本：

```
□ 最近一个月睡眠明显异常
□ 缓冲月数 < 3 个月
```

复制走 `navigator.clipboard`，失败时降级到 `document.execCommand("copy")`（兼容旧浏览器与 `http://` 环境）。文本存在 `data-copy` 属性里，不需要额外接口。

### 4. 输入输出卡片

`:::io` 里 `@输入 / @输出 / @依据` 分段，渲染成三色卡片（白 / 浅棕 / 灰），对应「你要填什么 → 你得到什么信号 → 凭什么这么说」。这是全站最重要的视觉单元。

### 5. 其他容器

| 写法 | 产出 |
| --- | --- |
| `:::case pos 案例 C-01｜标题` | 左侧色条案例卡（绿/黄/红） |
| `:::cross` | 灰底跨站跳转区 |
| `:::meta` | 虚线框页尾元数据 |
| `:::note 提示` | 红色警示框 |

### 6. 安全边界

渲染器会转义所有 HTML，只放行三个白名单标签：
`<span class="light red|amber|green">`、`<span class="arrow">`、`<br>`。
除此之外写任何 HTML 都会原样显示成源码 —— 这是有意的，防止内容里混入脚本。

---

## 自检

```bash
node test-render.js    # 样板专题单篇校验
node test-all.js       # 全部 12 篇批量校验（需 NODE_PATH 指向含依赖的目录或与 assets 同目录运行）
node test-page.js      # jsdom 端到端校验（需先启动本地服务）
```

`test-all.js` 校验项：front-matter 完整性与 index.json 一致、11 个模块标题、≥4 张表格、3+1 案例卡、≥2 清单、12 条证据、≥12 处内联引用、容器闭合、白名单外 HTML、跨站链接 q 值可路由。
改完任何 `.md` 跑一遍，全 PASS 再推。

---

## 改样式

所有设计变量在 `assets/style.css` 顶部的 `:root`：

```css
--paper: #fbfaf7;   /* 纸张底色 */
--ink: #1e1c19;     /* 正文字色 */
--accent: #7a5c3e;  /* 强调色（旧纸棕） */
--red / --amber / --green  /* 信号灯三色 */
--font-serif / --font-sans / --font-mono
```

想和《高性价比人生指南》完全对齐，把这三个色值和字体栈换成原站的值即可，其余版式不用动。

---

## 内容红线

- 不写「建议你选 A」类结论
- 不编造文献、数据、案例
- 案例必须脱敏，不做道德评判
- 高不可逆事项必须提示「配套专业人士咨询」
