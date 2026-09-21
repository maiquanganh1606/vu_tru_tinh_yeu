(() => {
    const U = window.Universe;
    let pending = null, pollTimer, generation = 0;
    // Retain an uncertain submission only in this tab's session storage; clear it on acknowledgment.
    try { const saved = JSON.parse(sessionStorage.getItem('love:pending-wish')); if (saved && typeof saved.key === 'string' && typeof saved.content === 'string') pending = saved; } catch {}
    const savePending = () => { try { if (pending) sessionStorage.setItem('love:pending-wish', JSON.stringify(pending)); else sessionStorage.removeItem('love:pending-wish'); } catch {} };
    const key = () => [...crypto.getRandomValues(new Uint8Array(18))].map(n=>n.toString(16).padStart(2,'0')).join('');
    function message(status) {
        return status === 'sent' ? 'Điều ước đã được gửi đến anh.' : status === 'failed'
            ? 'Điều ước đã được lưu. Việc gửi đang bị gián đoạn, anh sẽ kiểm tra lại.'
            : 'Điều ước đã được lưu, đang chờ gửi đến anh.';
    }
    async function poll(id, current, attempt = 0) {
        if (U.modal.top() !== 'wish-overlay' || current !== generation || attempt >= 12) return;
        try {
            const data = await U.request('/api/wishes/' + encodeURIComponent(id));
            if (current !== generation) return;
            U.$('wish-status').textContent = message(data.status);
            if (['sent','failed'].includes(data.status)) return;
        } catch { /* The server still retains the wish if polling loses connectivity. */ }
        pollTimer = setTimeout(() => poll(id,current,attempt+1), 5000);
    }
    U.wishes = {
        init() {
            if (pending) U.$('wish-text').value = pending.content;
            U.$('wish-close').onclick = () => U.modal.close('wish-overlay');
            U.$('wish-form').addEventListener('submit', async event => {
                event.preventDefault(); const button = U.$('wish-submit'), text = U.$('wish-text'), content = text.value.trim();
                if (!content || button.disabled) return;
                // Reuse the key after uncertain network errors, but never for a different wish.
                if (!pending || pending.content !== content) pending = { key: key(), content };
                savePending();
                button.disabled = true; text.readOnly = true;
                const current = ++generation; clearTimeout(pollTimer);
                try {
                    await U.connect();
                    const result = await U.request('/api/wishes', {content, idempotencyKey: pending.key});
                    text.value = ''; pending = null; savePending();
                    U.$('wish-status').textContent = message(result.status); U.announce(message(result.status));
                    poll(result.id,current);
                } catch (error) { U.$('wish-status').textContent = error.message; }
                finally { button.disabled = false; text.readOnly = false; }
            });
            window.addEventListener('universe:modalclose', event => { if (event.detail === 'wish-overlay') { clearTimeout(pollTimer); generation++; } });
        },
        open(caught = false) {
            U.$('wish-title').textContent = caught ? 'Pé đã bắt được sao băng!' : 'Gửi một điều ước';
            U.$('wish-intro').textContent = caught ? 'Hãy nhắm mắt ước một điều, anh sẽ biến nó thành hiện thực.' : 'Có điều gì pé muốn anh cùng thực hiện không?';
            U.modal.open('wish-overlay');
        }
    };
})();
