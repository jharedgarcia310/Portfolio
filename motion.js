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
})();
