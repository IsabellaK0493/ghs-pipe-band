(function () {
  "use strict";

  /* ---------------- form endpoints ----------------
     Paste the form service's POST address here (for example a Formspree
     form URL). Both forms send JSON; the enquiry form's "newsletter" box
     comes through as newsletter: "yes". While these are empty the forms
     say they aren't connected rather than pretending to send. */
  var ENQUIRY_ACTION = "";
  var NEWSLETTER_ACTION = "";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- header ---------------- */
  var head = document.querySelector("[data-head]");
  function setHead() { head.classList.toggle("is-solid", window.scrollY > 40); }
  setHead();
  window.addEventListener("scroll", setHead, { passive: true });

  var nav = document.querySelector(".nav");
  var toggle = document.querySelector(".nav-toggle");
  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    head.classList.add("is-solid");
  });
  nav.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });

  /* ---------------- hero clip cycle ---------------- */
  var hero = document.querySelector(".hero");
  var clips = Array.prototype.slice.call(hero.querySelectorAll(".hero-clip"));
  var ticks = Array.prototype.slice.call(hero.querySelectorAll(".hero-ticks button"));
  var caption = hero.querySelector("[data-caption]");
  var captions = [
    ["Riding of the Marches, Royal Mile · Sept 2026", "Mercat Tours"],
    ["Leading the Riding of the Marches · Sept 2026", "Mercat Tours"],
    ["Juvenile band, World Championships, Glasgow · Aug 2026", "M I K Anderson"],
    ["Playing the Royal Mile, Riding of the Marches · Sept 2026", "Mercat Tours"]
  ];
  function setCaption(i) {
    caption.firstChild.textContent = captions[i][0];
    caption.querySelector(".hero-credit").textContent = "Video: " + captions[i][1];
  }
  var CLIP_MS = 8000;
  var current = 0, timer = null, visible = true;
  hero.style.setProperty("--clip-ms", CLIP_MS + "ms");

  function play(v) {
    if (reduceMotion) return;
    if (v.preload === "none") { v.preload = "auto"; v.load(); }
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }

  function show(i) {
    clips[current].classList.remove("is-on");
    ticks[current].setAttribute("aria-current", "false");
    var old = clips[current];
    setTimeout(function () { if (!old.classList.contains("is-on")) old.pause(); }, 1500);
    current = i;
    var v = clips[i];
    try { v.currentTime = 0; } catch (e) {}
    play(v);
    v.classList.add("is-on");
    // restart the tick animation
    var bar = ticks[i].querySelector("span");
    ticks[i].setAttribute("aria-current", "true");
    bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = "";
    setCaption(i);
    // warm up the next clip
    var next = clips[(i + 1) % clips.length];
    if (next.preload === "none") { next.preload = "auto"; next.load(); }
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    if (reduceMotion || !visible) return;
    timer = setTimeout(function () { show((current + 1) % clips.length); }, CLIP_MS);
  }

  ticks.forEach(function (b, i) {
    b.addEventListener("click", function () { if (i !== current) show(i); else schedule(); });
  });

  function setVisible(v) {
    visible = v;
    hero.classList.toggle("is-paused", !v);
    if (v) { play(clips[current]); schedule(); }
    else { clearTimeout(timer); clips[current].pause(); }
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) { setVisible(e[0].isIntersecting && !document.hidden); }, { threshold: 0.15 }).observe(hero);
  }
  document.addEventListener("visibilitychange", function () { setVisible(!document.hidden); });

  if (reduceMotion) { hero.classList.add("is-paused"); } else { play(clips[0]); schedule(); }

  /* ---------------- reveal on scroll ---------------- */
  var revealables = document.querySelectorAll(".band-copy, .band-photo, .diary li, .ig-copy, .ig-tiles li, .enq-copy, .form, .prize-list li");
  if (!reduceMotion && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealables.forEach(function (el, i) {
      el.classList.add("reveal");
      el.style.transitionDelay = (i % 3) * 90 + "ms";
      io.observe(el);
    });
  }

  /* ---------------- enquiry topic ---------------- */
  var enquiry = document.querySelector('[data-form="enquiry"]');
  function syncTopic() {
    var topic = enquiry.querySelector('input[name="topic"]:checked').value;
    enquiry.querySelectorAll("[data-show-for]").forEach(function (f) {
      f.hidden = f.getAttribute("data-show-for") !== topic;
    });
    var msg = enquiry.querySelector("#f-msg");
    msg.placeholder = {
      "Bookings": "Tell us the occasion, the venue and roughly how long you'd like us to play.",
      "Support the band": "Tell us how you'd like to help, or which years you played with the band.",
      "Something else": "How can we help?"
    }[topic];
  }
  /* ---------------- budget limits ----------------
     A small band starts at £300 and the full band at £500, so budget
     options below the dearest ticked choice are switched off. */
  var budgets = Array.prototype.slice.call(enquiry.querySelectorAll('input[name="budget"]'));
  var budgetHint = enquiry.querySelector("[data-budget-hint]");
  function syncBudget() {
    var min = 0, which = "";
    enquiry.querySelectorAll('input[name="performers"]:checked').forEach(function (c) {
      var m = Number(c.getAttribute("data-min") || 0);
      if (m > min) { min = m; which = c.value.toLowerCase(); }
    });
    budgets.forEach(function (b) {
      var off = Number(b.getAttribute("data-from")) < min;
      b.disabled = off;
      if (off) b.checked = false;
      b.parentNode.classList.toggle("is-off", off);
    });
    budgetHint.hidden = !min;
    if (min) budgetHint.textContent = "A " + which + " starts from £" + min + ".";
  }
  enquiry.addEventListener("change", function (e) {
    if (e.target.name === "topic") syncTopic();
    if (e.target.name === "performers") syncBudget();
  });
  syncTopic();

  /* ---------------- form submit ---------------- */
  function wire(form, action, okText) {
    var status = form.querySelector(".form-status");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.className = "form-status";
      var bad = null;
      form.querySelectorAll("[required]").forEach(function (el) {
        var ok = el.value.trim() !== "" && (el.type !== "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
        el.classList.toggle("is-invalid", !ok);
        if (!ok && !bad) bad = el;
      });
      var budgetSet = form.querySelector('[data-show-for="Bookings"] input[name="budget"]');
      if (!bad && budgetSet && !budgetSet.closest("[data-show-for]").hidden && !form.querySelector('input[name="budget"]:checked')) {
        status.textContent = "Choose a budget to send your booking enquiry.";
        status.classList.add("is-err");
        budgetSet.closest("fieldset").scrollIntoView({ block: "center" });
        return;
      }
      if (bad) {
        status.textContent = bad.type === "email" ? "Enter an email address like name@example.com." : "Fill in the highlighted fields to send.";
        status.classList.add("is-err");
        bad.focus();
        return;
      }
      if (form.querySelector('[name="_gotcha"]').value) return;
      if (!action) {
        status.textContent = "This form isn't connected yet. Please message the band on Instagram for now.";
        status.classList.add("is-err");
        return;
      }
      var data = {};
      new FormData(form).forEach(function (v, k) {
        if (k === "_gotcha") return;
        data[k] = k in data ? data[k] + ", " + v : v; // ticked boxes arrive as one list
      });
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      fetch(action, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) })
        .then(function (r) {
          if (!r.ok) throw new Error();
          form.reset();
          if (form === enquiry) { syncTopic(); syncBudget(); }
          status.textContent = okText;
          status.classList.add("is-ok");
        })
        .catch(function () {
          status.textContent = "That didn't send. Check your connection and try again, or message the band on Instagram.";
          status.classList.add("is-err");
        })
        .then(function () { btn.disabled = false; });
    });
  }
  wire(enquiry, ENQUIRY_ACTION, "Enquiry sent. The band staff will reply by email.");
  wire(document.querySelector('[data-form="newsletter"]'), NEWSLETTER_ACTION, "You're signed up. Look out for the next update.");
})();
