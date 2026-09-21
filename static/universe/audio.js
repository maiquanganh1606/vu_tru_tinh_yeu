(() => {
    const U = window.Universe;
    const audio = document.getElementById('bg-music');
    let context, analyser, source, bins, baseline = .15, lastBeat = -1, busy = false;
    const signals = { bass: 0, mid: 0, treble: 0, energy: 0, beatPulse: 0, playing: false };
    function band(data, rate, fft, low, high) {
        const from = Math.max(1, Math.floor(low * fft / rate));
        const to = Math.min(data.length - 1, Math.ceil(high * fft / rate));
        let sum = 0;
        for (let i = from; i <= to; i++) sum += data[i] / 255;
        return sum / Math.max(1, to - from + 1);
    }
    function setup() {
        if (source || location.protocol === 'file:') return;
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        context = new Audio(); analyser = context.createAnalyser();
        analyser.fftSize = 2048; analyser.smoothingTimeConstant = .65;
        bins = new Uint8Array(analyser.frequencyBinCount);
        source = context.createMediaElementSource(audio); source.connect(analyser); analyser.connect(context.destination);
    }
    function label() {
        U.$('music-btn').textContent = audio.paused ? '♫ Bật nhạc' : 'Ⅱ Tạm dừng';
        U.$('music-btn').setAttribute('aria-pressed', String(!audio.paused));
    }
    audio.addEventListener('play', label); audio.addEventListener('pause', label);
    U.audio = {
        signals, band,
        async toggle() {
            if (busy) return;
            busy = true;
            try {
                if (!audio.paused) audio.pause();
                else {
                    try { setup(); } catch { /* HTML audio remains the fallback. */ }
                    // Both calls originate in the user gesture; Safari must not await resume before play.
                    await Promise.all([context?.resume(), audio.play()]);
                    U.save('music', true);
                }
                label();
            } catch { U.$('music-btn').textContent = '♫ Thử bật nhạc lại'; }
            finally { busy = false; }
        },
        update(dt, time) {
            const playing = !audio.paused && !audio.ended;
            signals.playing = playing;
            const target = { bass: 0, mid: 0, treble: 0, energy: 0 };
            if (playing && analyser && context.state === 'running' && U.config.features.audioReactive) {
                analyser.getByteFrequencyData(bins);
                target.bass = band(bins, context.sampleRate, analyser.fftSize, 40, 180);
                target.mid = band(bins, context.sampleRate, analyser.fftSize, 180, 2000);
                target.treble = band(bins, context.sampleRate, analyser.fftSize, 2000, 8000);
                target.energy = target.bass * .4 + target.mid * .4 + target.treble * .2;
                baseline += (target.bass - baseline) * (1 - Math.exp(-dt * 2));
                if (target.bass > Math.max(.16, baseline * 1.18) && time - lastBeat > .24) { signals.beatPulse = 1; lastBeat = time; }
            }
            for (const key of Object.keys(target)) signals[key] += (target[key] - signals[key]) * (1 - Math.exp(-dt * (target[key] > signals[key] ? 14 : 5)));
            signals.beatPulse *= Math.exp(-dt * 6);
            return signals;
        }
    };
})();
