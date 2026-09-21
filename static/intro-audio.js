/* Original score follows the flight clock, including late user activation. */
(() => {
    const overlay = document.getElementById('intro-overlay');
    const button = document.getElementById('intro-sound-btn');
    const audio = document.getElementById('intro-music');
    if (!overlay || !button || !audio) return;
    let startedAt, closed = false, wantsSound = true, request = 0, fadeFrame;
    const volume = .55;
    const elapsed = () => Math.max(0, (performance.now() - startedAt) / 1000);
    function label(playing, retry = false) {
        button.textContent = playing ? 'Tắt nhạc intro ♫' : retry ? 'Thử lại nhạc intro ♫' : 'Bật nhạc intro ♫';
        button.setAttribute('aria-pressed', String(playing));
    }
    function sync() {
        if (Number.isFinite(audio.duration)) audio.currentTime = Math.min(elapsed(), Math.max(0, audio.duration - .01));
    }
    async function play() {
        const current = ++request;
        audio.volume = volume;
        try {
            sync();
            // Invoke play directly from the click for Safari's gesture policy.
            await audio.play();
            if (closed || !wantsSound || document.hidden) { audio.pause(); return; }
            if (current !== request) return;
            sync();
            label(true);
        } catch (error) {
            if (current !== request || closed) return;
            wantsSound = false;
            label(false, error.name !== 'NotAllowedError');
        }
    }
    function visibility() {
        if (closed) return;
        if (document.hidden) { ++request; audio.pause(); }
        else if (wantsSound && startedAt !== undefined) play();
    }
    button.addEventListener('click', event => {
        event.stopPropagation();
        if (closed || startedAt === undefined) return;
        wantsSound = !wantsSound;
        if (wantsSound) play();
        else { ++request; audio.pause(); label(false); }
    });
    overlay.addEventListener('intro:start', event => {
        startedAt = event.detail.startedAt;
        button.hidden = false;
        if (!document.hidden) play();
    }, { once: true });
    overlay.addEventListener('intro:close', () => {
        closed = true; wantsSound = false; ++request;
        document.removeEventListener('visibilitychange', visibility);
        const start = performance.now(), initialVolume = audio.volume;
        const duration = overlay.dataset.phase === 'flash' ? 580 : 180;
        const fade = now => {
            const amount = Math.min((now - start) / duration, 1);
            audio.volume = initialVolume * (1 - amount);
            if (amount < 1 && !audio.paused) fadeFrame = requestAnimationFrame(fade);
            else {
                cancelAnimationFrame(fadeFrame);
                audio.pause(); audio.removeAttribute('src'); audio.load();
            }
        };
        fadeFrame = requestAnimationFrame(fade);
    }, { once: true });
    document.addEventListener('visibilitychange', visibility);
})();
