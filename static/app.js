/* Compose the universe while retaining the independent cinematic intro. */
(() => {
    const U = window.Universe;
    const startDate = new Date(U.config.startDate || '2025-07-26T00:00:00+07:00');
    const introOverlay = document.getElementById('intro-overlay');
    let introClosed = false;
    let introTimeout = setTimeout(() => enterUniverse(), 30000);
    introOverlay?.addEventListener('intro:ready', () => {
        clearTimeout(introTimeout);
        introTimeout = setTimeout(() => enterUniverse(), 31000);
    }, { once: true });
    U.$('experience').inert = true;

    function timer() {
        const elapsed = Math.max(0, Date.now() - startDate.getTime());
        const days = Math.floor(elapsed / 86400000);
        const hours = Math.floor(elapsed / 3600000) % 24;
        const minutes = Math.floor(elapsed / 60000) % 60;
        const seconds = Math.floor(elapsed / 1000) % 60;
        U.$('timer').textContent = `${days} ngày · ${hours} giờ · ${minutes} phút · ${seconds} giây`;
        const focusTimer = U.$('heart-focus-timer');
        if (focusTimer) focusTimer.textContent = U.$('timer').textContent;
    }
    setInterval(timer, 1000);
    timer();
    const greeting = 'Chào mừng pé đến với vũ trụ tình iu của chúng ta...';
    let character = 0;
    function typeGreeting() {
        if (character < greeting.length) {
            U.$('typewriter').textContent += greeting[character++];
            setTimeout(typeGreeting, 65);
        }
    }
    setTimeout(typeGreeting, 900);

    function enterUniverse(event) {
        event?.stopPropagation();
        if (introClosed) return;
        introClosed = true;
        clearTimeout(introTimeout);
        U.$('experience').inert = false;
        if (introOverlay) introOverlay.inert = true;
        introOverlay?.classList.add('is-hidden');
        introOverlay?.dispatchEvent(new Event('intro:close'));
        document.body.classList.remove('intro-active');
        setTimeout(() => introOverlay?.remove(), 1100);
        U.setMode('EXPLORE');
        U.scene.start();
        U.$('experience').hidden = false;
        U.$('main-panel').classList.add('visible');
    }
    window.enterUniverse = enterUniverse;
    for (const id of ['intro-skip-btn', 'intro-enter-btn', 'intro-watch-btn']) {
        U.$(id)?.addEventListener('click', enterUniverse);
    }
    document.body.classList.add('intro-active');

    U.$('music-btn').addEventListener('click', () => U.audio.toggle());
    U.$('quality-btn').addEventListener('click', () => {
        U.light = !U.light;
        U.save('light', U.light);
        window.dispatchEvent(new Event('universe:quality'));
        U.$('quality-btn').setAttribute('aria-pressed', String(U.light));
    });
    U.$('draw-stars-btn').addEventListener('click', () => U.constellations.open());
    U.$('map-btn').addEventListener('click', () => {
        if (U.config.features.memoryPlanets) U.modal.open('map-overlay');
        else U.gallery.open();
    });
    U.$('wish-direct-btn').addEventListener('click', () => U.wishes.open());
    U.$('open-gallery-btn').addEventListener('click', () => U.gallery.open());
    U.$('mailbox-btn').addEventListener('click', () => U.modal.open('mailbox-overlay'));
    for (const [button, modal] of [
        ['map-close', 'map-overlay'], ['mailbox-close', 'mailbox-overlay'],
        ['gallery-close', 'gallery-overlay'], ['lightbox-close', 'lightbox'],
    ]) U.$(button).addEventListener('click', () => U.modal.close(modal));
    U.$('lightbox').addEventListener('click', event => {
        if (event.target.id === 'lightbox') U.modal.close('lightbox');
    });
    U.$('hide-panel').addEventListener('click', () => {
        U.$('main-panel').classList.remove('visible');
        U.$('show-panel').focus();
    });
    U.$('show-panel').addEventListener('click', () => {
        U.$('main-panel').classList.add('visible');
        U.$('hide-panel').focus();
    });
    let heartClosing = false;
    const heartPanel = U.$('heart-focus');
    const heartButton = U.$('heart-open');
    function openHeartFocus() {
        if (U.mode !== 'EXPLORE' || U.config.features.heartFocus === false) return;
        heartClosing = false;
        U.scene.heartActive = true;
        U.scene.hover(null);
        U.setMode('HEART_TRANSITION');
        heartPanel.hidden = false;
        heartPanel.classList.remove('is-closing');
        heartPanel.setAttribute('aria-modal', 'true');
        U.$('experience').classList.add('heart-focus-active');
        for (const child of U.$('experience').children) {
            if (child !== heartPanel && child.id !== 'canvas-container') child.inert = true;
        }
        U.$('heart-focus-close').focus({ preventScroll: true });
        U.scene.focusHeart(() => {
            if (!heartClosing && U.mode === 'HEART_TRANSITION') U.setMode('HEART_FOCUS');
        });
    }
    function closeHeartFocus() {
        if (heartClosing || !['HEART_TRANSITION', 'HEART_FOCUS'].includes(U.mode)) return;
        heartClosing = true;
        U.scene.heartActive = false;
        U.setMode('HEART_TRANSITION');
        heartPanel.classList.add('is-closing');
        U.scene.home(finishHeartClose);
    }
    function finishHeartClose() {
        heartPanel.hidden = true;
        heartPanel.removeAttribute('aria-modal');
        U.$('experience').classList.remove('heart-focus-active');
        for (const child of U.$('experience').children) child.inert = false;
        U.setMode('EXPLORE');
        heartClosing = false;
        heartButton.focus({ preventScroll: true });
    }
    U.recoverHeart = () => {
        if (heartClosing) finishHeartClose();
        else if (U.scene.heartActive) U.setMode('HEART_FOCUS');
    };

    heartButton.addEventListener('click', openHeartFocus);
    heartButton.hidden = U.config.features.heartFocus === false;
    U.$('heart-focus-title').textContent = U.config.couple || 'Quang Anh & Pé Nhi';
    U.$('heart-focus-close').addEventListener('click', closeHeartFocus);
    heartPanel.addEventListener('click', event => {
        if (event.target.matches('[data-heart-close]')) closeHeartFocus();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Tab' && ['HEART_TRANSITION', 'HEART_FOCUS'].includes(U.mode)) {
            event.preventDefault(); U.$('heart-focus-close').focus();
        }
    });
    U.openHeartFocus = openHeartFocus;
    U.closeHeartFocus = closeHeartFocus;
    document.body.addEventListener('click', event => {
        const background = event.target === document.body || ['canvas-container', 'experience'].includes(event.target.id);
        if (U.mode === 'EXPLORE' && background) U.$('main-panel').classList.add('visible');
    });
    U.constellations.init();
    U.planets.init();
    U.capsule.init();
    U.wishes.init();
    U.meteors.init();
    U.$('quality-btn').setAttribute('aria-pressed', String(U.light));
    document.querySelectorAll('.mail-item').forEach(element => {
        element.addEventListener('click', () => {
            element.classList.toggle('opened');
            element.setAttribute('aria-expanded', String(element.classList.contains('opened')));
        });
    });
    for (const [flag, id] of [
        ['constellations', 'draw-stars-btn'], ['timeCapsule', 'capsule-open'], ['shootingWishes', 'wish-direct-btn'],
    ]) U.$(id).hidden = !U.config.features[flag];
    U.$('planet-labels').hidden = !U.config.features.memoryPlanets;
    U.connect().catch(() => {});
    window.toggleUIPanel = show => U.$('main-panel').classList.toggle('visible', show);
})();
