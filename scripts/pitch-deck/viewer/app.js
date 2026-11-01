(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const state = {
    data: null,
    index: 0,
    mode: "slides",
    notesOpen: true,
    zoom: 1,
    presenting: false,
    query: "",
  };

  const els = {
    progressBar: $("progressBar"),
    slideCount: $("slideCount"),
    thumbList: $("thumbList"),
    searchInput: $("searchInput"),
    searchEmpty: $("searchEmpty"),
    counter: $("counter"),
    mobileCounter: $("mobileCounter"),
    slideImage: $("slideImage"),
    slideCaption: $("slideCaption"),
    slideKicker: $("slideKicker"),
    slideTitle: $("slideTitle"),
    notesPanel: $("notesPanel"),
    notesText: $("notesText"),
    notesToggle: $("notesToggle"),
    textKicker: $("textKicker"),
    textTitle: $("textTitle"),
    textBlocks: $("textBlocks"),
    textNotes: $("textNotes"),
    pdfFrame: $("pdfFrame"),
    pdfPageCount: $("pdfPageCount"),
    openPdf: $("openPdf"),
    prevBtn: $("prevBtn"),
    nextBtn: $("nextBtn"),
    mobilePrev: $("mobilePrev"),
    mobileNext: $("mobileNext"),
    fullscreenBtn: $("fullscreenBtn"),
    exitPresentation: $("exitPresentation"),
    zoomIn: $("zoomIn"),
    zoomOut: $("zoomOut"),
    zoomReset: $("zoomReset"),
    zoomLabel: $("zoomLabel"),
    loadError: $("loadError"),
    stage: $("stage"),
  };

  const panels = {
    slides: $("slidesPanel"),
    text: $("textPanel"),
    pdf: $("pdfPanel"),
  };
  const tabs = Array.from(document.querySelectorAll(".tab"));

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function current() {
    return state.data.slides[state.index];
  }

  function slideSearchText(slide) {
    return normalize([
      slide.title,
      slide.kicker,
      slide.notes,
      ...slide.blocks.map((b) => b.text),
    ].join(" "));
  }

  function renderThumbs() {
    els.thumbList.replaceChildren();
    const query = normalize(state.query);
    let visible = 0;

    state.data.slides.forEach((slide, i) => {
      const matches = !query || slideSearchText(slide).includes(query);
      const li = document.createElement("li");
      li.hidden = !matches;
      if (matches) visible += 1;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "thumb-button";
      button.dataset.index = String(i);
      button.setAttribute("aria-current", i === state.index ? "true" : "false");
      button.setAttribute("aria-label", `Diapositive ${slide.number} : ${slide.title}`);

      const img = document.createElement("img");
      img.src = slide.thumbnail;
      img.alt = "";
      img.loading = "lazy";
      img.width = 360;
      img.height = 203;

      const meta = document.createElement("span");
      meta.className = "thumb-meta";
      const number = document.createElement("span");
      number.className = "thumb-number";
      number.textContent = pad(slide.number);
      const title = document.createElement("span");
      title.className = "thumb-title";
      title.textContent = slide.title;
      meta.append(number, title);
      button.append(img, meta);
      button.addEventListener("click", () => setSlide(i));
      li.append(button);
      els.thumbList.append(li);
    });

    els.searchEmpty.hidden = visible !== 0;
  }

  function updateThumbCurrent() {
    els.thumbList.querySelectorAll(".thumb-button").forEach((button) => {
      const active = Number(button.dataset.index) === state.index;
      button.setAttribute("aria-current", active ? "true" : "false");
      if (active && !button.closest("li").hidden) {
        button.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    });
  }

  function renderText(slide) {
    els.textKicker.textContent = slide.kicker || `Diapositive ${pad(slide.number)}`;
    els.textTitle.textContent = slide.title;
    els.textBlocks.replaceChildren();

    if (!slide.blocks.length) {
      const p = document.createElement("p");
      p.textContent = "Cette diapositive est principalement visuelle. Consultez l’aperçu ou le PDF original.";
      els.textBlocks.append(p);
    }

    slide.blocks.forEach((block) => {
      const isHeading = block.size >= 15 || block.bold;
      const node = document.createElement(isHeading ? "h3" : "p");
      if (!isHeading && block.size >= 20) node.className = "lead";
      node.textContent = block.text;
      els.textBlocks.append(node);
    });

    els.textNotes.textContent = slide.notes || "Aucune note orateur pour cette diapositive.";
  }

  function applyZoom() {
    const percent = Math.round(state.zoom * 100);
    els.zoomLabel.textContent = `${percent} %`;
    els.slideImage.style.maxWidth = `${Math.round(1100 * state.zoom)}px`;
  }

  function setSlide(index, { fromHash = false } = {}) {
    const total = state.data.slides.length;
    state.index = Math.max(0, Math.min(total - 1, index));
    const slide = current();

    els.slideImage.src = slide.image;
    els.slideImage.alt = `Diapositive ${slide.number} : ${slide.title}`;
    els.slideCaption.textContent = slide.title;
    els.slideKicker.textContent = slide.kicker || `Diapositive ${pad(slide.number)}`;
    els.slideTitle.textContent = slide.title;
    els.notesText.textContent = slide.notes || "Aucune note orateur pour cette diapositive.";

    const counter = `${pad(slide.number)} / ${pad(total)}`;
    els.counter.textContent = counter;
    els.mobileCounter.textContent = counter;
    els.progressBar.style.width = `${(slide.number / total) * 100}%`;
    els.prevBtn.disabled = state.index === 0;
    els.nextBtn.disabled = state.index === total - 1;
    els.mobilePrev.disabled = state.index === 0;
    els.mobileNext.disabled = state.index === total - 1;

    updateThumbCurrent();
    renderText(slide);
    applyZoom();

    if (state.mode === "pdf") {
      const href = state.data.files.pdf.href;
      els.pdfFrame.src = `${href}#page=${slide.number}&view=FitH`;
      els.openPdf.href = `${href}#page=${slide.number}`;
    }

    if (!fromHash) {
      history.replaceState(null, "", `#slide-${pad(slide.number)}`);
    }

    const next = state.data.slides[state.index + 1];
    const prev = state.data.slides[state.index - 1];
    [next, prev].filter(Boolean).forEach((s) => {
      const img = new Image();
      img.src = s.image;
    });
  }

  function setMode(mode) {
    state.mode = mode;
    tabs.forEach((tab) => {
      const selected = tab.dataset.mode === mode;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.tabIndex = selected ? 0 : -1;
    });
    Object.entries(panels).forEach(([key, panel]) => {
      panel.hidden = key !== mode;
    });
    els.notesToggle.hidden = mode !== "slides";

    if (mode === "pdf") {
      const slide = current();
      const href = state.data.files.pdf.href;
      els.pdfFrame.src = `${href}#page=${slide.number}&view=FitH`;
      els.openPdf.href = `${href}#page=${slide.number}`;
    }
    if (mode === "text") renderText(current());
  }

  function toggleNotes(force) {
    state.notesOpen = typeof force === "boolean" ? force : !state.notesOpen;
    els.notesPanel.hidden = !state.notesOpen;
    els.notesToggle.setAttribute("aria-expanded", state.notesOpen ? "true" : "false");
    els.notesToggle.textContent = state.notesOpen ? "Masquer les notes" : "Afficher les notes";
  }

  async function enterPresentation() {
    state.presenting = true;
    document.body.classList.add("presenting");
    els.fullscreenBtn.setAttribute("aria-pressed", "true");
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Le mode plein écran CSS reste utilisable si l'API est refusée.
    }
  }

  async function exitPresentation() {
    state.presenting = false;
    document.body.classList.remove("presenting");
    els.fullscreenBtn.setAttribute("aria-pressed", "false");
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // ignore
      }
    }
  }

  function togglePresentation() {
    if (state.presenting) exitPresentation();
    else enterPresentation();
  }

  function parseHash() {
    const match = /^#slide-(\d+)$/i.exec(location.hash) || /^#(\d+)$/i.exec(location.hash);
    if (!match) return 0;
    return Math.max(0, Number(match[1]) - 1);
  }

  function bind() {
    els.prevBtn.addEventListener("click", () => setSlide(state.index - 1));
    els.nextBtn.addEventListener("click", () => setSlide(state.index + 1));
    els.mobilePrev.addEventListener("click", () => setSlide(state.index - 1));
    els.mobileNext.addEventListener("click", () => setSlide(state.index + 1));
    els.notesToggle.addEventListener("click", () => toggleNotes());
    els.fullscreenBtn.addEventListener("click", togglePresentation);
    els.exitPresentation.addEventListener("click", exitPresentation);

    els.zoomIn.addEventListener("click", () => {
      state.zoom = Math.min(1.75, Math.round((state.zoom + 0.25) * 100) / 100);
      applyZoom();
    });
    els.zoomOut.addEventListener("click", () => {
      state.zoom = Math.max(0.75, Math.round((state.zoom - 0.25) * 100) / 100);
      applyZoom();
    });
    els.zoomReset.addEventListener("click", () => {
      state.zoom = 1;
      applyZoom();
    });

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => setMode(tab.dataset.mode));
      tab.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        const i = tabs.indexOf(tab);
        const next = event.key === "ArrowRight" ? (i + 1) % tabs.length : (i - 1 + tabs.length) % tabs.length;
        tabs[next].focus();
        setMode(tabs[next].dataset.mode);
      });
    });

    els.searchInput.addEventListener("input", () => {
      state.query = els.searchInput.value.trim();
      renderThumbs();
      updateThumbCurrent();
    });
    els.searchInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      const first = els.thumbList.querySelector("li:not([hidden]) .thumb-button");
      if (first) setSlide(Number(first.dataset.index));
    });

    document.addEventListener("keydown", (event) => {
      if (event.defaultPrevented) return;
      const target = event.target;
      const typing = target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (typing) return;
      const interactive = target instanceof HTMLElement && Boolean(target.closest("button, a, select"));
      if (interactive && (event.key === " " || event.key === "Enter")) return;

      if (event.key === "Escape" && state.presenting) {
        event.preventDefault();
        exitPresentation();
        return;
      }
      if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        setSlide(state.index + 1);
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        setSlide(state.index - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        setSlide(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setSlide(state.data.slides.length - 1);
      } else if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        togglePresentation();
      } else if (event.key.toLowerCase() === "n" && state.mode === "slides") {
        event.preventDefault();
        toggleNotes();
      }
    });

    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement && state.presenting) {
        state.presenting = false;
        document.body.classList.remove("presenting");
        els.fullscreenBtn.setAttribute("aria-pressed", "false");
      }
    });

    window.addEventListener("hashchange", () => {
      if (!state.data) return;
      setSlide(parseHash(), { fromHash: true });
    });

    let touchX = null;
    let touchY = null;
    els.stage.addEventListener("touchstart", (event) => {
      const t = event.changedTouches[0];
      touchX = t.clientX;
      touchY = t.clientY;
    }, { passive: true });
    els.stage.addEventListener("touchend", (event) => {
      if (touchX === null || touchY === null) return;
      const t = event.changedTouches[0];
      const dx = t.clientX - touchX;
      const dy = t.clientY - touchY;
      touchX = null;
      touchY = null;
      if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      if (dx < 0) setSlide(state.index + 1);
      else setSlide(state.index - 1);
    }, { passive: true });
  }

  async function init() {
    try {
      const response = await fetch("./data.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      state.data = await response.json();
      if (!Array.isArray(state.data.slides) || !state.data.slides.length) throw new Error("Manifeste vide");

      els.slideCount.textContent = String(state.data.slideCount || state.data.slides.length);
      els.pdfPageCount.textContent = String(state.data.slideCount || state.data.slides.length);
      renderThumbs();
      bind();
      setMode("slides");
      toggleNotes(true);
      setSlide(parseHash(), { fromHash: true });
      if (!location.hash) history.replaceState(null, "", `#slide-${pad(state.index + 1)}`);
    } catch (error) {
      console.error(error);
      els.loadError.hidden = false;
      Object.values(panels).forEach((panel) => { panel.hidden = true; });
      document.querySelector(".toolbar").hidden = true;
      document.querySelector(".sidebar").hidden = true;
    }
  }

  init();
})();
