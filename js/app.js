(() => {
  'use strict';

  const body = document.body;
  const isHome = body.classList.contains('home-page');
  const hasGSAP = typeof window.gsap !== 'undefined';
  const hasScrollTrigger = typeof window.ScrollTrigger !== 'undefined';
  if (hasGSAP && hasScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* =========================================================
     Language
     ---------------------------------------------------------
     IMPORTANT: the site architecture always stays LTR so the
     Thorsten-style grid never flips. Arabic is applied only to
     the actual text blocks. This prevents RTL from breaking the
     header, horizontal rail, grids, cards and footer geometry.
  ========================================================= */
  const langButtons = [...document.querySelectorAll('.language-toggle')];

  // V22: keep contact form placeholders bilingual without duplicating form controls.
  const syncBilingualPlaceholders = () => {
    const ar = document.body.classList.contains('is-ar');
    document.querySelectorAll('[data-placeholder-en]').forEach((el) => {
      el.setAttribute('placeholder', ar ? el.dataset.placeholderAr : el.dataset.placeholderEn);
    });
  };
  syncBilingualPlaceholders();
  langButtons.forEach((btn) => btn.addEventListener('click', () => requestAnimationFrame(syncBilingualPlaceholders)));
  const storedLang = localStorage.getItem('cross-sector-lang');
  const initialLang = storedLang === 'ar' || storedLang === 'en' ? storedLang : 'en';

  function setLanguage(lang, persist = true) {
    const ar = lang === 'ar';

    body.classList.toggle('is-ar', ar);
    body.classList.toggle('is-en', !ar);
    document.documentElement.lang = ar ? 'ar' : 'en';
    // Layout direction intentionally stays LTR. Arabic text itself is RTL in CSS.
    document.documentElement.dir = ar ? 'rtl' : 'ltr';

    langButtons.forEach(btn => {
      const label = btn.querySelector('.current-lang');
      if (label) label.textContent = ar ? 'EN' : 'AR';
      btn.setAttribute('aria-label', ar ? 'Switch to English' : 'التبديل إلى العربية');
      btn.setAttribute('title', ar ? 'English' : 'العربية');
    });

    if (persist) localStorage.setItem('cross-sector-lang', lang);

    requestAnimationFrame(() => {
      if (isHome) window.__crossSectorHomeRefresh?.();
      if (hasScrollTrigger) ScrollTrigger.refresh(true);
    });
  }

  setLanguage(initialLang, false);
  syncBilingualPlaceholders();
  langButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      setLanguage(body.classList.contains('is-ar') ? 'en' : 'ar');
    });
  });

  /* =========================================================
     Lenis — one smooth engine for every page
     ---------------------------------------------------------
     Inner pages: regular vertical Lenis.
     Home: vertical Lenis drives the horizontal GSAP timeline.
     This is intentionally NOT a scripted scrollLeft controller.
     It keeps wheel/trackpad input smooth and predictable.
  ========================================================= */
  let lenis = null;
  if (typeof window.Lenis !== 'undefined') {
    lenis = new Lenis(isHome ? {
      orientation: 'vertical',
      gestureOrientation: matchMedia('(max-width: 900px)').matches ? 'vertical' : 'both',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.05,
      syncTouch: false,
      duration: 1.18,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t))
    } : {
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.05,
      syncTouch: false,
      duration: 1.05,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t))
    });

    if (hasScrollTrigger) lenis.on('scroll', ScrollTrigger.update);

    if (hasGSAP) {
      gsap.ticker.add(time => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = time => {
        lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    }
  }

  /* Back to top — hidden at the top, appears as soon as an inner page starts scrolling.
     Home intentionally never shows it. */
  const backTopButtons = [...document.querySelectorAll('.site-backtop,.about-backtop')];

  function updateBackTop(scrollY = window.scrollY || 0) {
    if (isHome) {
      backTopButtons.forEach(btn => btn.classList.remove('is-visible'));
      return;
    }
    const visible = scrollY > 8;
    backTopButtons.forEach(btn => btn.classList.toggle('is-visible', visible));
  }

  backTopButtons.forEach(btn => {
    btn.addEventListener('click', event => {
      event.preventDefault();
      if (lenis) lenis.scrollTo(0, { duration: 1.05, force: true });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  if (!isHome && backTopButtons.length) {
    if (lenis) lenis.on('scroll', ({ scroll }) => updateBackTop(scroll));
    window.addEventListener('scroll', () => updateBackTop(window.scrollY), { passive: true });
    updateBackTop(window.scrollY);
  }

  /* =========================================================
     Full-screen menu
  ========================================================= */
  const overlay = document.querySelector('.menu-overlay');
  const openBtn = document.querySelector('.menu-trigger');
  const closeBtns = [...document.querySelectorAll('.menu-close-text,.menu-x')];
  let menuOpen = false;
  let menuTL = null;

  if (overlay && hasGSAP) {
    menuTL = gsap.timeline({ paused: true, defaults: { ease: 'power4.inOut' } })
      .set(overlay, { visibility: 'visible' })
      .to(overlay, { clipPath: 'inset(0 0 0% 0)', duration: 0.7 })
      .from('.menu-links a', { y: 40, opacity: 0, stagger: 0.05, duration: 0.5 }, '-=.32')
      .from('.menu-contact > *', { y: 20, opacity: 0, stagger: 0.05, duration: 0.4 }, '-=.38');
  }

  function openMenu() {
    if (!overlay || menuOpen) return;
    menuOpen = true;
    overlay.setAttribute('aria-hidden', 'false');
    openBtn?.setAttribute('aria-expanded', 'true');
    lenis?.stop();
    body.classList.add('menu-is-open');

    if (menuTL) menuTL.play(0);
    else {
      overlay.style.visibility = 'visible';
      overlay.style.clipPath = 'none';
    }
  }

  function closeMenu(after) {
    if (!overlay || !menuOpen) {
      if (after) after();
      return;
    }

    menuOpen = false;
    overlay.setAttribute('aria-hidden', 'true');
    openBtn?.setAttribute('aria-expanded', 'false');
    body.classList.remove('menu-is-open');

    if (menuTL) {
      menuTL.reverse().eventCallback('onReverseComplete', () => {
        overlay.style.visibility = 'hidden';
        lenis?.start();
        if (after) after();
      });
    } else {
      overlay.style.visibility = 'hidden';
      lenis?.start();
      if (after) after();
    }
  }

  openBtn?.addEventListener('click', openMenu);
  closeBtns.forEach(btn => btn.addEventListener('click', () => closeMenu()));
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });

  /* =========================================================
     Cursor
  ========================================================= */
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');

  if (dot && ring && hasGSAP && matchMedia('(pointer:fine)').matches) {
    const dx = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power3' });
    const dy = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power3' });
    const rx = gsap.quickTo(ring, 'x', { duration: 0.28, ease: 'power3' });
    const ry = gsap.quickTo(ring, 'y', { duration: 0.28, ease: 'power3' });

    addEventListener('pointermove', event => {
      dx(event.clientX);
      dy(event.clientY);
      rx(event.clientX);
      ry(event.clientY);
    });

    document.querySelectorAll('a,button,input,textarea').forEach(el => {
      el.addEventListener('mouseenter', () => body.classList.add('link-hover'));
      el.addEventListener('mouseleave', () => body.classList.remove('link-hover'));
    });
  }

  /* =========================================================
     HOME — responsive motion architecture (V8)
     ---------------------------------------------------------
     Every viewport uses the same horizontal story.
     Lenis owns vertical page progress and GSAP maps that progress to
     the horizontal rail. On touch devices we additionally translate
     deliberate horizontal swipes into the same Lenis progress, so the
     home feels genuinely horizontal without creating two competing
     scroll owners. Arabic mirrors the visual travel direction.
  ========================================================= */
  function initHomeHorizontal() {
    if (!isHome) return;

    const stage = document.querySelector('#horizontal-stage');
    const viewport = document.querySelector('.horizontal-viewport');
    const track = document.querySelector('#horizontal-track');
    if (!stage || !viewport || !track) return;

    const panels = [...track.querySelectorAll('.h-panel')];
    const progressFill = document.querySelector('#progress-fill');
    const progressCurrent = document.querySelector('.progress-current');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobileMQ = matchMedia('(max-width: 900px)');
    let horizontalTween = null;
    let horizontalST = null;
    let resizeTimer = 0;
    let currentProgress = 0;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const headerHeight = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 74;
    const railWidth = () => {
      if (mobileMQ.matches) return 0;
      const raw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rail-w'));
      return Number.isFinite(raw) ? raw : 0;
    };
    const homeFooterHeight = () => (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--home-footer-h')) || 0);
    const viewportWidth = () => Math.max(1, innerWidth - railWidth());
    const maxTravel = () => Math.max(0, track.scrollWidth - viewportWidth());

    function setOpeningViewSize() {
      const intro = panels[0];
      const hero = panels[1];
      if (!intro) return;

      const width = viewportWidth();

      // V30: mobile starts exactly like desktop — intro copy + hero image
      // share the first viewport instead of becoming two full-screen slides.
      const introWidth = Math.round(width * 0.44);
      const heroWidth = width - introWidth;
      intro.style.width = `${introWidth}px`;
      intro.style.minWidth = `${introWidth}px`;
      if (hero) {
        hero.style.width = `${heroWidth}px`;
        hero.style.minWidth = `${heroWidth}px`;
      }
    }

    function setStageHeight() {
      const travel = maxTravel();
      // The sticky horizontal viewport ends above the fixed Thorsten-style
      // footer strip, so the parent height must reserve that exact space too.
      // This keeps the sticky release point aligned with ScrollTrigger.end.
      const visibleStageHeight = Math.max(1, innerHeight - homeFooterHeight());
      stage.style.setProperty('--home-stage-h', `${Math.ceil(visibleStageHeight + travel)}px`);
      return travel;
    }

    function panelLogicalStart(target) {
      let distance = 0;
      for (const panel of panels) {
        if (panel === target) break;
        distance += panel.getBoundingClientRect().width;
      }
      return distance;
    }

    function panelProgress(target) {
      const travel = maxTravel();
      if (!travel || !target) return 0;
      return clamp(panelLogicalStart(target) / travel, 0, 1);
    }

    function revealPanel(panel) {
      if (!hasGSAP || !panel || panel.dataset.revealed === '1') return;
      panel.dataset.revealed = '1';
      const wrap = panel.querySelector('.image-wrap');
      const curtain = panel.querySelector('.image-curtain');
      const image = panel.querySelector('img');
      const copy = panel.querySelector('.reveal-copy,.ref-over-caption');
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      if (wrap && !panel.classList.contains('ref-hero-panel')) {
        tl.fromTo(wrap,
          { y: -42, rotationX: -8, transformPerspective: 1200, transformOrigin: '50% 0%' },
          { y: 0, rotationX: 0, duration: 0.82 }, 0);
      }
      if (curtain) tl.fromTo(curtain, { scaleY: 1 }, { scaleY: 0, duration: 0.9, ease: 'power4.inOut' }, 0.02);
      if (image) tl.fromTo(image, { scale: 1.07 }, { scale: 1.01, duration: 1.15 }, 0);
      if (copy && !panel.classList.contains('ref-intro-panel')) {
        tl.fromTo(copy, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.58 }, 0.2);
      }
    }

    function updateVisiblePanels() {
      const left = viewport.getBoundingClientRect().left;
      const right = viewport.getBoundingClientRect().right;
      panels.forEach(panel => {
        const rect = panel.getBoundingClientRect();
        if (rect.right > left + 30 && rect.left < right - 30) revealPanel(panel);
      });
    }

    function updateParallax() {
      // Parallax is intentionally disabled on touch-sized viewports to keep
      // 60fps while the rail itself still uses GSAP transforms.
      if (!hasGSAP || mobileMQ.matches) return;
      const viewportRect = viewport.getBoundingClientRect();
      const vw = viewportRect.width || 1;
      panels.forEach(panel => {
        const image = panel.querySelector('.image-wrap img');
        if (!image) return;
        const rect = panel.getBoundingClientRect();
        if (rect.right < viewportRect.left - 150 || rect.left > viewportRect.right + 150) return;
        const center = rect.left - viewportRect.left + rect.width * 0.5;
        const normalized = (center - vw * 0.5) / vw;
        gsap.set(image, { x: clamp(normalized * -18, -20, 20) });
      });
    }

    function updateProgress(progress = currentProgress) {
      currentProgress = clamp(progress, 0, 1);
      if (progressFill) progressFill.style.transform = `scaleX(${currentProgress})`;
      if (progressCurrent && panels.length) {
        const logicalCenter = currentProgress * maxTravel() + viewportWidth() * 0.5;
        let cursor = 0;
        let active = panels.length - 1;
        for (let i = 0; i < panels.length; i++) {
          cursor += panels[i].getBoundingClientRect().width;
          if (logicalCenter <= cursor) { active = i; break; }
        }
        progressCurrent.textContent = String(active + 1).padStart(2, '0');
      }
      updateVisiblePanels();
      updateParallax();
    }

    function killHorizontal() {
      if (horizontalTween) { horizontalTween.kill(); horizontalTween = null; }
      if (horizontalST) { horizontalST.kill(); horizontalST = null; }
      if (hasGSAP) gsap.set(track, { clearProps: 'x,transform' });
    }

    function buildDesktop({ keepProgress = true } = {}) {
      const previousProgress = keepProgress ? currentProgress : 0;
      killHorizontal();
      setOpeningViewSize();

      const ar = body.classList.contains('is-ar');
      track.style.flexDirection = ar ? 'row-reverse' : 'row';
      void track.offsetWidth;
      const travel = setStageHeight();

      if (!hasGSAP || !hasScrollTrigger || travel <= 0) {
        track.style.transform = ar ? `translate3d(${-travel}px,0,0)` : 'translate3d(0,0,0)';
        updateProgress(0);
        return;
      }

      const fromX = ar ? -travel : 0;
      const toX = ar ? 0 : -travel;
      gsap.set(track, { x: fromX, force3D: true });

      horizontalTween = gsap.to(track, {
        x: toX,
        ease: 'none',
        overwrite: true,
        scrollTrigger: {
          trigger: stage,
          start: 'top top',
          end: () => `+=${maxTravel()}`,
          scrub: reducedMotion ? true : 0.22,
          invalidateOnRefresh: true,
          onRefresh(self) {
            horizontalST = self;
            currentProgress = self.progress;
            updateProgress(self.progress);
          },
          onUpdate(self) {
            horizontalST = self;
            updateProgress(self.progress);
          }
        }
      });
      horizontalST = horizontalTween.scrollTrigger;

      requestAnimationFrame(() => {
        ScrollTrigger.refresh(true);
        const st = horizontalTween?.scrollTrigger;
        if (!st) return;
        const y = st.start + previousProgress * (st.end - st.start);
        if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
        else scrollTo(0, y);
        ScrollTrigger.update();
        updateProgress(previousProgress);
      });
    }

    function buildMobile({ keepProgress = true } = {}) {
      const previousProgress = keepProgress ? currentProgress : 0;
      killHorizontal();
      body.classList.add('home-mobile-native');
      const ar = body.classList.contains('is-ar');
      track.style.flexDirection = ar ? 'row-reverse' : 'row';
      setOpeningViewSize();
      stage.style.setProperty('--home-stage-h', `${Math.max(1, innerHeight - headerHeight())}px`);

      const syncMobilePosition = () => {
        const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
        const left = ar
          ? clamp((1 - previousProgress) * max, 0, max)
          : clamp(previousProgress * max, 0, max);
        viewport.scrollLeft = left;
        updateProgress(previousProgress);
      };

      requestAnimationFrame(() => {
        syncMobilePosition();
        requestAnimationFrame(syncMobilePosition);
      });

      // Keep Lenis alive; the viewport itself owns scrolling on phone.
      lenis?.start();
    }

    function buildHome({ keepProgress = true } = {}) {
      // V31: phones must behave horizontally as well. We keep the same
      // opening composition as desktop, but on touch-sized viewports we
      // use the proven native horizontal owner so vertical finger/wheel
      // gestures are bridged into sideways movement with no vertical fall-through.
      if (mobileMQ.matches) {
        buildMobile({ keepProgress });
        return;
      }
      body.classList.remove('home-mobile-native');
      lenis?.start();
      buildDesktop({ keepProgress });
    }

    function scrollToPanel(target, immediate = false) {
      if (!target) return;

      if (mobileMQ.matches && body.classList.contains('home-mobile-native')) {
        const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
        const ar = body.classList.contains('is-ar');
        const left = clamp(target.offsetLeft, 0, max);
        viewport.scrollTo({ left, behavior: immediate ? 'auto' : 'smooth' });
        const logical = max ? (ar ? 1 - left / max : left / max) : 0;
        updateProgress(logical);
        return;
      }

      const st = horizontalTween?.scrollTrigger;
      if (!st) return;
      const progress = panelProgress(target);
      const y = st.start + progress * (st.end - st.start);
      if (lenis) lenis.scrollTo(y, immediate ? { immediate: true, force: true } : { duration: 1.1, force: true });
      else scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' });
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', event => {
        const id = anchor.getAttribute('href');
        if (!id || id === '#') return;
        const target = document.querySelector(id);
        if (!target) return;
        event.preventDefault();
        const action = () => scrollToPanel(target, false);
        if (menuOpen) closeMenu(() => setTimeout(action, 40));
        else action();
      });
    });

    viewport.addEventListener('keydown', event => {
      const step = Math.max(260, viewportWidth() * 0.72);
      if (mobileMQ.matches && body.classList.contains('home-mobile-native')) {
        const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
        const ar = body.classList.contains('is-ar');
        const forward = ar ? -step : step;
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          viewport.scrollBy({ left: forward, behavior: 'smooth' });
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          viewport.scrollBy({ left: -forward, behavior: 'smooth' });
        } else if (event.key === 'Home') {
          event.preventDefault();
          viewport.scrollTo({ left: ar ? max : 0, behavior: 'smooth' });
        } else if (event.key === 'End') {
          event.preventDefault();
          viewport.scrollTo({ left: ar ? 0 : max, behavior: 'smooth' });
        }
        return;
      }
      const ar = body.classList.contains('is-ar');
      const sign = ar ? -1 : 1;
      const y = scrollY + step * sign;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        lenis?.scrollTo(y, { duration: 0.85, force: true });
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        lenis?.scrollTo(scrollY - step * sign, { duration: 0.85, force: true });
      } else if (event.key === 'Home') {
        event.preventDefault();
        lenis?.scrollTo(0, { duration: 0.9, force: true });
      } else if (event.key === 'End') {
        event.preventDefault();
        lenis?.scrollTo(horizontalTween?.scrollTrigger?.end || maxTravel(), { duration: 0.9, force: true });
      }
    });

    viewport.addEventListener('scroll', () => {
      if (!mobileMQ.matches || !body.classList.contains('home-mobile-native')) return;
      const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      const ar = body.classList.contains('is-ar');
      const logical = max ? (ar ? 1 - viewport.scrollLeft / max : viewport.scrollLeft / max) : 0;
      updateProgress(logical);
    }, { passive: true });

    panels[0] && (panels[0].dataset.revealed = '1');
    buildHome({ keepProgress: false });

    window.__crossSectorHomeRefresh = () => buildHome({ keepProgress: true });

    const ready = () => {
      buildHome({ keepProgress: false });
      if (location.hash) {
        const target = document.querySelector(location.hash);
        if (target) setTimeout(() => scrollToPanel(target, true), 130);
      }
    };

    if (document.fonts?.ready) document.fonts.ready.then(() => {
      ready();
      addEventListener('load', () => buildHome({ keepProgress: true }), { once: true });
    });
    else addEventListener('load', ready, { once: true });

    mobileMQ.addEventListener?.('change', () => {
      setTimeout(() => buildHome({ keepProgress: true }), 60);
    });

    // Mobile address bars emit many height-only resize events. Rebuild the
    // horizontal geometry only when width/orientation meaningfully changes.
    let lastViewportWidth = innerWidth;
    addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const widthChanged = Math.abs(innerWidth - lastViewportWidth) > 8;
        if (!mobileMQ.matches || widthChanged) {
          lastViewportWidth = innerWidth;
          buildHome({ keepProgress: true });
        }
      }, 180);
    });

    // V29 mobile bridge: responsive browser wheel/trackpad and vertical finger
    // gestures advance the exact same native horizontal viewport. Horizontal
    // swipes remain native. Arabic intentionally travels in the opposite direction.
    let mobileWheelTimer = 0;
    const nearestMobileSnap = () => {
      if (!mobileMQ.matches || !body.classList.contains('home-mobile-native')) return;
      const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      const current = viewport.scrollLeft;
      let nearest = current;
      let best = Infinity;
      panels.forEach(panel => {
        const candidate = clamp(panel.offsetLeft, 0, max);
        const d = Math.abs(candidate - current);
        if (d < best) { best = d; nearest = candidate; }
      });
      viewport.scrollTo({ left: nearest, behavior: 'smooth' });
    };

    viewport.addEventListener('wheel', event => {
      if (!mobileMQ.matches || !body.classList.contains('home-mobile-native')) return;
      if (Math.abs(event.deltaX) < 0.01 && Math.abs(event.deltaY) < 0.01) return;
      event.preventDefault();
      const ar = body.classList.contains('is-ar');
      const dominant = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      viewport.scrollLeft += dominant * (ar ? -1 : 1);
      clearTimeout(mobileWheelTimer);
      mobileWheelTimer = setTimeout(nearestMobileSnap, 125);
    }, { passive: false });

    let nativeTouchStartX = 0;
    let nativeTouchStartY = 0;
    let nativeTouchStartLeft = 0;
    let nativeVerticalBridge = false;
    viewport.addEventListener('touchstart', event => {
      if (!mobileMQ.matches || !body.classList.contains('home-mobile-native') || event.touches.length !== 1) return;
      const t = event.touches[0];
      nativeTouchStartX = t.clientX;
      nativeTouchStartY = t.clientY;
      nativeTouchStartLeft = viewport.scrollLeft;
      nativeVerticalBridge = false;
    }, { passive: true });

    viewport.addEventListener('touchmove', event => {
      if (!mobileMQ.matches || !body.classList.contains('home-mobile-native') || event.touches.length !== 1) return;
      const t = event.touches[0];
      const dx = t.clientX - nativeTouchStartX;
      const dy = t.clientY - nativeTouchStartY;
      if (!nativeVerticalBridge && Math.abs(dy) > 9 && Math.abs(dy) > Math.abs(dx) * 1.08) nativeVerticalBridge = true;
      if (!nativeVerticalBridge) return; // horizontal gesture remains native
      event.preventDefault();
      const ar = body.classList.contains('is-ar');
      const forward = -dy; // swipe up advances in English
      viewport.scrollLeft = nativeTouchStartLeft + forward * (ar ? -1 : 1);
    }, { passive: false });

    viewport.addEventListener('touchend', () => {
      if (!mobileMQ.matches || !body.classList.contains('home-mobile-native') || !nativeVerticalBridge) return;
      nativeVerticalBridge = false;
      nearestMobileSnap();
    }, { passive: true });

    // Native-feeling sideways swipe bridge for phones/tablets. Vertical swipe
    // still works through Lenis, while a clear horizontal gesture advances the
    // same timeline. One scroll owner means no jump or double movement.
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartScroll = 0;
    let touchHorizontal = false;
    let touchLastTarget = 0;
    viewport.addEventListener('touchstart', event => {
      if (!mobileMQ.matches || body.classList.contains('home-mobile-native') || event.touches.length !== 1) return;
      const t = event.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchStartScroll = window.scrollY || document.documentElement.scrollTop || 0;
      touchLastTarget = touchStartScroll;
      touchHorizontal = false;
    }, { passive: true });

    viewport.addEventListener('touchmove', event => {
      if (!mobileMQ.matches || body.classList.contains('home-mobile-native') || event.touches.length !== 1) return;
      const t = event.touches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      if (!touchHorizontal && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.12) touchHorizontal = true;
      if (!touchHorizontal) return;
      event.preventDefault();
      const ar = body.classList.contains('is-ar');
      const signedDelta = ar ? dx : -dx;
      const st = horizontalTween?.scrollTrigger;
      const min = st?.start || 0;
      const max = st?.end || maxTravel();
      touchLastTarget = clamp(touchStartScroll + signedDelta * 1.18, min, max);
      if (lenis) lenis.scrollTo(touchLastTarget, { immediate: true, force: true });
      else window.scrollTo(0, touchLastTarget);
    }, { passive: false });

    viewport.addEventListener('touchend', () => {
      if (!mobileMQ.matches || body.classList.contains('home-mobile-native') || !touchHorizontal) return;
      if (lenis) lenis.scrollTo(touchLastTarget, { duration: .42, force: true });
      touchHorizontal = false;
    }, { passive: true });
  }

  /* =========================================================
     Inner page reveal motion
  ========================================================= */
  function initInnerAnimations() {
    if (!body.classList.contains('inner-page') || !hasGSAP || !hasScrollTrigger) return;

    document.querySelectorAll('.reveal-up').forEach(el => {
      gsap.from(el, {
        y: 38,
        opacity: 0,
        duration: 0.82,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });

    document.querySelectorAll('.about-progress-fill').forEach(fill => {
      gsap.fromTo(fill, { scaleX: 0 }, {
        scaleX: 1,
        duration: 1.15,
        ease: 'power3.out',
        scrollTrigger: { trigger: fill, start: 'top 90%', once: true }
      });
    });

    document.querySelectorAll('.hero-paper').forEach(hero => {
      const curtain = hero.querySelector('.vertical-curtain');
      const img = hero.querySelector('img');
      if (curtain) {
        gsap.fromTo(curtain, { scaleY: 1 }, {
          scaleY: 0,
          duration: 1.16,
          ease: 'power4.inOut',
          scrollTrigger: { trigger: hero, start: 'top 90%', once: true }
        });
      }
      if (img) {
        gsap.fromTo(img, { scale: 1.1, yPercent: -2 }, {
          scale: 1.02,
          yPercent: 0,
          duration: 1.5,
          ease: 'power3.out',
          scrollTrigger: { trigger: hero, start: 'top 92%', once: true }
        });
      }
    });
  }

  /* =========================================================
     Three.js paper intro — decorative and fail-safe
  ========================================================= */
  function initThreePaper() {
    if (!isHome || typeof THREE === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const mount = document.querySelector('#three-paper');
    if (!mount) return;

    let renderer;
    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
      camera.position.z = 8;
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.35));
      renderer.setSize(innerWidth, innerHeight);
      mount.appendChild(renderer.domElement);

      const papers = [];
      const geometry = new THREE.PlaneGeometry(0.92, 1.25, 3, 3);
      const colors = [0xf8f6f2, 0xffffff, 0xeee7dc];

      for (let i = 0; i < 7; i++) {
        const material = new THREE.MeshBasicMaterial({
          color: colors[i % colors.length],
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9
        });
        const mesh = new THREE.Mesh(geometry.clone(), material);
        mesh.position.set(
          THREE.MathUtils.randFloatSpread(8.4),
          THREE.MathUtils.randFloat(3.5, 6.2),
          THREE.MathUtils.randFloat(-1.4, 1)
        );
        mesh.rotation.set(
          THREE.MathUtils.randFloat(-0.5, 0.4),
          THREE.MathUtils.randFloat(-0.4, 0.4),
          THREE.MathUtils.randFloat(-0.5, 0.5)
        );
        mesh.userData = {
          speed: THREE.MathUtils.randFloat(0.042, 0.07),
          phase: Math.random() * Math.PI * 2
        };
        scene.add(mesh);
        papers.push(mesh);
      }

      let active = true;
      let t = 0;
      const render = () => {
        if (!active) return;
        t += 0.018;
        papers.forEach((paper, index) => {
          paper.position.y -= paper.userData.speed;
          paper.position.x += Math.sin(t * 2 + paper.userData.phase) * 0.005;
          paper.rotation.x += 0.006 + index * 0.0002;
          paper.rotation.y += 0.004;
        });
        renderer.render(scene, camera);
        requestAnimationFrame(render);
      };
      render();

      const dispose = () => {
        active = false;
        try { renderer.dispose(); } catch (_) {}
        mount.remove();
      };

      if (hasGSAP) gsap.to(mount, { opacity: 0, duration: 0.9, delay: 1.2, ease: 'power2.out', onComplete: dispose });
      else setTimeout(dispose, 1900);

      addEventListener('resize', () => {
        if (!active) return;
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
      });
    } catch (error) {
      console.warn('Three.js intro skipped:', error);
      mount.remove();
      try { renderer?.dispose?.(); } catch (_) {}
    }
  }


  /* =========================================================
     V18 — touch-friendly team cards
     On coarse/touch pointers a tap opens the exact same centered
     overlay used by desktop hover. A second tap or outside tap closes it.
  ========================================================= */
  function initMobileTeamCards() {
    const cards = Array.from(document.querySelectorAll('.about-team-card'));
    if (!cards.length) return;

    const touchQuery = window.matchMedia('(hover: none), (pointer: coarse)');
    const closeAll = except => cards.forEach(card => {
      if (card !== except) card.classList.remove('is-active');
    });

    cards.forEach(card => {
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-expanded', 'false');

      const syncAria = () => card.setAttribute('aria-expanded', card.classList.contains('is-active') ? 'true' : 'false');

      card.addEventListener('click', event => {
        if (!touchQuery.matches || window.innerWidth > 900) return;

        const clickedLink = event.target.closest('.about-team-overlay a');
        if (clickedLink && card.classList.contains('is-active')) return;

        event.preventDefault();
        const willOpen = !card.classList.contains('is-active');
        closeAll(card);
        card.classList.toggle('is-active', willOpen);
        cards.forEach(sync => sync.setAttribute('aria-expanded', sync.classList.contains('is-active') ? 'true' : 'false'));
      });

      card.addEventListener('keydown', event => {
        if (!touchQuery.matches || window.innerWidth > 900) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        const willOpen = !card.classList.contains('is-active');
        closeAll(card);
        card.classList.toggle('is-active', willOpen);
        cards.forEach(sync => sync.setAttribute('aria-expanded', sync.classList.contains('is-active') ? 'true' : 'false'));
      });
    });

    document.addEventListener('pointerdown', event => {
      if (!touchQuery.matches || window.innerWidth > 900) return;
      if (event.target.closest('.about-team-card')) return;
      closeAll();
      cards.forEach(card => card.setAttribute('aria-expanded', 'false'));
    }, { passive: true });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) {
        closeAll();
        cards.forEach(card => card.setAttribute('aria-expanded', 'false'));
      }
    }, { passive: true });
  }

  initHomeHorizontal();
  initInnerAnimations();
  initMobileTeamCards();
  initThreePaper();

  if (hasGSAP && isHome) {
    gsap.from('.ref-intro-copy > *', {
      y: 24,
      opacity: 0,
      duration: 0.72,
      stagger: 0.07,
      delay: 0.24,
      ease: 'power3.out'
    });
  }
})();
