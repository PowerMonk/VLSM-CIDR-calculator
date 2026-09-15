import{I as g,f as y,v as A,a as k,p as I,b as R,i as p,n as N,c as P,V as S,d as q,C as T,r as B,e as M}from"./download.Doue-Ef3.js";const h="ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");function C(t){return t<h.length?h[t]:`${h[t%h.length]}-${Math.floor(t/h.length)}`}function V(t){if(!t.requirements||t.requirements.length===0)throw new g("Debe ingresar al menos un requerimiento de hosts.");const s=y(t.baseNetwork);if(s.prefix===null)throw new g('Para VLSM la IP base debe incluir el prefijo (ej. "172.18.16.0/16").');const e=A(s.prefix),m=k(R(s.ip),I(e)),b=p(m),o=2**(32-e),c=[...t.requirements.map((n,a)=>{if(!Number.isInteger(n.hosts)||n.hosts<1)throw new g(`Requerimiento #${a+1}: hosts debe ser un entero ≥ 1 (recibido ${n.hosts}).`);const f=N(n.hosts);return{label:n.label?.trim()||C(a),original:n.hosts,adjusted:f,prefix:32-P(f)}})].sort((n,a)=>a.adjusted-n.adjusted),r=c.reduce((n,a)=>n+a.adjusted,0);if(r>o)throw new S(`Espacio insuficiente: se requieren ${r.toLocaleString()} direcciones pero el bloque solo dispone de ${o.toLocaleString()}.`,o,r);let x=m;const L=c.map(n=>{const a=x,f=a+n.adjusted-1>>>0,j={label:n.label,original:n.original,adjusted:n.adjusted,prefix:n.prefix,network:p(a),broadcast:p(f),range:`${p(a)} – ${p(f)}`,firstIpInt:a,lastIpInt:f};return x=f+1>>>0,j});return{baseNetwork:b,basePrefix:e,availableAddresses:o,totalNeeded:r,requirements:c,assignments:L}}const D="172.18.16.0/16",H=[{label:"A",hosts:100},{label:"B",hosts:250},{label:"C",hosts:300},{label:"D",hosts:10},{label:"E",hosts:50}],l={form:"#vlsm-form",baseNetwork:"#vlsm-base",reqList:"#vlsm-requirements",addBtn:"#vlsm-add-row",example:"#vlsm-example",results:"#vlsm-results",downloadCsv:"#vlsm-download-csv",downloadTxt:"#vlsm-download-txt"};let i=null;function u(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function v(t="",s=""){const e=document.createElement("div");return e.className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center vlsm-row",e.dataset.row="",e.innerHTML=`
    <input
      type="text"
      name="label"
      value="${u(t)}"
      placeholder="Etiqueta"
      class="font-mono"
      maxlength="12"
    />
    <input
      type="number"
      name="hosts"
      value="${u(s)}"
      placeholder="Hosts requeridos"
      min="1"
      step="1"
      class="font-mono"
    />
    <button
      type="button"
      class="btn btn-danger vlsm-remove"
      aria-label="Eliminar requerimiento"
    >×</button>
  `,e}function w(t){t.querySelectorAll(".vlsm-remove").forEach(s=>{s.addEventListener("click",()=>{const e=s.closest("[data-row]");t.children.length>1&&e&&e.remove()})})}function $(t,s){if(s)return`<div class="alert-error mb-4">${u(s)}</div>`;if(!t)return"";const e=t.totalNeeded<=t.availableAddresses;return`
    <div class="${e?"alert-ok":"alert-error"} mb-4 text-sm">
      Espacio disponible:
      <strong>${t.availableAddresses.toLocaleString()}</strong>
      &nbsp;·&nbsp; Espacio requerido:
      <strong>${t.totalNeeded.toLocaleString()}</strong>
      &nbsp;·&nbsp; ${e?"✓ Cabe perfectamente.":"✗ No cabe."}
    </div>
  `}function _(t){return`
    <h3 class="text-base font-semibold mt-6 mb-2">Paso 2 — Ajuste a potencia de 2 (orden mayor → menor)</h3>
    <div class="overflow-x-auto mb-2">
      <table class="minimal">
        <thead>
          <tr>
            <th>Etiqueta</th>
            <th>Requerido</th>
            <th>Ajustado</th>
            <th>Prefijo</th>
          </tr>
        </thead>
        <tbody>${t.requirements.map(e=>`
      <tr>
        <td class="font-mono">${u(e.label)}</td>
        <td class="font-mono text-right">${e.original.toLocaleString()}</td>
        <td class="font-mono text-right">${e.adjusted.toLocaleString()}</td>
        <td><span class="prefix">/${e.prefix}</span></td>
      </tr>`).join("")}</tbody>
      </table>
    </div>
  `}function F(t){const s=t.assignments.map(e=>`
      <tr>
        <td class="font-mono">${u(e.label)}</td>
        <td class="font-mono text-right">${e.original.toLocaleString()}</td>
        <td class="font-mono text-right">${e.adjusted.toLocaleString()}</td>
        <td class="font-mono">${u(e.network)}</td>
        <td class="font-mono">${u(e.broadcast)}</td>
        <td><span class="prefix">/${e.prefix}</span></td>
        <td class="font-mono text-xs">${u(e.range)}</td>
      </tr>`).join("");return`
    <h3 class="text-base font-semibold mt-6 mb-2">Paso 4 — Asignación de subredes</h3>
    <div class="alert-info mb-2 text-sm">
      Subred base: <span class="font-mono">${u(t.baseNetwork)}</span>
      <span class="prefix">&nbsp;/${t.basePrefix}</span>
    </div>
    <div class="overflow-x-auto">
      <table class="minimal">
        <thead>
          <tr>
            <th>Etiqueta</th>
            <th>Requerido</th>
            <th>Ajustado</th>
            <th>Red</th>
            <th>Broadcast</th>
            <th>Prefijo</th>
            <th>Rango</th>
          </tr>
        </thead>
        <tbody>${s}</tbody>
      </table>
    </div>
  `}function O(t,s){const e=new FormData(t),m=String(e.get("baseNetwork")??"").trim(),b=[];t.querySelectorAll("[data-row]").forEach(o=>{const d=o.querySelector('input[name="label"]'),c=o.querySelector('input[name="hosts"]'),r=Number(c?.value??"");c?.value.trim()&&b.push({label:d?.value.trim()||void 0,hosts:r})});try{const o=V({baseNetwork:m,requirements:b});i=o,s.innerHTML=$(o,null)+_(o)+F(o),E(!0)}catch(o){i=null;let d;o instanceof S||o instanceof g?d=o.message:d="Error inesperado al calcular.",s.innerHTML=$(null,d),E(!1)}}function E(t){document.querySelectorAll(`${l.downloadCsv}, ${l.downloadTxt}`).forEach(s=>{s.disabled=!t})}function U(){if(!i)return;const t=["Etiqueta","Requerido","Ajustado","Red","Broadcast","Prefijo","Rango"],s=i.assignments.map(e=>[e.label,e.original,e.adjusted,e.network,e.broadcast,`/${e.prefix}`,e.range]);q("subredes-vlsm.csv",B(t,s),T)}function X(){if(!i)return;const t=[];t.push(`# Calculadora VLSM — ${i.baseNetwork} /${i.basePrefix}`),t.push(`# Disponible: ${i.availableAddresses} · Requerido: ${i.totalNeeded}`),t.push(""),t.push(["Etiqueta","Req.","Ajustado","Red","Broadcast","Prefijo","Rango"].join("	"));for(const s of i.assignments)t.push([s.label,s.original,s.adjusted,s.network,s.broadcast,`/${s.prefix}`,s.range].join("	"));q("subredes-vlsm.txt",M(t))}function Q(){const t=document.querySelector(l.form),s=document.querySelector(l.results),e=document.querySelector(l.reqList),m=document.querySelector(l.addBtn),b=document.querySelector(l.example),o=document.querySelector(l.downloadCsv),d=document.querySelector(l.downloadTxt),c=document.querySelector(l.baseNetwork);!t||!s||!e||(e.children.length===0&&e.appendChild(v()),w(e),t.addEventListener("submit",r=>{r.preventDefault(),O(t,s)}),m?.addEventListener("click",()=>{const r=v();e.appendChild(r),w(e)}),b?.addEventListener("click",()=>{c&&(c.value=D),e.innerHTML="";for(const r of H)e.appendChild(v(r.label,String(r.hosts)));w(e)}),o?.addEventListener("click",U),d?.addEventListener("click",X))}Q();
