(function () {
  "use strict";
  var root = document.documentElement;
  root.classList.add("js");

  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var smooth = function (v, a, b) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Hero: vídeo de 10 s controlado pela rolagem ---------- */
  var hero = document.getElementById("inicio");
  var video = document.getElementById("heroVideo");
  var nav = document.getElementById("nav");
  var target = 0, current = 0, duration = 10, ticking = false;

  function heroProgress() {
    var h = hero.offsetHeight - window.innerHeight;
    return h > 0 ? clamp(-hero.getBoundingClientRect().top / h, 0, 1) : 1;
  }

  function updateTarget() {
    var p = heroProgress();
    // o nome fica parado sobre o primeiro quadro (até ~12%), depois o vídeo
    // percorre 0–10 s até ~85% da rolagem; o PNG entra no finalzinho
    target = clamp((p - 0.12) / 0.73, 0, 1) * duration;
    hero.style.setProperty("--intro", (1 - smooth(p, 0.2, 0.4)).toFixed(3));
    hero.style.setProperty("--r", smooth(p, 0.8, 0.97).toFixed(3));
    hero.style.setProperty("--dim", (p * 0.3).toFixed(3));
    nav.classList.toggle("is-solid", window.scrollY > window.innerHeight * 0.6 || p > 0.9);
  }

  function frame() {
    // suaviza o avanço (inércia) para a animação ficar fluida
    current += (target - current) * 0.14;
    if (Math.abs(target - current) < 0.003) current = target;
    if (video && video.readyState >= 2 && Math.abs(video.currentTime - current) > 0.02) {
      try { video.currentTime = current; } catch (e) {}
    }
    if (current !== target) requestAnimationFrame(frame); else ticking = false;
  }

  function onScroll() {
    updateTarget();
    if (!reduce && !ticking) { ticking = true; requestAnimationFrame(frame); }
  }

  if (video) {
    video.addEventListener("loadedmetadata", function () {
      if (video.duration && isFinite(video.duration)) duration = Math.min(10, video.duration - 0.05);
      if (reduce) video.currentTime = duration;
      else onScroll();
    });
    // iOS/Safari: um "play/pause" silencioso libera o controle do currentTime
    var unlock = function () {
      var pr = video.play();
      if (pr && pr.then) pr.then(function () { video.pause(); }).catch(function () {});
      window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("touchstart", unlock, { passive: true, once: true });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---------- Revelações ao rolar ---------- */
  var items = document.querySelectorAll(".reveal, .reveal-arch");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -4% 0px" });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Imagens: escalonamento + paralaxe suave ---------- */
  var figs = Array.prototype.slice.call(document.querySelectorAll(".reveal-arch"));
  figs.forEach(function (el) {
    var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.classList.contains("reveal-arch"); });
    el.style.setProperty("--d", (sibs.indexOf(el) * 0.22).toFixed(2) + "s");
  });
  var pTick = false;
  function parallax() {
    pTick = false;
    if (reduce) return;
    var vh = window.innerHeight;
    figs.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var k = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.translate = "0 " + (k * -22).toFixed(1) + "px";
    });
  }
  window.addEventListener("scroll", function () { if (!pTick) { pTick = true; requestAnimationFrame(parallax); } }, { passive: true });
  parallax();

  /* ---------- Linha do tempo: linha dourada que acompanha a rolagem ---------- */
  var tl = document.getElementById("timeline");
  function updateTimeline() {
    if (!tl) return;
    var r = tl.getBoundingClientRect();
    var p = clamp((window.innerHeight * 0.6 - r.top) / r.height, 0, 1);
    tl.style.setProperty("--line", p.toFixed(3));
  }
  window.addEventListener("scroll", updateTimeline, { passive: true });
  updateTimeline();

  /* ---------- Depoimentos extensos: modal ---------- */
  var tributeTexts = document.querySelectorAll(".tribute__text");
  tributeTexts.forEach(function (text) {
    if (text.offsetHeight <= 220) return;

    text.classList.add("is-collapsed");

    var button = document.createElement("button");
    button.type = "button";
    button.className = "tribute__toggle";
    button.textContent = "Ler mais";

    text.insertAdjacentElement("afterend", button);
    button.addEventListener("click", function () {
      openTributeModal(text);
    });
  });

  var modal = null;
  var previousFocus = null;

  function openTributeModal(text) {
    previousFocus = document.activeElement;
    modal = document.createElement("div");
    modal.className = "tribute-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Depoimento completo");

    var card = text.closest(".tribute");
    var name = card ? card.querySelector("h3") : null;
    var title = name ? name.textContent : "Depoimento";

    modal.innerHTML =
      '<div class="tribute-modal__dialog">' +
        '<button class="tribute-modal__close" type="button" aria-label="Fechar depoimento">&times;</button>' +
        '<h3 class="tribute-modal__title">' + title + '</h3>' +
        '<blockquote class="tribute-modal__text"></blockquote>' +
      '</div>';

    modal.querySelector(".tribute-modal__text").textContent = text.textContent.trim();
    document.body.appendChild(modal);
    document.body.classList.add("modal-open");

    requestAnimationFrame(function () { modal.classList.add("is-open"); });

    var closeButton = modal.querySelector(".tribute-modal__close");
    closeButton.addEventListener("click", closeTributeModal);
    modal.addEventListener("click", function (event) {
      if (event.target === modal) closeTributeModal();
    });
    closeButton.focus();
  }

  function closeTributeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    document.body.classList.remove("modal-open");
    var elementToRemove = modal;
    modal = null;
    setTimeout(function () {
      elementToRemove.remove();
      if (previousFocus) previousFocus.focus();
    }, 250);
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && modal) closeTributeModal();
  });

  /* ---------- Menu mobile ---------- */
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");
  function setMenu(open) {
    toggle.setAttribute("aria-expanded", open);
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    links.classList.toggle("is-open", open);
    if (open) nav.classList.add("is-solid");
  }
  toggle.addEventListener("click", function () { setMenu(toggle.getAttribute("aria-expanded") !== "true"); });
  links.addEventListener("click", function (e) { if (e.target.tagName === "A") setMenu(false); });
})();
