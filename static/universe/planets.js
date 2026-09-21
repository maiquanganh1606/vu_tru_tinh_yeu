(() => {
    const U=window.Universe;
    const labels=new Map(); let photos=[], selected=null;
    U.planets={
        get selected(){return selected;},
        init(){
            window.addEventListener('universe:mode',()=>{
                for(const button of labels.values())button.hidden=U.mode!=='EXPLORE';
            });
            for(const planet of U.config.planets){
                const button=U.button('',()=>U.planets.select(planet.id),'planet-label');
                button.dataset.planet=planet.id;button.style.setProperty('--planet-color',planet.color);
                button.append(U.node('span','planet-marker'),U.node('span','planet-name',planet.title),U.node('span','planet-count',planet.memoryIds.length+' khung hình'));
                button.addEventListener('pointerenter',()=>U.scene.hover(planet.id));button.addEventListener('pointerleave',()=>U.scene.hover(null));
                button.addEventListener('focus',()=>U.scene.hover(planet.id));button.addEventListener('blur',()=>U.scene.hover(null));
                U.$('planet-labels').append(button);labels.set(planet.id,button);
                U.$('planet-menu').append(U.button(planet.title,()=>{U.modal.close('map-overlay');U.planets.select(planet.id);},'destination-btn'));
            }
            U.$('planet-back').onclick=()=>U.planets.leave();
            U.$('planet-gallery').onclick=()=>U.gallery.open(selected);
        },
        select(id){
            if(U.mode!=='EXPLORE')return;
            const data=U.config.planets.find(p=>p.id===id);if(!data)return;
            selected=id;U.scene.hover(null);
            if(!U.scene.available){U.gallery.open(id);return;}
            U.setMode('PLANET_TRANSITION');U.$('planet-detail').hidden=false;
            U.$('planet-title').textContent=data.title;U.$('planet-description').textContent=[U.formatDate(data.date),data.description].filter(Boolean).join(' · ');
            U.$('planet-gallery').textContent=`Xem ${data.memoryIds.length} khung hình`;
            U.$('planet-back').focus();
            U.scene.focus(id,()=>{
                if(selected!==id)return;
                U.setMode('PLANET_VIEW');
                const memories=data.memoryIds.slice(0,8).map(mid=>U.config.memories.find(m=>m.id===mid)).filter(Boolean);
                U.$('orbit-photos').replaceChildren();
                photos=memories.map((memory,index)=>{
                    const button=U.button('',()=>U.gallery.zoom(memory.id,data.memoryIds),'orbit-photo');button.style.setProperty('--tilt',`${index%2?5:-5}deg`);
                    button.setAttribute('aria-label','Mở ảnh '+(memory.caption||String(index+1)));button.append(U.makeImage(memory));
                    U.$('orbit-photos').append(button);return button;
                });
                U.announce(data.title+'. '+data.memoryIds.length+' khung hình.');
            });
        },
        leave(immediate=false){
            const id=selected;selected=null;photos=[];U.$('orbit-photos').replaceChildren();U.$('planet-detail').hidden=true;
            if(immediate){U.setMode('EXPLORE');return;}
            U.setMode('PLANET_TRANSITION');
            U.scene.home(()=>{U.setMode('EXPLORE');labels.get(id)?.focus({preventScroll:true});});
        },
        project(){
            for(const [id,button] of labels){
                const point=U.scene.project(id);if(!point)continue;
                button.hidden=U.mode!=='EXPLORE'||!point.visible;
                const half=button.offsetWidth/2;
                button.style.left=Math.max(half+8,Math.min(innerWidth-half-8,point.x))+'px';
                button.style.top=Math.max(155,Math.min(innerHeight-170,point.y+32))+'px';
            }
            if(!selected||!photos.length||innerWidth<650)return;
            photos.forEach((button,i)=>{
                const angle=i/photos.length*Math.PI*2-Math.PI/2;
                const point=U.scene.project(selected,new THREE.Vector3(Math.cos(angle)*86,Math.sin(angle)*64,6));
                button.style.left=point.x+'px';button.style.top=point.y+'px';
            });
        }
    };
    U.gallery={
        open(planetId){
            const planet=U.config.planets.find(p=>p.id===planetId), ids=planet?planet.memoryIds:U.config.memories.map(m=>m.id);
            U.$('gallery-title').textContent=planet?.title||'Tất cả kỷ niệm';
            const grid=U.$('gallery-grid');grid.replaceChildren();
            for(const id of ids){
                const memory=U.config.memories.find(m=>m.id===id);if(!memory)continue;
                const card=U.button('',()=>U.gallery.zoom(id,ids),'photo-card');card.setAttribute('aria-label','Mở ảnh '+(memory.caption||memory.file));card.append(U.makeImage(memory));
                if(memory.caption)card.append(U.node('span','photo-caption',memory.caption));
                if(U.formatDate(memory.date))card.append(U.node('span','photo-caption',U.formatDate(memory.date)));
                grid.append(card);
            }
            U.modal.open('gallery-overlay');
        },
        zoom(id,ids){
            const memory=U.config.memories.find(m=>m.id===id);if(!memory)return;
            const image=U.$('lightbox-img');image.src=U.asset('love_images/'+memory.file);image.alt=memory.alt;
            U.$('lightbox-caption').textContent=[memory.caption||'Một khoảnh khắc của chúng mình',U.formatDate(memory.date)].filter(Boolean).join(' · ');
            U.$('lightbox-counter').textContent=`${ids.indexOf(id)+1} / ${ids.length}`;
            U.$('lightbox-prev').onclick=()=>U.gallery.zoom(ids[(ids.indexOf(id)-1+ids.length)%ids.length],ids);
            U.$('lightbox-next').onclick=()=>U.gallery.zoom(ids[(ids.indexOf(id)+1)%ids.length],ids);
            U.modal.open('lightbox');
        }
    };
})();
