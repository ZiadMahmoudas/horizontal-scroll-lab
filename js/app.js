(() => {
  gsap.registerPlugin(ScrollTrigger);

  const stage = document.querySelector('.h-scroll');
  const track = document.querySelector('#track');
  const panels = gsap.utils.toArray('.panel');
  const projectPanels = gsap.utils.toArray('.project-panel');
  const progressFill = document.querySelector('#progress-fill');
  const progressLabel = document.querySelector('.progress-label');
  const menuBtn = document.querySelector('.menu-btn');
  const menuOverlay = document.querySelector('.menu-overlay');
  const menuLinks = gsap.utils.toArray('.menu-overlay a');

  // -----------------------------
  // LENIS — vertical wheel / touch input
  // -----------------------------
  const lenis = new Lenis({
    duration: 1.08,
    smoothWheel: true,
    wheelMultiplier: 1.0,
    touchMultiplier: 1.15,
    syncTouch: false
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // -----------------------------
  // Horizontal scroll mapping
  // -----------------------------
  let horizontalTween;

  const getScrollDistance = () => Math.max(0, track.scrollWidth - window.innerWidth + parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rail-w')));

  function buildHorizontalScroll() {
    if (horizontalTween) horizontalTween.kill();
    ScrollTrigger.getById('horizontal-main')?.kill();

    const distance = getScrollDistance();

    horizontalTween = gsap.to(track, {
      x: () => -distance,
      ease: 'none',
      scrollTrigger: {
        id: 'horizontal-main',
        trigger: stage,
        start: 'top top',
        end: () => `+=${distance}`,
        scrub: 0.8,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          gsap.set(progressFill, { scaleX: self.progress });

          const idx = Math.min(
            projectPanels.length,
            Math.max(1, Math.round(self.progress * (projectPanels.length - 1)) + 1)
          );
          progressLabel.textContent = String(idx).padStart(2, '0');
        }
      }
    });

    return horizontalTween;
  }

  buildHorizontalScroll();

  // -----------------------------
  // Paper-like project reveal
  // Each image unfolds from the top while its panel enters horizontally.
  // -----------------------------
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    projectPanels.forEach((panel, index) => {
      const wrap = panel.querySelector('.image-wrap');
      const curtain = panel.querySelector('.image-curtain');
      const image = panel.querySelector('img');
      const copy = panel.querySelector('.card-copy, .project-meta, .statement-copy, .final-inner');

      if (wrap) {
        gsap.set(wrap, { transformPerspective: 1200, transformOrigin: '50% 0%', rotationX: index === 0 ? 0 : -17, y: index === 0 ? 0 : -80 });
        gsap.set(curtain, { scaleY: index === 0 ? 0 : 1 });
        gsap.set(image, { scale: 1.12, yPercent: -3 });
      }
      if (copy && index > 0) gsap.set(copy, { y: 30, opacity: 0 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: panel,
          containerAnimation: horizontalTween,
          start: 'left 92%',
          end: 'left 48%',
          scrub: 1.15
        }
      });

      if (wrap) {
        tl.to(wrap, { rotationX: 0, y: 0, duration: 1, ease: 'power2.out' }, 0)
          .to(curtain, { scaleY: 0, duration: 1, ease: 'power3.inOut' }, 0.06)
          .to(image, { scale: 1.035, yPercent: 0, duration: 1.1, ease: 'power2.out' }, 0);
      }
      if (copy && index > 0) tl.to(copy, { y: 0, opacity: 1, duration: .75, ease: 'power2.out' }, .25);
    });
  });

  mm.add('(max-width: 900px)', () => {
    projectPanels.forEach((panel, index) => {
      const curtain = panel.querySelector('.image-curtain');
      const image = panel.querySelector('img');
      if (curtain) gsap.set(curtain, { scaleY: index === 0 ? 0 : 1 });
      if (image) gsap.set(image, { scale: 1.08 });

      if (!curtain) return;
      gsap.to(curtain, {
        scaleY: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: panel,
          containerAnimation: horizontalTween,
          start: 'left 95%',
          end: 'left 40%',
          scrub: 1
        }
      });
    });
  });

  // -----------------------------
  // Image parallax inside each horizontal panel
  // -----------------------------
  gsap.utils.toArray('.image-wrap img').forEach((img) => {
    const panel = img.closest('.panel');
    gsap.fromTo(img,
      { xPercent: -3 },
      {
        xPercent: 3,
        ease: 'none',
        scrollTrigger: {
          trigger: panel,
          containerAnimation: horizontalTween,
          start: 'left right',
          end: 'right left',
          scrub: true
        }
      }
    );
  });

  // -----------------------------
  // Menu animation
  // -----------------------------
  let menuOpen = false;
  const menuTL = gsap.timeline({ paused: true, defaults: { ease: 'power4.inOut' } })
    .set(menuOverlay, { visibility: 'visible' })
    .to(menuOverlay, { clipPath: 'inset(0 0 0% 0)', duration: .8 })
    .from(menuLinks, { y: 70, opacity: 0, stagger: .055, duration: .7 }, '-=.42');

  menuBtn.addEventListener('click', () => {
    menuOpen = !menuOpen;
    menuBtn.classList.toggle('is-open', menuOpen);
    menuOverlay.setAttribute('aria-hidden', String(!menuOpen));
    if (menuOpen) {
      lenis.stop();
      menuTL.play();
    } else {
      menuTL.reverse().eventCallback('onReverseComplete', () => {
        menuOverlay.style.visibility = 'hidden';
        lenis.start();
      });
    }
  });

  menuLinks.forEach(link => link.addEventListener('click', () => {
    if (!menuOpen) return;
    menuOpen = false;
    menuBtn.classList.remove('is-open');
    menuTL.reverse().eventCallback('onReverseComplete', () => {
      menuOverlay.style.visibility = 'hidden';
      lenis.start();
    });
  }));

  // -----------------------------
  // Anchor navigation — translate target X into body scroll position
  // -----------------------------
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const id = anchor.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();

      const x = target.offsetLeft - parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rail-w'));
      const st = ScrollTrigger.getById('horizontal-main');
      const maxX = Math.max(1, getScrollDistance());
      const y = st ? st.start + (x / maxX) * (st.end - st.start) : x;

      setTimeout(() => lenis.scrollTo(y, { duration: 1.4 }), menuOpen ? 650 : 0);
    });
  });

  // -----------------------------
  // Custom cursor
  // -----------------------------
  const cursorDot = document.querySelector('.cursor-dot');
  const cursorRing = document.querySelector('.cursor-ring');
  const xDot = gsap.quickTo(cursorDot, 'x', { duration: .12, ease: 'power3' });
  const yDot = gsap.quickTo(cursorDot, 'y', { duration: .12, ease: 'power3' });
  const xRing = gsap.quickTo(cursorRing, 'x', { duration: .35, ease: 'power3' });
  const yRing = gsap.quickTo(cursorRing, 'y', { duration: .35, ease: 'power3' });

  window.addEventListener('pointermove', (e) => {
    xDot(e.clientX); yDot(e.clientY);
    xRing(e.clientX); yRing(e.clientY);
  });
  document.querySelectorAll('a,button').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('link-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('link-hover'));
  });

  // -----------------------------
  // Three.js paper intro
  // Lightweight decorative layer only.
  // -----------------------------
  function initThreePaper() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.THREE) return;

    const mount = document.getElementById('three-paper');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, .1, 100);
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    renderer.setSize(innerWidth, innerHeight);
    mount.appendChild(renderer.domElement);

    const papers = [];
    const geo = new THREE.PlaneGeometry(1.05, 1.38, 7, 7);
    const colors = [0xf8f3e9, 0xf0e8dc, 0xffffff];

    for (let i = 0; i < 9; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        side: THREE.DoubleSide,
        transparent: true,
        opacity: .88,
        wireframe: false
      });
      const mesh = new THREE.Mesh(geo.clone(), mat);
      mesh.position.x = THREE.MathUtils.randFloatSpread(8.5);
      mesh.position.y = THREE.MathUtils.randFloat(3.4, 6.5);
      mesh.position.z = THREE.MathUtils.randFloat(-1.5, 1.2);
      mesh.rotation.set(
        THREE.MathUtils.randFloat(-.55, .35),
        THREE.MathUtils.randFloat(-.45, .45),
        THREE.MathUtils.randFloat(-.45, .45)
      );
      mesh.userData = {
        speed: THREE.MathUtils.randFloat(.012, .024),
        sway: THREE.MathUtils.randFloat(.012, .032),
        phase: Math.random() * Math.PI * 2
      };
      scene.add(mesh);
      papers.push(mesh);
    }

    let frame = 0;
    let active = true;
    function render() {
      if (!active) return;
      frame += .02;
      papers.forEach((paper, i) => {
        paper.position.y -= paper.userData.speed * 4.2;
        paper.position.x += Math.sin(frame * 1.9 + paper.userData.phase) * paper.userData.sway;
        paper.rotation.x += .006 + i * .00015;
        paper.rotation.y += .004;
        paper.rotation.z += Math.sin(frame + i) * .0016;
      });
      renderer.render(scene, camera);
      requestAnimationFrame(render);
    }
    render();

    gsap.to(mount, { opacity: 0, duration: 1.15, delay: 1.7, ease: 'power2.out', onComplete: () => {
      active = false;
      renderer.dispose();
      mount.remove();
    }});

    window.addEventListener('resize', () => {
      if (!active) return;
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });
  }

  initThreePaper();

  // Initial intro typography motion
  gsap.from('.intro-inner > *', {
    y: 34,
    opacity: 0,
    duration: .85,
    stagger: .09,
    delay: .35,
    ease: 'power3.out'
  });

  // Keep calculations correct after font/image load and on resize.
  window.addEventListener('load', () => ScrollTrigger.refresh());
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 200);
  });
})();
