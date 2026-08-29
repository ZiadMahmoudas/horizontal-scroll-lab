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
    const phoneMQ = matchMedia('(max-width: 620px)');
    const tabletMQ = matchMedia('(max-width: 1180px)');

    let travel = 0;
    let currentProgress = 0;
    let raf = 0;
    let resizeTimer = 0;

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const cssVar = name => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
    const headerHeight = () => cssVar('--header-h') || 74;
    const footerHeight = () => cssVar('--home-footer-h') || 0;

    function stageStart() {
      // Home stage is the scroll ruler. The visual viewport is fixed, so its
      // progress starts exactly where the stage begins in the document.
      return stage.offsetTop || 0;
    }

    function setPanelSize(panel, width) {
      if (!panel) return;
      panel.style.width = `${Math.round(width)}px`;
      panel.style.minWidth = `${Math.round(width)}px`;
      panel.style.maxWidth = 'none';
    }

    function configurePanelGeometry() {
      const vw = Math.max(320, window.innerWidth);
      const intro = panels[0];
      const hero = panels[1];
      const projects = panels.filter(p => p.classList.contains('ref-project-panel'));
      const closing = panels.find(p => p.classList.contains('ref-contact-panel'));

      if (phoneMQ.matches) {
        // Thorsten's mobile behavior keeps desktop-like fixed columns.
        // The viewport gets narrower; the horizontal canvas does not collapse.
        setPanelSize(intro, Math.max(520, vw * 1.35));

        if (hero) {
          hero.style.display = 'none';
          hero.style.width = '0px';
          hero.style.minWidth = '0px';
        }

        projects.forEach(panel => setPanelSize(panel, Math.max(335, vw * 0.88)));
        setPanelSize(closing, Math.max(520, vw * 1.28));
      } else if (tabletMQ.matches) {
        setPanelSize(intro, Math.max(500, vw * 0.44));
        if (hero) {
          hero.style.display = '';
          setPanelSize(hero, Math.max(560, vw * 0.56));
        }
        projects.forEach(panel => setPanelSize(panel, Math.max(350, vw * 0.36)));
        setPanelSize(closing, Math.max(580, vw * 0.58));
      } else {
        setPanelSize(intro, vw * 0.44);
        if (hero) {
          hero.style.display = '';
          setPanelSize(hero, vw * 0.56);
        }
        projects.forEach(panel => setPanelSize(panel, Math.max(365, vw * 0.29)));
        setPanelSize(closing, Math.max(650, vw * 0.51));
      }
    }

    function setDirection() {
      track.style.flexDirection = body.classList.contains('is-ar') ? 'row-reverse' : 'row';
    }

    function measure() {
      body.classList.add('home-clean-horizontal');
      document.documentElement.classList.add('home-clean-horizontal');

      setDirection();
      configurePanelGeometry();

      // Force a real layout pass after widths / display changes.
      void track.offsetWidth;

      const visible = Math.max(1, window.innerHeight - headerHeight() - footerHeight());

      travel = Math.max(0, track.scrollWidth - window.innerWidth);
      stage.style.setProperty('--home-stage-h', `${Math.ceil(visible + travel)}px`);

      return { visible, travel };
    }

    function updateVisiblePanels() {
      const vr = viewport.getBoundingClientRect();
      panels.forEach(panel => {
        if (panel.style.display === 'none') return;
        const r = panel.getBoundingClientRect();
        if (r.right > vr.left - 60 && r.left < vr.right + 60) {
          if (panel.dataset.revealed !== '1') {
            panel.dataset.revealed = '1';
            if (hasGSAP) {
              const wrap = panel.querySelector('.image-wrap');
              const curtain = panel.querySelector('.image-curtain');
              const image = panel.querySelector('img');
              const copy = panel.querySelector('.reveal-copy,.ref-over-caption');
              const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
              if (wrap && !panel.classList.contains('ref-hero-panel')) {
                tl.fromTo(wrap, { y: -18, rotationX: -3, transformPerspective: 1000 }, { y: 0, rotationX: 0, duration: .55 }, 0);
              }
              if (curtain) tl.fromTo(curtain, { scaleY: 1 }, { scaleY: 0, duration: .66, ease: 'power4.inOut' }, 0);
              if (image) tl.fromTo(image, { scale: 1.035 }, { scale: 1, duration: .82 }, 0);
              if (copy && !panel.classList.contains('ref-intro-panel')) {
                tl.fromTo(copy, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: .38 }, .1);
              }
            }
          }
        }
      });
    }

    function updateProgress(progress) {
      currentProgress = clamp(progress, 0, 1);

      if (progressFill) {
        progressFill.style.transform = `scaleX(${currentProgress})`;
      }

      if (progressCurrent && panels.length) {
        const logicalCenter = currentProgress * travel + viewport.clientWidth * .5;
        let cursor = 0;
        let active = 0;

        for (let i = 0; i < panels.length; i++) {
          if (panels[i].style.display === 'none') continue;
          cursor += panels[i].getBoundingClientRect().width;
          if (logicalCenter <= cursor) {
            active = i;
            break;
          }
        }

        progressCurrent.textContent = String(active + 1).padStart(2, '0');
      }

      updateVisiblePanels();
    }

    function applyScroll() {
      raf = 0;

      const start = stageStart();
      const raw = clamp(window.scrollY - start, 0, travel);
      const progress = travel ? raw / travel : 0;
      const ar = body.classList.contains('is-ar');

      // English: 0 -> -travel. Arabic: -travel -> 0.
      const x = ar ? (-travel + raw) : -raw;

      if (hasGSAP) {
        gsap.set(track, { x, force3D: true });
      } else {
        track.style.transform = `translate3d(${x}px,0,0)`;
      }

      updateProgress(progress);
    }

    function requestScrollUpdate() {
      if (raf) return;
      raf = requestAnimationFrame(applyScroll);
    }

    function rebuild({ keepProgress = true } = {}) {
      const progress = keepProgress ? currentProgress : 0;

      // Remove every old responsive-engine class. V43 has one owner only.
      [
        'home-scroll-horizontal',
        'home-direct-horizontal',
        'home-mobile-native',
        'home-pinned-horizontal',
        'home-responsive-pinned',
        'home-unified-horizontal',
        'home-compact-horizontal',
        'home-native-map-horizontal'
      ].forEach(cls => {
        body.classList.remove(cls);
        document.documentElement.classList.remove(cls);
      });

      // Kill old home ScrollTriggers if a previous rebuild left one behind.
      if (hasScrollTrigger) {
        ScrollTrigger.getAll().forEach(st => {
          if (
            st.vars?.id === 'cross-sector-home-horizontal' ||
            st.vars?.id === 'cross-sector-responsive-horizontal'
          ) st.kill();
        });
      }

      if (hasGSAP) gsap.set(track, { clearProps: 'transform,x' });
      else track.style.transform = 'none';

      measure();

      const start = stageStart();
      const y = start + progress * travel;

      if (Math.abs(window.scrollY - y) > 2) {
        if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
        else window.scrollTo(0, y);
      }

      requestAnimationFrame(() => {
        measure();
        applyScroll();
      });
    }

    function panelLogicalStart(target) {
      let distance = 0;
      for (const panel of panels) {
        if (panel === target) break;
        if (panel.style.display === 'none') continue;
        distance += panel.getBoundingClientRect().width;
      }
      return distance;
    }

    function goToPanel(target, immediate = false) {
      if (!target || !travel) return;

      const progress = clamp(panelLogicalStart(target) / travel, 0, 1);
      const y = stageStart() + progress * travel;

      if (lenis) {
        lenis.scrollTo(y, immediate
          ? { immediate: true, force: true }
          : { duration: 1.0, force: true });
      } else {
        window.scrollTo({
          top: y,
          behavior: immediate ? 'auto' : 'smooth'
        });
      }
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', event => {
        const id = anchor.getAttribute('href');
        if (!id || id === '#') return;

        const target = document.querySelector(id);
        if (!target) return;

        event.preventDefault();

        const action = () => goToPanel(target, false);
        if (menuOpen) closeMenu(() => setTimeout(action, 30));
        else action();
      });
    });

    // This is the whole interaction model:
    // browser / Lenis scroll stays vertical; only the canvas moves sideways.
    window.addEventListener('scroll', requestScrollUpdate, { passive: true });
    if (lenis) lenis.on('scroll', requestScrollUpdate);

    viewport.addEventListener('keydown', event => {
      const step = Math.max(240, viewport.clientWidth * .7);

      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        const y = clamp(window.scrollY + step, stageStart(), stageStart() + travel);
        if (lenis) lenis.scrollTo(y, { duration: .72, force: true });
        else window.scrollTo({ top: y, behavior: 'smooth' });
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        const y = clamp(window.scrollY - step, stageStart(), stageStart() + travel);
        if (lenis) lenis.scrollTo(y, { duration: .72, force: true });
        else window.scrollTo({ top: y, behavior: 'smooth' });
      } else if (event.key === 'Home') {
        event.preventDefault();
        goToPanel(panels[0], false);
      } else if (event.key === 'End') {
        event.preventDefault();
        const y = stageStart() + travel;
        if (lenis) lenis.scrollTo(y, { duration: .85, force: true });
        else window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });

    panels[0] && (panels[0].dataset.revealed = '1');

    rebuild({ keepProgress: false });
    window.__crossSectorHomeRefresh = () => rebuild({ keepProgress: true });

    const ready = () => {
      rebuild({ keepProgress: false });

      if (location.hash) {
        const target = document.querySelector(location.hash);
        if (target) setTimeout(() => goToPanel(target, true), 120);
      }
    };

    if (document.fonts?.ready) {
      document.fonts.ready.then(ready);
    } else {
      addEventListener('load', ready, { once: true });
    }

    addEventListener('load', () => rebuild({ keepProgress: true }), { once: true });

    addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => rebuild({ keepProgress: true }), 140);
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
