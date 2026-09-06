(() => {
  "use strict";

  const data = window.EP01_DATA;
  const deck = document.getElementById("slides");
  if (!data || !Array.isArray(data.slides) || data.slides.length === 0) {
    deck.replaceChildren();
    const message = document.createElement("p");
    message.className = "loading-message";
    message.setAttribute("role", "alert");
    message.textContent = "The lecture data could not be loaded. Keep assets/episode-data.js beside the presentation files, then reopen index.html.";
    deck.append(message);
    document.querySelectorAll(".toolbar button").forEach(button => { button.disabled = true; });
    return;
  }

  const sourceData = Array.isArray(data.sources) ? data.sources : [];
  const sources = new Map(sourceData.map(source => [String(source.id), source]));
  const layouts = new Set(["cover", "timeline", "cards", "steps", "compare", "table", "closing"]);
  const slideElements = [];
  const noteElements = [];
  const state = { current: 0, presentation: false, notes: false };
  const counter = document.getElementById("slide-counter");
  const previous = document.getElementById("previous-slide");
  const next = document.getElementById("next-slide");
  const modeButton = document.getElementById("mode-toggle");
  const notesButton = document.getElementById("notes-toggle");
  const announcer = document.getElementById("announcer");
  const progress = document.getElementById("progress-fill");
  const two = n => String(n).padStart(2, "0");
  const safeId = value => String(value).replace(/[^a-zA-Z0-9_-]/g, "-");
  const plain = value => value == null ? "" : String(value);

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = plain(text);
    return node;
  }

  function addParagraphs(parent, text) {
    const paragraphs = plain(text).split(/\n\s*\n/).map(part => part.trim()).filter(Boolean);
    paragraphs.forEach(part => parent.append(element("p", "", part)));
  }

  function safeLink(url) {
    if (plain(url).startsWith("#")) return plain(url);
    try {
      const resolved = new URL(plain(url), window.location.href);
      return ["https:", "http:", "file:", "mailto:"].includes(resolved.protocol) ? resolved.href : "";
    } catch (_) { return ""; }
  }

  function minutes(seconds) {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    return `${Math.floor(total / 60)}:${two(total % 60)}`;
  }

  function itemContent(item) {
    const content = element("div", "item-content");
    if (item.label) content.append(element("h3", "item-label", item.label));
    const body = element("div", "item-text");
    addParagraphs(body, item.text);
    content.append(body);
    return content;
  }

  function appendItems(parent, items, layout, slideTitle) {
    if (!items.length) return;
    if (layout === "table") {
      const wrap = element("div", "slide-table-wrap");
      wrap.tabIndex = 0;
      wrap.setAttribute("role", "region");
      wrap.setAttribute("aria-label", plain(slideTitle));
      const table = element("table", "slide-table");
      table.append(element("caption", "visually-hidden", slideTitle));
      const head = element("thead");
      const headerRow = element("tr");
      ["Element", "Practical meaning"].forEach(text => {
        const th = element("th", "", text); th.scope = "col"; headerRow.append(th);
      });
      head.append(headerRow); table.append(head);
      const tbody = element("tbody");
      items.forEach(item => {
        const row = element("tr");
        const label = element("th", "", item.label); label.scope = "row";
        const cell = element("td"); addParagraphs(cell, item.text);
        row.append(label, cell); tbody.append(row);
      });
      table.append(tbody); wrap.append(table); parent.append(wrap); return;
    }
    const isTimeline = layout === "timeline";
    const isSteps = layout === "steps";
    const grid = element(isTimeline || isSteps ? "ol" : "div", isTimeline ? "timeline-list" : isSteps ? "step-list" : "item-grid");
    const columns = isTimeline ? Math.min(5, items.length) : isSteps ? Math.min(2, items.length) : Math.min(items.length === 4 ? 2 : 3, items.length);
    grid.style.setProperty("--columns", String(Math.max(1, columns)));
    items.forEach(item => {
      const card = element(isTimeline || isSteps ? "li" : "article", isTimeline ? "timeline-item" : "content-item");
      card.append(itemContent(item)); grid.append(card);
    });
    parent.append(grid);
  }

  function appendQuote(parent, value) {
    if (!value) return;
    const text = typeof value === "object" ? value.text || value.quote : value;
    if (!text) return;
    const quote = element("blockquote", "slide-quote");
    addParagraphs(quote, text);
    if (typeof value === "object" && (value.author || value.source)) quote.append(element("cite", "", value.author || value.source));
    parent.append(quote);
  }

  function appendVisual(parent, slide) {
    const visual = slide.visual;
    const figure = element("figure", "slide-visual");
    figure.dataset.visual = plain(visual.id);
    const image = element("img", "diagram-image");
    image.src = plain(visual.src);
    image.alt = plain(visual.alt);
    image.decoding = "sync";
    // A local SVG stays sharp at 1080p/4K and contains no runtime dependencies.
    figure.append(image, element("figcaption", "diagram-caption", visual.caption));
    image.addEventListener("error", () => {
      figure.replaceChildren(element("p", "", visual.alt));
      appendItems(figure, slide.items || [], "cards", slide.title);
    }, { once: true });
    parent.append(figure);
  }

  function appendContact(parent, contact, channels) {
    if (!contact) return;
    const href = safeLink(contact.url);
    if (!href) return;
    const block = element("div", "closing-contact");
    const identity = element("div", "contact-identity");
    identity.append(element("p", "contact-caption", "Your host · Stay in touch"),
      element("p", "contact-name", contact.name));
    const link = element("a", "contact-website", contact.label);
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    block.append(identity, link);
    parent.append(block);
    if (!Array.isArray(channels) || !channels.length) return;
    const list = element("ul", "contact-channels");
    channels.forEach(channel => {
      const target = safeLink(channel.url);
      if (!target) return;
      const row = element("li");
      row.append(element("span", "channel-label", channel.label));
      const anchor = element("a", "channel-value", channel.value);
      anchor.href = target;
      // mailto: must not open a blank tab, and needs no opener hardening.
      if (!target.startsWith("mailto:")) {
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
      }
      row.append(anchor);
      list.append(row);
    });
    if (list.childElementCount) parent.append(list);
  }

  function footer(slide, index) {
    const foot = element("footer", "slide-footer");
    const refs = element("div", "slide-source-links");
    const referenced = (Array.isArray(slide.sourceIds) ? slide.sourceIds : []).map(id => sources.get(String(id))).filter(Boolean);
    if (referenced.length) {
      refs.append(element("span", "source-prefix", "Sources"));
      referenced.forEach(source => {
        const a = element("a", "", `[${plain(source.id)}]`);
        a.title = plain(source.title);
        a.setAttribute("aria-label", `[${plain(source.id)}] ${plain(source.title)}`);
        a.href = `#source-${safeId(source.id)}`;
        a.dataset.sourceLink = "true";
        refs.append(a);
      });
    } else {
      refs.append(element("span", "", "Author’s lecture material"));
    }
    const mark = element("p", "slide-footmark");
    const anchor = element("a", "", `EP01 / ${two(index + 1)}`);
    anchor.href = `#slide-${two(index + 1)}`;
    anchor.setAttribute("aria-label", `Link to slide ${index + 1}`);
    mark.append(anchor); foot.append(refs, mark);
    return foot;
  }

  function renderSlide(slide, index) {
    const layout = layouts.has(slide.layout) ? slide.layout : "cards";
    const section = element("section", `slide layout-${layout}`);
    if (slide.visual) section.classList.add("has-visual");
    section.id = `slide-${two(index + 1)}`;
    section.dataset.slideIndex = String(index);
    section.setAttribute("aria-roledescription", "slide");
    section.setAttribute("aria-labelledby", `${section.id}-title`);
    const panel = element("div", `slide-panel${layout === "cover" ? " cover-panel" : ""}`);
    let contentRoot = panel;
    if (layout === "cover" && data.cover) {
      const image = element("img", "cover-image");
      image.src = plain(data.cover);
      image.alt = `${plain(data.title)} — episode cover`;
      image.decoding = "async";
      image.width = 1600; image.height = 900;
      panel.append(image);
      contentRoot = element("div", "cover-caption");
      panel.append(contentRoot);
    } else if (layout === "cover") {
      contentRoot = element("div", "cover-caption"); panel.append(contentRoot);
    }
    const header = element("div", "slide-header");
    header.append(element("span", "section-name", slide.section || "Secure development programme"), element("span", "slide-index", `${two(index + 1)} / ${two(data.slides.length)}`));
    contentRoot.append(header);
    if (slide.kicker) contentRoot.append(element("p", "slide-kicker", slide.kicker));
    const title = element("h2", "slide-title", slide.title || `Slide ${index + 1}`);
    title.id = `${section.id}-title`; contentRoot.append(title);
    if (slide.lead) contentRoot.append(element("p", "slide-lead", slide.lead));
    const content = element("div", "slide-content");
    if (slide.visual) appendVisual(content, slide);
    else appendItems(content, Array.isArray(slide.items) ? slide.items : [], layout, slide.title);
    appendQuote(content, slide.quote);
    appendContact(content, slide.contact, slide.channels);
    contentRoot.append(content, footer(slide, index));
    section.append(panel);

    const notes = element("details", "speaker-notes");
    const summary = element("summary");
    const noteHeading = element("span", "note-heading");
    noteHeading.append(element("span", "", "Full speaker notes"));
    if (Number(slide.seconds) > 0) noteHeading.append(element("span", "note-duration", `Planned delivery ${minutes(slide.seconds)}`));
    summary.append(noteHeading); notes.append(summary);
    const body = element("div", "notes-body");
    if (slide.visual) {
      const textVersion = element("details", "diagram-text-version");
      textVersion.append(element("summary", "", "Diagram description and slide points"));
      addParagraphs(textVersion, slide.visual.alt);
      const list = element("ul");
      (slide.items || []).forEach(item => list.append(element("li", "", `${item.label}: ${item.text}`)));
      textVersion.append(list);
      body.append(textVersion);
    }
    if (plain(slide.notes).trim()) addParagraphs(body, slide.notes);
    else body.append(element("p", "no-notes", "No speaker notes have been supplied for this slide."));
    notes.append(body); section.append(notes);
    noteElements.push(notes); slideElements.push(section); deck.append(section);
  }

  function renderSources() {
    document.getElementById("source-count").textContent = `(${sourceData.length})`;
    const list = document.getElementById("source-list");
    sourceData.forEach(source => {
      const li = element("li"); li.id = `source-${safeId(source.id)}`;
      li.append(element("span", "source-id", `[${plain(source.id)}]`));
      const url = safeLink(source.url);
      const title = element(url ? "a" : "span", "source-title", source.title);
      if (url) {
        title.href = url;
        if (!url.startsWith("#")) { title.target = "_blank"; title.rel = "noopener noreferrer"; }
      }
      li.append(title);
      if (source.note) {
        const note = element("p", "source-note", source.note);
        if (url.startsWith("#") && url.length > 1) note.id = url.slice(1);
        li.append(note);
      }
      if (url) li.append(element("span", "source-url", plain(source.url)));
      list.append(li);
    });
  }

  function updateControls(announce = false) {
    counter.textContent = `${two(state.current + 1)} / ${two(slideElements.length)}`;
    counter.setAttribute("aria-label", `Slide ${state.current + 1} of ${slideElements.length}`);
    previous.disabled = state.current === 0;
    next.disabled = state.current === slideElements.length - 1;
    progress.style.width = `${((state.current + 1) / slideElements.length) * 100}%`;
    slideElements.forEach((slide, index) => { slide.classList.toggle("is-current", index === state.current); });
    modeButton.setAttribute("aria-pressed", String(state.presentation));
    modeButton.textContent = state.presentation ? "Return to reading ↙" : "Present slides ↗";
    notesButton.setAttribute("aria-pressed", String(state.notes));
    notesButton.textContent = state.notes ? (state.presentation ? "Hide notes" : "Hide all notes") : (state.presentation ? "Show notes" : "Show all notes");
    if (announce) announcer.textContent = `Slide ${state.current + 1} of ${slideElements.length}: ${plain(data.slides[state.current].title)}`;
  }

  function setHash(id) {
    const hash = `#${id}`;
    if (window.location.hash === hash) return;
    try { window.history.replaceState(null, "", hash); }
    catch (_) { window.location.hash = hash; }
  }

  function goTo(index, options = {}) {
    state.current = Math.min(Math.max(0, index), slideElements.length - 1);
    updateControls(options.announce !== false);
    if (options.hash !== false) setHash(slideElements[state.current].id);
    if (options.scroll !== false) {
      slideElements[state.current].scrollIntoView({ behavior: "instant", block: "start" });
    }
  }

  function setPresentation(active) {
    state.presentation = Boolean(active);
    document.body.classList.toggle("mode-presentation", state.presentation);
    updateControls();
    requestAnimationFrame(() => goTo(state.current, { instant: true }));
  }

  function handleHash() {
    let hash;
    try { hash = decodeURIComponent(window.location.hash.slice(1)); }
    catch (_) { return; }
    const slideIndex = slideElements.findIndex(slide => slide.id === hash);
    if (slideIndex >= 0) { goTo(slideIndex, { hash: false, instant: true }); return; }
    if (hash === "sources" || hash.startsWith("source-") || hash === "example-note") {
      state.presentation = false;
      document.body.classList.remove("mode-presentation");
      document.getElementById("source-details").open = true;
      updateControls();
      const target = document.getElementById(hash);
      if (target) requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
    }
  }

  document.title = `${plain(data.title)} · EP01`;
  document.getElementById("deck-title").textContent = plain(data.title);
  document.getElementById("deck-subtitle").textContent = plain(data.subtitle);
  document.getElementById("deck-author").textContent = plain(data.author);
  document.getElementById("deck-date").textContent = plain(data.date);
  const seconds = data.slides.reduce((total, slide) => total + Math.max(0, Number(slide.seconds) || 0), 0);
  document.getElementById("deck-duration").textContent = `${data.slides.length} slides${seconds > 0 ? ` · Approx. ${Math.round(seconds / 60)} minutes` : ""}`;
  deck.replaceChildren();
  data.slides.forEach(renderSlide);
  renderSources();
  updateControls();

  previous.addEventListener("click", () => goTo(state.current - 1));
  next.addEventListener("click", () => goTo(state.current + 1));
  modeButton.addEventListener("click", () => setPresentation(!state.presentation));
  notesButton.addEventListener("click", () => {
    state.notes = !state.notes;
    noteElements.forEach(notes => { notes.open = state.notes; });
    updateControls();
  });

  document.addEventListener("click", event => {
    const anchor = event.target.closest("a[href^='#']");
    if (!anchor) return;
    const targetId = anchor.getAttribute("href").slice(1);
    if (targetId === "sources" || targetId === "example-note" || anchor.dataset.sourceLink) {
      event.preventDefault(); setHash(targetId); handleHash();
    }
  });

  document.addEventListener("keydown", event => {
    if (!state.presentation || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    if (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    const navigation = { ArrowLeft: -1, PageUp: -1, ArrowRight: 1, PageDown: 1 };
    if (Object.prototype.hasOwnProperty.call(navigation, event.key)) {
      event.preventDefault(); goTo(state.current + navigation[event.key]);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault(); goTo(event.key === "Home" ? 0 : slideElements.length - 1);
    } else if (event.key === "Escape") {
      event.preventDefault(); setPresentation(false); modeButton.focus({ preventScroll: true });
    }
  });

  // Selection follows explicit navigation, not incidental scrolling while a
  // sticky control receives focus. This preserves the selected slide on mode changes.
  window.addEventListener("hashchange", handleHash);
  handleHash();
})();
