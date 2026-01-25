// ボタンUIとページ遷移

document.addEventListener("DOMContentLoaded", () => {
  const sound = document.getElementById("clickSound");
  const deleteBtn = document.getElementById("delete-btn");
  const glitchDurationMs = 600;
  const glitchStorageKey = "glitchTransition";

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
});
