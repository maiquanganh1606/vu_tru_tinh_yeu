// --- 1. CONFIG & UTILS ---
const startDate = new Date(2025, 6, 26); // Tháng 7 là 6

// --- 0. CINEMATIC INTRO ---
const introOverlay = document.getElementById('intro-overlay');
const introMemory = document.getElementById('intro-memory');
const introMemoryImg = document.getElementById('intro-memory-img');
const images = window.LOVE_IMAGES || [];
const imageURL = name => new URL('../static/love_images/' + encodeURIComponent(name), document.baseURI).href;
const introImages = images.slice(0, 10);
const galleryGrid = document.querySelector('.gallery-grid');
for (const name of images) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'photo-card';
    card.setAttribute('aria-label', 'Mở ảnh ' + name);
    const image = document.createElement('img');
    image.src = imageURL(name);
    image.alt = 'Kỷ niệm của chúng ta';
    image.loading = 'lazy';
    card.appendChild(image);
    card.addEventListener('click', event => {
        event.stopPropagation();
        zoomImage(image.src);
    });
    galleryGrid.appendChild(card);
}
if (!images.length) galleryGrid.textContent = 'Chưa có ảnh kỷ niệm.';
const introCaptions = [
    'Một tín hiệu nhỏ giữa hàng triệu vì sao...',
    'Rồi mình tìm thấy nhau trong cùng một quỹ đạo.',
    'Những ngày bình thường bỗng hóa thành kỷ niệm.',
    'Mỗi nụ cười là một ngôi sao mới.',
    'Và hành trình của chúng ta vẫn đang tiếp tục.'
];
const introTimers = new Set();
function scheduleIntro(callback, delay) {
    const timer = setTimeout(() => {
        introTimers.delete(timer);
        if (!introClosed) callback();
    }, delay);
    introTimers.add(timer);
}
let introClosed = false;

function startIntro() {
    if (!introOverlay) return;
    document.body.classList.add('intro-active');
    // The 3D timeline owns the cinematic progression. This delayed fallback
    // prevents a blocked Three.js CDN from trapping the visitor on the intro.
    scheduleIntro(() => enterUniverse(), 30000);
    introOverlay.addEventListener('intro:ready', () => {
        introTimers.forEach(clearTimeout);
        introTimers.clear();
        scheduleIntro(() => enterUniverse(), 31000);
    }, { once: true });
}

function showIntroMemory(index) {
    if (!introMemory || !introImages.length) return;
    const imageName = introImages[index % introImages.length];
    introMemory.classList.remove('show');
    introMemory.classList.add('fade');
    scheduleIntro(() => {
        introMemoryImg.src = imageURL(imageName);
        introMemory.style.setProperty('--tilt', `${(index % 2 ? 5 : -5)}deg`);
        introMemory.classList.remove('fade');
        introMemory.classList.add('show');
        document.getElementById('intro-subtitle').textContent = introCaptions[index] || introCaptions[4];
        document.getElementById('intro-kicker').textContent = index < 2 ? 'Tín hiệu ký ức đã tìm thấy' : 'Đang bay qua những ngày thương nhớ';
    }, 220);
}

function enterUniverse(event) {
    if (event) event.stopPropagation();
    if (introClosed) return;
    introClosed = true;
    introTimers.forEach(clearTimeout);
    introTimers.clear();
    introOverlay.classList.add('is-hidden');
    introOverlay.inert = true;
    introOverlay.dispatchEvent(new Event('intro:close'));
    document.body.classList.remove('intro-active');
    setTimeout(() => introOverlay.remove(), 1100);
    startScene();
    toggleUIPanel(true);
}

function skipIntro(event) {
    if (event) event.stopPropagation();
    enterUniverse();
}

// These controls initialize independently of the optional 3D library.
document.getElementById('intro-skip-btn')?.addEventListener('click', skipIntro);
document.getElementById('intro-enter-btn')?.addEventListener('click', enterUniverse);
document.getElementById('intro-watch-btn')?.addEventListener('click', skipIntro);

startIntro();

function toggleUIPanel(show) {
    const panel = document.getElementById('main-panel');
    if (show) panel.classList.add('visible');
    else panel.classList.remove('visible');
}

function updateTimer() {
    const now = new Date();
    const diff = now - startDate;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    const el = document.getElementById('timer');
    if(el) el.innerText = `${days} Days : ${hours} Hours : ${minutes} Mins : ${seconds} Secs`;
}
setInterval(updateTimer, 1000); updateTimer();

const message = "Hello my love! Chào mừng pé đến với vũ trụ tình iu của chúng ta...";
const typeTarget = document.getElementById('typewriter');
let i = 0;
function typeWriter() {
    if (typeTarget && i < message.length) {
        typeTarget.innerHTML += message.charAt(i); i++; setTimeout(typeWriter, 100);
    } else if (typeTarget) {
        typeTarget.innerHTML += '<span class="cursor">_</span>';
    }
}
setTimeout(typeWriter, 1000);

// --- 2. AUDIO VISUALIZER SETUP ---
let audioContext, analyser, dataArray, source;
let isAudioSetup = false;
let beatStrength = 0; // Biến dùng để truyền độ mạnh của nhạc vào 3D

function setupAudio() {
    if (isAudioSetup) return;
    const audio = document.getElementById('bg-music');

    // Tạo AudioContext
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    source = audioContext.createMediaElementSource(audio);

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    isAudioSetup = true;
}

async function toggleMusic() {
    const audio = document.getElementById('bg-music');
    const btn = document.getElementById('music-btn');

    try {
        // file:// media can play normally, but Web Audio may silence it
        // because local files do not have a shared CORS origin.
        if (location.protocol !== 'file:' && !isAudioSetup) setupAudio();
        if (audioContext && audioContext.state === 'suspended') await audioContext.resume();
        if (audio.paused) {
            await audio.play();
            btn.innerHTML = '<i class="fas fa-pause"></i> PAUSE';
        } else {
            audio.pause();
            btn.innerHTML = '<i class="fas fa-play"></i> PLAY MUSIC';
        }
    } catch (error) {
        btn.textContent = 'Thử bật nhạc lại';
        console.warn('Không thể phát nhạc:', error.message);
    }
}

// --- 3. OVERLAYS & GALLERY ---
function openGallery() {
    const over = document.getElementById('gallery-overlay');
    over.style.display = 'flex'; setTimeout(() => over.style.opacity = '1', 10);
}
function openMailbox() {
    const over = document.getElementById('mailbox-overlay');
    over.style.display = 'flex'; setTimeout(() => over.style.opacity = '1', 10);
}
function closeOverlay(id) {
    const over = document.getElementById(id);
    over.style.opacity = '0'; setTimeout(() => over.style.display = 'none', 500);
}
function toggleMail(el) {
    el.classList.toggle('opened');
}
function zoomImage(src) {
    const lb = document.getElementById('lightbox');
    document.getElementById('lightbox-img').src = src;
    lb.style.display = 'flex'; setTimeout(() => { lb.style.opacity = '1'; lb.classList.add('active'); }, 10);
}
function closeLightbox() {
    const lb = document.getElementById('lightbox');
    lb.style.opacity = '0'; lb.classList.remove('active'); setTimeout(() => lb.style.display = 'none', 300);
}

// --- 4. MOUSE TRAIL EFFECT ---
document.addEventListener('mousemove', function(e) {
    // Chỉ tạo hạt nếu không hover lên UI để đỡ rối
    if (e.target.closest('.glass-panel') || e.target.closest('.action-bar')) return;

    const heart = document.createElement('div');
    heart.className = 'heart-trail';
    heart.style.left = e.pageX + 'px';
    heart.style.top = e.pageY + 'px';
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 1000);
});

// --- 5. SHOOTING STARS ---
function createShootingStars() {
    setInterval(() => {
        const star = document.createElement('div');
        star.className = 'shooting-star';
        star.style.left = Math.random() * window.innerWidth + 'px';
        star.style.top = Math.random() * (window.innerHeight / 2) + 'px';
        star.style.transform = `rotate(${Math.random() * 45 - 22.5}deg)`;
        document.body.appendChild(star);
        setTimeout(() => star.remove(), 3000);
    }, 2500);
}
createShootingStars();

// --- 6. THREE.JS 3D HEART ---
let scene, camera, renderer, heartCloud, stars, auraCloud;
let mouseX = 0, mouseY = 0; let windowHalfX = window.innerWidth/2; let windowHalfY = window.innerHeight/2;

let mainSceneStarted = false;
function startScene() {
    if (!window.THREE || !introClosed || mainSceneStarted) return;
    mainSceneStarted = true;
    try {
        initThree();
        animate();
    } catch (error) {
        console.warn('Hiệu ứng 3D không khả dụng:', error.message);
    }
}
if (window.THREE) startScene();
else document.getElementById('three-library').addEventListener('load', startScene, { once: true });

function initThree() {
    const container = document.getElementById('canvas-container');
    if(!container) return;
    scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x1a0520, 0.002);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 1, 2000);
    camera.position.z = 400;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75)); renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    createVolumetricHeart();
    createStarfield();
    createAura();

    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX - windowHalfX) * 0.05; mouseY = (e.clientY - windowHalfY) * 0.05;
    }, false);
    window.addEventListener('resize', () => {
        windowHalfX = window.innerWidth/2; windowHalfY = window.innerHeight/2;
        camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }, false);
}

function createVolumetricHeart() {
    const particles = 25000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particles * 3);
    const colors = new Float32Array(particles * 3);
    const color = new THREE.Color();

    for (let i = 0; i < particles; i++) {
        const u = Math.random() * Math.PI * 2;
        const v = Math.random() * Math.PI;
        const x = 16 * Math.pow(Math.sin(u), 3) * Math.sin(v);
        const y = (13 * Math.cos(u) - 5 * Math.cos(2*u) - 2 * Math.cos(3*u) - Math.cos(4*u)) * Math.sin(v);
        const z = 6 * Math.cos(v);
        const scale = 11;
        positions[i*3] = x * scale + (Math.random()-0.5)*0.6;
        positions[i*3+1] = y * scale + (Math.random()-0.5)*0.6;
        positions[i*3+2] = z * scale + (Math.random()-0.5)*0.6;

        const normalizedZ = (z * scale + 100) / 200;
        if (Math.random() > 0.1) color.setHSL(0.88 + normalizedZ * 0.05, 0.9, 0.6 + normalizedZ * 0.2);
        else color.setHSL(0.9, 1.0, 0.95);
        colors[i*3] = color.r; colors[i*3+1] = color.g; colors[i*3+2] = color.b;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    heartCloud = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 2.5, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.9, sizeAttenuation: true }));
    scene.add(heartCloud);
}

function createAura() {
    const particles = 1500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particles * 3);
    const colors = new Float32Array(particles * 3);
    const color = new THREE.Color();
    for (let i = 0; i < particles; i++) {
        const r = 250 + Math.random() * 200;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        positions[i*3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i*3+2] = r * Math.cos(phi);
        color.setHSL(0.9, 0.8, 0.8);
        colors[i*3] = color.r; colors[i*3+1] = color.g; colors[i*3+2] = color.b;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    auraCloud = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 1.5, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.5 }));
    scene.add(auraCloud);
}

function createStarfield() {
    const geometry = new THREE.BufferGeometry(); const positions = new Float32Array(4000 * 3);
    for(let i=0; i<4000; i++) {
        positions[i*3] = (Math.random()-0.5)*2000; positions[i*3+1] = (Math.random()-0.5)*2000; positions[i*3+2] = (Math.random()-0.5)*2000 - 500;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    stars = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 1.2, color: 0xffd1dc, transparent: true, opacity: 0.6 }));
    scene.add(stars);
}

function animate() {
    requestAnimationFrame(animate);

    // --- AUDIO VISUALIZER LOGIC ---
    let scaleBeat = 1;
    if (isAudioSetup && analyser) {
        analyser.getByteFrequencyData(dataArray);
        // Lấy trung bình dải Bass (tần số thấp) để làm nhịp đập
        let sum = 0;
        for(let i = 0; i < 10; i++) sum += dataArray[i];
        let avg = sum / 10;
        // Scale từ 1.0 đến khoảng 1.3 tùy độ mạnh nhạc
        scaleBeat = 1 + (avg / 256) * 0.3;
    } else {
        // Nhịp đập mặc định khi chưa bật nhạc
        scaleBeat = 1 + Math.sin(Date.now()*0.001 * 2.5)*0.05;
    }

    if(heartCloud) {
        camera.position.x += (mouseX - camera.position.x) * 0.05;
        camera.position.y += (-mouseY - camera.position.y) * 0.05;
        camera.lookAt(scene.position);

        heartCloud.rotation.y += 0.005;
        // Áp dụng scaleBeat từ nhạc hoặc mặc định
        heartCloud.scale.set(scaleBeat, scaleBeat, scaleBeat);
    }

    if(auraCloud) {
        auraCloud.rotation.y -= 0.002;
        auraCloud.rotation.z += 0.001;
        // Aura cũng đập nhẹ theo nhạc nhưng trễ hơn xíu
        auraCloud.scale.set(scaleBeat * 1.1, scaleBeat * 1.1, scaleBeat * 1.1);
    }
    if(stars) stars.rotation.z += 0.0005;

    renderer.render(scene, camera);
}
