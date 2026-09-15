import{c as w,I as m,i as p,g as S,a as k,p as $,b as h,d as g,r as I,C as P,e as q}from"./download.Doue-Ef3.js";function E(e){if(!Number.isInteger(e.k)||e.k<1)throw new m(`La cantidad de subredes debe ser un entero ≥ 1 (recibido ${e.k}).`);const t=e.prefix!==void 0?e.prefix:S(e.ip);return{baseIpInt:k(h(e.ip),$(t)),prefix:t,k:e.k}}function L(e){const{baseIpInt:t,prefix:r,k:a}=E(e),c=w(a),o=r+c;if(o>32)throw new m(`No es posible obtener ${a} subredes: el nuevo prefijo /${o} excede /32.`);const d=2**(32-o),l=2**c,n=[];for(let u=0;u<l;u++){const x=t+u*d>>>0,b=x+d-1>>>0;n.push({index:u,network:p(x),broadcast:p(b),prefix:o,range:`${p(x)} – ${p(b)}`,firstIpInt:x,lastIpInt:b})}return{baseNetwork:p(t),originalPrefix:r,requestedSubnets:a,bitsBorrowed:c,newPrefix:o,blockSize:d,totalSubnets:l,subnets:n}}const T="38.120.32.110",y=200,i={form:"#cidr-form",ip:"#cidr-ip",k:"#cidr-k",prefix:"#cidr-prefix",example:"#cidr-example",results:"#cidr-results",downloadCsv:"#cidr-download-csv",downloadTxt:"#cidr-download-txt"};let s=null;function f(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function B(e){return`
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div class="border border-line p-3 rounded">
        <div class="text-xs uppercase text-muted">Prefijo original</div>
        <div class="text-lg font-mono"><span class="prefix">/${e.originalPrefix}</span></div>
      </div>
      <div class="border border-line p-3 rounded">
        <div class="text-xs uppercase text-muted">Bits prestados (b)</div>
        <div class="text-lg font-mono">${e.bitsBorrowed}</div>
      </div>
      <div class="border border-line p-3 rounded">
        <div class="text-xs uppercase text-muted">Prefijo nuevo</div>
        <div class="text-lg font-mono"><span class="prefix">/${e.newPrefix}</span></div>
      </div>
      <div class="border border-line p-3 rounded">
        <div class="text-xs uppercase text-muted">Tamaño de bloque</div>
        <div class="text-lg font-mono">${e.blockSize.toLocaleString()}</div>
      </div>
    </div>
    <div class="alert-info mb-4 text-sm">
      Subred base: <span class="font-mono">${f(e.baseNetwork)}</span>
      &nbsp;·&nbsp; Subredes generadas: <strong>${e.totalSubnets.toLocaleString()}</strong>
      &nbsp;(se pidieron ${e.requestedSubnets.toLocaleString()}).
    </div>
  `}function j(e){return`
    <div class="overflow-x-auto">
      <table class="minimal">
        <thead>
          <tr>
            <th>#</th>
            <th>Red</th>
            <th>Broadcast</th>
            <th>Prefijo</th>
            <th>Rango</th>
          </tr>
        </thead>
        <tbody>${e.map(r=>`
      <tr>
        <td class="font-mono">${r.index}</td>
        <td class="font-mono">${f(r.network)}</td>
        <td class="font-mono">${f(r.broadcast)}</td>
        <td><span class="prefix">/${r.prefix}</span></td>
        <td class="font-mono text-xs">${f(r.range)}</td>
      </tr>`).join("")}</tbody>
      </table>
    </div>
  `}function C(e){return`<div class="alert-error">${f(e)}</div>`}function M(e,t){const r=new FormData(e),a=String(r.get("ip")??"").trim(),c=String(r.get("k")??"").trim(),o=String(r.get("prefix")??"").trim(),d=Number(c),l=o===""?void 0:Number(o);try{const n=L({ip:a,k:d,prefix:l});s=n,t.innerHTML=B(n)+j(n.subnets),v(!0)}catch(n){s=null;const u=n instanceof m?n.message:"Error inesperado al calcular.";t.innerHTML=C(u),v(!1)}}function v(e){document.querySelectorAll(`${i.downloadCsv}, ${i.downloadTxt}`).forEach(t=>{t.disabled=!e})}function N(){if(!s)return;const e=["#","Red","Broadcast","Prefijo","Rango"],t=s.subnets.map(r=>[r.index,r.network,r.broadcast,`/${r.prefix}`,r.range]);g("subredes-cidr.csv",I(e,t),P)}function R(){if(!s)return;const e=[];e.push(`# Calculadora CIDR — ${s.baseNetwork}`),e.push(`# Prefijo original: /${s.originalPrefix} · Bits prestados: ${s.bitsBorrowed} · Prefijo nuevo: /${s.newPrefix} · Bloque: ${s.blockSize}`),e.push(""),e.push(["#","Red","Broadcast","Prefijo","Rango"].join("	"));for(const t of s.subnets)e.push([t.index,t.network,t.broadcast,`/${t.prefix}`,t.range].join("	"));g("subredes-cidr.txt",q(e))}function D(){const e=document.querySelector(i.form),t=document.querySelector(i.results),r=document.querySelector(i.example),a=document.querySelector(i.downloadCsv),c=document.querySelector(i.downloadTxt),o=document.querySelector(i.ip),d=document.querySelector(i.k),l=document.querySelector(i.prefix);!e||!t||(e.addEventListener("submit",n=>{n.preventDefault(),M(e,t)}),r?.addEventListener("click",()=>{o&&(o.value=T),d&&(d.value=String(y)),l&&(l.value="")}),a?.addEventListener("click",N),c?.addEventListener("click",R))}D();
