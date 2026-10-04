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
