/* A 28-second flight. Scene resources belong exclusively to this intro. */
(() => {
    const overlay = document.getElementById('intro-overlay');
    const host = document.getElementById('intro-3d-container');
    if (!overlay || !host) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = matchMedia('(max-width: 600px)').matches;
    const images = (window.LOVE_IMAGES || []).slice(0, mobile ? 12 : 20);
    const clamp = x => Math.max(0, Math.min(1, x));
    const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
    let seed = 0x200d;
    const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    let scene, camera, renderer, frame, start, previous, heart, halo, warp;
    let ended = false, started = false, collision = false, phase = '';
    const resources = new Set();
    const own = resource => { resources.add(resource); return resource; };
    const cards = [], clouds = [], timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!ended) fn(); }, ms); timers.add(id); };
    const progressBar = overlay.querySelector('.intro-progress span');
    // Hermite distance curve: position and velocity stay continuous at each act.
    const knots = [[0, 0, 12], [5.6, 120, 40], [10, 750, 260], [19, 3450, 300], [22.4, 4350, 180], [26.8, 4730, 0]];
    function flight(t) {
        const i = knots.findIndex((k, n) => n && t <= k[0]);
        if (i < 1) return [4730, 0];
        const a = knots[i - 1], b = knots[i], h = b[0] - a[0], u = clamp((t - a[0]) / h);
        const d = (2*u**3-3*u*u+1)*a[1] + (u**3-2*u*u+u)*h*a[2] + (-2*u**3+3*u*u)*b[1] + (u**3-u*u)*h*b[2];
        const v = ((6*u*u-6*u)*a[1] + (3*u*u-4*u+1)*h*a[2] + (-6*u*u+6*u)*b[1] + (3*u*u-2*u)*h*b[2]) / h;
        return [d, v];
    }
    function glowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 128;
        const ctx = canvas.getContext('2d');
        const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(.12, 'rgba(255,255,255,.65)');
        g.addColorStop(.4, 'rgba(255,255,255,.16)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
        return own(new THREE.CanvasTexture(canvas));
    }
    let glow;
    function sprite(color, opacity) {
        return new THREE.Sprite(own(new THREE.SpriteMaterial({ map: glow, color, opacity, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    }
    function points(positions, material, colors) {
        const geometry = own(new THREE.BufferGeometry());
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        if (colors) geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        return new THREE.Points(geometry, own(new THREE.PointsMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, ...material })));
    }
    function environment() {
        const count = mobile ? 2400 : 6000, positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const angle = random() * Math.PI * 2, radius = 140 + random() * 1400;
            positions.set([Math.cos(angle)*radius, Math.sin(angle)*radius, 900-random()*6500], i*3);
        }
        scene.add(points(positions, { color: 0xc8dfff, size: 4, opacity: .9 }));
        for (let i = 0; i < (mobile ? 24 : 42); i++) {
            const cloud = sprite([0x8546ff, 0x227cdb, 0xff398b][i%3], .23);
            const angle = random()*Math.PI*2;
            cloud.position.set(Math.cos(angle)*(250+random()*650), Math.sin(angle)*(180+random()*460), 350-random()*5500);
            cloud.scale.set(650+random()*700, 380+random()*500, 1);
            cloud.userData.phase = random()*6;
            clouds.push(cloud); scene.add(cloud);
        }
        const geometry = own(new THREE.BufferGeometry());
        const vertices = new Float32Array((mobile ? 240 : 600)*6);
        for (let i = 0; i < vertices.length; i += 6) {
            const angle = random()*Math.PI*2, radius = 85+random()*900;
            vertices.set([Math.cos(angle)*radius, Math.sin(angle)*radius, -random()*1800, Math.cos(angle)*radius, Math.sin(angle)*radius, 0], i);
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
        warp = new THREE.LineSegments(geometry, own(new THREE.LineBasicMaterial({ color: 0xb7dbff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })));
        warp.frustumCulled = false; scene.add(warp);
    }
    function memory(name, index) {
        const group = new THREE.Group();
        const texture = own(new THREE.TextureLoader().load(new URL('../static/love_images/'+encodeURIComponent(name), document.baseURI).href, loaded => {
            if (ended) { loaded.dispose(); return; }
            const aspect = loaded.image.width / loaded.image.height;
            photo.scale.x = aspect;
            border.scale.x = aspect;
        }, undefined, () => { group.visible = false; }));
        texture.encoding = THREE.sRGBEncoding;
        const photo = new THREE.Mesh(own(new THREE.PlaneGeometry(96, 96)), own(new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide })));
        const border = new THREE.Mesh(own(new THREE.PlaneGeometry(104, 110)), own(new THREE.MeshBasicMaterial({ color: 0xffe5f2, transparent: true, side: THREE.DoubleSide })));
        border.position.set(0, -3, -1);
        const aura = sprite(index%2 ? 0x63cfff : 0xff4ea2, 0);
        aura.scale.set(270, 270, 1); aura.position.z = -3;
        group.add(aura, border, photo);
        // Portrait screens need narrower lanes so memories remain in the frustum.
        const lane = mobile ? 72+random()*50 : 140+random()*160;
        group.position.set((index%2 ? 1 : -1)*lane, (random()-.5)*(mobile ? 250 : 350), 470-index*(3900/Math.max(images.length-1, 1)));
        group.userData = { base: group.position.clone(), phase: random()*6.28, frequency: .36+index*.037, tilt: (random()-.5)*.24, photo, border, aura };
        cards.push(group); scene.add(group);
    }
    function makeHeart() {
        const count = mobile ? 5000 : 11000;
        const positions = new Float32Array(count*3), colors = new Float32Array(count*3);
        const pink = new THREE.Color(0xff348f), white = new THREE.Color(0xe9faff);
        for (let i = 0; i < count; i++) {
            const u = random()*Math.PI*2, v = Math.acos(2*random()-1);
            const r = i%3 === 0 ? Math.cbrt(random())*.82 : .9+random()*.1;
            positions.set([16*Math.sin(u)**3*Math.sin(v)*r*12, (13*Math.cos(u)-5*Math.cos(2*u)-2*Math.cos(3*u)-Math.cos(4*u))*Math.sin(v)*r*12, 6*Math.cos(v)*r*12], i*3);
            const color = pink.clone().lerp(white, 1-smooth((r-.2)/.8));
            colors.set([color.r, color.g, color.b], i*3);
        }
        heart = points(positions, { vertexColors: true, size: mobile ? 5 : 6, opacity: 0 }, colors);
        heart.position.set(0, 0, -4020); scene.add(heart);
        halo = sprite(0xff429c, 0); halo.position.copy(heart.position); halo.position.z -= 40;
        halo.scale.set(900, 800, 1); scene.add(halo);
    }
    function setPhase(next) {
        if (phase === next) return;
        phase = next; overlay.dataset.phase = next;
        const copy = { drift: ['Một tín hiệu giữa muôn vì sao', 'Vũ trụ tình yêu', 'Có một người, khiến cả vũ trụ trở nên gần hơn.'], warp: ['Qua những miền ký ức', 'Mình tìm thấy nhau', 'Mỗi khoảnh khắc đưa mình gần nhau thêm.'], arrival: ['Nơi mọi quỹ đạo gặp nhau', 'Là nơi có em', 'Và hành trình của chúng ta vẫn tiếp tục.'] }[next];
        ['intro-kicker', 'intro-title', 'intro-subtitle'].forEach((id, i) => { document.getElementById(id).textContent = copy[i]; });
    }
    function render(now) {
        if (ended || collision) return;
        if (start === undefined) {
            start = previous = now;
            overlay.dispatchEvent(new CustomEvent('intro:start', { detail: { startedAt: now } }));
        }
        const t = (now-start)/1000, dt = Math.min((now-previous)/1000, .05); previous = now;
        const [distance, velocity] = flight(t);
        const speed = smooth((velocity-30)/270), arrival = smooth((t-22.4)/3.5);
        setPhase(t < 5.6 ? 'drift' : t < 22.4 ? 'warp' : 'arrival');
        progressBar.style.width = `${clamp(t/28)*100}%`;
        if (reduced) {
            camera.position.set(0, 0, -3300); camera.fov = 62;
        } else {
            const settle = 1-arrival, amplitude = (18+speed*24)*settle;
            camera.position.set(Math.sin(t*.67)*amplitude, Math.sin(t*.49)*amplitude*.55, 800-distance);
            camera.rotation.set(Math.cos(t*.49)*.009*settle, Math.cos(t*.67)*.015*settle, -Math.cos(t*.67)*(.015+speed*.045)*settle);
            camera.fov = 62+speed*34;
        }
        camera.updateProjectionMatrix();
        overlay.style.setProperty('--warp', reduced ? 0 : speed);
        const vertices = warp.geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 6) {
            vertices[i+2] += dt*(65+velocity*2.4);
            if (vertices[i+2] > 70) vertices[i+2] -= 1870;
            vertices[i+5] = vertices[i+2]-(3+speed*150);
        }
        warp.position.copy(camera.position); warp.geometry.attributes.position.needsUpdate = true;
        warp.material.opacity = reduced ? 0 : speed*.65*(1-arrival);
        clouds.forEach(cloud => { cloud.material.opacity = .20+Math.sin(t*.22+cloud.userData.phase)*.035; });
        cards.forEach(group => {
            const d = group.userData, f = reduced ? 0 : t*d.frequency;
            group.position.y = d.base.y+Math.sin(f+d.phase)*17;
            group.position.x = d.base.x+Math.cos(f*.73+d.phase)*12;
            group.rotation.set(Math.sin(f*.6+d.phase)*.09, Math.cos(f*.8+d.phase)*.16, d.tilt+Math.sin(f+d.phase)*.055);
            const depth = camera.position.z-group.position.z;
            const visible = smooth((1250-depth)/600)*smooth((depth+40)/120);
            d.photo.material.opacity = visible;
            d.border.material.opacity = visible*.85;
            const near = Math.exp(-(((depth-150)/240)**2));
            d.aura.material.opacity = visible*(.12+near*.85);
            d.photo.material.color.setScalar(.5+near*.5);
        });
        const reveal = reduced ? .9 : smooth((t-21)/3);
        const beat = reduced ? 0 : Math.max(0, Math.sin(t*5.8))**12*.10 + Math.max(0, Math.sin(t*5.8-.85))**18*.045;
        heart.material.opacity = reveal;
        heart.scale.setScalar(1+beat);
        heart.rotation.y = reduced ? 0 : Math.sin(t*.45)*.08;
        halo.material.opacity = reveal*(.33+beat*2);
        renderer.render(scene, camera);
        // The camera reaches the front shell (90 world units from the core).
        if ((!reduced && camera.position.z <= heart.position.z+90.01) || (reduced && t >= 7)) { finish(); return; }
        frame = requestAnimationFrame(render);
    }
    function releaseScene() {
        cancelAnimationFrame(frame);
        window.removeEventListener('resize', resize);
        resources.forEach(resource => resource.dispose()); resources.clear();
        scene?.clear(); renderer?.dispose(); renderer?.forceContextLoss();
        host.replaceChildren();
    }
    function dispose() {
        if (ended) return;
        ended = true; timers.forEach(clearTimeout); timers.clear(); releaseScene();
    }
    function finish() {
        if (collision || ended) return;
        collision = true;
        if (reduced) { window.enterUniverse?.(); return; }
        overlay.dataset.phase = 'flash';
        scene.fog.color.set(0xffffff); scene.fog.density = .15;
        renderer.setClearColor(0xffffff, 1); renderer.render(scene, camera);
        document.getElementById('intro-flash').classList.add('active');
        // Let the white cover reach full opacity before releasing the GPU.
        later(releaseScene, 140);
        later(() => { progressBar.style.width = '100%'; window.enterUniverse?.(); }, 620);
    }
    function resize() {
        if (!renderer || ended || collision) return;
        camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
    }
    function init() {
        if (started || ended || !window.THREE || !overlay.isConnected || overlay.classList.contains('is-hidden')) return;
        started = true;
        try {
            scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x03010a, .00085);
            camera = new THREE.PerspectiveCamera(62, innerWidth/innerHeight, .5, 7000);
            renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: false, powerPreference: 'high-performance' });
            renderer.setClearColor(0x03010a, 1);
            renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.25 : 1.75));
            renderer.setSize(innerWidth, innerHeight); renderer.outputEncoding = THREE.sRGBEncoding;
            host.appendChild(renderer.domElement);
            renderer.domElement.addEventListener('webglcontextlost', () => { if (!collision && !ended) window.enterUniverse?.(); });
            glow = glowTexture(); environment(); images.forEach(memory); makeHeart();
            window.addEventListener('resize', resize, { passive: true });
            overlay.classList.add('is-flying');
            overlay.dispatchEvent(new Event('intro:ready'));
            frame = requestAnimationFrame(render);
        } catch (error) {
            console.warn('Intro 3D không khả dụng:', error.message);
            window.enterUniverse?.();
        }
    }
    overlay.addEventListener('intro:close', dispose, { once: true });
    if (window.THREE) init();
    else document.getElementById('three-library')?.addEventListener('load', init, { once: true });
})();
