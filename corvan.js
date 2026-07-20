/* ====================================================================
   CORVAN — launch page interactions
   ==================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var docEl = document.documentElement;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  // local progress of p within [a,b]
  var seg = function (p, a, b) { return clamp((p - a) / (b - a), 0, 1); };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var easeExpo = function (t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); };

  /* -------------------------------------------------- custom cursor */
  (function cursor() {
    if (reduce) return;
    var ring = document.querySelector('.cursor');
    var dot = document.querySelector('.cursor-dot');
    if (!ring || !dot) return;

    var isCoarse = window.matchMedia('(pointer:coarse)').matches;
    if (!isCoarse) {
      document.body.classList.add('has-cursor');
    }

    var rx = window.innerWidth / 2, ry = window.innerHeight / 2;
    var dx = rx, dy = ry;

    // Mouse tracking
    document.addEventListener('mousemove', function (e) {
      dx = e.clientX; dy = e.clientY;
      if (!isCoarse) {
        dot.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      }
    });

    // Touch tracking
    document.addEventListener('touchstart', function (e) {
      if (e.touches.length > 0) {
        var t = e.touches[0];
        dx = t.clientX; dy = t.clientY;
        if (isCoarse) {
          rx = dx; ry = dy; // snap position on touch start to prevent sliding in
          ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
        }
        ring.style.opacity = 1;
        if (!isCoarse) dot.style.opacity = 1;
      }
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
      if (e.touches.length > 0) {
        var t = e.touches[0];
        dx = t.clientX; dy = t.clientY;
        if (e.target.closest('[data-hover],a,button,input,textarea')) {
          ring.classList.add('hot');
        } else {
          ring.classList.remove('hot');
        }
      }
    }, { passive: true });

    document.addEventListener('touchend', function () {
      ring.style.opacity = 0;
      dot.style.opacity = 0;
    });

    document.addEventListener('touchcancel', function () {
      ring.style.opacity = 0;
      dot.style.opacity = 0;
    });

    (function follow() {
      rx = lerp(rx, dx, isCoarse ? 0.32 : 0.18);
      ry = lerp(ry, dy, isCoarse ? 0.32 : 0.18);
      var scale = ring.classList.contains('hot') ? (isCoarse ? 1.3 : 1) : 1;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) scale(' + scale + ')';
      requestAnimationFrame(follow);
    })();

    // Desktop mouse hover states
    document.addEventListener('pointerover', function (e) {
      if (e.pointerType === 'mouse' && e.target.closest('[data-hover],a,button,input,textarea')) {
        ring.classList.add('hot');
      }
    });

    document.addEventListener('pointerout', function (e) {
      if (e.pointerType === 'mouse' && e.target.closest('[data-hover],a,button,input,textarea')) {
        ring.classList.remove('hot');
      }
    });

    // Touch hover state on start
    document.addEventListener('touchstart', function (e) {
      if (e.target.closest('[data-hover],a,button,input,textarea')) {
        ring.classList.add('hot');
      } else {
        ring.classList.remove('hot');
      }
    }, { passive: true });

    if (!isCoarse) {
      document.addEventListener('mouseleave', function () { ring.style.opacity = dot.style.opacity = 0; });
      document.addEventListener('mouseenter', function () { ring.style.opacity = dot.style.opacity = 1; });
    }
  })();

  /* -------------------------------------------------- countdown to 07.24 */
  (function countdown() {
    var el = document.getElementById('countdown');
    if (!el) return;
    var target = new Date('2026-07-24T00:00:00');
    function tick() {
      var diff = target - new Date();
      if (diff <= 0) { el.textContent = 'LIVE NOW'; return; }
      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      el.textContent = d + 'd · ' + ('0' + h).slice(-2) + 'h · ' + ('0' + m).slice(-2) + 'm';
    }
    tick();
    setInterval(tick, 30000);
  })();

  /* -------------------------------------------------- hero scroll sequence */
  var layWord = document.getElementById('layWord');
  var mlines = Array.prototype.slice.call(document.querySelectorAll('[data-mline]'));
  var layMani = document.getElementById('layMani');
  var layClimax = document.getElementById('layClimax');
  var bigClimax = layClimax ? layClimax.querySelector('.big') : null;
  var kickClimax = layClimax ? layClimax.querySelector('.kick') : null;
  var scrollcue = document.getElementById('scrollcue');
  var topbar = document.getElementById('topbar');
  var track = document.getElementById('heroTrack');
  var heroBottle = document.getElementById('hero-bottle');

  // drip
  var dripWrap = document.getElementById('dripWrap');
  var community = document.getElementById('community');
  var drips = Array.prototype.slice.call(document.querySelectorAll('.drip'));
  var drops = Array.prototype.slice.call(document.querySelectorAll('.drop'));
  drips.forEach(function (d) {
    d.style.transformBox = 'fill-box';
    d.style.transformOrigin = 'top';
    d.style.transform = 'scaleY(0.04)';
  });

  function setLayer(layer, opacity, ty, scale, clipBottom) {
    if (!layer) return;
    layer.style.opacity = opacity;
    var t = 'translate(-50%,-50%)';
    if (!docEl.classList.contains('anim')) t = 'none';
    layer.style.transform = t + ' translateY(' + ty + 'px) scale(' + scale + ')';
  }

  function renderHero(p) {
    // p: 0..1 over the pinned track
    // --- wordmark: hold 0-0.08, exit 0.08-0.16
    var wOut = seg(p, 0.08, 0.16);
    setLayer(layWord, 1 - wOut, lerp(0, -40, easeOut(wOut)), lerp(1, 0.94, wOut), 0);

    // --- manifesto container present 0.14 - 0.58
    var maniOut = seg(p, 0.50, 0.58);
    if (layMani) layMani.style.opacity = (p > 0.13 && p < 0.6) ? 1 : (p <= 0.13 ? 0 : 1 - maniOut);
    if (layMani) {
      var mt = lerp(0, -36, easeOut(maniOut));
      layMani.style.transform = (docEl.classList.contains('anim') ? 'translate(-50%,-50%)' : 'none') + ' translateY(' + mt + 'px)';
    }
    // each line staggered reveal
    var starts = [0.15, 0.235, 0.32];
    mlines.forEach(function (ln, i) {
      var inner = ln.firstElementChild;
      var rp = easeExpo(seg(p, starts[i], starts[i] + 0.11));
      ln.style.clipPath = 'inset(0 0 ' + (100 - rp * 100) + '% 0)';
      inner.style.opacity = rp;
      inner.style.transform = 'translateY(' + lerp(34, 0, rp) + 'px)';
    });

    // --- climax: reveal 0.6 - 0.82, hold to 1
    var cp = seg(p, 0.6, 0.82);
    var ce = easeExpo(cp);
    if (layClimax) {
      layClimax.style.opacity = cp > 0 ? 1 : 0;
    }
    if (bigClimax) {
      bigClimax.style.opacity = ce;
      bigClimax.style.transform = 'scale(' + lerp(1.16, 1, ce) + ')';
      bigClimax.style.filter = 'blur(' + lerp(8, 0, ce) + 'px)';
      bigClimax.style.letterSpacing = lerp(-0.04, 0.01, ce) + 'em';
    }
    if (kickClimax) {
      var kp = seg(p, 0.58, 0.68);
      kickClimax.style.opacity = kp;
      kickClimax.style.letterSpacing = lerp(0.2, 0.5, kp) + 'em';
    }
    // faint bottle silhouette rises with the climax (only meaningful once filled)
    if (heroBottle) {
      heroBottle.style.opacity = (ce * 0.42).toFixed(3);
      heroBottle.style.transform = 'translate(-50%,' + lerp(-40, -46, ce) + '%) scale(' + lerp(1.08, 1, ce) + ')';
    }

    // scroll cue fade out quickly
    if (scrollcue) scrollcue.style.opacity = clamp(1 - p * 12, 0, 1);
    // header wordmark appears once we're past hero
    if (topbar) topbar.classList.toggle('show', p > 0.9);
  }

  function renderDrip() {
    if (!community) return;
    var rect = dripWrap.getBoundingClientRect();
    var vh = window.innerHeight;
    // progress as the drip band rises through the lower viewport
    var dp = clamp((vh - rect.top) / (vh * 0.62), 0, 1);
    var e = easeOut(dp);
    drips.forEach(function (d, i) {
      var phase = clamp((e - i * 0.015) * 1.12, 0.04, 1);
      d.style.transform = 'scaleY(' + phase + ')';
    });
    drops.forEach(function (d) {
      var fall = parseFloat(d.getAttribute('data-fall')) || 120;
      var dropP = seg(dp, 0.45, 1);
      d.style.transform = 'translateY(' + (dropP * fall) + 'px)';
      d.style.opacity = clamp(1 - dropP * 0.7, 0, 1) * (dp > 0.4 ? 1 : 0);
    });
  }

  var queued = false;
  function paint() {
    queued = false;
    if (docEl.classList.contains('anim') && track) {
      var top = track.offsetTop;
      var h = track.offsetHeight - window.innerHeight;
      var p = clamp((window.scrollY - top) / h, 0, 1);
      renderHero(p);
    }
    renderDrip();
  }
  function onScroll() {
    // paint immediately (robust even when rAF is throttled), then coalesce a
    // follow-up frame via rAF when available for smoothness.
    paint();
    if (!queued && typeof requestAnimationFrame === 'function') {
      queued = true;
      requestAnimationFrame(paint);
    }
  }

  if (!reduce) {
    docEl.classList.add('anim');
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    // set initial frame
    renderHero(0);
    renderDrip();
  } else {
    // static: ensure everything visible, drips resting
    if (topbar) topbar.classList.add('show');
    drips.forEach(function (d) { d.style.transform = 'scaleY(1)'; });
    drops.forEach(function (d) { d.style.opacity = 0; });
  }

  /* -------------------------------------------------- scroll reveals */
  (function reveals() {
    var els = document.querySelectorAll('.reveal');
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (e) { e.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    // stagger siblings within a container
    els.forEach(function (e, i) {
      e.style.transitionDelay = (Math.min(i % 6, 5) * 0.06) + 's';
      io.observe(e);
    });
  })();

  /* -------------------------------------------------- smooth anchor nav */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  });

  /* -------------------------------------------------- waitlist form */
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://corvanwaitlist-production.up.railway.app';

  (function waitlist() {
    var form = document.getElementById('waitlistForm');
    var input = document.getElementById('wlEmail');
    var note = document.getElementById('wlNote');
    var success = document.getElementById('wlSuccess');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.trim();
      if (!emailRe.test(v)) {
        input.classList.add('err'); note.classList.add('err');
        note.textContent = 'That email doesn\u2019t look right — try again.';
        input.focus();
        return;
      }
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = '...';

      fetch(API_BASE + '/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: v })
      })
      .then(function(r){ return r.json(); })
      .then(function(data){
        if (data.success) {
          form.style.display = 'none';
          success.classList.add('show');
          bumpMembers();
        } else {
          note.classList.add('err');
          note.textContent = data.error || 'Something went wrong — try again.';
          btn.disabled = false;
          btn.textContent = 'Waitlist';
        }
      })
      .catch(function(){
        // fallback: still show success if backend is offline
        form.style.display = 'none';
        success.classList.add('show');
        bumpMembers();
        btn.disabled = false;
        btn.textContent = 'Waitlist';
      });
    });
    input.addEventListener('input', function () {
      input.classList.remove('err'); note.classList.remove('err');
      note.textContent = 'No spam. One email when we launch — that\u2019s the deal.';
    });
  })();

  /* -------------------------------------------------- member counter */
  var memberCountEl = document.getElementById('memberCount');
  var baseMembers = 427;
  function bumpMembers() {
    baseMembers += 1;
    if (memberCountEl) memberCountEl.textContent = baseMembers;
  }

  /* -------------------------------------------------- community modal */
  (function modal() {
    var scrim = document.getElementById('modalScrim');
    var openBtn = document.getElementById('openCommunity');
    var closeBtn = document.getElementById('modalClose');
    var fill = document.getElementById('modalFill');
    var steps = Array.prototype.slice.call(document.querySelectorAll('.modal-step'));
    if (!scrim || !openBtn) return;
    var cur = 1;
    var widths = { 1: '33%', 2: '66%', 3: '100%', 4: '100%' };

    function show(n) {
      cur = n;
      steps.forEach(function (s) { s.classList.toggle('active', +s.getAttribute('data-step') === n); });
      fill.style.width = widths[n] || '33%';
      var active = steps[n - 1];
      var f = active && active.querySelector('.modal-field');
      if (f) setTimeout(function () { f.focus(); }, 350);
    }
    function open() {
      scrim.classList.add('open');
      document.body.classList.add('modal-open');
      show(1);
    }
    function close() {
      scrim.classList.remove('open');
      document.body.classList.remove('modal-open');
    }
    openBtn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    scrim.addEventListener('click', function (e) { if (e.target === scrim) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && scrim.classList.contains('open')) close(); });

    function fail(errId, msg, field) {
      document.getElementById(errId).textContent = msg;
      if (field) field.focus();
    }
    function clearErr(errId) { document.getElementById(errId).textContent = ''; }

    document.querySelectorAll('[data-next]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (cur === 1) {
          var n = document.getElementById('mName').value.trim();
          if (n.length < 2) return fail('err1', 'Give us something to call you.', document.getElementById('mName'));
          clearErr('err1'); show(2);
        } else if (cur === 2) {
          var h = document.getElementById('mHandle').value.trim();
          var em = document.getElementById('mEmail').value.trim();
          if (!h) return fail('err2', 'Drop a handle so we can reach you.', document.getElementById('mHandle'));
          if (!emailRe.test(em)) return fail('err2', 'A real email keeps you on the list.', document.getElementById('mEmail'));
          clearErr('err2'); show(3);
        }
      });
    });
    document.querySelectorAll('[data-back]').forEach(function (b) {
      b.addEventListener('click', function () { show(cur - 1); });
    });
    var finalBtn = document.querySelector('[data-final]');
    if (finalBtn) finalBtn.addEventListener('click', function () {
      var why = document.getElementById('mWhy').value.trim();
      if (why.length < 3) return fail('err3', 'One line. What do you stand for?', document.getElementById('mWhy'));
      clearErr('err3');

      var name  = document.getElementById('mName').value.trim();
      var handle = document.getElementById('mHandle').value.trim();
      var email  = document.getElementById('mEmail').value.trim();

      fetch(API_BASE + '/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, handle: handle, email: email, statement: why })
      })
      .then(function(r){ return r.json(); })
      .then(function(data){
        var memberNum = data.memberNumber
          ? '#' + ('0000' + data.memberNumber).slice(-4)
          : '#' + ('0000' + (baseMembers + 1)).slice(-4);
        bumpMembers();
        document.getElementById('memberNum').textContent = memberNum;
        show(4);
      })
      .catch(function(){
        // fallback if backend offline
        bumpMembers();
        var num = '#' + ('0000' + baseMembers).slice(-4);
        document.getElementById('memberNum').textContent = num;
        show(4);
      });
    });

    var shareBtn = document.getElementById('modalShareBtn');
    if (shareBtn) shareBtn.addEventListener('click', function () {
      var txt = 'I just joined the CORVAN counterculture. an olfactory counterculture — launching 07.24.';
      if (navigator.share) { navigator.share({ title: 'CORVAN', text: txt }).catch(function () {}); }
      else if (navigator.clipboard) {
        navigator.clipboard.writeText(txt);
        shareBtn.textContent = 'Copied ✓';
        setTimeout(function () { shareBtn.textContent = 'Share your spot ↗'; }, 2000);
      }
    });
  })();

  /* -------------------------------------------------- contact form */
  (function contact() {
    var form = document.getElementById('contactForm');
    var success = document.getElementById('cSuccess');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var n   = document.getElementById('cName').value.trim();
      var em  = document.getElementById('cEmail').value.trim();
      var msg = document.getElementById('cMsg').value.trim();
      var ok = true;
      [['cName', n.length >= 2], ['cEmail', emailRe.test(em)], ['cMsg', msg.length >= 10]].forEach(function (pair) {
        var f = document.getElementById(pair[0]);
        if (!pair[1]) { f.style.borderColor = 'var(--ox-bright)'; ok = false; }
        else { f.style.borderColor = ''; }
      });
      if (!ok) return;

      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;

      fetch(API_BASE + '/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n, email: em, message: msg })
      })
      .then(function(r){ return r.json(); })
      .then(function(){
        form.style.display = 'none';
        success.classList.add('show');
      })
      .catch(function(){
        form.style.display = 'none';
        success.classList.add('show');
      })
      .finally(function(){
        btn.disabled = false;
      });
    });
  })();

})();
