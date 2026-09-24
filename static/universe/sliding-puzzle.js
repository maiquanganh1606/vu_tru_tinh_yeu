(() => {
    const U=window.Universe,E=window.PuzzleEngine,$=U.$,key='love:v2:sliding-puzzle:records:v1';
    const labels={3:'Dễ',4:'Trung bình',5:'Khó',6:'Rất khó'};
    let selected=null, memory=null,n=3,board=[],moves=0,elapsed=0,since=null,ticker=null,state='setup',generation=0,source='',ratio=1,preview=true,records={},resizeFrame=null;
    const time=()=>elapsed+(since===null?0:performance.now()-since);
    const format=ms=>`${String(Math.floor(ms/60000)).padStart(2,'0')}:${(ms/1000%60).toFixed(1).padStart(4,'0')}`;
    function soundButton(){ $('puzzle-sound').textContent=U.gameSound.enabled?'♪ Âm thanh: bật':'♪ Âm thanh: tắt';$('puzzle-sound').setAttribute('aria-pressed',String(U.gameSound.enabled)); }
    function stop(){if(since!==null)elapsed+=performance.now()-since;since=null;clearInterval(ticker);ticker=null;}
    function clock(){ $('puzzle-time').textContent=format(time()); }
    function readRecords(){
        try { const data=JSON.parse(localStorage.getItem(key));records={};
            if(data?.schema===1 && data.records && typeof data.records==='object')for(const [id,r] of Object.entries(data.records)){
                if(r && Number.isFinite(r.elapsedMs) && r.elapsedMs>=0 && Number.isInteger(r.moves) && r.moves>0)records[id]=r;
            }
        }catch{records={};}
    }
    function recordText(){
        const best=records[`${n}:${memory.id}`];
        const all=Object.entries(records).filter(([id])=>id.startsWith(`${n}:`)).map(([,r])=>r).sort((a,b)=>a.elapsedMs-b.elapsedMs||a.moves-b.moves);
        $('puzzle-record').textContent=`${best?`Ảnh này: ${format(best.elapsedMs)} · ${best.moves} nước`:'Ảnh này chưa có kỷ lục'}${all.length?` · Nhanh nhất mức ${labels[n]}: ${format(all[0].elapsedMs)}`:''}`;
    }
    function reference(){ $('puzzle-reference').hidden=!preview||state==='paused';$('puzzle-preview').textContent=preview?'Ẩn hình mẫu':'Hiện hình mẫu';$('puzzle-preview').setAttribute('aria-pressed',String(preview));scheduleResize(); }
    function resizeBoard(){
        const area=$('puzzle-board'),stage=area?.parentElement,layout=stage?.parentElement;
        if(!area||!stage||!layout||state==='setup'||state==='closed')return;
        const stageStyle=getComputedStyle(stage),maxWidth=parseFloat(stageStyle.maxWidth);
        const layoutStyle=getComputedStyle(layout),tracks=layoutStyle.gridTemplateColumns.split(/\s+/).map(parseFloat);
        const card=layout.closest('.puzzle-card'),cardStyle=getComputedStyle(card);
        const heading=card.querySelector('.puzzle-heading'),stats=card.querySelector('.puzzle-stats'),statsStyle=getComputedStyle(stats);
        // Use normal-flow heights so scrolling the sticky photos never changes their size.
        const heightLimit=card.clientHeight-parseFloat(cardStyle.paddingTop)-parseFloat(cardStyle.paddingBottom)
            -heading.getBoundingClientRect().height-stats.getBoundingClientRect().height
            -parseFloat(statsStyle.marginTop)-parseFloat(statsStyle.marginBottom)
            -parseFloat(layoutStyle.paddingTop)-parseFloat(layoutStyle.paddingBottom)-4;
        if(heightLimit<=0)return;
        const firstTrack=tracks[0];
        const availableWidth=Number.isFinite(firstTrack)?firstTrack:layout.clientWidth;
        const widthLimit=Math.min(availableWidth,Number.isFinite(maxWidth)?maxWidth:availableWidth);
        const width=Math.max(1,Math.min(widthLimit,heightLimit*ratio));
        stage.style.width=`${width}px`;stage.style.height=`${width/ratio}px`;stage.style.aspectRatio=String(ratio);
        area.style.width='100%';area.style.height='100%';area.style.aspectRatio=String(ratio);
        const sample=$('puzzle-reference'),caption=sample.querySelector('figcaption');
        const sampleHeight=Math.max(1,heightLimit-caption.getBoundingClientRect().height);
        sample.style.width=`${Math.min(tracks[1],sampleHeight*ratio)}px`;
    }
    function scheduleResize(){
        if(resizeFrame!==null)cancelAnimationFrame(resizeFrame);
        resizeFrame=requestAnimationFrame(()=>{resizeFrame=null;resizeBoard();});
    }
    function render(){
        const area=$('puzzle-board');area.replaceChildren();area.style.setProperty('--size',n);area.style.aspectRatio=String(ratio);
        board.forEach((value,index)=>{
            if(value===n*n-1){const empty=U.node('span','puzzle-empty');empty.setAttribute('aria-label','Ô trống');area.append(empty);return;}
            const tile=U.button('',()=>move(index),'puzzle-tile');tile.dataset.tile=value;tile.tabIndex=-1;
            tile.setAttribute('aria-label',`Mảnh ${value+1}, hàng ${Math.floor(index/n)+1}, cột ${index%n+1}`);
            tile.style.backgroundImage=`url(${JSON.stringify(source)})`;
            // Scale from the tile width and let the browser derive the height from the
            // source ratio. The board has no layout gaps, so every tile shares
            // one exact image coordinate system without stretching.
            tile.style.backgroundSize=`${n*100}% auto`;
            tile.style.backgroundPosition=`${value%n/(n-1)*100}% ${Math.floor(value/n)/(n-1)*100}%`;
            const number=U.node('span','tile-number',String(value+1));tile.append(number);area.append(tile);
        });
        $('puzzle-moves').textContent=`${moves} nước`;clock();resizeBoard();
    }
    function move(index){
        if(state!=='ready'&&state!=='playing')return;
        const next=E.move(board,index,n);if(!next)return;
        if(state==='ready'){state='playing';since=performance.now();ticker=setInterval(clock,100);}
        board=next;moves++;U.gameSound.play();render();$('puzzle-board').focus({preventScroll:true});
        if(E.complete(board)){
            stop();state='complete';clock();$('puzzle-pause').disabled=true;U.gameSound.play(true);
            const candidate={elapsedMs:Math.round(elapsed),moves,createdAt:new Date().toISOString(),memoryId:memory.id};
            // Merge records written by another tab before comparing this result.
            const sessionRecords=records;readRecords();records={...sessionRecords,...records};
            const id=`${n}:${memory.id}`,isBest=E.better(candidate,records[id]);if(isBest)records[id]=candidate;
            let saved=true;try{localStorage.setItem(key,JSON.stringify({schema:1,records}));}catch{saved=false;}
            $('puzzle-result').textContent=`Ghép xong rồi! ${format(elapsed)} · ${moves} nước.${isBest?' Kỷ lục mới cho ảnh này!':''}${saved?'':' Kỷ lục chỉ giữ trong phiên này vì trình duyệt không cho lưu.'}`;
            U.announce($('puzzle-result').textContent);recordText();
        }
    }
    function pause(){if(state!=='playing'&&state!=='ready')return;stop();state='paused';$('puzzle-curtain').hidden=false;$('puzzle-board').inert=true;$('puzzle-pause').disabled=true;reference();clock();$('puzzle-resume').focus();}
    function resume(){if(state!=='paused'||document.hidden)return;state=moves?'playing':'ready';if(moves){since=performance.now();ticker=setInterval(clock,100);} $('puzzle-curtain').hidden=true;$('puzzle-board').inert=false;$('puzzle-pause').disabled=false;reference();$('puzzle-board').focus();}
    function choose(id){selected=U.config.memories.find(m=>m.id===id);$('puzzle-images').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.memory===id)));$('puzzle-status').textContent=selected?'Đã chọn: '+(selected.caption||selected.file):'Kho ảnh đang trống.';$('puzzle-start').disabled=!selected;}
    async function load(url){const image=new Image();image.src=url;await image.decode();if(!image.naturalWidth)throw Error('image');return image;}
    async function start(){
        if(!selected)return;stop();state='loading';const token=++generation;
        $('puzzle-start').disabled=true;$('puzzle-status').textContent='Đang chuẩn bị ảnh…';
        $('puzzle-play').hidden=true;$('puzzle-setup').hidden=false;
        const chosen=selected,size=Number($('puzzle-level').value);
        try{
            let image;try{image=await load(U.asset(chosen.thumbnail));}catch{image=await load(U.asset('love_images/'+chosen.file));}
            if(token!==generation)return;
            memory=chosen;n=size;source=image.src;
            // Keep the source aspect ratio. Tiles may be rectangular; stretching the
            // memory would make faces and lettering look wrong.
            ratio=image.naturalWidth/image.naturalHeight;
            const maxSide=960;
            const w=ratio>=1?maxSide:Math.max(1,Math.round(maxSide*ratio));
            const h=ratio>=1?Math.max(1,Math.round(maxSide/ratio)):maxSide;
            const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
            try{canvas.getContext('2d').drawImage(image,0,0,w,h);source=canvas.toDataURL('image/jpeg',.9);}
            catch{/* file:// may forbid pixel export; keep the original source and ratio. */}
            board=E.shuffle(n,{3:80,4:160,5:280,6:450}[n]);moves=0;elapsed=0;state='ready';preview=n<=4;
            $('puzzle-reference-img').src=source;$('puzzle-reference-img').style.aspectRatio=String(ratio);
            $('puzzle-level-label').textContent=`${labels[n]} · ${n} × ${n}`;
            $('puzzle-setup').hidden=true;$('puzzle-play').hidden=false;$('puzzle-curtain').hidden=true;$('puzzle-board').inert=false;$('puzzle-pause').disabled=false;
            $('puzzle-result').textContent='';$('puzzle-status').textContent='Đồng hồ bắt đầu ở nước đi đầu tiên.';
            render();reference();recordText();$('puzzle-board').focus();
        }catch{if(token===generation){state='setup';$('puzzle-status').textContent='Ảnh chưa tải được. Pé chọn ảnh khác hoặc thử lại nhé.';}}
        finally{if(token===generation)$('puzzle-start').disabled=!selected;}
    }
    function setup(){++generation;stop();state='setup';$('puzzle-play').hidden=true;$('puzzle-setup').hidden=false;$('puzzle-start').disabled=!selected;$('puzzle-status').textContent='Chọn ảnh và độ khó để bắt đầu ván mới.';}
    U.puzzle={init(){
        $('puzzle-open').hidden=U.config.features.slidingPuzzle===false;
        $('puzzle-open').onclick=()=>{if(U.mode!=='EXPLORE')return;readRecords();setup();soundButton();U.modal.open('puzzle-panel');if(!$('puzzle-images').children.length){
            U.config.memories.forEach(m=>{const button=U.button('',()=>choose(m.id),'puzzle-photo');button.dataset.memory=m.id;button.setAttribute('aria-label','Chọn '+(m.caption||m.file));button.append(U.makeImage(m));$('puzzle-images').append(button);});
        }choose(selected?.id||U.config.memories[0]?.id);};
        $('puzzle-close').onclick=()=>U.modal.close('puzzle-panel');
        $('puzzle-random').onclick=()=>{const list=U.config.memories.filter(m=>m.id!==selected?.id);choose((list[Math.floor(Math.random()*list.length)]||selected)?.id);};
        $('puzzle-start').onclick=start;$('puzzle-restart').onclick=start;$('puzzle-change').onclick=setup;
        $('puzzle-preview').onclick=()=>{preview=!preview;reference();};$('puzzle-pause').onclick=pause;$('puzzle-resume').onclick=resume;
        $('puzzle-numbers').onclick=()=>{const hidden=$('puzzle-board').classList.toggle('hide-numbers');$('puzzle-numbers').textContent=hidden?'Hiện số':'Ẩn số';$('puzzle-numbers').setAttribute('aria-pressed',String(!hidden));};
        $('puzzle-sound').onclick=()=>{U.gameSound.toggle();soundButton();};
        $('puzzle-board').addEventListener('keydown',event=>{const directions={ArrowUp:-n,ArrowDown:n,ArrowLeft:-1,ArrowRight:1,w:-n,s:n,a:-1,d:1};if(event.key in directions){event.preventDefault();move(board.indexOf(n*n-1)+directions[event.key]);}});
        window.addEventListener('resize',scheduleResize,{passive:true});
        const resizeObserver=new ResizeObserver(scheduleResize),card=$('puzzle-board').closest('.puzzle-card');
        [card,card.querySelector('.puzzle-heading'),card.querySelector('.puzzle-layout')].forEach(el=>resizeObserver.observe(el));
        document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
        window.addEventListener('universe:modalclose',event=>{if(event.detail==='puzzle-panel'){++generation;stop();state='closed';board=[];$('puzzle-board').replaceChildren();$('puzzle-board').removeAttribute('style');$('puzzle-reference-img').removeAttribute('src');source='';}});
    }};
})();
