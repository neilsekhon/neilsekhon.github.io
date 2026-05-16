(() => {
  const canvas = document.getElementById("physics-canvas");
  if (!canvas) return;

  const params = new URLSearchParams(window.location.search);
  const requestedVariant = params.get("physics");
  const variant = requestedVariant === "orbit" ? "orbit" : "bubbles";
  document.body.dataset.physics = variant;

  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pointer = {
    active: false,
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  };

  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
  let springs = [];
  let ripples = [];
  let running = !reduceMotion.matches;
  let lastTime = performance.now();
  let frameId = 0;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const rand = (min, max) => min + Math.random() * (max - min);

  const cssColor = (name, fallback) => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  };

  function resize() {
    dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    draw();
  }

  function seed() {
    ripples = [];
    if (variant === "orbit") seedOrbit();
    else seedBubbles();
  }

  function seedBubbles() {
    const count = width < 620 ? 13 : 18;
    const colors = palette();

    particles = Array.from({ length: count }, (_, i) => {
      const r = rand(width < 620 ? 26 : 34, width < 620 ? 74 : 110);
      return {
        x: rand(-r, width + r),
        y: rand(-r, height + r),
        vx: rand(-10, 10),
        vy: rand(-7, 7),
        r,
        baseR: r,
        phase: rand(0, Math.PI * 2),
        tone: i % colors.length,
      };
    });

    springs = [];
  }

  function seedOrbit() {
    const count = width < 620 ? 24 : 36;
    const centerX = width * (width < 620 ? 0.58 : 0.55);
    const centerY = height * (width < 620 ? 0.62 : 0.54);
    const radiusX = width * (width < 620 ? 0.38 : 0.34);
    const radiusY = height * 0.3;

    particles = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      return {
        x: centerX + Math.cos(angle) * radiusX * rand(0.66, 1.14),
        y: centerY + Math.sin(angle) * radiusY * rand(0.58, 1.18),
        vx: Math.sin(angle) * rand(10, 34),
        vy: -Math.cos(angle) * rand(10, 34),
        r: rand(2.2, 5.8),
        tone: i % 4,
      };
    });

    springs = [];
    for (let i = 0; i < particles.length; i += 1) {
      addSpring(i, (i + 1) % particles.length, 0.026);
      if (i % 3 === 0) addSpring(i, (i + 7) % particles.length, 0.008);
      if (i % 6 === 0) addSpring(i, (i + 15) % particles.length, 0.006);
    }
  }

  function addSpring(a, b, strength) {
    const pa = particles[a];
    const pb = particles[b];
    springs.push({
      a,
      b,
      rest: Math.hypot(pb.x - pa.x, pb.y - pa.y),
      strength,
    });
  }

  function palette() {
    return [
      cssColor("--accent", "#a7ff7a"),
      cssColor("--accent-strong", "#53d38a"),
      cssColor("--warm", "#f0a84f"),
      cssColor("--rose", "#d86d80"),
    ];
  }

  function clickPhysics(x, y) {
    if (variant === "orbit") {
      particles.forEach((p) => {
        const dx = p.x - x;
        const dy = p.y - y;
        const distance = Math.max(24, Math.hypot(dx, dy));
        const impulse = rand(150, 260) / distance;
        p.vx += dx * impulse + rand(-18, 18);
        p.vy += dy * impulse + rand(-18, 18);
      });
      startLoop();
      return;
    }

    ripples.push({ x, y, age: 0, duration: 1.8 });
    particles.forEach((p) => {
      const dx = p.x - x;
      const dy = p.y - y;
      const distance = Math.max(80, Math.hypot(dx, dy));
      const force = Math.max(0, 1 - distance / 420) * 3.5;
      p.vx += (dx / distance) * force;
      p.vy += (dy / distance) * force;
      p.r = Math.min(p.baseR * 1.08, p.r + force * 0.9);
    });
    startLoop();
  }

  function step(dt) {
    if (variant === "orbit") stepOrbit(dt);
    else stepBubbles(dt);
  }

  function stepBubbles(dt) {
    const centerX = width * 0.54;
    const centerY = height * 0.55;

    ripples = ripples
      .map((ripple) => ({ ...ripple, age: ripple.age + dt }))
      .filter((ripple) => ripple.age < ripple.duration);

    particles.forEach((p, i) => {
      p.phase += dt * 0.18;
      p.vx += Math.cos(p.phase + i) * 0.006;
      p.vy += Math.sin(p.phase * 0.9 + i) * 0.005;
      p.vx += (centerX - p.x) * 0.0006 * dt;
      p.vy += (centerY - p.y) * 0.0005 * dt;

      if (pointer.active) {
        const dx = pointer.x - p.x;
        const dy = pointer.y - p.y;
        const distance = Math.max(80, Math.hypot(dx, dy));
        const pull = Math.max(0, 1 - distance / 360);
        p.vx += (dx / distance) * pull * 4 * dt;
        p.vy += (dy / distance) * pull * 4 * dt;
      }

      for (let j = i + 1; j < particles.length; j += 1) {
        const other = particles[j];
        const dx = other.x - p.x;
        const dy = other.y - p.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const mergeRange = (p.r + other.r) * 0.64;

        if (distance > mergeRange) continue;

        const pull = (1 - distance / mergeRange) * 0.004;
        p.vx += dx * pull * dt;
        p.vy += dy * pull * dt;
        other.vx -= dx * pull * dt;
        other.vy -= dy * pull * dt;
      }

      p.r += (p.baseR - p.r) * 0.018;
      p.vx *= 0.992;
      p.vy *= 0.992;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const margin = p.r * 1.5;
      if (p.x < -margin) p.x = width + margin;
      if (p.x > width + margin) p.x = -margin;
      if (p.y < -margin) p.y = height + margin;
      if (p.y > height + margin) p.y = -margin;
    });
  }

  function stepOrbit(dt) {
    applyOrbitSprings(dt);
    applyOrbitPointer(dt);
    applyOrbitCollisions();
    integrateOrbit(dt);
  }

  function applyOrbitSprings(dt) {
    springs.forEach((spring) => {
      const a = particles[spring.a];
      const b = particles[spring.b];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.max(0.01, Math.hypot(dx, dy));
      const nx = dx / distance;
      const ny = dy / distance;
      const stretch = distance - spring.rest;
      const relativeVelocity = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      const force = stretch * spring.strength + relativeVelocity * 0.008;

      a.vx += force * nx * dt * 60;
      a.vy += force * ny * dt * 60;
      b.vx -= force * nx * dt * 60;
      b.vy -= force * ny * dt * 60;
    });
  }

  function applyOrbitPointer(dt) {
    if (!pointer.active) return;

    particles.forEach((p) => {
      const dx = pointer.x - p.x;
      const dy = pointer.y - p.y;
      const distance = Math.max(22, Math.hypot(dx, dy));
      const pull = Math.max(0, 1 - distance / 260);
      const orbit = pull * 28 * dt;

      p.vx += (dx / distance) * pull * 300 * dt;
      p.vy += (dy / distance) * pull * 300 * dt;
      p.vx += (-dy / distance) * orbit;
      p.vy += (dx / distance) * orbit;
    });
  }

  function applyOrbitCollisions() {
    for (let i = 0; i < particles.length; i += 1) {
      for (let j = i + 1; j < particles.length; j += 1) {
        const a = particles[i];
        const b = particles[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minDistance = a.r + b.r + 1;
        const distance = Math.max(0.01, Math.hypot(dx, dy));

        if (distance >= minDistance) continue;

        const nx = dx / distance;
        const ny = dy / distance;
        const overlap = (minDistance - distance) * 0.5;
        const impulse = ((b.vx - a.vx) * nx + (b.vy - a.vy) * ny) * 0.58;

        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;
        a.vx += nx * impulse;
        a.vy += ny * impulse;
        b.vx -= nx * impulse;
        b.vy -= ny * impulse;
      }
    }
  }

  function integrateOrbit(dt) {
    const centerX = width / 2;
    const centerY = height / 2;

    particles.forEach((p) => {
      p.vx += (centerX - p.x) * 0.01 * dt;
      p.vy += (centerY - p.y) * 0.01 * dt;
      p.vx *= 0.995;
      p.vy *= 0.995;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.x < -80) p.x = width + 80;
      if (p.x > width + 80) p.x = -80;
      if (p.y < -80) p.y = height + 80;
      if (p.y > height + 80) p.y = -80;
    });
  }

  function draw() {
    if (variant === "orbit") drawOrbit();
    else drawBubbles();
  }

  function drawBubbles() {
    const colors = palette();

    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";

    particles.forEach((p) => {
      const glow = p.r * 1.45;
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow);
      gradient.addColorStop(0, colors[p.tone]);
      gradient.addColorStop(0.32, colors[p.tone]);
      gradient.addColorStop(0.72, "rgba(255, 255, 255, 0.045)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.globalAlpha = 0.11;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glow, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = colors[p.tone];
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.92, 0, Math.PI * 2);
      ctx.stroke();
    });

    ripples.forEach((ripple) => {
      const progress = ripple.age / ripple.duration;
      ctx.globalAlpha = (1 - progress) * 0.18;
      ctx.strokeStyle = colors[0];
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, 30 + progress * 130, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  function drawOrbit() {
    const colors = palette();

    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    springs.forEach((spring) => {
      const a = particles[spring.a];
      const b = particles[spring.b];
      const distance = Math.hypot(b.x - a.x, b.y - a.y);
      const tension = clamp(Math.abs(distance - spring.rest) / 120, 0, 1);

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = colors[(a.tone + b.tone) % colors.length];
      ctx.globalAlpha = 0.02 + tension * 0.09;
      ctx.lineWidth = 0.7 + tension * 1.3;
      ctx.stroke();
    });

    particles.forEach((p) => {
      const speed = clamp(Math.hypot(p.vx, p.vy) / 240, 0, 1);
      const glow = p.r * (4.8 + speed * 3.4);
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow);

      gradient.addColorStop(0, colors[p.tone]);
      gradient.addColorStop(0.28, colors[p.tone]);
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.globalAlpha = 0.08 + speed * 0.12;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glow, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.28 + speed * 0.12;
      ctx.fillStyle = colors[p.tone];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  function tick(now) {
    frameId = 0;
    if (!running) {
      draw();
      return;
    }

    const dt = clamp((now - lastTime) / 1000, 0, 0.032);
    lastTime = now;
    step(dt);
    draw();
    frameId = requestAnimationFrame(tick);
  }

  function startLoop() {
    if (reduceMotion.matches || frameId) return;
    running = true;
    lastTime = performance.now();
    frameId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    running = false;
    if (!frameId) return;
    cancelAnimationFrame(frameId);
    frameId = 0;
  }

  window.addEventListener("pointermove", (event) => {
    pointer.active = true;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    startLoop();
  });

  window.addEventListener("pointerleave", () => {
    pointer.active = false;
  });

  window.addEventListener("click", (event) => {
    if (event.target.closest("a, button")) return;
    pointer.active = true;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    clickPhysics(event.clientX, event.clientY);
  });

  reduceMotion.addEventListener("change", () => {
    if (reduceMotion.matches) stopLoop();
    else startLoop();
    draw();
  });

  window.addEventListener("resize", resize);
  window.addEventListener("pagehide", stopLoop, { once: true });

  resize();
  if (running) startLoop();
})();
