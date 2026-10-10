/* MoonTrade hero: a procedurally shaded moon (WebGL) with an orbit of price candles (2D canvas).
   No libraries. Falls back to a CSS moon when WebGL is unavailable. */
(function () {
  'use strict';
  var stage = document.getElementById('moon-stage');
  if (!stage) return;
  var glc = stage.querySelector('.moon-gl'), backC = stage.querySelector('.ring-back'), frontC = stage.querySelector('.ring-front');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // seeded random so the moon looks the same on every visit
  var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  // ---------- WebGL moon ----------
  var gl = null;
  try { gl = glc.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true }); } catch (e) {}
  if (!gl) { stage.classList.add('no-gl'); }

  var N_CR = 26, craters = new Float32Array(N_CR * 4);
  for (var i = 0; i < N_CR; i++) {
    var u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    craters[i * 4] = s * Math.cos(th); craters[i * 4 + 1] = u; craters[i * 4 + 2] = s * Math.sin(th);
    craters[i * 4 + 3] = 0.05 + Math.pow(rnd(), 2.0) * 0.24;
  }

  var prog, uRes, uR, uRot, uC, uLight;
  if (gl) {
    var vs = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
    var fs = [
      'precision highp float;',
      'uniform vec2 uRes;uniform float uR;uniform mat3 uRot;uniform vec4 uC[' + N_CR + '];uniform vec3 uLight;',
      'float h3(vec3 p){p=fract(p*0.3183099+.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}',
      'float vn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);',
      ' return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),',
      '            mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}',
      'float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*vn(p);p*=2.03;a*=.5;}return s;}',
      'float height(vec3 p){float h=0.;',
      ' for(int i=0;i<' + N_CR + ';i++){vec4 c=uC[i];float a=acos(clamp(dot(p,c.xyz),-1.,1.));float x=a/c.w;',
      '  if(x<1.6){h+=c.w*((x<1.)?-(1.-x*x)*.3:0.)+c.w*.07*exp(-pow((x-1.)*3.,2.));}}',
      ' return h+fbm(p*5.)*.006;}',
      'void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uR;float d=length(uv);',
      ' if(d>1.){gl_FragColor=vec4(0.);return;}',
      ' vec3 n=vec3(uv,sqrt(max(0.,1.-d*d)));vec3 p=uRot*n;',
      ' vec3 t1=normalize(cross(p,abs(p.y)<.99?vec3(0,1,0):vec3(1,0,0)));vec3 t2=cross(p,t1);',
      ' float e=.012;float h0=height(p);float hx=height(normalize(p+t1*e));float hy=height(normalize(p+t2*e));',
      ' vec3 no=normalize(p-((hx-h0)/e)*t1*.9-((hy-h0)/e)*t2*.9);',
      ' vec3 L=uRot*normalize(uLight);float lam=max(dot(no,L),0.);',
      ' float maria=smoothstep(.42,.68,fbm(p*1.7+3.1));',
      ' vec3 base=mix(vec3(.84,.78,1.),vec3(.52,.41,.92),maria*.85);',
      ' base*=1.+clamp(h0*1.4,-.22,.08);',
      ' vec3 col=base*(.16+.96*lam)+vec3(.05,.02,.12)*(1.-lam);',
      ' float rim=pow(1.-n.z,2.6);col+=rim*vec3(.55,.36,1.)*.85;',
      
      ' float a=1.-smoothstep(1.-2.2/uR,1.,d);gl_FragColor=vec4(col*a,a);}'
    ].join('\n');
    function sh(t, src) { var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { throw new Error(gl.getShaderInfoLog(s)); } return s; }
    try {
      prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(prog); gl.useProgram(prog);
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      uRes = gl.getUniformLocation(prog, 'uRes'); uR = gl.getUniformLocation(prog, 'uR'); uRot = gl.getUniformLocation(prog, 'uRot');
      uC = gl.getUniformLocation(prog, 'uC'); uLight = gl.getUniformLocation(prog, 'uLight');
      gl.uniform4fv(uC, craters); gl.uniform3f(uLight, -0.55, 0.5, 0.67);
    } catch (e) { gl = null; stage.classList.add('no-gl'); if (window.console) console.warn('moon shader', e); }
  }

  // ---------- candle orbit ----------
  var N = 54, candles = [], v = 0;
  for (var k = 0; k < N; k++) { var d = (rnd() - 0.46) * 1.0; v += d; candles.push({ up: d > 0, body: 0.35 + Math.abs(d) * 0.9, wick: 0.25 + rnd() * 0.5 }); }
  var bctx = backC.getContext('2d'), fctx = frontC.getContext('2d');
  var pins = [].slice.call(stage.querySelectorAll('.pin')).map(function (el) {
    var la = +el.getAttribute('data-lat') * Math.PI / 180, lo = +el.getAttribute('data-lon') * Math.PI / 180;
    return { el: el, d: [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)] };
  });
  var hoverPin = false;
  pins.forEach(function (p) {
    p.el.addEventListener('pointerenter', function () { hoverPin = true; });
    p.el.addEventListener('pointerleave', function () { hoverPin = false; });
    p.el.addEventListener('focus', function () { hoverPin = true; });
    p.el.addEventListener('blur', function () { hoverPin = false; });
    p.el.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  });
  function placePins(m) {
    var lead = -1, best = 0.45;
    for (var j = 0; j < pins.length; j++) { var dd = pins[j].d, z = m[6] * dd[0] + m[7] * dd[1] + m[8] * dd[2]; if (z > best) { best = z; lead = j; } }
    for (var i = 0; i < pins.length; i++) {
      pins[i].el.classList.toggle('lead', i === lead);
      var d = pins[i].d, vx = m[0] * d[0] + m[1] * d[1] + m[2] * d[2], vy = m[3] * d[0] + m[4] * d[1] + m[5] * d[2], vz = m[6] * d[0] + m[7] * d[1] + m[8] * d[2];
      var a = Math.max(0, Math.min(1, (vz - 0.12) / 0.35)), el = pins[i].el;
      el.style.transform = 'translate(' + (cx + vx * r * 0.96).toFixed(1) + 'px,' + (cy - vy * r * 0.96).toFixed(1) + 'px)';
      el.style.opacity = a.toFixed(2); el.style.zIndex = Math.round(10 + vz * 10);
      el.classList.toggle('front', vz > 0.55); var px = cx + vx * r * 0.96, sw = pins[i].w || (pins[i].w = el.lastElementChild.offsetWidth); el.classList.toggle('flip', px + 14 + sw > W - 6 && px - 14 - sw > 6); el.tabIndex = a > 0.3 ? 0 : -1; el.style.pointerEvents = a > 0.3 ? 'auto' : 'none';
    }
  }

  // ---------- state ----------
  var W = 0, H = 0, dpr = 1, r = 100, cx = 0, cy = 0;
  var yaw = 0.25, pitch = -0.12, vyaw = 0.16, ringSpin = 0, dragging = false, lx = 0, ly = 0, visible = true;

  function resize() {
    var b = stage.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(b.width)); H = Math.max(1, Math.round(b.height));
    [glc, backC, frontC].forEach(function (c) { c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px'; });
    r = Math.min(W * 0.27, H * 0.33); cx = W / 2; cy = H / 2;
    if (typeof pins !== 'undefined') pins.forEach(function (p) { p.w = 0; });
    if (gl) gl.viewport(0, 0, W * dpr, H * dpr);
    draw();
  }

  function rotMat(y, p) { // object <- view : Ry(y) * Rx(p)
    var cyw = Math.cos(y), syw = Math.sin(y), cp = Math.cos(p), sp = Math.sin(p);
    // column-major mat3 for GLSL
    return new Float32Array([cyw, 0, -syw, syw * sp, cp, cyw * sp, syw * cp, -sp, cyw * cp]);
  }

  function drawRing(ctx, front) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    var R = 1.7, tilt = 0.32, roll = -0.22, f = 5.5;
    var ct = Math.cos(tilt), st = Math.sin(tilt), cr = Math.cos(roll), sr = Math.sin(roll);
    for (var i = 0; i < N; i++) {
      var a = i / N * Math.PI * 2 + ringSpin;
      var x = Math.cos(a) * R, y = 0, z = Math.sin(a) * R;
      var y2 = y * ct - z * st, z2 = y * st + z * ct; // tilt about x
      var x3 = x * cr - y2 * sr, y3 = x * sr + y2 * cr; // roll about z
      if ((z2 > 0) !== front) continue;
      var s = f / (f - z2), px = cx + x3 * s * r, py = cy - y3 * s * r;
      var c = candles[i], unit = r * 0.15 * s, bw = Math.max(2, r * 0.032 * s);
      var depth = (z2 + R) / (2 * R);
      ctx.globalAlpha = 0.28 + depth * 0.72;
      var col = c.up ? '#e2d8ff' : '#8b5cf6';
      ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, bw * 0.28);
      var bh = c.body * unit, wh = c.wick * unit;
      ctx.beginPath(); ctx.moveTo(px, py - bh / 2 - wh); ctx.lineTo(px, py + bh / 2 + wh * 0.7); ctx.stroke();
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(px - bw / 2, py - bh / 2, bw, bh, bw * 0.25); else ctx.rect(px - bw / 2, py - bh / 2, bw, bh); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function draw() {
    if (gl) {
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, W * dpr, H * dpr); gl.uniform1f(uR, r * dpr);
      gl.uniformMatrix3fv(uRot, false, rotMat(yaw, pitch));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    placePins(rotMat(yaw, pitch));
    drawRing(bctx, false); drawRing(fctx, true);
  }

  var last = 0;
  function loop(t) {
    var dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
    if (!dragging && !hoverPin) { yaw += vyaw * dt; vyaw += (0.16 - vyaw) * Math.min(1, dt * 0.8); }
    if (!hoverPin) ringSpin += dt * 0.16;
    draw();
    if (visible && !reduce) requestAnimationFrame(loop); else running = false;
  }
  var running = false;
  function start() { if (!running && !reduce) { running = true; last = performance.now(); requestAnimationFrame(loop); } }

  stage.addEventListener('pointerdown', function (e) { dragging = true; lx = e.clientX; ly = e.clientY; stage.setPointerCapture(e.pointerId); stage.classList.add('is-drag'); });
  stage.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    yaw += dx * 0.009; pitch = Math.max(-0.7, Math.min(0.7, pitch + dy * 0.006)); vyaw = dx * 0.5;
    ringSpin += dx * 0.002;
    if (reduce || !running) draw();
  });
  function up() { dragging = false; stage.classList.remove('is-drag'); vyaw = Math.max(-2, Math.min(2, vyaw)); }
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) start(); }).observe(stage);
  }
  window.addEventListener('resize', resize);
  resize(); start();
  stage.classList.add('is-ready');
})();
