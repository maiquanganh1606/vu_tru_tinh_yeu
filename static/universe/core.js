/* Shared state, accessible overlays and same-origin API. No framework/build needed. */
(() => {
    const U = window.Universe = { config: window.LOVE_UNIVERSE, mode: 'INTRO', reduced: matchMedia('(prefers-reduced-motion: reduce)').matches };
    U.$ = id => document.getElementById(id);
    U.formatDate = value => {
        if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
        const date = new Date(value + 'T12:00:00+07:00');
        return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    };
    U.asset = path => new URL('../static/' + path.split('/').map(encodeURIComponent).join('/'), document.baseURI).href;
    U.read = (key, fallback) => { try { return JSON.parse(localStorage.getItem('love:v2:' + key)) ?? fallback; } catch { return fallback; } };
    U.save = (key, value) => { try { localStorage.setItem('love:v2:' + key, JSON.stringify(value)); } catch { /* Private mode still works. */ } };
    U.light = U.read('light', false);
    U.setMode = mode => {
        const previous = U.mode;
        U.mode = mode; document.body.dataset.mode = mode;
        window.dispatchEvent(new CustomEvent('universe:mode', { detail: { mode, previous } }));
    };
    U.announce = text => { U.$('live-status').textContent = text; };
    U.node = (tag, className, text) => { const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el; };
    U.button = (label, callback, className = '') => { const el = U.node('button', className, label); el.type = 'button'; el.addEventListener('click', event => { event.stopPropagation(); callback(event); }); return el; };
    const stack = [];
    U.modal = {
        open(id) {
            if (stack.some(entry => entry.id === id)) return;
            const el = U.$(id);
            stack.push({ id, focus: document.activeElement, mode: U.mode });
            U.setMode('MODAL');
            U.$('experience').inert = true;
            for (const entry of stack) U.$(entry.id).inert = entry.id !== id;
            el.hidden = false; el.style.display = 'flex'; el.style.opacity = '1'; el.setAttribute('aria-modal', 'true');
            requestAnimationFrame(() => (el.querySelector('[autofocus],input,textarea,button') || el).focus());
        },
        close(id) {
            if (!stack.length || stack.at(-1).id !== id) return;
            const entry = stack.pop(), el = U.$(id);
            el.hidden = true; el.style.display = 'none'; el.style.opacity = '0'; el.removeAttribute('aria-modal'); el.inert = false;
            const current = stack.at(-1);
            U.$('experience').inert = Boolean(current);
            if (current) U.$(current.id).inert = false;
            U.setMode(entry.mode);
            entry.focus?.focus({ preventScroll: true });
            window.dispatchEvent(new CustomEvent('universe:modalclose', { detail: id }));
        },
        recoverScene() { for (const entry of stack) if (['PLANET_VIEW','PLANET_TRANSITION'].includes(entry.mode)) entry.mode = 'EXPLORE'; },
        top: () => stack.at(-1)?.id
    };
    document.addEventListener('keydown', event => {
        const id = U.modal.top();
        if (event.key === 'Escape') {
            if (id) { event.preventDefault(); U.modal.close(id); }
            else if (['HEART_FOCUS', 'HEART_TRANSITION'].includes(U.mode)) { event.preventDefault(); U.closeHeartFocus?.(); }
            else if (U.mode === 'CONSTELLATION_DRAW') U.constellations.close();
            else if (['PLANET_VIEW','PLANET_TRANSITION'].includes(U.mode)) U.planets.leave();
        }
        if (event.key !== 'Tab' || !id) return;
        const focusable = [...U.$(id).querySelectorAll('button,input,textarea,select,[tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
        if (!focusable.length) { event.preventDefault(); return; }
        const first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && (document.activeElement === first || !U.$(id).contains(document.activeElement))) { last.focus(); event.preventDefault(); }
        else if (!event.shiftKey && (document.activeElement === last || !U.$(id).contains(document.activeElement))) { first.focus(); event.preventDefault(); }
    });
    U.request = async (path, body) => {
        if (location.protocol === 'file:') throw new Error('Pé mở đường dẫn website để dùng tính năng này nhé.');
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
        try {
            const response = await fetch(path, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', signal: controller.signal,
                headers: { 'Content-Type': 'application/json', ...(body === undefined ? {} : { 'X-CSRF-Token': U.csrf || '' }) },
                ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
            const data = await response.json();
            if (!response.ok) { const error = new Error(data.error || 'Chưa kết nối được, pé thử lại nhé.'); error.status = response.status; error.data = data; throw error; }
            return data;
        } catch (error) {
            if (error.name === 'AbortError' || error instanceof TypeError) throw new Error('Kết nối đang chậm. Nội dung vẫn ở đây, pé thử lại nhé.');
            throw error;
        } finally { clearTimeout(timer); }
    };
    let handshake;
    U.connect = () => {
        if (!handshake) handshake = U.request('/api/universe').then(data => { U.csrf = data.csrfToken; return data; }).catch(error => { handshake = null; throw error; });
        return handshake;
    };
    U.makeImage = (memory, full = false) => {
        const img = U.node('img'); img.alt = memory.alt; img.loading = 'lazy'; img.decoding = 'async';
        img.src = U.asset(full ? 'love_images/' + memory.file : memory.thumbnail);
        img.addEventListener('error', () => { img.classList.add('image-error'); img.alt = 'Ảnh đang nghỉ một chút. Pé thử lại sau nhé.'; }, { once: true });
        return img;
    };
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    motion.addEventListener('change', event => { U.reduced = event.matches; window.dispatchEvent(new Event('universe:quality')); });
})();
