/* ===========================================================
   人生抉择参考手册 · LifeChoices
   零依赖前端：mini-markdown 渲染 + REF 锚点 + 清单复制 + ?q/?sec 路由
   =========================================================== */

(function () {
  "use strict";

  var BASE = (typeof location === "undefined") ? "./" : (function () {
    // 支持部署在 /LifeChoices/ 子路径
    var p = location.pathname;
    var i = p.lastIndexOf("/");
    return i >= 0 ? p.slice(0, i + 1) : "/";
  })();

  /* ---------------- 工具 ---------------- */

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function slugify(s) {
    return String(s)
      .replace(/<[^>]+>/g, "")
      .trim()
      .replace(/[\s\u3000]+/g, "-")
      .replace(/[^\w\u4e00-\u9fa5\-]/g, "")
      .toLowerCase();
  }

  /* ---------------- front-matter ---------------- */

  function parseFrontMatter(raw) {
    var meta = {}, body = raw;
    if (raw.slice(0, 3) === "---") {
      var end = raw.indexOf("\n---", 3);
      if (end > -1) {
        var head = raw.slice(3, end).trim();
        body = raw.slice(end + 4).replace(/^\s*\n/, "");
        head.split(/\r?\n/).forEach(function (line) {
          if (!line.trim() || line.trim().charAt(0) === "#") return;
          var idx = line.indexOf(":");
          if (idx < 0) return;
          var k = line.slice(0, idx).trim();
          var v = line.slice(idx + 1).trim();
          // 去行内注释（未加引号时）
          if (v.charAt(0) !== '"' && v.charAt(0) !== "'") {
            v = v.replace(/\s+#.*$/, "");
          }
          if (/^\[.*\]$/.test(v)) {
            v = v.slice(1, -1).split(",").map(function (x) {
              return x.trim().replace(/^["']|["']$/g, "");
            }).filter(Boolean);
          } else {
            v = v.replace(/^["']|["']$/g, "");
          }
          meta[k] = v;
        });
      }
    }
    return { meta: meta, body: body };
  }

  /* ---------------- 行内渲染 ---------------- */

  function inline(text) {
    var codes = [];
    // 保护行内代码
    text = text.replace(/`([^`]+)`/g, function (_, c) {
      codes.push(c);
      return "\u0000C" + (codes.length - 1) + "\u0000";
    });

    text = esc(text);

    // REF 引用标记 -> 锚点
    text = text.replace(/\[(REF-\d{1,3})\]/g, function (_, id) {
      return '<a class="ref" href="#' + id.toLowerCase() + '" data-ref="' + id + '">' + id + '</a>';
    });

    // {{URL}} 占位
    text = text.replace(/\{\{URL\}\}/g, '<span class="url-ph">{{URL}}</span>');

    // 普通链接
    text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, t, u) {
      var ext = /^https?:/i.test(u);
      return '<a href="' + u + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" + t + "</a>";
    });

    // 粗体 / 斜体
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");

    // 白名单标签还原（arrow 装饰、信号灯、换行）
    text = text.replace(/&lt;span class=&quot;(light (?:red|amber|green)|arrow)&quot;&gt;([\s\S]*?)&lt;\/span&gt;/g, '<span class="$1">$2</span>');
    text = text.replace(/&lt;br\s*\/?&gt;/gi, "<br>");

    // 还原代码
    text = text.replace(/\u0000C(\d+)\u0000/g, function (_, i) {
      return "<code>" + esc(codes[+i]) + "</code>";
    });

    return text;
  }

  /* ---------------- 块级渲染 ---------------- */

  function renderMarkdown(md) {
    var lines = md.replace(/\r\n/g, "\n").split("\n");
    var out = [];
    var i = 0;
    var h2n = 0;
    var toc = [];

    function flushParagraph(buf) {
      if (!buf.length) return;
      out.push("<p>" + inline(buf.join(" ")) + "</p>");
      buf.length = 0;
    }

    var para = [];

    while (i < lines.length) {
      var line = lines[i];
      var t = line.trim();

      // 空行
      if (!t) { flushParagraph(para); i++; continue; }

      // 容器指令 :::type args ... :::
      if (/^:::\s*[a-z]+/.test(t)) {
        flushParagraph(para);
        var head = t.slice(3).trim();
        var sp = head.indexOf(" ");
        var type = (sp < 0 ? head : head.slice(0, sp)).toLowerCase();
        var args = sp < 0 ? "" : head.slice(sp + 1).trim();
        var buf = [];
        i++;
        while (i < lines.length) {
          var lt = lines[i].trim();
          if (lt === ":::") { i++; break; }            // 正常闭合
          if (/^:::\s*[a-z]+/.test(lt)) break;          // 容错：新容器指令，视为上一容器未闭合
          if (/^#{1,2}\s/.test(lt)) break;              // 容错：标题不可能属于容器内容
          buf.push(lines[i]);
          i++;
        }
        out.push(renderContainer(type, args, buf.join("\n")));
        continue;
      }

      // 分隔线
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) {
        flushParagraph(para);
        out.push("<hr>");
        i++;
        continue;
      }

      // 标题
      var hm = t.match(/^(#{1,6})\s+(.*)$/);
      if (hm) {
        flushParagraph(para);
        var level = hm[1].length;
        var htext = hm[2].trim();
        if (level === 1) {
          out.push("<h2>" + inline(htext) + "</h2>");
        } else if (level === 2) {
          h2n++;
          var id2 = "sec-" + h2n;
          var clean2 = htext.replace(/^[一二三四五六七八九十百]+[、.．]\s*/, "");
          toc.push({ level: 2, id: id2, text: clean2 });
          out.push('<h2 id="' + id2 + '"><span class="h2num">' +
            String(h2n).padStart(2, "0") + "</span>" + inline(clean2) + "</h2>");
        } else if (level === 3) {
          var id3 = slugify(htext) || "h3-" + i;
          toc.push({ level: 3, id: id3, text: htext });
          out.push('<h3 id="' + id3 + '">' + inline(htext) + "</h3>");
        } else {
          out.push("<h4>" + inline(htext) + "</h4>");
        }
        i++;
        continue;
      }

      // 表格
      if (t.charAt(0) === "|" && i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1].trim())) {
        flushParagraph(para);
        var tbuf = [t];
        i += 2;
        while (i < lines.length && lines[i].trim().charAt(0) === "|") {
          tbuf.push(lines[i].trim());
          i++;
        }
        out.push(renderTable(tbuf));
        continue;
      }

      // 引用
      if (t.charAt(0) === ">") {
        flushParagraph(para);
        var qbuf = [];
        while (i < lines.length && lines[i].trim().charAt(0) === ">") {
          qbuf.push(lines[i].trim().replace(/^>\s?/, ""));
          i++;
        }
        out.push("<blockquote>" + renderMarkdown(qbuf.join("\n")) + "</blockquote>");
        continue;
      }

      // 列表（含任务清单）
      if (/^([-*+]\s|\d+[.)]\s)/.test(t)) {
        flushParagraph(para);
        var lbuf = [];
        while (i < lines.length && /^([-*+]\s|\d+[.)]\s|\s{2,}\S)/.test(lines[i])) {
          lbuf.push(lines[i]);
          i++;
        }
        out.push(renderList(lbuf));
        continue;
      }

      para.push(t);
      i++;
    }
    flushParagraph(para);

    return { html: out.join("\n"), toc: toc };
  }

  function renderList(buf) {
    var ordered = /^\d+[.)]\s/.test(buf[0].trim());
    var items = [];
    var cur = null;
    buf.forEach(function (raw) {
      var m = raw.match(/^([-*+]|\d+[.)])\s+(.*)$/);
      if (m) {
        if (cur) items.push(cur);
        cur = { text: m[2], sub: [] };
      } else if (cur) {
        var s = raw.trim();
        if (/^([-*+]\s|\d+[.)]\s)/.test(s)) cur.sub.push(s);
        else cur.text += " " + s;
      }
    });
    if (cur) items.push(cur);

    var isTask = items.some(function (it) { return /^\[[ xX]\]\s/.test(it.text); });

    var html = items.map(function (it) {
      var tm = it.text.match(/^\[([ xX])\]\s+([\s\S]*)$/);
      if (tm) {
        return '<li data-task="1"><input type="checkbox"' +
          (tm[1].toLowerCase() === "x" ? " checked" : "") + "><span>" + inline(tm[2]) + "</span></li>";
      }
      var sub = it.sub.length
        ? "<ul>" + it.sub.map(function (s) {
            return "<li>" + inline(s.replace(/^([-*+]\s|\d+[.)]\s)/, "")) + "</li>";
          }).join("") + "</ul>"
        : "";
      return "<li>" + inline(it.text) + sub + "</li>";
    }).join("");

    if (isTask) return '<ul class="tasklist">' + html + "</ul>";
    return ordered ? "<ol>" + html + "</ol>" : "<ul>" + html + "</ul>";
  }

  function renderTable(rows) {
    function cells(row) {
      return row.replace(/^\|/, "").replace(/\|$/, "").split("|").map(function (c) { return c.trim(); });
    }
    var head = cells(rows[0]);
    var body = rows.slice(1).map(cells);
    var h = "<thead><tr>" + head.map(function (c) { return "<th>" + inline(c) + "</th>"; }).join("") + "</tr></thead>";
    var b = "<tbody>" + body.map(function (r) {
      return "<tr>" + r.map(function (c) { return "<td>" + inline(c) + "</td>"; }).join("") + "</tr>";
    }).join("") + "</tbody>";
    return '<div class="table-scroll"><table>' + h + b + "</table></div>";
  }

  /* ---------------- 自定义容器 ---------------- */

  function renderContainer(type, args, content) {
    if (type === "io") return renderIO(content);
    if (type === "case") return renderCase(args, content);
    if (type === "check") return renderCheck(args, content);
    if (type === "refs") return renderRefs(content);
    if (type === "cross") return '<div class="crossnav"><h3>跨站跳转</h3>' + renderMarkdown(content).html + "</div>";
    if (type === "meta") return '<div class="page-meta"><b>本页元数据</b>' + inline(content.replace(/\n+/g, " ")) + "</div>";
    if (type === "note") return '<div class="warning"><b>' + esc(args || "提示") + "</b>" + inline(content.replace(/\n+/g, " ")) + "</div>";
    // 未知容器降级为普通引用
    return "<blockquote>" + renderMarkdown(content).html + "</blockquote>";
  }

  function renderIO(content) {
    var parts = content.split(/^@(输入|输出|依据|备注|判断信号)\s*$/m);
    var html = "";
    // parts[0] 是第一个标记前的内容
    if (parts[0].trim()) {
      html += '<div class="in"><span class="k">输入</span>' + renderMarkdown(parts[0].trim()).html + "</div>";
    }
    for (var i = 1; i < parts.length; i += 2) {
      var label = parts[i];
      var body = (parts[i + 1] || "").trim();
      var cls = label === "输入" ? "in" : label === "输出" || label === "判断信号" ? "out" : "base";
      var bodyHtml = renderMarkdown(body).html;
      html += '<div class="' + cls + '"><span class="k">' + label + "</span>" + bodyHtml + "</div>";
    }
    return '<div class="io">' + html + "</div>";
  }

  function renderCase(args, content) {
    var tone = "pos";
    var head = args || "";
    var tm = head.match(/^(pos|neg|mid)\s*/);
    if (tm) { tone = tm[1]; head = head.slice(tm[0].length); }
    return '<div class="case ' + tone + '">' +
      (head ? '<span class="case-no">' + inline(head) + "</span>" : "") +
      renderMarkdown(content).html + "</div>";
  }

  function renderCheck(args, content) {
    var lines = content.split(/\r?\n/).filter(function (l) { return l.trim(); });
    var lis = lines.map(function (l) {
      var txt = l.trim().replace(/^[-*+]\s+(\[[ xX]\]\s+)?/, "");
      var m = txt.match(/^\[([ xX])\]\s+([\s\S]*)$/);
      var checked = m && m[1].toLowerCase() === "x";
      if (m) txt = m[2];
      return '<li><input type="checkbox"' + (checked ? " checked" : "") + "><span>" + inline(txt) + "</span></li>";
    }).join("");
    var plain = lines.map(function (l) {
      return "□ " + l.trim().replace(/^[-*+]\s+(\[[ xX]\]\s+)?/, "");
    }).join("\n");
    return '<div class="checklist"><div class="checklist-head">' +
      '<span class="checklist-title">' + esc(args || "自检清单") + "</span>" +
      '<button class="copy-btn" data-copy="' + esc(plain) + '">复制清单</button></div>' +
      "<ul>" + lis + "</ul></div>";
  }

  function renderRefs(content) {
    var items = content.split(/\r?\n/).filter(function (l) { return l.trim(); });
    var html = items.map(function (line) {
      var s = line.trim();
      // 形如：[REF-001]｜类型｜标题｜机构｜年份｜{{URL}}｜strong
      // 容错：年份可省略，URL 与强度标记位置不固定
      var m = s.match(/^\[(REF-\d{1,3})\]\s*[｜|]\s*([\s\S]*)$/);
      if (!m) return '<li><span class="rid">—</span><span class="rbody">' + inline(s) + "</span></li>";
      var id = m[1];
      var rest = m[2].split(/\s*[｜|]\s*/).map(function (x) { return x.trim(); });

      var strength = "";
      var url = "";
      var rest2 = [];
      rest.forEach(function (seg) {
        if (/^(strong|weak|辅助|强|弱)$/i.test(seg)) { strength = seg; return; }
        if (/^\{\{URL\}\}$/.test(seg) || /^https?:\/\//i.test(seg)) { if (!url) { url = seg; return; } }
        rest2.push(seg);
      });
      if (!url) url = "{{URL}}";

      var type = rest2[0] || "";
      var title = rest2[1] || "";
      var org = rest2[2] || "";
      var year = rest2[3] || "";
      // 年份字段若不是年份形态，视为机构描述的一部分
      if (year && !/^\d{4}$|^\d{4}\s*[-–]\s*\d{2,4}$/.test(year)) {
        org = [org, year].filter(Boolean).join(" · ");
        year = "";
      }

      var strong = /strong|^强$/i.test(strength);
      var urlHtml = /^\{\{URL\}\}$/.test(url)
        ? '<span class="rlink url-ph">{{URL}}</span>'
        : '<a class="rlink" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(url) + "</a>";

      return '<li id="' + id.toLowerCase() + '">' +
        '<span class="rid">' + id + "</span>" +
        '<span class="rbody">' +
          '<span class="rtype' + (strong ? " strong" : "") + '">' + esc(type) + (strong ? " · 强证据" : " · 辅助") + "</span>" +
          '<span class="rtitle">' + inline(title) + "</span>" +
          (org || year ? '<br><span class="ryear">' + esc([org, year].filter(Boolean).join(" · ")) + "</span>" : "") +
          urlHtml +
        "</span></li>";
    }).join("");
    return '<ul class="refs">' + html + "</ul>";
  }

  /* ---------------- 交互 ---------------- */

  function bindCopy() {
    document.querySelectorAll(".copy-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var text = btn.getAttribute("data-copy") || "";
        var done = function () {
          var old = btn.textContent;
          btn.textContent = "已复制";
          btn.classList.add("done");
          setTimeout(function () {
            btn.textContent = old;
            btn.classList.remove("done");
          }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(fallback);
        } else fallback();

        function fallback() {
          var ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand("copy"); done(); } catch (e) {}
          document.body.removeChild(ta);
        }
      });
    });
  }

  function bindTasks() {
    document.querySelectorAll('.tasklist li').forEach(function (li) {
      var cb = li.querySelector('input[type="checkbox"]');
      if (!cb) return;
      li.addEventListener("click", function (e) {
        if (e.target !== cb) { cb.checked = !cb.checked; }
      });
    });
  }

  function bindRefs() {
    document.querySelectorAll('a.ref').forEach(function (a) {
      a.addEventListener("click", function () {
        var id = (a.getAttribute("data-ref") || "").toLowerCase();
        var target = document.getElementById(id);
        if (!target) return;
        target.classList.add("flash");
        setTimeout(function () { target.classList.remove("flash"); }, 1600);
      });
    });
  }

  function bindToTop() {
    var btn = document.getElementById("totop");
    if (!btn) return;
    window.addEventListener("scroll", function () {
      btn.classList.toggle("show", window.scrollY > 600);
    }, { passive: true });
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------------- 页面渲染 ---------------- */

  function renderArticleShell(meta, html, toc) {
    var risk = meta.risk_level || "—";
    var riskCls = /高/.test(risk) ? "high" : /半/.test(risk) ? "half" : "low";
    var tags = Array.isArray(meta.tags) ? meta.tags : (meta.tags ? [meta.tags] : []);

    var tocHtml = toc.length
      ? '<nav class="toc"><div class="toc-title">本页结构</div><ol>' +
        toc.filter(function (x) { return x.level === 2; }).map(function (x) {
          return '<li><a href="#' + x.id + '">' + esc(x.text) + "</a></li>";
        }).join("") + "</ol></nav>"
      : "";

    return '<header class="article-head">' +
      '<div class="article-meta-top">人生抉择参考手册 · ' + esc(meta.q || "") + "</div>" +
      "<h1>" + esc(meta.title || "") + "</h1>" +
      '<p class="article-summary">' + esc(meta.summary || "") + "</p>" +
      '<div class="badges">' +
        '<span class="badge">不可逆等级 <b class="risk-' + riskCls + '">' + esc(risk) + "</b></span>" +
        '<span class="badge">建议冷静期 <b>' + esc(meta.cooling_period || "—") + " 天</b></span>" +
        '<span class="badge">证据条目 <b>' + (Array.isArray(meta.refs) ? meta.refs.length : 0) + " 条</b></span>" +
        tags.map(function (t) { return '<span class="badge">' + esc(t) + "</span>"; }).join("") +
      "</div>" +
      '<div class="warning"><b>前置声明</b>本内容仅为决策思考工具，不构成法律、医疗、金融、婚恋最终决策；高不可逆事项建议配套专业人士咨询。文中不提供"选 A 还是选 B"的结论，只交付框架、清单与成本核算方法。</div>' +
      tocHtml +
      "</header>" +
      '<div class="md">' + html + "</div>";
  }

  function showState(html) {
    var host = document.getElementById("article");
    host.innerHTML = '<div class="state">' + html + "</div>";
    document.getElementById("home").style.display = "none";
    host.style.display = "block";
  }

  function loadArticle(q, sec) {
    fetch(BASE + "data/index.json", { cache: "no-cache" })
      .then(function (r) { return r.json(); })
      .then(function (idx) {
        var hit = (idx.items || []).filter(function (it) { return it.q === q || it.slug === q; })[0];
        if (!hit) {
          showState("<b>暂无该专题</b>「" + esc(q) + "」还没有入库。<br>可回到首页查看已发布目录。" +
            '<br><a href="' + BASE + '">返回首页</a>');
          return;
        }
        return fetch(BASE + "data/" + hit.slug + ".md", { cache: "no-cache" })
          .then(function (r) {
            if (!r.ok) throw new Error("404");
            return r.text();
          })
          .then(function (raw) {
            var fm = parseFrontMatter(raw);
            var meta = Object.assign({}, hit, fm.meta);
            var r = renderMarkdown(fm.body);
            var host = document.getElementById("article");
            host.innerHTML = renderArticleShell(meta, r.html, r.toc);
            document.getElementById("home").style.display = "none";
            host.style.display = "block";
            document.title = (meta.title || "人生抉择") + " · 人生抉择参考手册";
            bindCopy(); bindTasks(); bindRefs(); bindToTop();
            if (sec) {
              var el = document.getElementById(/^\d+$/.test(sec) ? "sec-" + sec : sec);
              if (el) setTimeout(function () { el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 80);
            }
          });
      })
      .catch(function (e) {
        showState("<b>加载失败</b>本地直接双击打开时，浏览器会拦截文件读取。<br>" +
          "请用本地服务预览：在 LifeChoices 目录执行 <code>python -m http.server 8000</code>，" +
          "再访问 <code>http://localhost:8000/?q=" + encodeURIComponent(q) + "</code>；" +
          "或直接部署到 GitHub Pages。<br><a href=\"" + BASE + "\">返回首页</a>");
      });
  }

  function loadHome() {
    var grid = document.getElementById("catGrid");
    if (!grid) return;
    fetch(BASE + "data/index.json", { cache: "no-cache" })
      .then(function (r) { return r.json(); })
      .then(function (idx) {
        var cats = idx.categories || [];
        var items = idx.items || [];
        grid.innerHTML = cats.map(function (c) {
          var list = items.filter(function (it) { return it.category === c.key; });
          if (!list.length) return "";
          return "<div class=\"cat\"><h3>" + esc(c.key) + "</h3><ul>" + list.map(function (it) {
            var cls = /高/.test(it.risk || "") ? "high" : /半/.test(it.risk || "") ? "half" : "low";
            return '<li><a href="' + BASE + "?q=" + encodeURIComponent(it.q) + '">' + esc(it.title) + "</a>" +
              (it.status === "planned" ? '<span class="risk planned">筹备中</span>' : "") +
              '<span class="risk ' + cls + '">' + esc(it.risk || "") + "</span></li>";
          }).join("") + "</ul></div>";
        }).join("");
      })
      .catch(function () {
        grid.innerHTML = '<div class="cat" style="grid-column:1/-1">目录读取失败：请在本地起服务或用 Pages 打开。</div>';
      });
  }

  function init() {
    var params = new URLSearchParams(location.search);
    var q = params.get("q");
    var sec = params.get("sec");

    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });

    if (q) {
      document.getElementById("home").style.display = "none";
      loadArticle(q, sec);
    } else {
      document.getElementById("article").style.display = "none";
      loadHome();
      bindRefs();
      bindToTop();
    }
  }

  // Node 环境：导出渲染函数用于离线自检
  if (typeof document === "undefined") {
    if (typeof module !== "undefined" && module.exports) {
      module.exports = {
        renderMarkdown: renderMarkdown,
        parseFrontMatter: parseFrontMatter,
        renderRefs: renderRefs,
        renderCheck: renderCheck,
        renderIO: renderIO
      };
    }
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else init();
})();
