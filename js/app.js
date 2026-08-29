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
  const directHorizontalHome = isHome && matchMedia('(max-width: 1180px)').matches;
  if (typeof window.Lenis !== 'undefined' && !directHorizontalHome) {
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
    const responsiveMQ = matchMedia('(max-width: 1180px)');
    const phoneMQ = matchMedia('(max-width: 620px)');

    let desktopTween = null;
    let currentProgress = 0;
    let resizeTimer = 0;
    let mobileTravel = 0;
    let mobileRAF = 0;
    let mode = '';

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const headerHeight = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 74;
    const footerHeight = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--home-footer-h')) || 0;
    const railWidth = () => responsiveMQ.matches ? 0 : (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rail-w')) || 0);
    const viewportWidth = () => Math.max(1, innerWidth - railWidth());

    function setOpeningSizes() {
      if (!panels[0]) return;
      const vw = viewportWidth();
      let introWidth;
      let heroWidth;

      if (phoneMQ.matches) {
        // Phone follows the desktop storytelling, but without the giant standalone
        // hero slide. The opening frame is the copy panel only, then the project
        // cards continue horizontally with generous readable widths.
        introWidth = vw;
        heroWidth = 0;
      } else if (responsiveMQ.matches) {
        // Tablet keeps the desktop rhythm: intro + hero, just scaled down.
        introWidth = Math.round(vw * 0.46);
        heroWidth = vw - introWidth;
      } else {
        introWidth = Math.round(vw * 0.44);
        heroWidth = vw - introWidth;
      }

      panels[0].style.width = `${introWidth}px`;
      panels[0].style.minWidth = `${introWidth}px`;
      if (panels[1]) {
        if (phoneMQ.matches) {
          panels[1].style.width = `0px`;
          panels[1].style.minWidth = `0px`;
          panels[1].style.display = 'none';
        } else {
          panels[1].style.display = '';
          panels[1].style.width = `${heroWidth}px`;
          panels[1].style.minWidth = `${heroWidth}px`;
        }
      }
    }

    function setDirection() {
      track.style.flexDirection = body.classList.contains('is-ar') ? 'row-reverse' : 'row';
    }

    function getTravel() {
      return Math.max(0, track.scrollWidth - viewport.clientWidth);
    }

    function panelLogicalStart(target) {
      let distance = 0;
      for (const panel of panels) {
        if (panel === target) break;
        distance += panel.getBoundingClientRect().width;
      }
      return distance;
    }

    function revealPanel(panel) {
      if (!panel || panel.dataset.revealed === '1') return;
      panel.dataset.revealed = '1';
      if (!hasGSAP) return;
      const wrap = panel.querySelector('.image-wrap');
      const curtain = panel.querySelector('.image-curtain');
      const image = panel.querySelector('img');
      const copy = panel.querySelector('.reveal-copy,.ref-over-caption');
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      if (wrap && !panel.classList.contains('ref-hero-panel')) {
        tl.fromTo(wrap, { y: -22, rotationX: -4, transformPerspective: 1200, transformOrigin: '50% 0%' }, { y: 0, rotationX: 0, duration: .58 }, 0);
      }
      if (curtain) tl.fromTo(curtain, { scaleY: 1 }, { scaleY: 0, duration: .7, ease: 'power4.inOut' }, 0);
      if (image) tl.fromTo(image, { scale: 1.035 }, { scale: 1, duration: .86 }, 0);
      if (copy && !panel.classList.contains('ref-intro-panel')) tl.fromTo(copy, { y: 9, opacity: 0 }, { y: 0, opacity: 1, duration: .42 }, .12);
    }

    function updateVisiblePanels() {
      const vr = viewport.getBoundingClientRect();
      panels.forEach(panel => {
        const r = panel.getBoundingClientRect();
        if (r.right > vr.left + 8 && r.left < vr.right - 8) revealPanel(panel);
      });
    }

    function updateProgress(progress) {
      currentProgress = clamp(progress, 0, 1);
      if (progressFill) progressFill.style.transform = `scaleX(${currentProgress})`;
      if (progressCurrent && panels.length) {
        const logical = currentProgress * Math.max(1, getTravel()) + viewport.clientWidth * .5;
        let cursor = 0;
        let active = panels.length - 1;
        for (let i = 0; i < panels.length; i++) {
          cursor += panels[i].getBoundingClientRect().width;
          if (logical <= cursor) { active = i; break; }
        }
        progressCurrent.textContent = String(active + 1).padStart(2, '0');
      }
      updateVisiblePanels();
    }

    function killDesktop() {
      if (desktopTween) {
        desktopTween.scrollTrigger?.kill();
        desktopTween.kill();
        desktopTween = null;
      }
      if (hasScrollTrigger) {
        ScrollTrigger.getAll().forEach(st => {
          if (st.vars?.id === 'cross-sector-home-horizontal') st.kill();
        });
      }
      if (hasGSAP) gsap.set(track, { clearProps: 'x,transform' });
      else track.style.transform = 'none';
    }

    function mobileStageStart() {
      return stage.getBoundingClientRect().top + window.scrollY;
    }

    function applyMobileScroll() {
      mobileRAF = 0;
      if (mode !== 'mobile') return;
      const start = mobileStageStart();
      const raw = clamp(window.scrollY - start, 0, mobileTravel);
      const progress = mobileTravel ? raw / mobileTravel : 0;
      const ar = body.classList.contains('is-ar');
      const x = ar ? (-mobileTravel + raw) : -raw;
      if (hasGSAP) gsap.set(track, { x, force3D: true });
      else track.style.transform = `translate3d(${x}px,0,0)`;
      updateProgress(progress);
    }

    function requestMobileScroll() {
      if (mode !== 'mobile' || mobileRAF) return;
      mobileRAF = requestAnimationFrame(applyMobileScroll);
    }

    function buildMobile({ keepProgress = true } = {}) {
      const progress = keepProgress ? currentProgress : 0;
      mode = 'mobile';
      killDesktop();
      body.classList.remove('home-direct-horizontal','home-mobile-native','home-pinned-horizontal');
      document.documentElement.classList.remove('home-direct-horizontal','home-mobile-native','home-pinned-horizontal');
      body.classList.add('home-scroll-horizontal');
      document.documentElement.classList.add('home-scroll-horizontal');

      lenis?.start();
      setDirection();
      setOpeningSizes();
      void track.offsetWidth;

      mobileTravel = getTravel();
      const visible = Math.max(1, innerHeight - headerHeight() - footerHeight());
      stage.style.setProperty('--home-mobile-visible-h', `${visible}px`);
      stage.style.setProperty('--home-stage-h', `${Math.ceil(visible + mobileTravel)}px`);

      const start = mobileStageStart();
      const targetY = start + progress * mobileTravel;
      if (Math.abs(window.scrollY - targetY) > 2) {
        if (lenis) lenis.scrollTo(targetY, { immediate: true, force: true });
        else window.scrollTo(0, targetY);
      }
      requestAnimationFrame(() => {
        mobileTravel = getTravel();
        applyMobileScroll();
      });
    }

    function buildDesktop({ keepProgress = true } = {}) {
      const progress = keepProgress ? currentProgress : 0;
      mode = 'desktop';
      body.classList.remove('home-scroll-horizontal','home-direct-horizontal','home-mobile-native','home-pinned-horizontal');
      document.documentElement.classList.remove('home-scroll-horizontal','home-direct-horizontal','home-mobile-native','home-pinned-horizontal');
      killDesktop();
      lenis?.start();
      setDirection();
      setOpeningSizes();
      void track.offsetWidth;
      const travel = getTravel();
      const visibleHeight = Math.max(1, innerHeight - footerHeight());
      stage.style.setProperty('--home-stage-h', `${Math.ceil(visibleHeight + travel)}px`);

      if (!hasGSAP || !hasScrollTrigger || !travel) {
        updateProgress(0);
        return;
      }

      const ar = body.classList.contains('is-ar');
      const fromX = ar ? -travel : 0;
      const toX = ar ? 0 : -travel;
      gsap.set(track, { x: fromX, force3D: true });
      desktopTween = gsap.to(track, {
        x: toX,
        ease: 'none',
        overwrite: true,
        scrollTrigger: {
          id: 'cross-sector-home-horizontal',
          trigger: stage,
          start: 'top top',
          end: () => `+=${getTravel()}`,
          scrub: reducedMotion ? true : .22,
          invalidateOnRefresh: true,
          onUpdate(self) { updateProgress(self.progress); },
          onRefresh(self) { updateProgress(self.progress); }
        }
      });
      requestAnimationFrame(() => {
        ScrollTrigger.refresh(true);
        const st = desktopTween?.scrollTrigger;
        if (!st) return;
        const y = st.start + progress * (st.end - st.start);
        if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
        else window.scrollTo(0, y);
        updateProgress(progress);
      });
    }

    function build({ keepProgress = true } = {}) {
      if (responsiveMQ.matches) buildMobile({ keepProgress });
      else buildDesktop({ keepProgress });
    }

    function goToPanel(target, immediate = false) {
      if (!target) return;
      const travel = mode === 'mobile' ? mobileTravel : getTravel();
      const progress = travel ? clamp(panelLogicalStart(target) / travel, 0, 1) : 0;
      if (mode === 'mobile') {
        const y = mobileStageStart() + progress * mobileTravel;
        if (lenis) lenis.scrollTo(y, immediate ? { immediate: true, force: true } : { duration: 1.0, force: true });
        else window.scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' });
        return;
      }
      const st = desktopTween?.scrollTrigger;
      if (!st) return;
      const y = st.start + progress * (st.end - st.start);
      if (lenis) lenis.scrollTo(y, immediate ? { immediate: true, force: true } : { duration: 1.05, force: true });
      else window.scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' });
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', event => {
        const id = anchor.getAttribute('href');
        if (!id || id === '#') return;
        const target = document.querySelector(id);
        if (!target) return;
        event.preventDefault();
        const action = () => goToPanel(target, false);
        if (menuOpen) closeMenu(() => setTimeout(action, 30)); else action();
      });
    });

    // Critical behavior: normal vertical page scroll/touch is never hijacked.
    // The sticky viewport simply maps that vertical progress to horizontal X.
    window.addEventListener('scroll', requestMobileScroll, { passive: true });
    if (lenis) lenis.on('scroll', requestMobileScroll);

    viewport.addEventListener('keydown', event => {
      const step = Math.max(260, viewport.clientWidth * .72);
      if (mode === 'mobile') {
        if (event.key === 'ArrowRight' || event.key === 'PageDown') {
          event.preventDefault();
          const dir = body.classList.contains('is-ar') ? -1 : 1;
          lenis?.scrollTo(clamp(window.scrollY + step * dir, mobileStageStart(), mobileStageStart() + mobileTravel), { duration: .72, force: true });
        } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
          event.preventDefault();
          const dir = body.classList.contains('is-ar') ? -1 : 1;
          lenis?.scrollTo(clamp(window.scrollY - step * dir, mobileStageStart(), mobileStageStart() + mobileTravel), { duration: .72, force: true });
        }
        return;
      }
    });

    panels[0] && (panels[0].dataset.revealed = '1');
    build({ keepProgress: false });
    window.__crossSectorHomeRefresh = () => build({ keepProgress: true });

    const ready = () => {
      build({ keepProgress: false });
      if (location.hash) {
        const target = document.querySelector(location.hash);
        if (target) setTimeout(() => goToPanel(target, true), 100);
      }
    };
    if (document.fonts?.ready) document.fonts.ready.then(ready);
    else addEventListener('load', ready, { once: true });

    responsiveMQ.addEventListener?.('change', () => setTimeout(() => build({ keepProgress: true }), 70));
    addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => build({ keepProgress: true }), 180);
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
