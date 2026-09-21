(() => {
    const U = window.Universe;
    let status, syncTime = 0, timer, generation = 0, refreshing = false, nextRefresh = 0;
    function countdown() {
        if (!status?.configured) { U.$('capsule-countdown').textContent = ''; return; }
        const now = new Date(status.serverNow).getTime() + performance.now() - syncTime;
        const remaining = Math.max(0, Math.ceil((new Date(status.unlockAt).getTime() - now)/1000));
        const days = Math.floor(remaining/86400), hours = Math.floor(remaining/3600)%24, minutes = Math.floor(remaining/60)%60, seconds = remaining%60;
        U.$('capsule-countdown').textContent = remaining ? `${days} ngày · ${hours} giờ · ${minutes} phút · ${seconds} giây` : 'Đã đến ngày hẹn của mình';
        if (!remaining && status.state === 'waiting' && !refreshing && performance.now() >= nextRefresh && U.modal.top() === 'capsule-overlay') refresh(generation);
    }
    function render(data) {
        status = data; syncTime = performance.now();
        U.$('capsule-title').textContent = data.title || 'Một ngày mai';
        U.$('capsule-question').textContent = data.configured ? data.question : 'Một lá thư dành cho chúng mình trong tương lai.';
        U.$('capsule-state').textContent = !data.configured ? 'Anh đang chuẩn bị lá thư này. Pé ghé lại sau nhé.'
            : data.state === 'waiting' ? 'Đúng rồi, pé ơi. Bây giờ mình chờ đến ngày hẹn nhé.'
            : data.state === 'open' ? 'Đã đến lúc mở lá thư của chúng mình.' : 'Chỉ hai đứa mình biết câu trả lời.';
        U.$('capsule-unlock-date').hidden = !data.configured;
        U.$('capsule-unlock-date').textContent = data.configured ? 'Mở vào ' + new Date(data.unlockAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' · giờ Việt Nam' : '';
        U.$('capsule-form').hidden = !data.configured || data.state === 'waiting';
        U.$('capsule-answer-wrap').hidden = data.state === 'open';
        U.$('capsule-answer').required = data.state !== 'open';
        U.$('capsule-submit').textContent = data.state === 'open' ? 'Đọc lá thư' : 'Mở cánh cổng';
        countdown();
    }
    async function refresh(current) {
        refreshing = true; nextRefresh = performance.now() + 5000;
        try { const data = await U.request('/api/capsules/future'); if (current === generation) render(data); }
        catch (error) { if (current === generation) U.$('capsule-state').textContent = error.message; }
        finally { refreshing = false; }
    }
    U.capsule = {
        init() {
            U.$('capsule-open').onclick = () => U.capsule.open(); U.$('capsule-close').onclick = () => U.modal.close('capsule-overlay');
            U.$('capsule-form').addEventListener('submit', async event => {
                event.preventDefault(); const button = U.$('capsule-submit'); if (button.disabled) return;
                button.disabled = true; const current = generation;
                try {
                    await U.connect();
                    const data = status?.state === 'open' ? status : await U.request('/api/capsules/future/unlock', { answer: U.$('capsule-answer').value });
                    if (current !== generation) return;
                    render(data); U.$('capsule-answer').value = '';
                    if (data.state === 'open') {
                        const letter = await U.request('/api/capsules/future/letter');
                        if (current !== generation) return;
                        U.$('capsule-letter').textContent = letter.letter; U.$('capsule-letter-wrap').hidden = false; U.$('capsule-form').hidden = true;
                    }
                } catch (error) {
                    if (current !== generation) return;
                    U.$('capsule-state').textContent = error.message + (error.data?.retryAfter ? ` Thử lại sau ${Math.ceil(error.data.retryAfter/60)} phút.` : '');
                    if (status?.state === 'open') { status.state = 'sealed'; U.$('capsule-answer-wrap').hidden = false; U.$('capsule-answer').required = true; }
                } finally { button.disabled = false; }
            });
            window.addEventListener('universe:modalclose', event => { if (event.detail === 'capsule-overlay') { generation++; clearInterval(timer); U.$('capsule-letter').textContent = ''; U.$('capsule-answer').value = ''; } });
            document.addEventListener('visibilitychange', () => { if (!document.hidden && U.modal.top() === 'capsule-overlay') refresh(generation); });
        },
        async open() {
            const current = ++generation; status = null;
            U.modal.open('capsule-overlay'); U.$('capsule-letter-wrap').hidden = true; U.$('capsule-form').hidden = true; U.$('capsule-answer').value = ''; U.$('capsule-countdown').textContent = '';
            U.$('capsule-unlock-date').hidden = true;
            U.$('capsule-state').textContent = 'Đang tìm lá thư của chúng mình…';
            await refresh(current); clearInterval(timer); if(current === generation) timer = setInterval(countdown,1000);
        }
    };
})();
