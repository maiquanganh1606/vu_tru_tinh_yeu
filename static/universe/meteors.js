(() => {
    const U = window.Universe;
    let active, remaining = 12, caughtTimer;
    function remove() { active?.element.remove(); active = null; }
    function spawn() {
        const element = U.button('', catchMeteor, 'catchable-meteor');
        element.setAttribute('aria-label', 'Bắt sao băng');
        const startX = innerWidth * .12, endX = innerWidth * .8, startY = innerHeight * .3, endY = innerHeight * .48;
        active = { element, elapsed: 0, duration: innerWidth < 650 ? 4 : 3.2, startX, endX, startY, endY };
        U.$('meteor-layer').append(element);
    }
    function catchMeteor() {
        if (!active || U.mode !== 'EXPLORE') return;
        remove(); remaining = 30 + Math.random() * 15;
        U.scene.freeze(1000); U.setMode('WISH_CAUGHT'); U.$('experience').inert = true;
        const message = U.node('div', 'caught-message', 'Pé đã bắt được sao băng!'); document.body.append(message); U.announce(message.textContent);
        caughtTimer = setTimeout(() => {
            message.remove(); U.$('experience').inert = false; U.setMode('EXPLORE'); U.wishes.open(true);
        }, U.reduced ? 100 : 1000);
    }
    U.meteors = {
        init() {},
        update(dt) {
            if (U.mode !== 'EXPLORE' || document.hidden || U.reduced || !U.config.features.shootingWishes) { if (active) { remove(); remaining = 25 + Math.random() * 20; } return; }
            if (!active) { remaining -= dt; if (remaining <= 0) spawn(); return; }
            active.elapsed += dt;
            const t = Math.min(1, active.elapsed / active.duration);
            active.element.style.transform = `translate(${active.startX + (active.endX-active.startX)*t - 28}px,${active.startY+(active.endY-active.startY)*t - 28}px)`;
            if (t >= 1) { remove(); remaining = 25 + Math.random() * 20; }
        },
        stop() { remove(); clearTimeout(caughtTimer); }
    };
})();
