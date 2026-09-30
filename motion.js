(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const panel = document.querySelector('.identity');
  const progress = document.querySelector('.reading-progress');
  const links = [...document.querySelectorAll('nav a')];
  const sections = links.map(link => document.querySelector(link.getAttribute('href')));
  const motionToggle = document.querySelector('.motion-toggle');
  let pausedByUser = false;
  try { pausedByUser = localStorage.getItem('portfolio-motion-paused') === 'true'; } catch (_) {}
  const motionOff = () => reduceMotion.matches || pausedByUser;
  function applyMotionPreference() {
    const off = motionOff();
    document.documentElement.dataset.motion = off ? 'paused' : 'on';
    if (motionToggle) {
      motionToggle.hidden = false;
      motionToggle.disabled = reduceMotion.matches;
      motionToggle.textContent = reduceMotion.matches ? 'Reduced motion enabled' : pausedByUser ? 'Resume animations' : 'Pause animations';
      motionToggle.setAttribute('aria-pressed', String(off));
    }
    if (off && document.getAnimations) document.getAnimations().forEach(animation => animation.cancel());
  }
  applyMotionPreference();
  let scrollFrame = 0;
  let pointerFrame = 0;
  let pointer = null;

  function reveal(element, delay = 0) {
    if (motionOff() || typeof element.animate !== 'function') return;
    element.animate([
      { opacity: 0, transform: 'translateY(22px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration: 650, delay, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
  }

  // Content remains visible if scripting or animation support is unavailable.
  document.querySelectorAll('.hero-copy > *').forEach((element, index) => reveal(element, index * 65));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const element = entry.target;
        reveal(element, Number(element.dataset.revealDelay || 0));
        observer.unobserve(element);
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('.about-title-block, .about-copy, .section-heading, .interest, .project, .personal-fact, .closing').forEach(element => {
      if (element.matches('.interest, .project, .personal-fact')) {
        const index = [...element.parentElement.children].indexOf(element);
        element.dataset.revealDelay = String((index % 3) * 65);
      }
      observer.observe(element);
    });
  }

  function updateScroll() {
    scrollFrame = 0;
    const available = document.documentElement.scrollHeight - window.innerHeight;
    const fraction = available > 0 ? Math.min(1, Math.max(0, window.scrollY / available)) : 0;
    if (progress) progress.style.transform = `scaleX(${fraction})`;
    let active = -1;
    sections.forEach((section, index) => {
      if (section && section.getBoundingClientRect().top <= 160) active = index;
    });
    links.forEach((link, index) => {
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function scheduleScroll() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
  }
  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('resize', scheduleScroll, { passive: true });
  window.addEventListener('load', scheduleScroll, { once: true });
  if ('ResizeObserver' in window) new ResizeObserver(scheduleScroll).observe(document.body);
  updateScroll();

  function resetPanel() {
    pointer = null;
    if (pointerFrame) cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    if (!panel) return;
    ['--tilt-x', '--tilt-y', '--light-x', '--light-y'].forEach(key => panel.style.removeProperty(key));
    panel.classList.remove('pointer-active');
  }
  if (panel) {
    panel.addEventListener('pointermove', event => {
      if (motionOff() || !finePointer.matches || event.pointerType === 'touch') return;
      pointer = { x: event.clientX, y: event.clientY };
      if (pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        if (!pointer) return;
        const rect = panel.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (pointer.x - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (pointer.y - rect.top) / rect.height));
        panel.style.setProperty('--tilt-x', `${(0.5 - y) * 7}deg`);
        panel.style.setProperty('--tilt-y', `${(x - 0.5) * 7}deg`);
        panel.style.setProperty('--light-x', `${x * 100}%`);
        panel.style.setProperty('--light-y', `${y * 100}%`);
        panel.classList.add('pointer-active');
      });
    }, { passive: true });
    panel.addEventListener('pointerleave', resetPanel);
    panel.addEventListener('pointercancel', resetPanel);
  }
  document.querySelectorAll('.project').forEach(project => {
    project.addEventListener('toggle', () => {
      if (project.open) reveal(project.querySelector('.project-body'));
      scheduleScroll();
    });
  });
  reduceMotion.addEventListener('change', () => {
    resetPanel();
    applyMotionPreference();
  });
  finePointer.addEventListener('change', resetPanel);
  if (motionToggle) motionToggle.addEventListener('click', () => {
    pausedByUser = !pausedByUser;
    try { localStorage.setItem('portfolio-motion-paused', String(pausedByUser)); } catch (_) {}
    resetPanel();
    applyMotionPreference();
  });
  // Pointer effects use one animation frame per event, with no idle render loop.
  const effectCards = [...document.querySelectorAll('.interest, .personal-fact, .project')];
  const magnetButtons = [...document.querySelectorAll('.hero-actions .button, .closing .button')];
  const resetEffects = [];
  function attachPointerEffect(element, update, clear) {
    let frame = 0;
    let latest = null;
    function reset() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      latest = null;
      clear();
    }
    resetEffects.push(reset);
    element.addEventListener('pointermove', event => {
      if (motionOff() || !finePointer.matches || event.pointerType === 'touch') return;
      latest = { x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!latest || motionOff()) return;
        const bounds = element.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        const x = Math.max(0, Math.min(1, (latest.x - bounds.left) / bounds.width));
        const y = Math.max(0, Math.min(1, (latest.y - bounds.top) / bounds.height));
        update(x, y);
      });
    }, { passive: true });
    element.addEventListener('pointerleave', reset);
    element.addEventListener('pointercancel', reset);
  }
  effectCards.forEach(card => {
    const glow = document.createElement('span');
    glow.className = 'card-spotlight';
    glow.setAttribute('aria-hidden', 'true');
    // Details content is closed by default, so its spotlight belongs in summary.
    const surface = card.querySelector('summary') || card;
    surface.appendChild(glow);
    attachPointerEffect(card, (x, y) => {
      card.style.setProperty('--spot-x', `${x * 100}%`);
      card.style.setProperty('--spot-y', `${y * 100}%`);
      card.classList.add('spot-active');
    }, () => {
      card.classList.remove('spot-active');
      card.style.removeProperty('--spot-x');
      card.style.removeProperty('--spot-y');
    });
  });
  magnetButtons.forEach(button => {
    attachPointerEffect(button, (x, y) => {
      button.style.translate = `${(x - 0.5) * 7}px ${(y - 0.5) * 7}px`;
    }, () => { button.style.translate = ''; });
    button.addEventListener('click', () => {
      if (motionOff()) return;
      const ripple = document.createElement('span');
      ripple.className = 'button-ripple';
      ripple.setAttribute('aria-hidden', 'true');
      button.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
      // Cleanup still happens if motion is paused while the ripple is active.
      setTimeout(() => ripple.remove(), 800);
    });
  });
  function clearPointerEffects() { resetEffects.forEach(reset => reset()); }
  reduceMotion.addEventListener('change', clearPointerEffects);
  finePointer.addEventListener('change', clearPointerEffects);
  if (motionToggle) motionToggle.addEventListener('click', clearPointerEffects);
  window.addEventListener('blur', () => { resetPanel(); clearPointerEffects(); });

  // The original photo can be opened at a larger size without leaving the page.
  const photoDialog = document.querySelector('#portrait-dialog');
  const photoOpen = document.querySelector('.portrait-open');
  const photoClose = document.querySelector('.portrait-close');
  if (photoDialog && photoOpen && photoClose && typeof photoDialog.showModal === 'function') {
    photoOpen.hidden = false;
    let savedOverflow = '';
    photoOpen.addEventListener('click', () => {
      if (photoDialog.open) return;
      savedOverflow = document.body.style.overflow;
      photoDialog.showModal();
      document.body.style.overflow = 'hidden';
    });
    photoClose.addEventListener('click', () => photoDialog.close());
    photoDialog.addEventListener('click', event => {
      if (event.target !== photoDialog) return;
      const bounds = photoDialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) photoDialog.close();
    });
    photoDialog.addEventListener('close', () => {
      document.body.style.overflow = savedOverflow;
      photoOpen.focus({ preventScroll: true });
    });
  }
})();
