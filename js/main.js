/**
 * Hero title letter reveal — vanilla adaptation of the React SplitText + GSAP demo.
 * Uses free GSAP core (CDN). Club SplitText is not required: chars are wrapped manually
 * so nested accents (.tint / .serif / .boxed) stay intact.
 */
(function () {
  var TITLE_SELECTOR = ".hero__title";
  var CHAR_CLASS = "split-char";
  var STAGGER = 0.028; // adapted from delay={50} for a long RU headline
  var DURATION = 1.25;
  var EASE = "power3.out";
  var FROM = { opacity: 0, y: 40 };
  var TO = { opacity: 1, y: 0 };

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function wrapCharsInNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      var text = node.textContent;
      if (!text) return;
      var frag = document.createDocumentFragment();
      for (var i = 0; i < text.length; i++) {
        var ch = text.charAt(i);
        var span = document.createElement("span");
        span.className = CHAR_CLASS;
        span.setAttribute("aria-hidden", "true");
        if (ch === " " || ch === "\u00A0") {
          span.classList.add(CHAR_CLASS + "--space");
          span.textContent = "\u00A0";
        } else {
          span.textContent = ch;
        }
        frag.appendChild(span);
      }
      node.parentNode.replaceChild(frag, node);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    // Skip script/style if any
    if (node.tagName === "SCRIPT" || node.tagName === "STYLE") return;

    var children = Array.prototype.slice.call(node.childNodes);
    for (var j = 0; j < children.length; j++) {
      wrapCharsInNode(children[j]);
    }
  }

  function splitTitle(title) {
    var lines = title.querySelectorAll(".line");
    var roots = lines.length ? lines : [title];
    for (var i = 0; i < roots.length; i++) {
      wrapCharsInNode(roots[i]);
    }
    return title.querySelectorAll("." + CHAR_CLASS);
  }

  function lightBoxed() {
    var boxed = document.querySelector(TITLE_SELECTOR + " .boxed");
    if (boxed) boxed.classList.add("is-lit");
  }

  function run() {
    var title = document.querySelector(TITLE_SELECTOR);
    if (!title || typeof gsap === "undefined") return;

    // Accessible plain-text label for the whole headline
    if (!title.getAttribute("aria-label")) {
      title.setAttribute("aria-label", title.innerText.replace(/\s+/g, " ").trim());
    }

    title.classList.add("hero__title--split");

    if (prefersReducedMotion()) {
      title.classList.add("is-ready", "is-done");
      lightBoxed();
      return;
    }

    var chars = splitTitle(title);
    if (!chars.length) {
      title.classList.add("is-ready", "is-done");
      lightBoxed();
      return;
    }

    title.classList.add("is-ready");
    gsap.set(chars, FROM);

    gsap.to(chars, {
      opacity: TO.opacity,
      y: TO.y,
      duration: DURATION,
      ease: EASE,
      stagger: STAGGER,
      force3D: true,
      onComplete: function () {
        title.classList.add("is-done");
        lightBoxed();
      }
    });
  }

  function whenFontsReady(cb) {
    if (document.fonts && document.fonts.status === "loaded") {
      cb();
      return;
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(cb).catch(cb);
      return;
    }
    cb();
  }

  whenFontsReady(function () {
    // one frame so layout settles after font swap
    requestAnimationFrame(run);
  });
})();

/* Fallback fill for approach numerals where scroll-driven animations aren't supported */
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (CSS.supports && CSS.supports("animation-timeline: view()")) return;

  var nums = document.querySelectorAll(".step__num");
  if (!nums.length || !("IntersectionObserver" in window)) return;

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle(
          "is-filled",
          entry.isIntersecting && entry.intersectionRatio > 0.35
        );
      });
    },
    { threshold: [0.35, 0.6] }
  );

  nums.forEach(function (n) {
    io.observe(n);
  });
})();

/**
 * Eyebrow proximity FX — LineSidebar logic on section labels
 * ("01 — Обо мне", "02 — Что я умею", …).
 */
(function () {
  var items = Array.prototype.slice.call(document.querySelectorAll(".eyebrow"));
  if (!items.length) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Even with reduced motion, scroll-spy still lights the active label via data-active + CSS.
  // Proximity lerp is skipped only when reduced motion is on.

  var falloff = function (p) { return p * p * (3 - 2 * p); };
  var PROXIMITY = 160;
  var SMOOTHING = 90;

  var targets = items.map(function () { return 0; });
  var current = items.map(function () { return 0; });
  var activeIndex = -1;
  var rafId = null;
  var last = 0;

  function setActive(index) {
    activeIndex = index;
    items.forEach(function (el, i) {
      if (i === index) el.setAttribute("data-active", "true");
      else el.removeAttribute("data-active");
    });
    if (!reduceMotion) startLoop();
  }

  function runFrame(now) {
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    var tau = Math.max(SMOOTHING, 1) / 1000;
    var k = 1 - Math.exp(-dt / tau);
    var moving = false;

    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      if (!el) continue;
      var target = Math.max(targets[i] || 0, activeIndex === i ? 1 : 0);
      var cur = current[i] || 0;
      var next = cur + (target - cur) * k;
      var settled = Math.abs(target - next) < 0.0015;
      var value = settled ? target : next;
      current[i] = value;
      el.style.setProperty("--effect", value.toFixed(4));
      if (!settled) moving = true;
    }

    rafId = moving ? requestAnimationFrame(runFrame) : null;
  }

  function startLoop() {
    if (rafId != null) cancelAnimationFrame(rafId);
    last = performance.now();
    rafId = requestAnimationFrame(runFrame);
  }

  function handlePointerMove(e) {
    if (reduceMotion) return;
    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      var rect = el.getBoundingClientRect();
      if (rect.bottom < -60 || rect.top > window.innerHeight + 60) {
        targets[i] = 0;
        continue;
      }
      var cx = rect.left + rect.width * 0.2;
      var cy = rect.top + rect.height / 2;
      var distance = Math.hypot(e.clientX - cx, e.clientY - cy);
      targets[i] = falloff(Math.max(0, 1 - distance / PROXIMITY));
    }
    startLoop();
  }

  function handlePointerLeave() {
    targets = targets.map(function () { return 0; });
    if (!reduceMotion) startLoop();
  }

  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", handlePointerLeave);

  if ("IntersectionObserver" in window) {
    var sectionToIndex = new Map();
    items.forEach(function (el, index) {
      var section = el.closest("section, footer");
      if (section) sectionToIndex.set(section, index);
    });

    var spy = new IntersectionObserver(
      function (entries) {
        var visible = entries
          .filter(function (e) { return e.isIntersecting; })
          .sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; });
        if (!visible.length) return;
        var idx = sectionToIndex.get(visible[0].target);
        if (typeof idx === "number" && idx !== activeIndex) setActive(idx);
      },
      { rootMargin: "-28% 0px -48% 0px", threshold: [0.12, 0.3, 0.5] }
    );

    sectionToIndex.forEach(function (_idx, section) {
      spy.observe(section);
    });
  }
})();
