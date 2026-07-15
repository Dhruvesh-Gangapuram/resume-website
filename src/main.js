import './style.css';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// Configuration for frame sequence
const frameCount = 348;
const startIndex = 1;
const currentFramePath = (index) => `${import.meta.env.BASE_URL}frames/My Intro-${String(index).padStart(5, '0')}.jpg`;

// Array to hold preloaded Image objects
const images = [];
let framesLoaded = false;
let lenisInstance;
let globalMouseX = window.innerWidth / 2;
let globalMouseY = window.innerHeight / 2;

window.addEventListener('DOMContentLoaded', () => {
  // Start Loader Scramble Effect
  const loaderText = document.querySelector('#loader-screen .loader-text');
  let loaderCtrl = null;
  if (loaderText) {
    loaderCtrl = createScrambleController(loaderText, 0);
    loaderCtrl.scramble();
  }

  // 1. Initialize Lenis Smooth Scroll
  lenisInstance = new Lenis({
    duration: 1.8,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    gestureOrientation: 'vertical',
  });

  // Lock scroll initially
  lenisInstance.stop();

  // Sync ScrollTrigger with Lenis
  lenisInstance.on('scroll', ScrollTrigger.update);
  
  gsap.ticker.add((time) => {
    lenisInstance.raf(time * 1000);
  });
  
  gsap.ticker.lagSmoothing(0);

  // 2. Custom Cursor
  setupCursor();

  // 3. Right Side Menu Hover
  setupDisciplinesHover();

  // 4. Preload Images & Sync with Video loading
  let videoReady = false;
  let framesReady = false;
  let initFlowTriggered = false;

  function checkIfAllLoaded() {
    if (videoReady && framesReady && !initFlowTriggered) {
      initFlowTriggered = true;
      if (loaderCtrl) {
        loaderCtrl.resolve();
      }
      setTimeout(() => {
        const loaderScreen = document.getElementById('loader-screen');
        const loaderTextEl = document.querySelector('#loader-screen .loader-text');
        const logoTextEl = document.querySelector('#header-logo .logo-text');
        
        if (loaderScreen && loaderTextEl && logoTextEl) {
          const loaderRect = loaderTextEl.getBoundingClientRect();
          const logoRect = logoTextEl.getBoundingClientRect();
          const deltaX = logoRect.left - loaderRect.left;
          const deltaY = logoRect.top - loaderRect.top;

          // Fade out loader screen background
          gsap.to(loaderScreen, {
            backgroundColor: 'rgba(11, 11, 11, 0)',
            duration: 0.8,
            ease: 'power2.out'
          });

          // Animate loader text to logo position
          gsap.to(loaderTextEl, {
            x: deltaX,
            y: deltaY,
            scale: logoRect.width / loaderRect.width,
            transformOrigin: 'top left',
            duration: 1.2,
            ease: 'power3.inOut',
            onComplete: () => {
              // Hide preloader entirely and reveal header with logo/cta
              loaderScreen.style.display = 'none';
              gsap.to('.header', {
                opacity: 1,
                duration: 0.5,
                ease: 'power2.out'
              });

              // Start background video intro
              const bgVideo = document.getElementById('bg-video');
              if (bgVideo) {
                bgVideo.play().catch(err => {
                  console.log("Autoplay was prevented, playing on user gesture", err);
                  onVideoFinished();
                });
              } else {
                onVideoFinished();
              }
            }
          });
        } else {
          if (loaderScreen) loaderScreen.style.display = 'none';
          const bgVideo = document.getElementById('bg-video');
          if (bgVideo) {
            bgVideo.play().catch(err => {
              console.log(err);
              onVideoFinished();
            });
          } else {
            onVideoFinished();
          }
        }
      }, 1000);
    }
  }

  preloadFrames(() => {
    framesLoaded = true;
    framesReady = true;
    checkIfAllLoaded();
  });

  const bgVideo = document.getElementById('bg-video');
  if (bgVideo) {
    if (bgVideo.readyState >= 3) {
      videoReady = true;
      checkIfAllLoaded();
    } else {
      bgVideo.addEventListener('canplaythrough', () => {
        videoReady = true;
        checkIfAllLoaded();
      });
      bgVideo.addEventListener('canplay', () => {
        videoReady = true;
        checkIfAllLoaded();
      });
    }
  } else {
    videoReady = true;
  }

  // 5. Video Playback & Transition logic
  setupVideoTransition();
});

// Custom Cursor Lag-Follow Animation
function setupCursor() {
  const cursor = document.getElementById('custom-cursor');
  const dot = document.getElementById('custom-cursor-dot');
  
  if (!cursor || !dot) return;

  const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const cursorTarget = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    globalMouseX = e.clientX;
    globalMouseY = e.clientY;
    
    // Position dot instantly
    dot.style.left = `${mouse.x}px`;
    dot.style.top = `${mouse.y}px`;
  });

  function updateCursor() {
    cursorTarget.x += (mouse.x - cursorTarget.x) * 0.15;
    cursorTarget.y += (mouse.y - cursorTarget.y) * 0.15;
    
    cursor.style.left = `${cursorTarget.x}px`;
    cursor.style.top = `${cursorTarget.y}px`;
    
    requestAnimationFrame(updateCursor);
  }
  updateCursor();

  const hoverables = document.querySelectorAll('a, button, .discipline-item, .btn');
  hoverables.forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('hovered');
      dot.style.transform = 'translate(-50%, -50%) scale(1.8)';
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('hovered');
      dot.style.transform = 'translate(-50%, -50%) scale(1.0)';
    });
  });
}

// Right side vertical menu active bullet toggles
function setupDisciplinesHover() {
  const items = document.querySelectorAll('.discipline-item');
  if (items.length === 0) return;

  items.forEach(item => {
    item.addEventListener('mouseenter', () => {
      items.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

// Preload the JPEGs into browser memory
function preloadFrames(onComplete) {
  let loadedCount = 0;
  
  for (let i = 0; i < frameCount; i++) {
    const img = new Image();
    img.src = currentFramePath(startIndex + i);
    img.onload = () => {
      loadedCount++;
      if (loadedCount === frameCount) {
        onComplete();
      }
    };
    img.onerror = () => {
      // Graceful fallback for broken image assets
      loadedCount++;
      if (loadedCount === frameCount) {
        onComplete();
      }
    };
    images.push(img);
  }
}

// Render canvas image keeping the 'cover' aspect ratio matching viewport (Top Center aligned)
function drawCoverImage(canvas, context, img) {
  if (!img) return;
  const canvasRatio = canvas.width / canvas.height;
  const imgRatio = img.width / img.height;
  let drawWidth, drawHeight, x, y;

  if (canvasRatio > imgRatio) {
    drawWidth = canvas.width;
    drawHeight = canvas.width / imgRatio;
    x = 0;
    y = 0; // Pin to top
  } else {
    drawHeight = canvas.height;
    drawWidth = canvas.height * imgRatio;
    x = (canvas.width - drawWidth) / 2; // Center horizontally
    y = 0; // Pin to top
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(img, x, y, drawWidth, drawHeight);
}

// Setup Canvas rendering and GSAP ScrollTrigger scrubbing
function setupScrollScrub() {
  const canvas = document.getElementById('scroll-canvas');
  const context = canvas.getContext('2d');
  
  if (!canvas || !context) return;

  // Set initial dimensions
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Handle window resizing
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const currentFrameIndex = Math.round(sequence.frame);
    if (images[currentFrameIndex]) {
      drawCoverImage(canvas, context, images[currentFrameIndex]);
    }
  });

  // Render first frame immediately
  if (images[0]) {
    images[0].onload = () => drawCoverImage(canvas, context, images[0]);
    if (images[0].complete) {
      drawCoverImage(canvas, context, images[0]);
    }
  }

  // Animating object parameter for GSAP
  const sequence = { frame: 0 };

  // GSAP ScrollTrigger Timeline
  const scrollTL = gsap.timeline({
    scrollTrigger: {
      id: 'main-scroll',
      trigger: '.main-content',
      start: 'top top',
      end: '+=300%', // Longer scroll for ultra-fine frame control
      scrub: 2.2, // Higher lag for massive fluid inertia
      pin: true,
      anticipatePin: 1,
      onUpdate: (self) => {
        // If user scrolls down while video is playing, force-hide the video
        const bgVideo = document.getElementById('bg-video');
        if (bgVideo && self.progress > 0.02 && bgVideo.style.display !== 'none') {
          bgVideo.pause();
          onVideoFinished();
        }
      }
    }
  });

  // Phase 1: Forward Frame Scrub (character moves to left)
  // Time: 0 to 1
  scrollTL.to(sequence, {
    frame: frameCount - 1,
    snap: 'frame',
    ease: 'none', // Linear response with scrub lag-follow provides the video feel
    onUpdate: () => {
      const activeImg = images[sequence.frame];
      if (activeImg) {
        drawCoverImage(canvas, context, activeImg);
      }
    }
  }, 0);

  // Fade out left text panel
  scrollTL.fromTo('.grid-left-side', 
    { opacity: 1, y: 0 },
    { opacity: 0, y: -40, duration: 0.8, ease: 'power1.out' },
    0
  );

  // Fade out right disciplines list
  scrollTL.fromTo('.grid-right-side', 
    { opacity: 1, x: 0, y: 0 },
    { opacity: 0, y: -40, duration: 0.8, ease: 'power1.out' },
    0
  );

  // Phase 2: Fade in About Section & Scramble (starts exactly as hero fades out at 0.8)
  scrollTL.to('.about-section', {
    opacity: 1,
    y: 0,
    duration: 0.4,
    ease: 'power1.out',
    onStart: () => {
      document.getElementById('about-section')?.classList.add('active');
      triggerAboutScramble();
    },
    onReverseComplete: () => {
      document.getElementById('about-section')?.classList.remove('active');
    }
  }, 0.8);

  // Phase 3: Trigger Experience Circular Transition on Scroll (one-shot trigger at 1.8)
  scrollTL.call(() => {
    const isForward = scrollTL.scrollTrigger.direction === 1;
    if (isForward) {
      triggerExperienceTransition();
    }
  }, null, 1.8);

  // Phase 4: Trigger Stats Circular Transition on Scroll (one-shot trigger at 2.2)
  scrollTL.call(() => {
    const isForward = scrollTL.scrollTrigger.direction === 1;
    if (isForward) {
      triggerStatsTransition();
    }
  }, null, 2.2);
}

// Listen to video ended event to fade out video and reveal canvas
function setupVideoTransition() {
  const bgVideo = document.getElementById('bg-video');
  const canvas = document.getElementById('scroll-canvas');
  const context = canvas?.getContext('2d');

  if (!bgVideo) return;

  bgVideo.addEventListener('ended', () => {
    // If user has already scrolled, do not trigger
    if (ScrollTrigger.getById('main-scroll')?.progress > 0.05) return;

    // Draw first frame on canvas just before fading to prevent blinking
    if (canvas && context && images[0]) {
      drawCoverImage(canvas, context, images[0]);
    }

    onVideoFinished();
  });
}

// Logic triggered when intro video is complete or skipped
function onVideoFinished() {
  const bgVideo = document.getElementById('bg-video');
  if (bgVideo) {
    bgVideo.style.opacity = 0;
    setTimeout(() => {
      bgVideo.style.display = 'none';
    }, 800);
  }

  // Setup scroll scrubbing and animate hero contents
  setupScrollScrub();
  triggerHeroEntranceScramble();
  
  if (lenisInstance) {
    lenisInstance.start();
  }
}

// GSAP Entrance sequence + Scramble (for hero section)
function triggerHeroEntranceScramble() {
  // Fade in header only if it is not already visible from the loader transition
  if (gsap.getProperty('.header', 'opacity') < 0.1) {
    gsap.set('.header', { y: -30, opacity: 0 });
    gsap.to('.header', {
      y: 0,
      opacity: 1,
      duration: 1.0,
      ease: 'power3.out'
    });
  }

  // Fade in columns cleanly
  gsap.set('.grid-left-side', { y: 30, opacity: 0 });
  gsap.set('.grid-right-side', { x: 30, opacity: 0 });

  gsap.to('.grid-left-side', {
    y: 0,
    opacity: 1,
    duration: 1.2,
    ease: 'power3.out'
  });

  gsap.to('.grid-right-side', {
    x: 0,
    opacity: 1,
    duration: 1.2,
    ease: 'power3.out'
  });

  // Select all individual text targets to scramble
  const scrambleTargets = [
    { selector: '.btn-contact', baseDelay: 0.2 },
    { selector: '.intro-accent-tag', baseDelay: 0.2 },
    { selector: '.main-heading', baseDelay: 0.3 },
    { selector: '.main-desc', baseDelay: 0.4 },
    { selector: '.btn', baseDelay: 0.5, stagger: 0.15 },
    { selector: '.list-heading', baseDelay: 0.3 },
    { selector: '.discipline-item .text', baseDelay: 0.4, stagger: 0.1 }
  ];

  scrambleTargets.forEach(target => {
    const elements = document.querySelectorAll(target.selector);
    elements.forEach((el, index) => {
      const delay = target.baseDelay + (target.stagger ? index * target.stagger : 0);
      const ctrl = createScrambleController(el, delay);
      ctrl.start();
    });
  });
}

// ==========================================
// About Section - Scramble Effect Controllers
// ==========================================

let scrambleControllers = [];
let aboutScrambleTriggered = false;

function triggerAboutScramble() {
  if (aboutScrambleTriggered) return;
  aboutScrambleTriggered = true;

  // Stop any existing runs just in case
  scrambleControllers.forEach(c => c.stop());
  scrambleControllers = [];

  const paragraphs = Array.from(document.querySelectorAll('.about-section .scramble-text'));
  if (paragraphs.length === 0) return;

  // Create paragraph 2 controller and scramble it immediately (if it exists)
  let c2 = null;
  if (paragraphs.length >= 2) {
    c2 = createScrambleController(paragraphs[1], 0);
    scrambleControllers.push(c2);
    c2.scramble(); // Start cycling random characters immediately
  }

  // Create paragraph 1 controller, resolving immediately and triggering c2 resolve when finished
  const c1 = createScrambleController(paragraphs[0], 0, () => {
    if (c2) {
      c2.resolve(); // Start resolving paragraph 2 once paragraph 1 is complete
    }
  });
  scrambleControllers.push(c1);
  c1.resolve(); // Resolve paragraph 1 immediately
}

function resetAboutScramble() {
  aboutScrambleTriggered = false;
  scrambleControllers.forEach(c => c.reset());
  scrambleControllers = [];
}

function createScrambleController(element, delaySeconds, onComplete) {
  // Persistently save original text in a data-attribute to survive timeline loops/resets
  let originalText = element.dataset.originalText;
  if (!originalText) {
    originalText = element.textContent;
    element.dataset.originalText = originalText;
  }
  const charsPool = "abcdefghijklmnopqrstuvwxyz0123456789_#*@$%&+=[]{}<>";
  let spans = [];
  let intervalId = null;
  let delayTimeoutId = null;
  let isRunning = false;
  let isResolving = false;

  function init() {
    element.innerHTML = '';
    spans = [];
    for (let i = 0; i < originalText.length; i++) {
      const char = originalText[i];
      const span = document.createElement('span');
      span.className = 'scramble-char';
      
      if (char === ' ') {
        span.textContent = ' ';
        span.dataset.resolved = 'true';
      } else if (char === '\n') {
        span.appendChild(document.createElement('br'));
        span.dataset.resolved = 'true';
      } else {
        span.textContent = charsPool[Math.floor(Math.random() * charsPool.length)];
        span.classList.add('scrambled');
        span.dataset.target = char;
        span.dataset.resolved = 'false';
      }
      element.appendChild(span);
      spans.push(span);
    }
  }

  init();

  function cycle() {
    for (let i = 0; i < spans.length; i++) {
      const span = spans[i];
      if (span.dataset.resolved === 'false') {
        span.textContent = charsPool[Math.floor(Math.random() * charsPool.length)];
      }
    }
  }

  return {
    scramble: () => {
      if (isRunning) return;
      isRunning = true;
      isResolving = false;
      init();
      intervalId = setInterval(cycle, 30);
    },
    resolve: () => {
      if (isResolving) return;
      isResolving = true;
      isRunning = true;
      
      if (intervalId) clearInterval(intervalId);
      
      delayTimeoutId = setTimeout(() => {
        let resolveIndex = 0;
        
        intervalId = setInterval(() => {
          let allResolved = true;
          
          // Keep cycling the remaining ones
          cycle();
          
          for (let i = 0; i < spans.length; i++) {
            if (spans[i].dataset.resolved === 'false') {
              allResolved = false;
            }
          }

          while (resolveIndex < spans.length && spans[resolveIndex].dataset.resolved === 'true') {
            resolveIndex++;
          }

          if (resolveIndex < spans.length) {
            const span = spans[resolveIndex];
            span.dataset.resolved = 'true';
            span.textContent = span.dataset.target;
            span.classList.remove('scrambled');
            span.classList.add('highlight');
            
            setTimeout(() => {
              span.classList.remove('highlight');
              span.classList.add('resolved');
            }, 300);
            
            resolveIndex++;
          }

          if (allResolved && resolveIndex >= spans.length) {
            clearInterval(intervalId);
            intervalId = null;
            if (typeof onComplete === 'function') {
              onComplete();
            }
          }
        }, 15); // Faster reveal tick
      }, delaySeconds * 1000);
    },
    start: function() {
      this.resolve();
    },
    stop: () => {
      isRunning = false;
      isResolving = false;
      if (delayTimeoutId) clearTimeout(delayTimeoutId);
      if (intervalId) clearInterval(intervalId);
    },
    reset: () => {
      isRunning = false;
      isResolving = false;
      if (delayTimeoutId) clearTimeout(delayTimeoutId);
      if (intervalId) clearInterval(intervalId);
      init();
    }
  };
}

// ==========================================
// Experience Section Transition
// ==========================================

let experienceScrambleControllers = [];
let experienceTriggered = false;

export function triggerExperienceTransition() {
  if (experienceTriggered) return;
  experienceTriggered = true;

  // Lock scrolling during transition
  if (lenisInstance) {
    lenisInstance.stop();
  }

  const darkSection = document.getElementById('experience-section');
  if (darkSection) {
    // Record current mouse position at trigger time to keep transition centered
    const originX = globalMouseX;
    const originY = globalMouseY;

    // Make custom cursor white on transition trigger
    document.body.classList.add('cursor-white');

    // Safe numerical animation object for radius to prevent string parsing issues in GSAP
    const revealObj = { radius: 0 };
    const maxRadius = Math.max(window.innerWidth, window.innerHeight) * 1.5;

    gsap.to(revealObj, {
      radius: maxRadius,
      duration: 1.5,
      ease: 'power3.inOut',
      onUpdate: () => {
        darkSection.style.clipPath = `circle(${revealObj.radius}px at ${originX}px ${originY}px)`;
      },
      onComplete: () => {
        darkSection.classList.add('active');
        triggerExperienceScramble();
      }
    });
  }
}

function triggerExperienceScramble() {
  const scrambleElements = Array.from(document.querySelectorAll('#experience-slide .dark-scramble-text'));
  if (scrambleElements.length === 0) {
    if (lenisInstance) lenisInstance.start();
    return;
  }

  // Fade in content
  gsap.fromTo('.dark-content',
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 1.0, ease: 'power3.out' }
  );

  const lastIndex = scrambleElements.length - 1;

  experienceScrambleControllers = scrambleElements.map((el, index) => {
    const delay = 1.0 + (index * 0.05); // Scramble for 1.0s then resolve with a small stagger
    const isLast = index === lastIndex;

    const ctrl = createScrambleController(el, delay, isLast ? () => {
      // Unlock scroll once everything is resolved
      if (lenisInstance) {
        lenisInstance.start();
      }
    } : null);

    ctrl.scramble(); // Start cycling random characters immediately
    ctrl.resolve(); // Resolves after the delay
    return ctrl;
  });
}

let statsScrambleControllers = [];
let statsTriggered = false;

export function triggerStatsTransition() {
  if (statsTriggered) return;
  statsTriggered = true;

  // Lock scrolling during transition
  if (lenisInstance) {
    lenisInstance.stop();
  }

  // Restore custom cursor back to primary color on light background
  document.body.classList.remove('cursor-white');

  const statsSection = document.getElementById('stats-section');
  if (statsSection) {
    // Record current mouse position at trigger time to keep transition centered
    const originX = globalMouseX;
    const originY = globalMouseY;

    // Safe numerical animation object for radius to prevent string parsing issues in GSAP
    const revealObj = { radius: 0 };
    const maxRadius = Math.max(window.innerWidth, window.innerHeight) * 1.5;

    gsap.to(revealObj, {
      radius: maxRadius,
      duration: 1.5,
      ease: 'power3.inOut',
      onUpdate: () => {
        statsSection.style.clipPath = `circle(${revealObj.radius}px at ${originX}px ${originY}px)`;
      },
      onComplete: () => {
        statsSection.classList.add('active');
        triggerStatsScramble();
      }
    });
  }
}

function triggerStatsScramble() {
  const scrambleElements = Array.from(document.querySelectorAll('#stats-slide .dark-scramble-text'));
  if (scrambleElements.length === 0) {
    if (lenisInstance) lenisInstance.start();
    return;
  }

  // Fade in stats content
  gsap.fromTo('#stats-slide .dark-content',
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 1.0, ease: 'power3.out' }
  );

  const lastIndex = scrambleElements.length - 1;

  statsScrambleControllers = scrambleElements.map((el, index) => {
    const delay = 1.0 + (index * 0.05); // Scramble for 1.0s then resolve with a small stagger
    const isLast = index === lastIndex;

    const ctrl = createScrambleController(el, delay, isLast ? () => {
      // Unlock scroll once everything is resolved
      if (lenisInstance) {
        lenisInstance.start();
      }
    } : null);

    ctrl.scramble(); // Start cycling random characters immediately
    ctrl.resolve(); // Resolves after the delay
    return ctrl;
  });
}
