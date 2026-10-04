/* LINE sticker composer extension v7: favorites and enlarged hover previews. */
(() => {
  'use strict';
  window.__lineStickerComposer?.uninstall();
  let catalog=[],packs=[],libraryLoaded=false,libraryPromise=null;
  const favoritesKey='line-sticker-favorites-v1';
  const assetPath=/^\/line-stickers\/asset\/\d+\/\d+\/(animation|popup|static)\/\d+\.png$/;
  let favorites={packs:[],stickers:[]};
  try{const saved=JSON.parse(localStorage.getItem(favoritesKey)||'null');if(saved){
    favorites.packs=[...new Set((saved.packs||[]).filter(x=>/^\d+$/.test(x)))].slice(0,1000);
    favorites.stickers=(saved.stickers||[]).filter(x=>/^\d+$/.test(x.pack)&&/^\d+$/.test(x.stickerId)&&assetPath.test(x.src)&&assetPath.test(x.poster)).slice(0,1000);
  }}catch{}
  function favoriteId(item){return item.stickerId?item.pack+'-'+item.stickerId:item.pack;}
  function isFavorite(item){return item.stickerId?favorites.stickers.some(x=>favoriteId(x)===favoriteId(item)):favorites.packs.includes(item.pack);}
  function toggleFavorite(item){
    const next={packs:[...favorites.packs],stickers:[...favorites.stickers]};
    if(item.stickerId){if(isFavorite(item))next.stickers=next.stickers.filter(x=>favoriteId(x)!==favoriteId(item));else next.stickers.push({pack:item.pack,stickerId:item.stickerId,src:item.src,poster:item.poster,title:String(item.title||packs.find(x=>x.pack===item.pack)?.title||item.pack)});}
    else if(isFavorite(item))next.packs=next.packs.filter(x=>x!==item.pack);else next.packs.push(item.pack);
    if(next.packs.length>1000||next.stickers.length>1000)throw Error('最愛已滿，請先移除一些收藏');
    localStorage.setItem(favoritesKey,JSON.stringify(next));favorites=next;
    for(const state of mounted.values())state.updateFavorites();
  }
  const nameTried=new Set(),namePending=new Set();
  async function hydrateNames(rows){
    const missing=rows.filter(x=>x.titleKnown===false&&!nameTried.has(x.pack)&&!namePending.has(x.pack));
    for(const row of missing)namePending.add(row.pack);
    for(let offset=0;offset<missing.length;offset+=4){
      const batch=missing.slice(offset,offset+4);for(const row of batch)nameTried.add(row.pack);
      try{const result=await json('/line-stickers/names.json?packs='+batch.map(x=>x.pack).join(','));
        for(const row of packs){const title=result.titles?.[row.pack];if(typeof title==='string'&&title){row.title=title;row.titleKnown=true;}}
        for(const state of mounted.values())state.updateNames();
      }catch{}finally{for(const row of batch)namePending.delete(row.pack);}
      if(stopped)break;
    }
    for(const row of missing)namePending.delete(row.pack);
  }
  async function json(url){const r=await fetch(url);if(!r.ok)throw Error('無法讀取本機 LINE 貼圖');return r.json()}
  async function library(refresh=false){
    if(libraryLoaded&&!refresh)return;
    if(libraryPromise)return libraryPromise;
    libraryPromise=(async()=>{const data=await json('/line-stickers/index.json'+(refresh?'?refresh=1':''));packs=data.packs;libraryLoaded=true;})();
    try{await libraryPromise;}finally{libraryPromise=null;}
  }
  async function imageData(url){
    if(url.startsWith('data:'))return url;
    if(!/^\/line-stickers\/asset\/\d+\/\d+\/(animation|popup|static)\/\d+\.png$/.test(url))throw Error('貼圖路徑不正確');
    const response=await fetch(url);if(!response.ok)throw Error('貼圖已移除，請重新整理');
    const blob=await response.blob();if(blob.size>8*1024*1024)throw Error('貼圖檔案太大');
    return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(Error('無法讀取貼圖'));reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob)});
  }
  const owned=new Set(), mounted=new Map();
  let stopped=false,busy=false;
  const posterCache=new Map(),imageTokens=new WeakMap(),posterQueue=[];let posterActive=0;
  async function staticPoster(src){
    if(posterCache.has(src))return posterCache.get(src);
    const pending=(async()=>{
      if(posterActive>=4)await new Promise(resolve=>posterQueue.push(resolve));else posterActive++;
      let decoder,frame;
      try{
        if(stopped)throw Error('Closed');
        const response=await fetch(src);if(!response.ok)throw Error('Poster unavailable');
        const bytes=await response.arrayBuffer();if(bytes.byteLength>8*1024*1024)throw Error('Image too large');
        if(typeof ImageDecoder==='function'){decoder=new ImageDecoder({data:bytes,type:'image/png',preferAnimation:true});await decoder.tracks.ready;frame=(await decoder.decode({frameIndex:0})).image;}
        else frame=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
        const width=frame.displayWidth||frame.width,height=frame.displayHeight||frame.height;
        if(!width||!height||width*height>16000000)throw Error('Image dimensions unsupported');
        const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').drawImage(frame,0,0);
        const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('Poster unavailable')),'image/png'));
        if(stopped)throw Error('Closed');return URL.createObjectURL(blob);
      }finally{frame?.close?.();decoder?.close?.();const next=posterQueue.shift();if(next)next();else posterActive--;}
    })();
    posterCache.set(src,pending);
    if(posterCache.size>128){const first=posterCache.keys().next().value;posterCache.get(first).then(url=>URL.revokeObjectURL(url),()=>{});posterCache.delete(first);}
    pending.catch(()=>{if(posterCache.get(src)===pending)posterCache.delete(src)});
    return pending;
  }
  function setPickerImage(img,src,still=true){
    const token={};imageTokens.set(img,token);
    if(still&&/\/line-stickers\/asset\/\d+\/\d+\/(animation|popup)\//.test(src)){
      img.removeAttribute('src');
      void staticPoster(src).then(url=>{if(!stopped&&img.isConnected&&imageTokens.get(img)===token)img.src=url;},()=>{if(imageTokens.get(img)===token)img.alt='預覽暫時無法顯示';});
    }else img.src=src;
  }
  const diagnostics={version:7,loaded:true,scans:0,bodies:0,surfaces:0,buttons:0};
  document.documentElement.dataset.lineStickerExtension='v7';
  console.info('[line-native] loaded v7');
  const style=document.createElement('style');
  style.textContent=`
  .line-native-picker{position:fixed;z-index:10000;width:480px;box-sizing:border-box;color:var(--foreground,inherit);background:var(--background,Canvas);padding:10px;border:1px solid color-mix(in srgb,currentColor 24%,transparent);border-radius:12px;font:inherit}
  .line-native-picker[hidden]{display:none!important}
  .line-native-tools{display:flex;gap:6px;align-items:center}
  .line-native-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:4px;max-height:420px;overflow:auto;margin-top:8px;overscroll-behavior:contain}
  .line-native-grid button{background:transparent;border:0;border-radius:8px;padding:4px;min-height:76px}
  .line-native-grid img{width:68px;max-width:100%;height:68px;object-fit:contain;display:block;margin:auto}
  .line-native-grid .line-native-pack-name{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:14px;line-height:20px;height:40px;overflow-wrap:anywhere;margin-top:4px;text-align:center}
  .line-native-cell{position:relative;min-width:0;padding-top:20px}
  .line-native-cell>button:first-child{width:100%}
  .line-native-grid .line-native-favorite{position:absolute;top:0;right:0;min-height:28px;width:28px;height:28px;padding:0;font-size:20px;line-height:28px}
  .line-native-favorite[aria-pressed=true]{color:var(--foreground,inherit)}
  .line-native-tabs{display:flex;gap:8px;margin-top:6px}
  .line-native-tabs button{padding:6px 10px;border:0;border-radius:6px;background:transparent;min-height:32px}
  .line-native-tabs button[aria-pressed=true]{background:color-mix(in srgb,currentColor 9%,transparent);font-weight:600}
  .line-native-preview{position:fixed;z-index:10001;pointer-events:none;width:192px;height:192px;padding:8px;box-sizing:border-box;border:1px solid color-mix(in srgb,currentColor 24%,transparent);border-radius:12px;background:var(--background,Canvas);color:var(--foreground,inherit)}
  .line-native-preview[hidden]{display:none!important}
  .line-native-preview img{width:100%;height:100%;object-fit:contain}
  @media(hover:hover) and (prefers-reduced-motion:no-preference){.line-native-cell>button:first-child:hover img{transform:scale(1.08);transition:transform 150ms ease-out}}
  @media(pointer:coarse){.line-native-grid .line-native-favorite{width:40px;height:40px;min-height:40px}.line-native-cell{padding-top:36px}.line-native-tools button,.line-native-tabs button{min-height:40px;min-width:40px}}
  .line-native-toolbar-button{display:inline-grid;place-items:center;font:inherit;background:transparent;color:inherit;border:0;border-radius:8px;width:32px;height:32px;padding:5px;cursor:pointer}
  .line-native-toolbar-button svg{display:block;width:22px;height:22px;pointer-events:none}
  .line-native-toolbar-button:hover{background:color-mix(in srgb,currentColor 6%,transparent)}
  .line-native-grid button:disabled{opacity:.45;cursor:wait}
  .line-native-toolbar-button:focus-visible,.line-native-picker button:focus-visible,.line-native-picker input:focus-visible{outline:2px solid Highlight;outline-offset:2px}
  .line-native-picker input[type=search]{font:inherit;font-size:14px;min-width:0;flex:1;padding:5px;border:0;border-radius:6px;color:inherit;background:transparent}
  .line-native-picker button{font:inherit;font-size:14px;color:inherit;cursor:pointer}
  .line-native-tools button{background:transparent;border:0;padding:5px;white-space:nowrap}
  .line-native-status{font-size:14px;padding:6px 2px}
  .line-native-status[hidden]{display:none!important}
  `;
  document.head.append(style);owned.add(style);
  const isVisible=e=>e.getClientRects().length>0;
  function decode(data,name){
    const match=/^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(data);
    if(!match||match[2].length>11200000)throw Error('貼圖格式或大小不支援');
    return new File([Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0))],name,{type:match[1]});
  }
  function validItems(value){
    if(!Array.isArray(value)||!value.length||value.length>100)throw Error('貼圖包內容不正確');
    return value.map(x=>{
      if(!/^\d+$/.test(x.pack)||!/^\d+$/.test(x.stickerId))throw Error('缺少貼圖資料');
      decode(x.src,'test.png');decode(x.poster,'poster.png');
      return {pack:x.pack,stickerId:x.stickerId,src:x.src,poster:x.poster};
    });
  }
  function mount(scope){
    const previous=mounted.get(scope);
    if(previous?.button.isConnected&&previous?.panel.isConnected)return;
    if(previous)previous.dispose();
    const body=scope.querySelector('[data-composer-body]');
    const foot=scope.querySelector('[data-composer-footer-responsive]');
    const editor=body?.querySelector('[contenteditable="true"]');
    if(!body||!foot||!editor||!isVisible(editor))return;
    const button=document.createElement('button');button.type='button';button.className='line-native-toolbar-button';button.title='貼圖';button.setAttribute('aria-label','LINE 貼圖');button.setAttribute('aria-expanded','false');
    button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 21H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v7l-7 7Z"/><path d="M14 21v-4a3 3 0 0 1 3-3h4M8 12.5c1.4 1.6 4.6 1.6 6 0"/><circle cx="8.5" cy="8.5" r=".8" fill="currentColor" stroke="none"/><circle cx="14" cy="8.5" r=".8" fill="currentColor" stroke="none"/></svg>';
    const panel=document.createElement('section');panel.className='line-native-picker';panel.hidden=true;panel.setAttribute('aria-label','LINE 貼圖選擇器');
    const tools=document.createElement('div');tools.className='line-native-tools';
    const search=document.createElement('input');search.type='search';search.placeholder='搜尋';search.setAttribute('aria-label','搜尋貼圖');
    const back=document.createElement('button');back.type='button';back.textContent='‹';back.setAttribute('aria-label','返回貼圖包');back.hidden=true;
    const refresh=document.createElement('button');refresh.type='button';refresh.textContent='↻';refresh.setAttribute('aria-label','重新整理本機貼圖');
    const load=document.createElement('button');load.type='button';load.textContent='載入';load.setAttribute('aria-label','載入貼圖包');
    const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','收起貼圖');
    const input=document.createElement('input');input.type='file';input.accept='.json,.linepack';input.hidden=true;
    const grid=document.createElement('div');grid.className='line-native-grid';
    const status=document.createElement('div');status.className='line-native-status';status.hidden=true;status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const tabs=document.createElement('div');tabs.className='line-native-tabs';
    const all=document.createElement('button');all.type='button';all.textContent='貼圖包';
    const favoriteView=document.createElement('button');favoriteView.type='button';favoriteView.textContent='★ 最愛';favoriteView.setAttribute('aria-label','查看最愛');
    tabs.append(all,favoriteView);
    const preview=document.createElement('div');preview.className='line-native-preview';preview.hidden=true;preview.setAttribute('aria-hidden','true');
    const previewImage=document.createElement('img');previewImage.alt='';preview.append(previewImage);
    const hidePreview=()=>{preview.hidden=true;imageTokens.delete(previewImage);previewImage.removeAttribute('src')};
    function showPreview(tile,item,animate){
      if(panel.hidden)return;
      const r=tile.getBoundingClientRect(),p=panel.getBoundingClientRect(),size=Math.min(192,innerWidth-16,innerHeight-16);
      let left=p.right+8,top=r.top+(r.height-size)/2;
      if(left+size>innerWidth-8){left=p.left-size-8;if(left<8){left=r.left+(r.width-size)/2;top=r.top-size-8;if(top<8)top=r.bottom+8;}}
      preview.style.width=preview.style.height=size+'px';preview.style.left=Math.max(8,Math.min(left,innerWidth-size-8))+'px';preview.style.top=Math.max(8,Math.min(top,innerHeight-size-8))+'px';
      const play=animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
      setPickerImage(previewImage,play?item.src:item.poster,!play);preview.hidden=false;
    }
    tools.append(back,search,refresh,load,close,input);panel.append(tools,tabs,grid,status);
    let currentPack=null,items=[],limit=40,generation=0,onlyFavorites=false;
    document.body.append(panel,preview);foot.prepend(button);owned.add(button);owned.add(panel);owned.add(preview);
    const position=()=>{
      hidePreview();if(panel.hidden)return;
      const rect=button.getBoundingClientRect(),width=Math.min(480,innerWidth-16);
      panel.style.width=width+'px';panel.style.left=Math.max(8,Math.min(rect.left,innerWidth-width-8))+'px';
      const above=rect.top-12,below=innerHeight-rect.bottom-12;
      if(above>=230||above>=below){panel.style.bottom=Math.max(8,innerHeight-rect.top+6)+'px';panel.style.top='auto';grid.style.maxHeight=Math.max(76,Math.min(420,above-104))+'px';}
      else{panel.style.top=(rect.bottom+6)+'px';panel.style.bottom='auto';grid.style.maxHeight=Math.max(76,Math.min(420,below-104))+'px';}
    };
    const outside=e=>{if(!panel.hidden&&!panel.contains(e.target)&&!button.contains(e.target)){hidePreview();panel.hidden=true;button.setAttribute('aria-expanded','false')}};
    document.addEventListener('pointerdown',outside);window.addEventListener('resize',position);window.addEventListener('scroll',position,true);
    const dispose=()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',position);window.removeEventListener('scroll',position,true);button.remove();panel.remove();preview.remove();owned.delete(button);owned.delete(panel);owned.delete(preview);mounted.delete(scope)};
    const updateNames=()=>{if(search.value.trim()&&!currentPack){draw();return;}for(const tile of grid.querySelectorAll('[data-line-pack]')){const item=packs.find(x=>x.pack===tile.dataset.linePack);if(item){const label=tile.querySelector('.line-native-pack-name');if(label.textContent!==item.title)label.textContent=item.title;tile.title=item.title+' · '+item.count+' 張';tile.setAttribute('aria-label','開啟貼圖包 '+item.title);}}if(currentPack)search.placeholder=currentPack.title;};
    mounted.set(scope,{button,panel,dispose,updateNames,hidePreview,updateFavorites:()=>{if(onlyFavorites&&!currentPack)draw();else for(const star of grid.querySelectorAll('.line-native-favorite'))star.updateFavorite();}});
    const hide=()=>{hidePreview();panel.hidden=true;button.setAttribute('aria-expanded','false');button.focus()};
    button.onclick=async()=>{hidePreview();panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden){nameTried.clear();position();search.focus();if(!libraryLoaded){status.hidden=false;status.textContent='讀取本機貼圖…'}try{await library();draw()}catch(e){status.hidden=false;status.textContent=e.message}}};
    close.onclick=hide;panel.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();hide()}};
    function draw(){
      hidePreview();
      grid.replaceChildren();
      back.hidden=currentPack===null;
      all.setAttribute('aria-pressed',String(!onlyFavorites));favoriteView.setAttribute('aria-pressed',String(onlyFavorites));
      search.placeholder=currentPack?.title||(onlyFavorites?'搜尋最愛':'搜尋本機貼圖包');
      const query=search.value.trim().toLocaleLowerCase();
      const source=currentPack?items:onlyFavorites?[...packs.filter(isFavorite),...favorites.stickers]:packs;
      const matches=source.filter(x=>(x.pack+' '+(x.stickerId||'')+' '+(x.title||'')).toLocaleLowerCase().includes(query));
      status.hidden=matches.length>0;status.textContent=matches.length?'':(query?'找不到貼圖':onlyFavorites?'還沒有最愛，按貼圖包或貼圖旁的 ☆ 收藏':'這台電腦尚未存有可讀取的 LINE 貼圖');
      const appendTile=(tile,item)=>{
        const cell=document.createElement('div');cell.className='line-native-cell';cell.append(tile);
        if(!item.stickerId||(assetPath.test(item.src)&&assetPath.test(item.poster))){
          const star=document.createElement('button');star.type='button';star.className='line-native-favorite';
          star.updateFavorite=()=>{const yes=isFavorite(item);star.textContent=yes?'★':'☆';star.setAttribute('aria-pressed',String(yes));star.setAttribute('aria-label',(yes?'移除最愛 ':'加入最愛 ')+(item.title||item.stickerId||item.pack));};star.updateFavorite();
          star.onclick=()=>{try{toggleFavorite(item)}catch{status.hidden=false;status.textContent='無法儲存最愛，請確認本機儲存空間後再試';}};cell.append(star);
        }
        grid.append(cell);
      };
      for(const item of matches.slice(0,limit)){
        if(!item.stickerId){
          const tile=document.createElement('button');tile.type='button';tile.dataset.linePack=item.pack;tile.title=item.title+' · '+item.count+' 張';tile.setAttribute('aria-label','開啟貼圖包 '+item.title);
          const image=document.createElement('img');setPickerImage(image,item.cover);image.loading='lazy';image.alt='';
          const label=document.createElement('span');label.className='line-native-pack-name';label.textContent=item.title;
          tile.append(image,label);tile.onclick=async()=>{const token=++generation;status.hidden=false;status.textContent='讀取貼圖…';try{const value=await json('/line-stickers/pack/'+item.pack+'.json');if(token!==generation)return;currentPack=item;items=value.items;search.value='';limit=40;draw()}catch(e){if(token===generation){status.hidden=false;status.textContent=e.message}}};appendTile(tile,item);continue;
        }
        const tile=document.createElement('button');tile.type='button';tile.setAttribute('aria-label','送出貼圖 '+item.stickerId);
        const image=document.createElement('img');setPickerImage(image,item.poster);image.alt='';
        tile.append(image);
        tile.onpointerenter=e=>{if(e.pointerType==='touch')return;showPreview(tile,item,true)};
        tile.onfocus=()=>showPreview(tile,item,false);
        tile.onpointerleave=hidePreview;tile.onblur=hidePreview;
        tile.onclick=async()=>{
          if(busy)return;
          hidePreview();
          try{
            const target=scope.querySelector('[data-composer-body] [contenteditable="true"]');
            if(!target||!isVisible(target))throw Error('找不到這段對話的輸入框');
            if(typeof target.__lineStickerSubmit!=='function')throw Error('貼圖傳送尚未準備好，請稍候再試');
            const destination=target.__lineStickerDestination;
            if(!destination)throw Error('貼圖傳送尚未準備好，請稍候再試');
            busy=true;grid.querySelectorAll('button').forEach(x=>x.disabled=true);status.hidden=true;
            const src=await imageData(item.src);
            await window.__lineStickerDisplay?.remember({pack:item.pack,stickerId:item.stickerId,src});
            const current=target.__lineStickerDestination;
            if(!target.isConnected||!current||current.scope!==destination.scope||current.conversationId!==destination.conversationId)throw Error('對話已切換，請重新選擇貼圖');
            await target.__lineStickerSubmit({pack:item.pack,stickerId:item.stickerId,src,conversationId:destination.conversationId});
            panel.hidden=true;button.setAttribute('aria-expanded','false');
            if(window.__lineStickerComposer)window.__lineStickerComposer.lastSubmission={packId:item.pack,stickerId:item.stickerId,at:new Date().toISOString(),status:'native-submit-handler-resolved'};
          }catch(e){status.hidden=false;status.textContent=e.message;}
          finally{busy=false;grid.querySelectorAll('button').forEach(x=>x.disabled=false);}
        };
        appendTile(tile,item);
      }
      if(matches.length>limit){const more=document.createElement('button');more.type='button';more.textContent='更多';more.setAttribute('aria-label','顯示更多貼圖');more.onclick=()=>{limit+=40;draw()};grid.append(more);}
      if(!currentPack&&!panel.hidden)void hydrateNames(matches.slice(0,limit));
    }
    search.oninput=()=>{limit=40;draw()};load.onclick=()=>input.click();
    const switchView=value=>{generation++;onlyFavorites=value;currentPack=null;items=[];search.value='';limit=40;draw()};
    all.onclick=()=>switchView(false);favoriteView.onclick=()=>switchView(true);
    back.onclick=()=>{generation++;currentPack=null;items=[];search.value='';limit=40;draw()};
    refresh.onclick=async()=>{generation++;currentPack=null;items=[];nameTried.clear();search.value='';limit=40;status.hidden=false;status.textContent='重新整理…';try{await library(true);draw()}catch(e){status.hidden=false;status.textContent=e.message}};
    input.onchange=async()=>{
      const file=input.files?.[0];if(!file)return;
      try{if(file.size>15000000)throw Error('貼圖包太大，請分批載入');catalog=validItems(JSON.parse(await file.text()));generation++;currentPack={title:'匯入貼圖'};items=catalog;search.value='';limit=40;draw();}
      catch(e){status.hidden=false;status.textContent='載入失敗：'+e.message;}finally{input.value='';}
    };
    draw();
  }
  let lastDiagnostic='';
  function scan(){
    if(stopped)return;
    for(const [scope,state] of mounted){
      if(!scope.isConnected)state.dispose();
      else if(!isVisible(state.button)){state.hidePreview();state.panel.hidden=true;state.button.setAttribute('aria-expanded','false');}
    }
    const bodies=[...document.querySelectorAll('[data-composer-body]')];
    const surfaces=new Set(bodies.map(body=>body.closest('[data-composer-surface-variant]')||body.closest('[data-thread-find-composer="true"]')).filter(Boolean));
    surfaces.forEach(mount);
    Object.assign(diagnostics,{scans:diagnostics.scans+1,bodies:bodies.length,surfaces:surfaces.size,buttons:document.querySelectorAll('.line-native-toolbar-button').length});
    const state=JSON.stringify({bodies:diagnostics.bodies,surfaces:diagnostics.surfaces,buttons:diagnostics.buttons});
    if(state!==lastDiagnostic){lastDiagnostic=state;console.info('[line-native] '+state);}
  }
  let queued=false;
  const observer=new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;scan()})}});
  window.__lineStickerComposer={version:7,diagnostics,lastSubmission:null,uninstall(){stopped=true;observer.disconnect();for(const state of [...mounted.values()])state.dispose();owned.forEach(x=>x.remove());for(const promise of posterCache.values())promise.then(url=>URL.revokeObjectURL(url),()=>{});posterCache.clear();delete document.documentElement.dataset.lineStickerExtension;delete window.__lineStickerComposer;}};
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','style','class']});scan();
  return {installedButtons:document.querySelectorAll('.line-native-toolbar-button').length,temporary:true};
})();

/* Native sticker message presentation: source-scoped, reversible, hover replay. */
(()=>{
  'use strict';
  window.__lineStickerDisplay?.uninstall();
  const known=new Map(Object.entries({"e4d47970ef9e9870e5f012dc4872dad85f9eb3ef9649889ac0fe9cfa1909ebba": {"pack": "10001", "stickerId": "24189520"}, "e4b0aca970257cc8add76ebd637d15f6d1a520bb80226388a1dd85d85e0b62e4": {"pack": "10001", "stickerId": "24189521"}, "154f448ba5780f0faa6857023d63578a46721daa9207dc39d85334ebb4004ea9": {"pack": "10001", "stickerId": "24189522"}, "e689cb4c725f70602bd3163e01e228bb0786adabf68e717ab1eae9bc49c87fb7": {"pack": "10001", "stickerId": "24189523"}, "df525f412e83b9dfe8c39627c82c62e7bd8b844ecdec8be55fc85931948af018": {"pack": "10001", "stickerId": "24189524"}, "9817e1e3a11e30234da192620b218f8a840e67cb35af7aeff934e7d1e4884c9f": {"pack": "10001", "stickerId": "24189525"}, "78725d6ba4f1329c01479774f85905d38f8902ae23c44f6cf976fa4d5784c09c": {"pack": "10001", "stickerId": "24189526"}, "7de1fe4e96e3cce34fa89e207ad131a18e5630ef04e7989f2e3fbe30140e771c": {"pack": "10001", "stickerId": "24189527"}, "c2b0d9bbfda720b095ced68dae982fefcf45f4a6c5f930e38867874ce3b61cff": {"pack": "10001", "stickerId": "24189528"}, "ffee8b54fb998875eac121674688a584886446fcf50ff56b8ad48b0fdabc40c4": {"pack": "10001", "stickerId": "24189529"}, "980c1db5619f9bc24ca5d4debb07d61f4a3058782d1f37155c392adb4bc0274b": {"pack": "10001", "stickerId": "24189530"}, "bb927edd63a741edaf6f475d1ec352bfaf564b8ac21742a9581daf7c6b6de94a": {"pack": "10001", "stickerId": "24189531"}, "756798526ea9f6e128b8a98f7e07180e02fcf5dbabfa3ab55ab5f480df68cefc": {"pack": "10001", "stickerId": "24189532"}, "730d77dc9d0b98f9a16d40ab1b2174a51e9ccb6c0892735c4c26fcc933563da3": {"pack": "10001", "stickerId": "24189533"}, "c8d00873962f7dcd9c7d43176aafc1e69c5949a91f5dd2739f9d7c2011e97110": {"pack": "10001", "stickerId": "24189534"}, "965995a8de01cf3b1bbc93b5600bd37455df1ade16a0b7483650ae9facd1568f": {"pack": "10001", "stickerId": "24189535"}, "0f2c66e965b55b5777e3681279599c351749bdccf9afc5a8e6e5ff4d964b1855": {"pack": "10001", "stickerId": "24189536"}, "cddf48d1e3b79d3c45a73e7816dc0a394dc5cafe5dfe39d31932f7abefa34bf9": {"pack": "10001", "stickerId": "24189537"}, "182cc7aad5bed2768465a4e5fe0ff5e15ada8c7d440899e4d2a6f2d246bb085b": {"pack": "10001", "stickerId": "24189538"}, "afe26c15b70bc3f010e886db9debbf15aa4afa9d3309e202ff58cc4f1170e8a0": {"pack": "10001", "stickerId": "24189539"}, "166a9fbdfcc15ae261c50b99a8a23e8ce92068be8bb832d7e9a6b12304624352": {"pack": "10001", "stickerId": "24189540"}, "17649c241cd1894ab3bbe1c0eb43f75cb7c9cc0f831dcf1500de093a94fad98e": {"pack": "10001", "stickerId": "24189541"}, "934150368db35572bccc39baa014b7d80e2fe3994df086165456a3776fe6d2ba": {"pack": "10001", "stickerId": "24189542"}, "90cecd7c5b0345826b60bfbf84006e2fda6cd4b2e8813dd9a93ac26ac606811d": {"pack": "10001", "stickerId": "24189543"}})),states=new Map(),pending=new WeakSet();
  const key='stan.line-stickers.hashes.v1',id=/^\d{1,15}$/;
  const roots={"line": "C:/Users/stans/AppData/Local/LINE/Data/Sticker", "assets": "C:/Users/stans/Documents/Codex/2026-10-04/x20-integrate-line-line-line-integrate/outputs/sticker-assets"};
  try{for(const row of JSON.parse(localStorage.getItem(key)||'[]').slice(-2000))if(/^[a-f0-9]{64}$/.test(row.hash)&&id.test(row.pack)&&id.test(row.stickerId))known.set(row.hash,{pack:row.pack,stickerId:row.stickerId})}catch{}
  const style=document.createElement('style');
  // One shared 144px message size; picker thumbnails keep their independent layout.
  style.textContent=`
    .line-sticker-message-host{width:144px!important;height:144px!important;min-width:0!important;max-width:min(144px,100%)!important;max-height:144px!important;padding:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:transparent!important;overflow:visible!important;flex:none!important;aspect-ratio:1!important}
    .line-sticker-message-host:focus-visible{outline:2px solid Highlight!important;outline-offset:3px!important}
    .line-sticker-message-host::before,.line-sticker-message-host::after{background:transparent!important;border:0!important;box-shadow:none!important}
    img.line-sticker-message-image{display:block!important;width:144px!important;height:144px!important;max-width:100%!important;max-height:144px!important;object-fit:contain!important;object-position:center!important;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:transparent!important}
  `;
  document.head.append(style);
  let stopped=false,queued=false,active=0,checked=new WeakMap();
  const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
  function sourceIdentity(value){
    let normalized=value;try{normalized=decodeURIComponent(value)}catch{}
    normalized=normalized.replaceAll('\\','/');
    let match=/^(?:app:\/\/-)?\/line-stickers\/asset\/(\d+)\/\d+\/(?:animation|popup|static)\/(\d+)\.png(?:[?#].*)?$/.exec(normalized);
    if(match)return {pack:match[1],stickerId:match[2]};
    normalized=normalized.replace(/^app:\/\/fs\/@fs\//i,'').replace(/^file:\/\/\//i,'');
    if(!/^[a-z]:\//i.test(normalized))return null;
    const lower=normalized.toLowerCase(),line=roots.line.toLowerCase()+'/',assets=roots.assets.toLowerCase()+'/';
    if(lower.startsWith(line))match=/^(\d+)\/\d+\/(?:animation\/|popup\/)?(\d+)\.png(?:[?#].*)?$/.exec(normalized.slice(line.length));
    else if(lower.startsWith(assets))match=/^(\d+)-(\d+)-[a-f0-9]+\.png(?:[?#].*)?$/.exec(normalized.slice(assets.length));
    return match?{pack:match[1],stickerId:match[2]}:null;
  }
  async function bytesFrom(src){
    const embedded=/^data:image\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/=]+)$/i.exec(src);
    if(embedded){if(embedded[1].length>11200000)throw Error('Image too large');const binary=atob(embedded[1]);if(binary.length>8*1024*1024)throw Error('Image too large');return Uint8Array.from(binary,c=>c.charCodeAt(0)).buffer;}
    if(!/^(?:data:image\/|blob:|app:\/\/|\/)/.test(src))throw Error('Not a local image');
    const response=await fetch(src);if(!response.ok)throw Error('Image unavailable');
    const length=Number(response.headers.get('content-length'));if(length>8*1024*1024)throw Error('Image too large');
    const bytes=await response.arrayBuffer();if(bytes.byteLength>8*1024*1024)throw Error('Image too large');return bytes;
  }
  function animatedPNG(bytes){
    const data=new DataView(bytes);if(data.byteLength<24||data.getUint32(0)!==0x89504e47||data.getUint32(4)!==0x0d0a1a0a)return false;
    for(let offset=8;offset+12<=data.byteLength;){const size=data.getUint32(offset);if(offset+12+size>data.byteLength)return false;if(data.getUint32(offset+4)===0x6163544c)return true;offset+=12+size;}return false;
  }
  async function poster(bytes){
    let frame,decoder;
    try{
      if(typeof ImageDecoder==='function'){
        decoder=new ImageDecoder({data:bytes.slice(0),type:'image/png',preferAnimation:true});await decoder.tracks.ready;
        frame=(await decoder.decode({frameIndex:0})).image;
      }else frame=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
      const width=frame.displayWidth||frame.width,height=frame.displayHeight||frame.height;
      if(!width||!height||width*height>16000000)throw Error('Image dimensions unsupported');
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').drawImage(frame,0,0);
      return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Poster unavailable')),'image/png'));
    }finally{frame?.close?.();decoder?.close?.();}
  }
  async function prepare(img){
    if(stopped||active>=4||pending.has(img)||states.has(img)||img.closest('.line-native-picker,.line-native-preview,[data-composer-body]'))return;
    const original=img.getAttribute('src');if(!original)return;
    if(checked.get(img)===original)return;
    const source=img.getAttribute('data-line-original-source')||original;
    const direct=sourceIdentity(source);
    // Only instrumented message renderers are eligible for a content hash check.
    if(!direct&&!img.hasAttribute('data-line-message-image'))return;
    pending.add(img);checked.set(img,original);active++;
    try{
      const bytes=await bytesFrom(original),identity=direct||known.get(await hash(bytes));if(!identity)return;
      const isAnimated=animatedPNG(bytes),still=isAnimated?await poster(bytes):new Blob([bytes],{type:'image/png'});
      if(stopped||!img.isConnected||img.getAttribute('src')!==original)return;
      const host=img.closest('[data-line-message-host],button[data-message-image="original"]')||img.parentElement;
      if(!host||host.querySelectorAll('img').length!==1)return;
      const stillURL=URL.createObjectURL(still),blob=new Blob([bytes],{type:'image/png'}),originalSrcset=img.getAttribute('srcset');
      const state={original,source,host,stillURL,playURL:null,isAnimated,identity};
      const stop=()=>{if(state.playURL){URL.revokeObjectURL(state.playURL);state.playURL=null;}img.src=stillURL;img.dataset.linePlaying='false'};
      const play=()=>{if(!isAnimated||matchMedia('(prefers-reduced-motion: reduce)').matches)return;if(state.playURL)URL.revokeObjectURL(state.playURL);state.playURL=URL.createObjectURL(blob);img.src=state.playURL;img.dataset.linePlaying='true'};
      const enter=()=>play(),leave=()=>stop();
      host.classList.add('line-sticker-message-host');img.classList.add('line-sticker-message-image');img.removeAttribute('srcset');
      img.dataset.lineSticker=identity.pack+'-'+identity.stickerId;img.dataset.linePlaying='false';img.src=stillURL;
      host.addEventListener('pointerenter',enter);host.addEventListener('pointerleave',leave);
      state.dispose=()=>{host.removeEventListener('pointerenter',enter);host.removeEventListener('pointerleave',leave);host.classList.remove('line-sticker-message-host');img.classList.remove('line-sticker-message-image');delete img.dataset.lineSticker;delete img.dataset.linePlaying;if(img.getAttribute('src')===state.playURL||img.getAttribute('src')===stillURL){img.setAttribute('src',original);if(originalSrcset!==null)img.setAttribute('srcset',originalSrcset)}URL.revokeObjectURL(stillURL);if(state.playURL)URL.revokeObjectURL(state.playURL);states.delete(img)};
      state.stop=stop;states.set(img,state);
    }catch{/* Keep the original accessible image when a read or decode fails. */}finally{pending.delete(img);active--;if(!stopped)queueMicrotask(scan);}
  }
  function scan(){
    if(stopped)return;
    for(const [img,state]of states){const src=img.getAttribute('src');if(!img.isConnected){state.dispose();continue;}if(src===state.original){state.stop();continue;}if(src!==state.stillURL&&src!==state.playURL){checked.delete(img);state.dispose();}}
    for(const img of document.querySelectorAll('img[data-line-message-image],img[data-line-original-source]'))prepare(img);
  }
  const observer=new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;scan()})}});
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),motionChange=()=>{if(motion.matches)for(const state of states.values())state.stop()};motion.addEventListener('change',motionChange);
  window.__lineStickerDisplay={async remember(item){if(!id.test(item.pack)||!id.test(item.stickerId))return;try{const digest=await hash(await bytesFrom(item.src));known.set(digest,{pack:item.pack,stickerId:item.stickerId});localStorage.setItem(key,JSON.stringify([...known].slice(-2000).map(([hash,value])=>({hash,...value}))));checked=new WeakMap();scan()}catch{}},scan,uninstall(){stopped=true;observer.disconnect();motion.removeEventListener('change',motionChange);for(const state of [...states.values()])state.dispose();style.remove();delete window.__lineStickerDisplay;}};
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src','srcset','data-line-original-source']});scan();
})();
