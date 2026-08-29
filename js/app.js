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
      gestureOrientation: 'both',
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
     Desktop (>900px): Lenis vertical progress drives the GSAP
     horizontal rail. Arabic runs in the opposite visual direction.

     Mobile/tablet (<=900px): no pinned/fake horizontal document.
     The same panels become a normal vertical editorial page and
     Lenis owns a standard vertical scroll. This avoids the sticky +
     dynamic mobile viewport conflict that could leave touch scrolling
     unresponsive on Chrome/Safari mobile.
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
    const railWidth = () => mobileMQ.matches ? 0 : (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rail-w')) || 74);
    const viewportWidth = () => Math.max(1, innerWidth - railWidth());
    const maxTravel = () => Math.max(0, track.scrollWidth - viewportWidth());

    function setOpeningViewSize() {
      const intro = panels[0];
      const hero = panels[1];
      if (!intro) return;

      if (mobileMQ.matches) {
        // Inline sizes from desktop must not survive orientation/resize.
        intro.style.removeProperty('width');
        intro.style.removeProperty('min-width');
        if (hero) {
          hero.style.removeProperty('width');
          hero.style.removeProperty('min-width');
        }
        return;
      }

      // Desktop opening screen is exactly one usable viewport.
      const width = viewportWidth();
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
      if (mobileMQ.matches) {
        stage.style.removeProperty('--home-stage-h');
        return 0;
      }
      const travel = maxTravel();
      stage.style.setProperty('--home-stage-h', `${Math.ceil(innerHeight + travel)}px`);
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
      if (mobileMQ.matches) {
        const vh = innerHeight || document.documentElement.clientHeight;
        panels.forEach(panel => {
          const rect = panel.getBoundingClientRect();
          if (rect.bottom > 30 && rect.top < vh - 30) revealPanel(panel);
        });
        return;
      }
      const left = viewport.getBoundingClientRect().left;
      const right = viewport.getBoundingClientRect().right;
      panels.forEach(panel => {
        const rect = panel.getBoundingClientRect();
        if (rect.right > left + 30 && rect.left < right - 30) revealPanel(panel);
      });
    }

    function updateParallax() {
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
      if (!mobileMQ.matches && progressCurrent && panels.length) {
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

    function buildMobile() {
      killHorizontal();
      setOpeningViewSize();
      setStageHeight();
      track.style.removeProperty('flex-direction');
      currentProgress = 0;
      if (progressFill) progressFill.style.transform = 'scaleX(0)';
      // Make any desktop parallax translate disappear on mobile.
      if (hasGSAP) track.querySelectorAll('.image-wrap img').forEach(img => gsap.set(img, { clearProps: 'x' }));
      requestAnimationFrame(() => {
        if (hasScrollTrigger) ScrollTrigger.refresh(true);
        updateVisiblePanels();
      });
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

    function buildHome({ keepProgress = true } = {}) {
      if (mobileMQ.matches) buildMobile();
      else buildDesktop({ keepProgress });
    }

    function scrollToPanel(target, immediate = false) {
      if (!target) return;

      if (mobileMQ.matches) {
        if (lenis) {
          lenis.scrollTo(target, {
            offset: -headerHeight(),
            immediate,
            duration: immediate ? 0 : 1.0,
            force: true
          });
        } else {
          const y = target.getBoundingClientRect().top + scrollY - headerHeight();
          scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' });
        }
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
      if (mobileMQ.matches) return;
      const step = Math.max(260, viewportWidth() * 0.72);
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

    panels[0] && (panels[0].dataset.revealed = '1');
    buildHome({ keepProgress: false });

    window.__crossSectorHomeRefresh = () => buildHome({ keepProgress: !mobileMQ.matches });

    const ready = () => {
      buildHome({ keepProgress: false });
      if (location.hash) {
        const target = document.querySelector(location.hash);
        if (target) setTimeout(() => scrollToPanel(target, true), 130);
      }
    };

    if (document.fonts?.ready) document.fonts.ready.then(ready);
    else addEventListener('load', ready, { once: true });

    mobileMQ.addEventListener?.('change', () => {
      // Return to the top when switching architectures so no stale desktop
      // vertical progress leaves mobile halfway through an invisible stage.
      if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
      else scrollTo(0, 0);
      setTimeout(() => buildHome({ keepProgress: false }), 40);
    });

    addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => buildHome({ keepProgress: true }), 180);
    });

    // Mobile vertical reveals follow real vertical scrolling.
    addEventListener('scroll', () => {
      if (mobileMQ.matches) updateVisiblePanels();
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

  initHomeHorizontal();
  initInnerAnimations();
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
