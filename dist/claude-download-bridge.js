/* Hosting bridge only: inside a claude.ai Artifact viewer, page-initiated downloads are inert,
   so <a download> saves are routed through the viewer's downloads capability.
   On any other host window.claude is absent and the browser's own download runs unchanged.
   It never touches routing, regression, screening or optimisation code. */
(()=>{
  let downloads=null;const blobs=new Map();
  const create=URL.createObjectURL.bind(URL);
  URL.createObjectURL=obj=>{const url=create(obj);if(obj instanceof Blob)blobs.set(url,obj);return url;};
  if(window.claude&&typeof window.claude.use==='function')window.claude.use('downloads').then(d=>{downloads=d;}).catch(()=>{downloads=null;});
  const nameOf=a=>a.getAttribute('download')||decodeURIComponent((a.getAttribute('href')||'download').split('/').pop());
  async function save(a){
    const href=a.getAttribute('href')||'';let data=blobs.get(a.href)||blobs.get(href);
    try{
      if(!data){let r=await fetch(href).catch(()=>null);if((!r||!r.ok)&&/\.zip$/i.test(href)){/* .zip cannot be published to an Artifact; it ships as base64 text beside the page. */const t=await fetch(href+'.b64.txt').then(x=>x.ok?x.text():null).catch(()=>null);if(t){const bin=atob(t.trim());const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);data=new Blob([u]);}}else if(r&&r.ok)data=await r.blob();if(!data)throw {code:'not_found'};}
      await downloads.save({filename:nameOf(a),data});
    }catch(err){
      const code=err&&err.code;if(code==='declined')return;
      const box=document.getElementById('status');
      if(box){box.className='status warn';box.textContent=(document.documentElement.lang==='zh-Hant'?'下載未完成：':'Download not completed: ')+(code==='not_found'?(document.documentElement.lang==='zh-Hant'?'此檔案未隨本頁發布。':'this file is not published with this page.'):(code||'unavailable'));}
    }
  }
  const nativeClick=HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click=function(){if(downloads&&this.hasAttribute('download')){save(this);return;}return nativeClick.call(this);};
  document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[download]');if(!a||!downloads)return;e.preventDefault();save(a);},true);
})();
