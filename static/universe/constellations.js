(() => {
    const U = window.Universe, ns = 'http://www.w3.org/2000/svg';
    const levels={easy:'Dễ',medium:'Trung bình',hard:'Khó','very-hard':'Rất khó'};
    let difficulty='easy', hints=0, hinted=null, reference=false;
    let pattern, previousMode, completed = new Set(), history = [], current = null, pointer = null, announced = false, pointerStart = null, dragged = false;
    const key = (a, b) => [a, b].sort((x, y) => x - y).join('-');
    const svg = () => U.$('constellation-lines');
    function store() { U.save('constellation:' + pattern.id + ':' + pattern.version, [...completed]); }
    function draw() {
        svg().replaceChildren();
        for (const [a, b] of pattern.edges) {
            const line = document.createElementNS(ns, 'line');
            line.setAttribute('x1', pattern.points[a][0] * 1000); line.setAttribute('y1', pattern.points[a][1] * 1000);
            line.setAttribute('x2', pattern.points[b][0] * 1000); line.setAttribute('y2', pattern.points[b][1] * 1000);
            line.setAttribute('class', completed.has(key(a, b)) ? 'joined' : 'guide');
            const visible=reference || difficulty==='easy' || difficulty==='medium' || hinted===key(a,b) || (difficulty==='hard' && (a===current || b===current));
            line.style.visibility=completed.has(key(a,b)) || visible ? 'visible':'hidden';svg().append(line);
        }
        const done = completed.size === pattern.edges.length;
        const next = pattern.edges.find(([a,b]) => !completed.has(key(a,b)) && (current === null || a === current || b === current));
        U.$('constellation-points').querySelectorAll('button').forEach((button, i) => {
            button.classList.toggle('selected', i === current); button.classList.toggle('suggested', Boolean((difficulty==='easy' && next?.includes(i)) || hinted?.split('-').map(Number).includes(i)));
            button.setAttribute('aria-pressed', String(i === current));
        });
        U.$('constellation-progress').textContent = `${levels[difficulty]} · ${completed.size} / ${pattern.edges.length} nét sao`;
        U.$('constellation-message').textContent = done ? pattern.message : 'Chọn một sao, rồi nối đến sao sáng bên cạnh. Nhấc tay để bắt đầu nét mới.';
        U.$('constellation-board').classList.toggle('complete', done);
        if (done && !announced) { U.announce(pattern.message); announced = true; }
        if (!done) announced = false;
        U.$('constellation-hint').textContent=`Gợi ý (${hints})`;U.$('constellation-hint').disabled=hints===0 || done;
        store();
    }
    function select(index) {
        if (current === index) return;
        if (current !== null) {
            const edge = key(current, index);
            if (!pattern.edges.some(([a,b]) => key(a,b) === edge)) {
                current = index; draw(); return;
            }
            if (!completed.has(edge)) { completed.add(edge); history.push(edge);hinted=null;U.gameSound.play();if(completed.size===pattern.edges.length)U.gameSound.play(true); }
        }
        current = index; draw();
    }
    function nearest(event) {
        const rect = U.$('constellation-board').getBoundingClientRect();
        let found = null, distance = 30;
        pattern.points.forEach(([x,y], i) => {
            const d = Math.hypot(event.clientX - rect.left - x * rect.width, event.clientY - rect.top - y * rect.height);
            if (d < distance) { distance = d; found = i; }
        });
        return found;
    }
    function choose(id) {
        pattern = U.config.constellations.find(x => x.id === id);
        if (!pattern) return;
        const valid = new Set(pattern.edges.map(([a,b]) => key(a,b)));
        const saved = U.read('constellation:' + pattern.id + ':' + pattern.version, []);
        completed = new Set((Array.isArray(saved) ? saved : []).filter(x => valid.has(x)));
        hints=difficulty==='easy'?99:difficulty==='medium'?3:1;hinted=null;reference=false;U.$('constellation-reference').setAttribute('aria-pressed','false');
        history = [...completed]; current = null; pointer = null; announced = false;
        const points = U.$('constellation-points'); points.replaceChildren();
        pattern.points.forEach(([x,y], i) => {
            const button = U.button('', event => { if (event.detail === 0) select(i); }, 'constellation-star');
            button.setAttribute('aria-label', 'Sao ' + (i+1)); button.style.left = `${x*100}%`; button.style.top = `${y*100}%`;
            button.dataset.point = i; points.append(button);
        });
        U.$('constellation-tabs').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.pattern === id)));
        draw();
    }
    function soundLabel(){U.$('constellation-sound').textContent=U.gameSound.enabled?'♪ Âm thanh: bật':'♪ Âm thanh: tắt';U.$('constellation-sound').setAttribute('aria-pressed',String(U.gameSound.enabled));}
    function setDifficulty(id){difficulty=id;const available=U.config.constellations.filter(p=>(p.difficulty||'easy')===id);U.$('constellation-tabs').querySelectorAll('button').forEach(b=>b.hidden=!available.some(p=>p.id===b.dataset.pattern));U.$('constellation-difficulties').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.difficulty===id)));choose(available[0].id);}
    U.constellations = {
        init() {
            for(const [id,label] of Object.entries(levels)){const b=U.button(label,()=>setDifficulty(id),'chip');b.dataset.difficulty=id;U.$('constellation-difficulties').append(b);}
            U.$('constellation-hint').onclick=()=>{if(!hints)return;const edge=pattern.edges.find(([a,b])=>!completed.has(key(a,b)));if(edge){hinted=key(...edge);hints--;U.announce(`Nối sao ${edge[0]+1} với sao ${edge[1]+1}`);draw();}};
            U.$('constellation-reference').onclick=()=>{reference=!reference;U.$('constellation-reference').setAttribute('aria-pressed',String(reference));draw();};
            U.$('constellation-sound').onclick=()=>{U.gameSound.toggle();soundLabel();};
            for (const p of U.config.constellations) {
                const button = U.button(p.title, () => choose(p.id), 'chip'); button.dataset.pattern = p.id;
                U.$('constellation-tabs').append(button);
            }
            const board = U.$('constellation-board');
            board.addEventListener('pointerdown', event => {
                if (pointer !== null || !event.isPrimary || event.button !== 0) return;
                pointer = event.pointerId; pointerStart = { x:event.clientX, y:event.clientY }; dragged = false; board.setPointerCapture(pointer);
                const i = nearest(event); if (i !== null) { select(i); U.$('constellation-points').children[i].focus({preventScroll:true}); } else current = null;
            });
            board.addEventListener('pointermove', event => {
                if (pointer !== event.pointerId && !(event.pointerType === 'mouse' && current !== null && pointer === null)) return;
                if (pointer === event.pointerId && pointerStart && Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>8) dragged = true;
                const i = nearest(event); if (i !== null) select(i);
            });
            const end = event => {
                if (pointer !== event.pointerId) return;
                pointer = null;
                // A tap can continue via another tap; a cancelled gesture always ends the stroke.
                if (dragged || event.type === 'pointercancel') { current = null; draw(); }
                pointerStart = null;
            };
            board.addEventListener('pointerup', end); board.addEventListener('pointercancel', end);
            U.$('constellation-undo').onclick = () => { const edge = history.pop(); if (edge) completed.delete(edge); current = null; draw(); };
            U.$('constellation-reset').onclick = () => { completed.clear(); history = []; current = null; draw(); };
            U.$('constellation-lift').onclick = () => { current = null; draw(); };
            U.$('constellation-close').onclick = () => U.constellations.close();
        },
        open() {
            if (U.mode !== 'EXPLORE') return;
            previousMode = U.mode; U.modal.open('constellation-panel'); U.setMode('CONSTELLATION_DRAW');
            setDifficulty(difficulty);soundLabel(); U.$('constellation-close').focus();
        },
        close() {
            pointer = null; current = null; U.modal.close('constellation-panel'); U.$('draw-stars-btn').focus();
        }
    };
})();
