(() => {
  window.nagiCreateHomeRefraction = (background, banner, signal) => {
    const enabled = matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    if (!enabled.matches || reducedMotion.matches || signal.aborted) return null;

    const canvas = document.createElement('canvas');
    canvas.className = 'home-banner-refraction';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.hidden = true;
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false, depth: false });
    if (!gl) return null;

    const shaders = [];
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      shaders.push(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Refraction shader unavailable');
      return shader;
    };
    const program = gl.createProgram();
    try {
      gl.attachShader(program, compile(gl.VERTEX_SHADER, `
        attribute vec2 position;
        varying vec2 uv;
        void main() {
          uv = position * 0.5 + 0.5;
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, `
        precision mediump float;
        varying vec2 uv;
        uniform sampler2D image;
        uniform vec2 size;
        uniform vec2 cover;
        uniform vec2 pointer;
        uniform float strength;
        void main() {
          vec2 delta = uv * size - pointer;
          float distance = length(delta);
          float falloff = 1.0 - smoothstep(0.0, 145.0, distance);
          // A gently curved lens bends the image by at most a few pixels.
          vec2 offset = delta * (0.085 * falloff * falloff * strength);
          vec2 sampleUV = ((uv * size - offset) / size - 0.5) * cover + 0.5;
          vec3 color = texture2D(image, sampleUV).rgb;
          gl_FragColor = vec4(color, falloff * strength);
        }
      `));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Refraction program unavailable');
    } catch {
      shaders.forEach(shader => gl.deleteShader(shader));
      gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return null;
    }

    gl.useProgram(program);
    const vertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    const uniforms = Object.fromEntries(['size', 'cover', 'pointer', 'strength'].map(name => [name, gl.getUniformLocation(program, name)]));

    let frame = 0;
    let lastTime = 0;
    let lastMove = -Infinity;
    let progress = 0;
    let opacity = 0;
    let inside = false;
    let disposed = false;
    let ready = false;
    let image;
    let width = 1;
    let height = 1;
    let x = 0;
    let y = 0;
    let targetX = 0;
    let targetY = 0;

    const clear = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      opacity = 0;
      canvas.hidden = true;
      if (!gl.isContextLost()) gl.clear(gl.COLOR_BUFFER_BIT);
    };
    const allowed = () => !disposed && ready && inside && progress < 1 && !document.hidden && enabled.matches && !reducedMotion.matches && !gl.isContextLost();
    const draw = (time) => {
      frame = 0;
      if (!allowed()) { clear(); return; }
      const step = Math.min(50, lastTime ? time - lastTime : 16.7);
      lastTime = time;
      const blend = 1 - Math.exp(-step / 65);
      x += (targetX - x) * blend;
      y += (targetY - y) * blend;
      const activity = 1 - Math.min(1, Math.max(0, (time - lastMove - 100) / 650));
      const targetOpacity = activity * (1 - progress) ** 2;
      opacity += (targetOpacity - opacity) * blend;
      if (activity === 0 && opacity < 0.002) { clear(); return; }
      canvas.hidden = false;
      gl.uniform2f(uniforms.pointer, x, height - y);
      gl.uniform1f(uniforms.strength, opacity);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      frame = requestAnimationFrame(draw);
    };
    const schedule = () => {
      if (!frame && allowed()) frame = requestAnimationFrame(draw);
    };
    const resize = () => {
      if (disposed || gl.isContextLost()) return;
      width = Math.max(1, background.clientWidth);
      height = Math.max(1, background.clientHeight);
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniforms.size, width, height);
      if (ready) {
        const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
        gl.uniform2f(uniforms.cover, width / (image.naturalWidth * scale), height / (image.naturalHeight * scale));
      }
      schedule();
    };
    const syncImage = () => {
      if (disposed || gl.isContextLost()) return;
      const visible = [...background.querySelectorAll('img')].find(img => getComputedStyle(img).display !== 'none');
      if (!visible?.complete || !visible.naturalWidth) { ready = false; clear(); return; }
      if (visible !== image || !ready) {
        try {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, visible);
          image = visible;
          ready = true;
        } catch {
          // Cross-origin or unavailable images keep the original background.
          ready = false;
          clear();
          return;
        }
      }
      resize();
    };
    const move = (event) => {
      if (event.pointerType !== 'mouse' || progress >= 1 || reducedMotion.matches || !enabled.matches) return;
      const hero = banner.getBoundingClientRect();
      if (event.clientY < Math.max(0, hero.top) || event.clientY > hero.bottom) { inside = false; clear(); return; }
      const bounds = background.getBoundingClientRect();
      targetX = (event.clientX - bounds.left) * width / bounds.width;
      targetY = (event.clientY - bounds.top) * height / bounds.height;
      if (!inside || !opacity) { x = targetX; y = targetY; }
      inside = true;
      lastMove = performance.now();
      schedule();
    };

    background.append(canvas);
    const observer = new ResizeObserver(resize);
    observer.observe(background);
    const themeObserver = new MutationObserver(syncImage);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    background.querySelectorAll('img').forEach(img => img.addEventListener('load', syncImage, { signal }));
    document.addEventListener('pointermove', move, { passive: true, signal });
    document.documentElement.addEventListener('pointerleave', () => { inside = false; clear(); }, { signal });
    document.addEventListener('visibilitychange', clear, { signal });
    for (const media of [enabled, reducedMotion]) media.addEventListener('change', () => { clear(); syncImage(); }, { signal });
    canvas.addEventListener('webglcontextlost', clear, { signal });
    signal.addEventListener('abort', () => {
      disposed = true;
      clear();
      observer.disconnect();
      themeObserver.disconnect();
      canvas.remove();
      gl.deleteTexture(texture);
      gl.deleteBuffer(vertices);
      shaders.forEach(shader => gl.deleteShader(shader));
      gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }, { once: true });
    syncImage();

    return {
      setProgress(value) {
        progress = value;
        if (progress >= 1) clear();
        else schedule();
      },
    };
  };
})();
