// ボタンUIとページ遷移

document.addEventListener("DOMContentLoaded", () => {
  const sound = document.getElementById("clickSound");
  const deleteBtn = document.getElementById("delete-btn");
  const glitchDurationMs = 600;
  const glitchStorageKey = "glitchTransition";
  const codeTargetsSelector = [
    "[data-code]",
    "[data-detail]",
    ".work-card",
    ".key",
    ".page-panel",
    ".canvas-container",
    ".header"
  ].join(",");

  const getBoxes = () => Array.from(document.querySelectorAll(".figma-box-container"));

  const ensureCodeDisplay = (box) => {
    if (!box) return null;
    const main = box.querySelector(".box-main");
    if (!main) return null;
    let editorWrap = main.querySelector(".code-editor");
    if (!editorWrap) {
      main.innerHTML = "";
      editorWrap = document.createElement("div");
      editorWrap.className = "code-editor";
      editorWrap.innerHTML = `
        <label for="html-editor">HTML</label>
        <textarea id="html-editor" placeholder=" "></textarea>
        <label for="css-editor">CSS</label>
        <textarea id="css-editor" placeholder=" "></textarea>
      `;
      main.appendChild(editorWrap);
    }
    return {
      htmlEditor: main.querySelector("#html-editor"),
      cssEditor: main.querySelector("#css-editor")
    };
  };

  const ensureDetailDisplay = (box) => {
    if (!box) return null;
    const main = box.querySelector(".box-main");
    if (!main) return null;
    let details = main.querySelector(".detail-display");
    if (!details) {
      main.innerHTML = "";
      details = document.createElement("div");
      details.className = "detail-display";
      details.innerHTML = "<h3>DETAILS</h3><div class=\"detail-row\">クリックすると詳細が表示されます。</div>";
      main.appendChild(details);
    }
    return details;
  };

  const ensureEasterDisplay = (box) => {
    if (!box) return null;
    const main = box.querySelector(".box-main");
    if (!main) return null;
    let easter = main.querySelector(".easter-display");
    if (!easter) {
      main.innerHTML = "";
      easter = document.createElement("div");
      easter.className = "easter-display";
      easter.textContent = "do you want easter edd?";
      main.appendChild(easter);
    }
    return easter;
  };

  let activeElement = null;
  let styleEl = null;

  const getMatchedCSS = (element) => {
    const collected = [];
    const sheets = Array.from(document.styleSheets || []);
    sheets.forEach(sheet => {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch (error) {
        return;
      }
      if (!rules) return;
      Array.from(rules).forEach(rule => {
        if (rule.type === CSSRule.STYLE_RULE) {
          if (element.matches(rule.selectorText)) {
            collected.push(rule.cssText);
          }
        } else if (rule.type === CSSRule.MEDIA_RULE) {
          const innerMatches = [];
          Array.from(rule.cssRules || []).forEach(innerRule => {
            if (innerRule.type === CSSRule.STYLE_RULE && element.matches(innerRule.selectorText)) {
              innerMatches.push(innerRule.cssText);
            }
          });
          if (innerMatches.length > 0) {
            collected.push(`@media ${rule.conditionText} {`);
            collected.push(...innerMatches.map(text => `  ${text}`));
            collected.push(`}`);
          }
        }
      });
    });
    return collected.join("\n");
  };

  const updateCodeDisplay = (box, element) => {
    const editors = ensureCodeDisplay(box);
    if (!editors || !element) return;
    const { htmlEditor, cssEditor } = editors;
    if (!htmlEditor || !cssEditor) return;
    if (element.dataset && element.dataset.code) {
      htmlEditor.value = element.dataset.code;
      cssEditor.value = "";
      activeElement = element;
      return;
    }
    htmlEditor.value = element.outerHTML.trim();
    cssEditor.value = getMatchedCSS(element) || "";
    activeElement = element;
  };

  const playClick = () => {
    if (!sound) return;
    sound.currentTime = 0;
    sound.play();
  };

  const navigateWithGlitch = (page) => {
    if (!page) return;
    if (document.body.classList.contains("glitch-transition")) return;
    document.body.classList.add("glitch-transition");
    try {
      window.sessionStorage.setItem(glitchStorageKey, "1");
    } catch (error) {
      // sessionStorage is optional; ignore failures.
    }
    window.requestAnimationFrame(() => {
      window.location.href = page;
    });
  };

  if (document.body.classList.contains("glitch-container")) {
    try {
      if (window.sessionStorage.getItem(glitchStorageKey) === "1") {
        window.sessionStorage.removeItem(glitchStorageKey);
        document.body.classList.add("glitch-transition");
        window.setTimeout(() => {
          document.body.classList.remove("glitch-transition");
        }, glitchDurationMs);
      }
    } catch (error) {
      // sessionStorage is optional; ignore failures.
    }
  }

  document.querySelectorAll(".key").forEach(btn => {
    btn.addEventListener("click", playClick);
  });

  // momentary：押してる間だけ点灯
  document.querySelectorAll(".key.momentary").forEach(btn => {
    const lamp = btn.parentElement.querySelector(".lamp");
    if (!lamp) return;

    btn.addEventListener("mousedown", () => lamp.classList.add("on"));
    btn.addEventListener("mouseup", () => lamp.classList.remove("on"));
    btn.addEventListener("mouseleave", () => lamp.classList.remove("on"));
  });

  // 現在ページのradioを点灯
  const currentPage = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll(".radio-group .key.radio").forEach(btn => {
    const page = (btn.dataset.page || "").toLowerCase();
    if (!page) return;

    if (page === currentPage) {
      btn.classList.add("pressed");
      const lamp = btn.parentElement.querySelector(".lamp");
      if (lamp) lamp.classList.add("on");
    }
  });

  // radio: ページ遷移
  document.querySelectorAll(".radio-group .key.radio").forEach(btn => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      if (!page) return;
      if (page === currentPage) return;
      navigateWithGlitch(page);
    });
  });

  // HOMEボタン: トップへ遷移
  const homeBtn = document.querySelector(".key.key-white.momentary");
  if (homeBtn && homeBtn.dataset.page) {
    homeBtn.addEventListener("click", () => {
      navigateWithGlitch(homeBtn.dataset.page);
    });
  }

  // 削除ボタンのクリックでDELETE処理を実行
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      if (!window.state || !window.world || typeof window.ground === "undefined") return;
      if (!window.Matter || !window.Matter.Composite) return;

      window.state.deleteActive = true;
      window.state.deleteStartTime = Date.now();
      if (window.ground) {
        window.Matter.Composite.remove(window.world, window.ground);
        window.ground = null;
      }
    });
  }

  const bindEditorHandlers = (box) => {
    const editors = ensureCodeDisplay(box);
    if (!editors) return;
    const { htmlEditor, cssEditor } = editors;
    if (!htmlEditor || !cssEditor) return;
    if (htmlEditor.dataset.bound === "1") return;

    const updatePreview = () => {
      if (!activeElement) return;
      const nextHTML = htmlEditor.value.trim();
      if (nextHTML) {
        const temp = document.createElement("div");
        temp.innerHTML = nextHTML;
        const nextEl = temp.firstElementChild;
        if (nextEl) {
          activeElement.replaceWith(nextEl);
          activeElement = nextEl;
        }
      }

      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "live-style";
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = cssEditor.value;
    };

    htmlEditor.addEventListener("input", updatePreview);
    cssEditor.addEventListener("input", updatePreview);
    htmlEditor.dataset.bound = "1";
  };

  const setupBoxes = () => {
    const boxes = getBoxes();
    if (boxes[0]) ensureDetailDisplay(boxes[0]);
    if (boxes[1]) {
      ensureCodeDisplay(boxes[1]);
      bindEditorHandlers(boxes[1]);
    }
    if (boxes[2]) ensureEasterDisplay(boxes[2]);
  };

  setupBoxes();

  document.addEventListener("click", (event) => {
    if (event.target.closest(".figma-box-container")) return;
    setupBoxes();
    const target = event.target.closest(codeTargetsSelector);
    if (!target) return;
    const boxes = getBoxes();
    if (boxes[0]) {
      const details = ensureDetailDisplay(boxes[0]);
      if (details) {
        const rect = target.getBoundingClientRect();
        const text = (target.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120);
        const customDetail = target.dataset && target.dataset.detail ? target.dataset.detail.trim() : "";
        if (customDetail) {
          details.innerHTML = `
            <h3>DETAILS</h3>
            <div class="detail-row">${customDetail}</div>
          `;
        } else {
          details.innerHTML = `
            <h3>DETAILS</h3>
            <div class="detail-row"><span class="detail-label">tag:</span> ${target.tagName.toLowerCase()}</div>
            <div class="detail-row"><span class="detail-label">id:</span> ${target.id || "-"}</div>
            <div class="detail-row"><span class="detail-label">class:</span> ${target.className || "-"}</div>
            <div class="detail-row"><span class="detail-label">size:</span> ${Math.round(rect.width)} x ${Math.round(rect.height)}</div>
            <div class="detail-row"><span class="detail-label">text:</span> ${text || "-"}</div>
          `;
        }
      }
    }
    if (boxes[1]) updateCodeDisplay(boxes[1], target);
  });
});
