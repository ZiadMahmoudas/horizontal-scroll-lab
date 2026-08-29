
(() => {
  'use strict';

  if (!document.body.classList.contains('home-page')) return;

  const mq = matchMedia('(max-width: 850px)');
  if (!mq.matches) return;

  const stage = document.querySelector('#horizontal-stage');
  const viewport = document.querySelector('.horizontal-viewport');
  const track = document.querySelector('#horizontal-track');
  if (!stage || !viewport || !track) return;

  const panels = [...track.querySelectorAll('.h-panel')];
  let travel = 0;
  let stageStart = 0;
  let raf = 0;
  let progress = 0;
  let resizeTimer = 0;

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const root = document.documentElement;

  function cssVar(name, fallback = 0) {
    const value = parseFloat(getComputedStyle(root).getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  }

  function isArabic() {
    return document.body.classList.contains('is-ar');
  }

  function visibleHeight() {
    return Math.max(
      1,
      window.innerHeight
        - cssVar('--header-h', 74)
        - cssVar('--home-footer-h', 42)
    );
  }

  function forceGeometry() {
    const phone = matchMedia('(max-width: 620px)').matches;

    track.style.flexDirection = isArabic() ? 'row-reverse' : 'row';

    // Wipe legacy inline geometry before measuring.
    panels.forEach(panel => {
      panel.style.maxWidth = 'none';
      panel.style.height = '100%';
      panel.style.minHeight = '100%';
    });

    if (panels[0]) {
      panels[0].style.display = '';
      panels[0].style.width = phone ? '520px' : '500px';
      panels[0].style.minWidth = phone ? '520px' : '500px';
    }

    if (panels[1]) {
      if (phone) {
        panels[1].style.display = 'none';
        panels[1].style.width = '0px';
        panels[1].style.minWidth = '0px';
      } else {
        panels[1].style.display = '';
        panels[1].style.width = '560px';
        panels[1].style.minWidth = '560px';
      }
    }

    panels.forEach(panel => {
      if (panel.classList.contains('ref-project-panel')) {
        panel.style.width = phone ? '335px' : '350px';
        panel.style.minWidth = phone ? '335px' : '350px';
      }
    });

    const contact = panels.find(panel => panel.classList.contains('ref-contact-panel'));
    if (contact) {
      contact.style.width = phone ? '520px' : '580px';
      contact.style.minWidth = phone ? '520px' : '580px';
    }

    // Real layout pass.
    void track.offsetWidth;

    const vh = visibleHeight();
    viewport.style.height = `${vh}px`;

    travel = Math.max(0, track.scrollWidth - window.innerWidth);

    // The stage is only a native vertical scroll ruler.
    stage.style.setProperty('--v45-stage-h', `${Math.ceil(vh + travel)}px`);

    stageStart = stage.getBoundingClientRect().top + window.scrollY;
  }

  function render() {
    raf = 0;

    const raw = clamp(window.scrollY - stageStart, 0, travel);
    progress = travel ? raw / travel : 0;

    const x = isArabic()
      ? (-travel + raw)
      : -raw;

    track.style.transform = `translate3d(${x}px,0,0)`;
  }

  function requestRender() {
    if (raf) return;
    raf = requestAnimationFrame(render);
  }

  function rebuild(keepProgress = true) {
    const oldProgress = keepProgress ? progress : 0;

    forceGeometry();

    const targetY = stageStart + oldProgress * travel;
    if (Math.abs(window.scrollY - targetY) > 2) {
      window.scrollTo(0, targetY);
    }

    requestAnimationFrame(() => {
      forceGeometry();
      render();
    });
  }

  function logicalPanelStart(target) {
    let x = 0;
    for (const panel of panels) {
      if (panel === target) break;
      if (panel.style.display === 'none') continue;
      x += panel.getBoundingClientRect().width;
    }
    return x;
  }

  function goToPanel(target) {
    if (!target || !travel) return;

    const p = clamp(logicalPanelStart(target) / travel, 0, 1);
    const y = stageStart + p * travel;

    window.scrollTo({
      top: y,
      behavior: 'smooth'
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;

      const target = document.querySelector(id);
      if (!target) return;

      event.preventDefault();
      goToPanel(target);
    });
  });

  window.addEventListener('scroll', requestRender, { passive: true });

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => rebuild(true), 120);
  }, { passive: true });

  // Existing language code calls this after AR/EN switching.
  window.__crossSectorHomeRefresh = () => rebuild(true);

  rebuild(false);

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => rebuild(true));
  }

  window.addEventListener('load', () => rebuild(true), { once: true });
})();
