// ---------- Procedural Gaussian-splat world generator ----------
function buildWorld(Q,opt={}){
const HQ=opt.room!==undefined,SP=(HQ?0.021:0.046)*Q;
const pos=[],cov=[],col=[],flg=[];
let seed=1234567;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
const fr=x=>x-Math.floor(x);
const h3=(x,y,z)=>fr(Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453);
const vn=(x,y)=>{const i=Math.floor(x),j=Math.floor(y),f=x-i,g=y-j,u=f*f*(3-2*f),v=g*g*(3-2*g);const a=h3(i,j,0),b=h3(i+1,j,0),c=h3(i,j+1,0),d=h3(i+1,j+1,0);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v};
const fbm=(x,y)=>vn(x,y)*.5+vn(x*2.1+5,y*2.1)*.3+vn(x*4.3,y*4.3+9)*.2;
const hex=h=>[parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255];
const C=c=>typeof c==='string'?hex(c):c;
const mix=(a,b,t)=>{a=C(a);b=C(b);return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]};
const mul=(a,k)=>{a=C(a);return[a[0]*k,a[1]*k,a[2]*k]};
const jit=(c,j)=>{c=C(c);const k=1+(rnd()-.5)*j;return[c[0]*k,c[1]*k,c[2]*k]};
const CF=(c,j=.035)=>typeof c==='function'?c:()=>jit(c,j);
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],sc=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const len=a=>Math.hypot(a[0],a[1],a[2]),nrm=a=>{const l=len(a)||1;return[a[0]/l,a[1]/l,a[2]/l]};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const ss=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)};
const PI2=Math.PI*2;
const I3=[[1,0,0],[0,1,0],[0,0,1]];
const AY=a=>{const c=Math.cos(a),s=Math.sin(a);return[[c,0,-s],[0,1,0],[s,0,c]]};
const AX=a=>{const c=Math.cos(a),s=Math.sin(a);return[[1,0,0],[0,c,s],[0,-s,c]]};
const AZ=a=>{const c=Math.cos(a),s=Math.sin(a);return[[c,s,0],[-s,c,0],[0,0,1]]};
const AM=(A,B)=>B.map(b=>add(add(sc(A[0],b[0]),sc(A[1],b[1])),sc(A[2],b[2])));
const loc=(c,A,l)=>add(c,add(add(sc(A[0],l[0]),sc(A[1],l[1])),sc(A[2],l[2])));
const tm=v=>{v=v<.8?v:.8+.2*(1-Math.exp(-(v-.8)/.2));return Math.max(0,Math.min(255,Math.round(v*255)))};
const cl=v=>Math.max(0,Math.min(255,Math.round(v*255)));

let ROOM=null,FW=0;const CTX=[],OCC=[];
function occluded(p,n,l){const o=n?[p[0]+n[0]*.006,p[1]+n[1]*.006,p[2]+n[2]*.006]:p,s=l.s;
  const d=[l.p[0]+(rnd()-.5)*s-o[0],l.p[1]+(rnd()-.5)*s-o[1],l.p[2]+(rnd()-.5)*s-o[2]],iv=[1/d[0],1/d[1],1/d[2]];
  for(const b of OCC){let t0=.002,t1=.97;for(let k=0;k<3;k++){let a=(b[k]-o[k])*iv[k],c=(b[k+3]-o[k])*iv[k];if(a>c){const q=a;a=c;c=q}if(a>t0)t0=a;if(c<t1)t1=c;if(t0>t1)break}if(t0<=t1)return true}return false}
function shade(c,p,n){
  const R=ROOM;let L0=R.amb[0],L1=R.amb[1],L2=R.amb[2];
  if(R.sky){const k=n?n[1]*.5+.5:.5;L0+=R.ground[0]*(1-k)+R.sky[0]*k;L1+=R.ground[1]*(1-k)+R.sky[1]*k;L2+=R.ground[2]*(1-k)+R.sky[2]*k}
  for(const l of R.lights){const dx=l.p[0]-p[0],dy=l.p[1]-p[1],dz=l.p[2]-p[2],dd=dx*dx+dy*dy+dz*dz,dl=Math.sqrt(dd)||1;
    const nd=n?(R.sky?Math.max(0,(n[0]*dx+n[1]*dy+n[2]*dz)/dl)*.95+.05:Math.max(0,(n[0]*dx+n[1]*dy+n[2]*dz)/dl)*.85+.15):.7;
    let f=l.i*nd/(1+dd/(l.r*l.r));if(l.s&&f>.004&&OCC.length&&occluded(p,n,l))f*=.1;L0+=l.c[0]*f;L1+=l.c[1]*f;L2+=l.c[2]*f}
  let ao=1;const b=R.box;
  if(b){const ex=Math.max(0,Math.min(p[0]-b[0],b[3]-p[0])),ey=Math.max(0,Math.min(p[1]-b[1],b[4]-p[1])),ez=Math.max(0,p[2]-b[2]);
    ao=Math.max(.5,1-.2*(Math.exp(-ex/.16)+Math.exp(-ey/.16)+Math.exp(-ez/.2)))}
  return[c[0]*L0*ao,c[1]*L1*ao,c[2]*L2*ao]}
function emit(p,c,a,ax,f){
  pos.push(p[0],p[1],p[2]);let xx=0,xy=0,xz=0,yy=0,yz=0,zz=0;
  for(let k=0;k<3;k++){const v=ax[k][0],s=ax[k][1]*ax[k][1];xx+=s*v[0]*v[0];xy+=s*v[0]*v[1];xz+=s*v[0]*v[2];yy+=s*v[1]*v[1];yz+=s*v[1]*v[2];zz+=s*v[2]*v[2]}
  cov.push(xx,xy,xz,yy,yz,zz);col.push(tm(c[0]),tm(c[1]),tm(c[2]),cl(a));flg.push((f||0)|FW)}
function out(p,c,n,o,ax){const e=c[3]!==undefined?c[3]:o.e;const k=e?[c[0]*e,c[1]*e,c[2]*e]:shade(c,p,n);if(o.glow){k[0]+=c[0]*o.glow;k[1]+=c[1]*o.glow;k[2]+=c[2]*o.glow}emit(p,k,c[4]!==undefined?c[4]:(o.a??1),ax,o.f)}

// ---- primitives ----
function quad(o,u,v,n,cf,opt={}){
  cf=CF(cf,opt.j);const sp=opt.sp||SP,lu=len(u),lv=len(v),nu=Math.max(1,Math.round(lu/sp)),nv=Math.max(1,Math.round(lv/sp));
  const uh=sc(u,1/lu),vh=sc(v,1/lv),su=lu/nu*.62,sv=lv/nv*.62,sn=Math.min(su,sv)*.15;
  for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){
    const s=(i+.5+(rnd()-.5)*.4)/nu,t=(j+.5+(rnd()-.5)*.4)/nv;
    const p=[o[0]+u[0]*s+v[0]*t,o[1]+u[1]*s+v[1]*t,o[2]+u[2]*s+v[2]*t];
    const c=cf(s,t,p);if(!c)continue;let nn=n;
    if(opt.bump){const e=.002,h0=opt.bump(p,s,t),gu=(opt.bump([p[0]+uh[0]*e,p[1]+uh[1]*e,p[2]+uh[2]*e],s,t)-h0)/e,gv=(opt.bump([p[0]+vh[0]*e,p[1]+vh[1]*e,p[2]+vh[2]*e],s,t)-h0)/e;nn=nrm([n[0]-uh[0]*gu-vh[0]*gv,n[1]-uh[1]*gu-vh[1]*gv,n[2]-uh[2]*gu-vh[2]*gv])}
    out(p,c,nn,opt,[[uh,su],[vh,sv],[n,sn]])}}
function obox(c,A,h,colr,opt={}){
  const cf=CF(colr,opt.j);
  for(let k=0;k<3;k++)for(const sg of[-1,1]){
    const id='xyz'[k]+(sg>0?'+':'-');if(opt.skip&&opt.skip.includes(id))continue;
    const i=k==0?1:0,j=k==2?1:2;
    const fc=add(c,sc(A[k],h[k]*sg)),o=sub(sub(fc,sc(A[i],h[i])),sc(A[j],h[j]));
    const sp=opt.sp||Math.min(SP,Math.max(.007*Q,Math.min(2*h[i],2*h[j])/2.2));
    quad(o,sc(A[i],2*h[i]),sc(A[j],2*h[j]),sc(A[k],sg),(s,t,p)=>cf(s,t,p,id),{...opt,sp})}}
function box(x0,y0,z0,x1,y1,z1,colr,opt){obox([(x0+x1)/2,(y0+y1)/2,(z0+z1)/2],I3,[(x1-x0)/2,(y1-y0)/2,(z1-z0)/2],colr,opt)}
function cyl(b,r,h,colr,opt={}){
  const A=opt.A||I3,r1=opt.r1??r,cf=CF(colr,opt.j),sp=opt.sp||Math.min(SP,Math.max(.006*Q,Math.max(r,r1)/2.5));
  const sl=Math.hypot(h,r1-r),nt=Math.max(6,Math.round(PI2*Math.max(r,r1)/sp)),ny=Math.max(1,Math.round(sl/sp));
  if(!opt.noSide)for(let i=0;i<nt;i++)for(let j=0;j<ny;j++){
    const th=(i+.5+(rnd()-.5)*.3)/nt*PI2,yf=(j+.5)/ny,rr=r+(r1-r)*yf,ct=Math.cos(th),st=Math.sin(th);
    const p=add(b,add(add(sc(A[0],rr*ct),sc(A[1],h*yf)),sc(A[2],rr*st)));
    const nn=add(sc(A[0],ct),sc(A[2],st)),tg=add(sc(A[0],-st),sc(A[2],ct));
    const c=cf(p,th,yf);if(!c)continue;
    out(p,c,nn,opt,[[tg,PI2*Math.max(rr,.002)/nt*.62],[A[1],sl/ny*.62],[nn,sp*.1]])}
  const cap=(y,rad,cc,nn)=>{const nr=Math.max(1,Math.round(rad/sp));for(let k=0;k<nr;k++){const rr=(k+.5)/nr*rad,m=Math.max(3,Math.round(PI2*rr/sp));
    for(let i=0;i<m;i++){const th=(i+rnd()*.5)/m*PI2,ct=Math.cos(th),st=Math.sin(th);
      const p=add(b,add(add(sc(A[0],rr*ct),sc(A[1],y)),sc(A[2],rr*st)));const c=cc(p,rr/rad,th);if(!c)continue;
      out(p,c,nn,opt,[[add(sc(A[0],-st),sc(A[2],ct)),PI2*rr/m*.62],[add(sc(A[0],ct),sc(A[2],st)),rad/nr*.62],[nn,sp*.1]])}}};
  if(opt.top!==false)cap(h,r1,opt.top?CF(opt.top):p=>cf(p,0,1),A[1]);
  if(opt.bot)cap(0,r,CF(opt.bot),sc(A[1],-1))}
function sph(c,r,colr,opt={}){
  const cf=CF(colr,opt.j),s3=opt.s||[1,1,1],mx=Math.max(...s3),sp=opt.sp||Math.min(SP,Math.max(.005*Q,r*mx/3));
  const N=Math.max(4,Math.round(4*Math.PI*r*r*mx*mx/(sp*sp)*1.15)),ga=Math.PI*(3-Math.sqrt(5)),sz=Math.sqrt(4*Math.PI/N)*r*mx*.62;
  for(let i=0;i<N;i++){const y=1-2*(i+.5)/N,rr=Math.sqrt(1-y*y),ph=i*ga,n0=[Math.cos(ph)*rr,y,Math.sin(ph)*rr];
    const p=[c[0]+n0[0]*r*s3[0],c[1]+n0[1]*r*s3[1],c[2]+n0[2]*r*s3[2]],nn=nrm([n0[0]/s3[0],n0[1]/s3[1],n0[2]/s3[2]]);
    const t1=nrm(cross(nn,Math.abs(nn[1])<.9?[0,1,0]:[1,0,0])),t2=cross(nn,t1),cc=cf(p,n0);if(!cc)continue;
    out(p,cc,nn,opt,[[t1,sz],[t2,sz],[nn,sz*.25]])}}
function blob(p,r,c,o={}){c=C(c);const s=o.s||[1,1,1],k=o.sh?shade(c,p,null):mul(c,o.e??1);
  emit(p,k,o.a??1,[[[1,0,0],r*s[0]],[[0,1,0],r*s[1]],[[0,0,1],r*s[2]]],o.f)}
function line(a,b,r,c,o={}){const d=sub(b,a),L=len(d)||1e-6,u=sc(d,1/L),n=Math.max(1,Math.ceil(L/(r*1.8)));
  const t1=nrm(cross(u,Math.abs(u[1])<.9?[0,1,0]:[1,0,0])),t2=cross(u,t1),cf=CF(c,o.j);
  for(let i=0;i<n;i++){const p=add(a,sc(d,(i+.5)/n));out(p,cf(p),null,o,[[u,L/n*.65],[t1,r],[t2,r]])}}
function ring(c,a,b,rx,ry,r,colr,o={}){const N=Math.max(8,Math.ceil(PI2*Math.max(rx,ry)/(r*1.6))),cf=CF(colr,o.j),nn=nrm(cross(a,b));
  for(let i=0;i<N;i++){const t=i/N*PI2,p=add(c,add(sc(a,rx*Math.cos(t)),sc(b,ry*Math.sin(t))));
    const tg=nrm(add(sc(a,-rx*Math.sin(t)),sc(b,ry*Math.cos(t)))),rd=nrm(add(sc(a,Math.cos(t)),sc(b,Math.sin(t))));
    out(p,cf(p,t),rd,o,[[tg,PI2*Math.max(rx,ry)/N*.6],[rd,r],[nn,r]])}}
function tri(a,b,c,n,colr,o={}){const cf=CF(colr,o.j),ab=sub(b,a),ac=sub(c,a),ar=len(cross(ab,ac))/2,sp=o.sp||Math.min(SP,.012*Q);
  const N=Math.max(3,Math.ceil(ar/(sp*sp)*1.6)),t1=nrm(ab),t2=nrm(cross(n,t1)),s=Math.sqrt(ar/N)*.75;
  for(let i=0;i<N;i++){let u=rnd(),v=rnd();if(u+v>1){u=1-u;v=1-v}const p=add(a,add(sc(ab,u),sc(ac,v))),cc=cf(p);if(!cc)continue;out(p,cc,n,o,[[t1,s],[t2,s],[n,s*.15]])}}
function wedge(A0,ang,L,hw,h,rind,paste){
  const f=[Math.cos(ang),0,Math.sin(ang)],g=[-Math.sin(ang),0,Math.cos(ang)],up=[0,h,0];
  const B=add(A0,sub(sc(f,L),sc(g,hw))),Cc=add(A0,add(sc(f,L),sc(g,hw))),A1=add(A0,up),B1=add(B,up),C1=add(Cc,up);
  tri(A1,B1,C1,[0,1,0],paste);tri(A0,B,B1,sc(g,-1),paste);tri(A0,B1,A1,sc(g,-1),paste);
  tri(A0,Cc,C1,g,paste);tri(A0,C1,A1,g,paste);tri(B,Cc,C1,f,rind);tri(B,C1,B1,f,rind)}
const swiss=(base,dark,s=.05)=>p=>{const ix=Math.floor(p[0]/s),iy=Math.floor(p[1]/s),iz=Math.floor(p[2]/s);
  const q=[(ix+.2+h3(ix,iy,iz)*.6)*s,(iy+.2+h3(iy,iz,ix)*.6)*s,(iz+.2+h3(iz,ix,iy)*.6)*s],r=(.15+h3(ix+3,iy,iz)*.25)*s,d=len(sub(p,q));
  return d<r?mix(dark,base,(d/r)**2*.7):jit(base,.05)};

// ---- house constants ----
const ZB=-1.25,ZF=1.3,H=1.8,HW=1.45;
const ROOMS=[{cx:-1.5,fy:3.9},{cx:1.5,fy:3.9},{cx:-1.5,fy:1.95},{cx:1.5,fy:1.95},{cx:-1.5,fy:0},{cx:1.5,fy:0}];
function enter(R,lights,amb){
  ROOM={lights:lights.map(l=>({p:[R.cx+l[0],R.fy+l[1],l[2]],c:C(l[3]),i:l[4],r:l[5],s:l[6]})).concat(HQ?[]:[{p:[R.cx,R.fy+1.2,3.2],c:[1,.86,.72],i:.32,r:3}]),
    amb:C(amb),box:[R.cx-HW,R.fy,ZB,R.cx+HW,R.fy+H]};CTX[ROOMS.indexOf(R)]=ROOM}
function shell(R,o){
  const x0=R.cx-HW,x1=R.cx+HW,y0=R.fy,y1=R.fy+H,d=ZF-ZB,sw=o.side||o.wall;
  quad([x0,y0,ZB],[2*HW,0,0],[0,H,0],[0,0,1],(s,t,p)=>o.wall(p[0]-R.cx,p[1]-y0,p,0),{bump:o.bw});
  quad([x0,y0,ZB],[2*HW,0,0],[0,0,d],[0,1,0],(s,t,p)=>o.floor(p[0]-R.cx,p[2],p),{bump:o.bf});
  quad([x0,y1,ZB],[2*HW,0,0],[0,0,d],[0,-1,0],o.ceil,{sp:SP*(HQ?1:1.3),bump:o.bc});
  quad([x0,y0,ZB],[0,0,d],[0,H,0],[1,0,0],(s,t,p)=>sw(p[2],p[1]-y0,p,-1),{bump:o.bl});
  quad([x1,y0,ZB],[0,0,d],[0,H,0],[-1,0,0],(s,t,p)=>sw(p[2],p[1]-y0,p,1),{bump:o.br});
  if(o.trim){const t=o.trim;box(x0,y0,ZB,x1,y0+.07,ZB+.02,t,{skip:'z-'});box(x0,y0,ZB,x0+.02,y0+.07,ZF,t,{skip:'x-'});box(x1-.02,y0,ZB,x1,y0+.07,ZF,t,{skip:'x+'});
    box(x0,y1-.05,ZB,x1,y1,ZB+.03,t,{skip:'z-'});box(x0,y1-.05,ZB,x0+.03,y1,ZF,t,{skip:'x-'});box(x1-.03,y1-.05,ZB,x1,y1,ZF,t,{skip:'x+'})}}
const L=R=>({P:(x,y,z)=>[R.cx+x,R.fy+y,z],b:(x0,y0,z0,x1,y1,z1,c,o)=>box(R.cx+x0,R.fy+y0,z0,R.cx+x1,R.fy+y1,z1,c,o)});

// ================= ROOM 1: THE READING NOOK (books) =================
if(!HQ){const R=ROOMS[0],{P,b}=L(R);
 enter(R,[[-.55,1.15,-.1,[1,.72,.42],1.7,.85],[.3,1.6,.4,[.9,.7,.5],.55,1.6],[-1.4,1.1,.15,[.5,.6,.95],.45,.8],[0,.9,-.6,[1,.8,.55],.4,1.2]],[.2,.16,.14]);
 shell(R,{wall:(h,y)=>fr(h/.14)<.07?C('#a08348'):jit('#2d4a3a',.05),
  floor:(x,z)=>{const u=x/.08,i=Math.floor(u),v=z/.24+(i&1?.5:0)+fr(u)*(i&1?1:-1)*.33,j=Math.floor(v);
    return(fr(u)<.06||fr(v)<.03)?C('#3b2414'):mul('#8a5a34',.8+.35*h3(i,j,1))},
  ceil:'#3b2a20',trim:'#5a3a24'});
 // window w/ moonlit sky on exterior wall
 quad(P(-HW+.006,.55,-.35),[0,0,.9],[0,1,0],[1,0,0],(s,t)=>{const m=Math.hypot(s-.72,(t-.76)*1.1);
   if(m<.09)return[.95,.93,.85,1.3];const st=h3(Math.floor(s*60),Math.floor(t*70),2)>.975;
   const c=mix('#4a6a8c','#141d38',t);return st?[1,1,.9,1.3]:[...mix(c,'#c9d6ea',Math.max(0,.18-m)*1.6),1]},{sp:SP*.8});
 const wf='#e8dcc6';b(-HW,.52,-.38,-HW+.04,.56,.58,wf);b(-HW,1.55,-.38,-HW+.04,1.59,.58,wf);b(-HW,.52,-.38,-HW+.04,1.59,-.34,wf);b(-HW,.52,.54,-HW+.04,1.59,.58,wf);
 b(-HW,.52,.09,-HW+.03,1.59,.11,wf);b(-HW,1.04,-.38,-HW+.03,1.06,.58,wf);
 // bookshelf
 const wood='#4a2b1b',xs=[-1.42,-.62,.18,.96];
 for(const x of xs)b(x,0,-1.21,x+.03,1.76,-.93,wood);
 for(const y of[.02,.38,.74,1.1,1.46,1.73])b(-1.42,y,-1.21,.99,y+.03,-.93,wood);
 const pal=['#7a2430','#1f3557','#b8862f','#2f5a3c','#e6dcc4','#5c2c4a','#a44a2a','#3d6b73','#d8b27a'];
 for(const y of[.02,.38,.74,1.1,1.46])for(let k=0;k<3;k++){let x=xs[k]+.035;const xe=xs[k+1]-.004;
   while(x<xe-.03){const w=.028+rnd()*.035,h=Math.min(.32,.2+rnd()*.12),c=pal[Math.floor(rnd()*pal.length)],d=.19+rnd()*.04;
     if(rnd()<.05){x+=.05;continue}
     const cf=(s,t,p,id)=>id=='z+'&&((t>.1&&t<.14)||(t>.86&&t<.9))?C('#d9b25a'):id=='z+'&&t>.55&&t<.7&&s>.2&&s<.8?mix(c,'#efe4c8',.55):jit(c,.06);
     if(x+w>xe-.06&&rnd()<.5){obox(P(x+w/2+.04,y+.03+h/2*.97,-1.19+d/2),AZ(-.22),[w/2,h/2,d/2],cf,{skip:'z-',sp:.022*Q});break}
     b(x,y+.03,-1.19,x+w,y+.03+h,-1.19+d,cf,{skip:'z-y-x-x+',sp:.026*Q});x+=w+.002}}
 // rolling ladder
 const lw='#7a4e2c',ra=[P(.72,0,-.5),P(.52,1.74,-.9)],rb=[P(.98,0,-.5),P(.78,1.74,-.9)];
 line(ra[0],ra[1],.012,lw);line(rb[0],rb[1],.012,lw);
 for(let k=1;k<9;k++){const t=k/9;line(add(ra[0],sc(sub(ra[1],ra[0]),t)),add(rb[0],sc(sub(rb[1],rb[0]),t)),.009,lw)}
 // armchair
 const chair=(c,a,v)=>{const A=AY(a);obox(loc(c,A,[0,.12,0]),A,[.22,.12,.2],v);obox(loc(c,A,[0,.27,.02]),A,[.19,.04,.17],mix(v,'#ffffff',.08));
   obox(loc(c,A,[0,.42,-.17]),AM(A,AX(-.15)),[.22,.22,.05],v);for(const s of[-1,1])obox(loc(c,A,[s*.21,.24,0]),A,[.04,.12,.2],v)};
 chair(P(-.95,0,.35),.85,C('#7a2632'));
 // floor lamp + pool of light
 cyl(P(-.55,0,-.1),.08,.02,'#b08d4a');line(P(-.55,0,-.1),P(-.55,1.15,-.1),.01,'#b08d4a');
 cyl(P(-.55,1.1,-.1),.15,.2,'#f2bd72',{r1:.09,e:1.15,top:false,a:.95});
 blob(P(-.55,1.17,-.1),.3,'#ffcf8c',{a:.22});blob(P(-.55,.012,-.1),.5,'#ffc070',{s:[1,.01,1],a:.18});
 // side table + open book + mug
 cyl(P(-.42,0,.72),.12,.4,'#3e2416');cyl(P(-.47,.4,.72),.03,.06,'#3d6b73',{top:'#2a1608'});
 obox(P(-.37,.413,.74),AZ(.12),[.055,.003,.075],'#f2e9d6');obox(P(-.27,.413,.74),AZ(-.12),[.055,.003,.075],'#f2e9d6');
 // stack of books on the floor
 {let y=0;for(let k=0;k<6;k++){const h=.04+rnd()*.03;obox(P(.6,y+h/2,.78),AY(rnd()*.8-.4),[.13-rnd()*.03,h/2,.09],pal[k%pal.length]);y+=h}}
 // globe
 cyl(P(.25,0,.3),.08,.02,'#8a6a3a');line(P(.25,0,.3),P(.25,.34,.3),.01,'#8a6a3a');
 const gc=P(.25,.5,.3);sph(gc,.14,(p,n)=>{const lat=Math.asin(n[1]),lon=Math.atan2(n[2],n[0]);return fbm(lon*1.6+3,lat*3+1)>.56?mix('#b89a52','#6f8a4a',h3(Math.floor(lon*9),Math.floor(lat*9),3)):jit('#2f6b80',.08)});
 ring(gc,nrm([1,0,.2]),nrm([0,1,.3]),.16,.16,.006,'#c9a25a');
 // rug
 quad(P(-1.15,.004,-.55),[1.95,0,0],[0,0,1.6],[0,1,0],(s,t,p)=>{const x=p[0]-R.cx,z=p[2],d=((x+.18)/.95)**2+((z-.25)/.72)**2;if(d>1)return null;
   return d<.08?C('#c9a25a'):d>.85?(d>.97?C('#c9a25a'):C('#2a1a2a')):fr(d*5)<.5?mix('#6e2030','#5a1828',fr(d*13)):C('#2c3b5a')},{sp:SP*.9});
 // dust motes
 for(let k=0;k<70;k++)blob(P(-.9+rnd()*.8,.4+rnd()*1.1,-.5+rnd()*1.1),.004,'#fff0c8',{e:1.4,a:.7,f:2});}

// ================= ROOM 2: THE PICTURE PALACE (film) =================
if(!HQ){const R=ROOMS[1],{P,b}=L(R);
 enter(R,[[0,1.05,-.9,[.95,.85,.7],1.3,1.4],[-1.3,1.3,-.92,[1,.7,.45],.5,.5],[1.3,1.3,-.92,[1,.7,.45],.5,.5]],[.12,.07,.09]);
 const screen=(h,y)=>{const dx=h,dy=y-1.05,r=Math.hypot(dx,dy),vig=1-r*.75;let c=mix('#3a2a1a','#ecd6a8',Math.max(0,vig));
   if(Math.abs(r-.36)<.008||Math.abs(r-.29)<.006||Math.abs(dx)<.005||Math.abs(dy)<.005)c=C('#fff3d6');
   else{const a=Math.atan2(dx,dy);if(a>0&&a<2.2&&r<.29)c=mul(c,.72)}
   if(h3(Math.floor(h*300),0,3)>.985)c=mix(c,'#ffffff',.4);return[...jit(c,.12),1.15]};
 shell(R,{wall:(h,y)=>Math.abs(h)<.85&&y>.55&&y<1.55?screen(h,y):(Math.abs(h)<.9&&y>.5&&y<1.6?C('#111014'):mul('#3b1d2e',.85+.2*Math.abs(Math.sin(h*18)*Math.sin(y*18)))),
  floor:(x,z)=>(fr(x*7)<.12&&fr(z*7)<.12)?C('#b08848'):jit('#5a1a24',.06),ceil:'#1c0e14',trim:'#2a1018'});
 // curtains + valance
 const fold=x=>mul('#9b1b2a',.5+.5*Math.sin(x*70)**2);
 quad(P(-1.42,.05,-1.15),[.58,0,0],[0,1.7,0],[0,0,1],(s,t,p)=>fold(p[0]),{sp:SP*.8});
 quad(P(.84,.05,-1.15),[.58,0,0],[0,1.7,0],[0,0,1],(s,t,p)=>fold(p[0]),{sp:SP*.8});
 quad(P(-1.42,1.55,-1.12),[2.84,0,0],[0,.2,0],[0,0,1],(s,t,p)=>{const sc2=fr(p[0]*3.5),edge=.25+.25*Math.sin(sc2*Math.PI);return t<edge?null:t<edge+.06?C('#d9b25a'):fold(p[0]*.6)},{sp:SP*.7});
 for(const x of[-.87,.87])blob(P(x,.95,-1.08),.03,'#d9b25a',{sh:1,s:[1,1.6,1]});
 // seats
 b(-1.45,0,.25,1.45,.12,1.3,'#4a1620',{skip:'z+'});
 const seat=(x,z,y0)=>{b(x-.2,y0,z-.18,x+.2,y0+.2,z+.18,'#7c1a25');b(x-.19,y0+.2,z-.16,x+.19,y0+.26,z+.17,'#a52a36');
   obox(P(x,y0+.48,z+.15),AX(.18),[.19,.24,.04],'#8c1f2b');b(x-.24,y0,z-.18,x-.2,y0+.36,z+.2,'#4a0f16');b(x+.2,y0,z-.18,x+.24,y0+.36,z+.2,'#4a0f16')};
 for(const x of[-.62,0,.62]){seat(x,-.2,0);seat(x,.52,.12)}
 // projector + beam
 for(const q of[[-.12,-.08],[.12,-.08],[0,.12]])line(P(1+q[0],.12,1.05+q[1]),P(1.00,.95,1.05),.008,'#2a2a2e');
 b(.91,.96,.93,1.09,1.1,1.17,'#2e2e34');
 const RA=[[0,1,0],[1,0,0],[0,0,1]];
 cyl(P(0.99,1.22,1.12),.07,.02,'#a7a7ad',{A:RA});cyl(P(0.99,1.22,.98),.06,.02,'#a7a7ad',{A:RA});
 cyl(P(1.00,1.04,.93),.026,.05,'#111111',{A:[[1,0,0],[0,0,-1],[0,1,0]]});
 blob(P(1.00,1.04,.875),.02,'#fff6dc',{e:1.6});blob(P(1.00,1.04,.87),.09,'#fff0c8',{a:.45});
 const lens=P(1.00,1.04,.87),NB=Math.round(1300/Q);
 for(let k=0;k<NB;k++){const q=P((rnd()*2-1)*.85,.55+rnd(),-1.23),t=rnd(),p=add(lens,sc(sub(q,lens),t)),dir=nrm(sub(q,lens)),w=.012+.05*t;
   const t1=nrm(cross(dir,[0,1,0])),t2=cross(dir,t1);emit(p,[1,.93,.78],.03,[[dir,.1],[t1,w],[t2,w]],1)}
 for(let k=0;k<110;k++){const q=P((rnd()*2-1)*.8,.6+rnd()*.9,-1.2),p=add(lens,sc(sub(q,lens),.15+rnd()*.8));blob(p,.004,'#fff3d8',{e:1.5,a:.6,f:2})}
 // posters on divider wall, reels on exterior wall
 const poster=(z0,fn)=>{quad(P(-HW+.006,.6,z0),[0,0,.42],[0,.68,0],[1,0,0],(s,t)=>fn(s,t),{sp:SP*.6});ring(P(-HW+.01,.94,z0+.21),[0,0,1],[0,1,0],.225,.35,.008,'#c9a25a')};
 poster(-.35,(s,t)=>{const r=Math.hypot(s-.5,(t-.58)*.62);return t<.32&&Math.abs(s-.5-(t-.16)*.3)<.03+.0*t?C('#1a0f10'):r<.18?C('#f2b04a'):mix('#c2412d','#3b1626',t)});
 poster(.3,(s,t)=>Math.abs((s-.5)-(1-t)*.35)<.12*(1-t)+.02?mix('#f3e3b6','#3f8f8a',t*.4):(fr(t*9)<.08?C('#e9d9b0'):C('#1f3d4a')));
 for(const [z,y,r] of[[-.55,1.15,.18],[.2,1.28,.15]])quad(P(HW-.006,y-r,z-r),[0,0,2*r],[0,2*r,0],[-1,0,0],(s,t)=>{const dx=(s-.5)*2,dy=(t-.5)*2,d=Math.hypot(dx,dy);if(d>1)return null;
   const a=Math.atan2(dy,dx),hole=d>.28&&d<.75&&Math.cos(a*5)>.55;if(hole)return null;return d<.12?C('#2a2a2e'):d>.92?C('#6f6f76'):mix('#9a9aa2','#d7d7dd',(Math.sin(a*3)+1)/2)},{sp:SP*.5});
 // sconces
 for(const x of[-1.38,1.38]){blob(P(x,1.3,-.92),.035,'#ffd59a',{e:1.5,s:[.6,1,1]});blob(P(x,1.32,-.92),.22,'#ffb870',{a:.2,f:1})}
 // popcorn + clapperboard
 cyl(P(.35,0,.02),.06,.14,(p,th)=>Math.floor(th/PI2*10)%2?C('#f4ede0'):C('#c42a2a'),{r1:.08,top:false});
 for(let k=0;k<45;k++){const a=rnd()*PI2,r=Math.sqrt(rnd())*.075;blob(P(.35+Math.cos(a)*r,.14+rnd()*.035*(1-r/.08)+.005,.02+Math.sin(a)*r),.011,'#f6e2a2',{sh:1})}
 const CA=AM(AY(.5),AX(-.25));obox(loc(P(-1.1,0,.05),CA,[0,.11,0]),CA,[.12,.1,.008],(s,t,p,id)=>id=='z+'&&fr(s*4+t)<.08?C('#e9e2d0'):C('#26262b'));
 obox(loc(P(-1.1,0,.05),CA,[0,.225,0]),CA,[.12,.012,.01],(s)=>fr(s*6)<.5?C('#f0ece4'):C('#18181c'));}

// ================= ROOM 3: THE REUNION LOUNGE (Real Housewives) =================
if(!HQ){const R=ROOMS[2],{P,b}=L(R);
 enter(R,[[0,1.45,-.25,[1,.86,.72],1.6,1.3],[-.62,1.15,-1.15,[1,.8,.6],.5,.5],[.62,1.15,-1.15,[1,.8,.6],.5,.5],[.9,.8,.6,[1,.85,.8],.4,1.2]],[.36,.28,.28]);
 const dam=(h,y)=>{const v=Math.sin(h*26)*Math.sin(y*22)+.5*Math.sin((h+y)*17);return v>.8?C('#efc9c2'):v<-.9?C('#c99a94'):jit('#e0b0aa',.04)};
 const marble=(x,z)=>{const v=Math.abs(Math.sin(x*5+fbm(x*3,z*3)*7+z*2));return v<.07?mix('#8f8a8c','#f4f0ec',v/.07):jit('#f2eee9',.03)};
 shell(R,{wall:(h,y)=>Math.abs(y-1.42)<.012?C('#c9a25a'):dam(h,y),floor:(x,z)=>marble(x,z),ceil:'#f0d6cf',trim:'#f6efe6'});
 // mirror
 quad(P(-.45,.6,ZB+.008),[.9,0,0],[0,1,0],[0,0,1],(s,t,p)=>{const x=p[0]-R.cx,y=p[1]-R.fy,e=(x/.36)**2+((y-1.1)/.46)**2;if(e>1.2)return null;
   if(e>1)return mul('#d4ad5c',.75+.35*Math.abs(Math.sin(Math.atan2(y-1.1,x)*24)));const hl=fr((x+y)*2.4)<.12;return[...mix('#b8aeb6','#f4eaee',hl?.95:.5-x*.4),.95]},{sp:SP*.6});
 for(const x of[-.62,.62]){blob(P(x,1.15,-1.2),.03,'#fff1cf',{e:1.6});blob(P(x,1.15,-1.18),.16,'#ffd9a8',{a:.22,f:1})}
 // sofa
 const bou='#efe7dd',bc=(s,t)=>jit(bou,.12);
 b(-.75,0,-1.2,.75,.22,-.72,bc);b(-.72,.22,-1.08,-.01,.3,-.72,bc);b(.01,.22,-1.08,.72,.3,-.72,bc);b(-.75,.22,-1.22,.75,.62,-1.08,bc);
 b(-.82,0,-1.22,-.7,.42,-.72,bc);b(.7,0,-1.22,.82,.42,-.72,bc);
 const leo=(s,t,p)=>{const u=(p[0]+p[2])*28,v=p[1]*28,i=Math.floor(u),j=Math.floor(v),d=Math.hypot(fr(u)-.3-h3(i,j,1)*.4,fr(v)-.3-h3(j,i,2)*.4);return d<.12?C('#8a5528'):d<.22?C('#2a1a10'):jit('#c99a5b',.06)};
 obox(P(-.42,.43,-1.0),AM(AZ(.12),AX(-.3)),[.12,.11,.035],leo);obox(P(.42,.43,-1.0),AM(AZ(-.12),AX(-.3)),[.12,.11,.035],leo);
 obox(P(0,.42,-1.02),AX(-.3),[.1,.09,.03],'#d98a9a');
 // coffee table
 b(-.45,.26,-.4,.45,.3,.12,(s,t,p)=>marble(p[0]*1.7,p[2]*1.7));
 for(const [x,z] of[[-.4,-.35],[.4,-.35],[-.4,.07],[.4,.07]])line(P(x,0,z),P(x,.26,z),.01,'#d4ad5c');
 // champagne on ice + flutes
 cyl(P(-.25,.3,-.22),.055,.1,'#c9c9cf',{top:(p,r)=>r>.85?C('#c9c9cf'):[.85,.9,.95,1.1]});
 cyl(P(-.25,.3,-.22),.024,.19,'#1f3a24',{top:false});cyl(P(-.25,.49,-.22),.024,.06,'#1f3a24',{r1:.011,top:false});cyl(P(-.25,.53,-.22),.012,.03,'#d4ad5c');
 for(const [x,z] of[[.05,-.27],[.16,-.12],[-.06,-.04]]){line(P(x,.3,z),P(x,.37,z),.003,'#f4f4f6',{a:.5,e:.9});
   cyl(P(x,.37,z),.008,.075,'#e8eef2',{r1:.02,a:.35,e:.95,top:false});cyl(P(x,.38,z),.009,.045,'#f3cf6a',{r1:.017,a:.8,e:.85});
   for(let k=0;k<5;k++)blob(P(x+(rnd()-.5)*.012,.39+rnd()*.03,z+(rnd()-.5)*.012),.002,'#fff6d8',{e:1.6,f:16})}
 // the knocked-over rose glass + spill
 const GA=AM(AY(.6),AZ(1.45));cyl(P(.27,.315,0),.009,.07,'#e8eef2',{A:GA,r1:.03,a:.35,e:.95,top:false});line(P(.27,.315,0),loc(P(.27,.315,0),GA,[0,-.07,0]),.003,'#f4f4f6',{a:.5,e:.9});
 for(let k=0;k<Math.round(90/Q);k++){const a=rnd()*PI2,r=Math.sqrt(rnd());blob(P(.38+Math.cos(a)*r*.11,.302,.05+Math.sin(a)*r*.07),.018,rnd()<.12?'#f7c2cc':'#c9506a',{sh:1,s:[1,.08,1],a:.9})}
 line(P(.43,.3,.12),P(.43,.22,.122),.006,'#c9506a',{a:.85});blob(P(.43,.215,.122),.009,'#c9506a',{sh:1});
 // pearls
 for(let k=0;k<44;k++){const t=k/43,x=-.38+t*.3,z=.0+Math.sin(t*Math.PI)*.09;sph(P(x,.308,z),.008,'#f6efe6',{sp:.004})}
 // chandelier
 const ch=P(0,1.5,-.25);line(P(0,1.8,-.25),P(0,1.56,-.25),.006,'#d4ad5c');ring(ch,[1,0,0],[0,0,1],.18,.18,.009,'#d4ad5c');
 for(let tier=0;tier<3;tier++){const rr=.22-tier*.06,y=-.03-tier*.06,n=26-tier*6;
   for(let k=0;k<n;k++){const a=k/n*PI2,p=add(ch,[Math.cos(a)*rr,y,Math.sin(a)*rr]);blob(p,.008,'#fff6e6',{e:1.6,f:1});
     if(k%2==0)for(let d=1;d<4;d++)blob(add(p,[0,-d*.022,0]),.004,'#fff1dc',{e:1.4,f:1})}}
 for(let k=0;k<8;k++){const a=k/8*PI2;blob(add(ch,[Math.cos(a)*.18,.03,Math.sin(a)*.18]),.012,'#ffe2a8',{e:1.8})}
 blob(add(ch,[0,-.05,0]),.5,'#ffe0b0',{a:.16,f:1});
 // roses on a pedestal
 cyl(P(1.1,0,-.95),.09,.6,(p)=>marble(p[0]*3,p[1]*3));cyl(P(1.1,.6,-.95),.05,.14,'#d4ad5c',{r1:.075});
 for(let k=0;k<9;k++){const a=k/9*PI2+rnd(),r=k?.08:0;sph(P(1.1+Math.cos(a)*r,.82+rnd()*.05-r*.3,-.95+Math.sin(a)*r),.036,(p,n)=>mix('#fbf4ec','#e9b6b8',fr((n[0]+n[2])*4+n[1]*3)*.6),{sp:.008})}
 for(let k=0;k<10;k++){const a=rnd()*PI2;blob(P(1.1+Math.cos(a)*.13,.76+rnd()*.06,-.95+Math.sin(a)*.13),.025,'#4f7a4a',{sh:1,s:[1.4,.35,.8]})}
 // handbag + pouf
 const BA=AY(.4);obox(P(-1.05,.09,.4),BA,[.11,.08,.05],'#a8344f');obox(loc(P(-1.05,.09,.4),BA,[0,.04,.052]),BA,[.11,.045,.006],'#922b44');blob(loc(P(-1.05,.09,.4),BA,[0,.01,.06]),.012,'#e6c06a',{sh:1});
 for(let k=0;k<14;k++){const a=k/13*Math.PI;blob(loc(P(-1.05,.17,.4),BA,[Math.cos(a)*.07,Math.sin(a)*.08,0]),.007,'#922b44',{sh:1})}
 sph(P(.95,.12,.3),.16,(p,n)=>Math.abs(Math.sin(n[0]*9)*Math.sin(n[2]*9))>.92?C('#9a7838'):jit('#c9a04a',.06),{s:[1,.75,1]});}

// ================= ROOM 4: THE VILLA TERRACE (Love Island) =================
if(!HQ){const R=ROOMS[3],{P,b}=L(R);
 enter(R,[[.2,.8,-1.0,[1,.6,.42],1.1,1.4],[-.5,.3,.25,[1,.55,.25],1.5,.8],[1.35,1.15,.18,[1,.35,.6],.6,.6]],[.26,.18,.2]);
 const seg=(px,py,ax,ay,bx,by)=>{const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy)));return[Math.hypot(px-ax-dx*t,py-ay-dy*t),t]};
 const palm=(h,y,bx,lean)=>{const cy=1.25,cx=bx+lean;const [dt,tt]=seg(h,y,bx,.5,cx,cy);if(dt<.022-tt*.01&&y>.5)return 1;
   for(let k=0;k<7;k++){const a=-.3+k*.55,ex=cx+Math.cos(a)*.32*(k<3?-1:1)*(k==3?0:1),ey=cy+Math.sin(Math.abs(a))*.1-.08*Math.abs(k-3);const [d,t]=seg(h,y,cx,cy,ex,ey);if(d<.03*(1-t)+.004)return 1}return 0};
 const mural=(h,y)=>{if(y<.55){const c=mix('#e9a06a','#1f4a5c',Math.min(1,(.55-y)*2.4));const sun=Math.abs(h-.25)<.12*(1-(.55-y)*1.6)&&fr(y*40)<.55;return[...(sun?mix(c,'#ffd9a0',.7):c),1]}
   if(palm(h,y,-1.15,.12)||palm(h,y,1.2,-.15))return[.17,.09,.12,1];
   const r=Math.hypot(h-.25,y-.72);if(r<.17)return[...mix('#fff3c8','#ffd27a',r/.17),1.25];
   return[...mix(mix('#ffc27a','#e8735a',ss(.55,1.0,y)),'#5b3a6e',ss(1.0,1.8,y)),1]};
 shell(R,{wall:mural,side:(h,y)=>jit('#efe2d2',.05),floor:(x,z)=>{const j=Math.floor(z/.09);return(fr(z/.09)<.06||fr((x+h3(j,0,0)*3)/.6)<.012)?C('#4a2e1a'):mul('#9a6a42',.8+.35*h3(j,1,2))},ceil:'#f3e6d4',trim:'#e6d6c0'});
 for(const x of[-1.1,-.4,.3,1.0])b(x,1.72,ZB,x+.06,1.8,ZF,'#b98a5a',{skip:'y+'});
 // plunge pool
 const st='#ece4d8';b(-.15,0,-1.2,1.35,.17,-1.12,st);b(-.15,0,-.58,1.35,.17,-.5,st);b(-.15,0,-1.12,-.07,.17,-.58,st);b(1.27,0,-1.12,1.35,.17,-.58,st);
 quad(P(-.07,.14,-1.12),[1.34,0,0],[0,0,.54],[0,1,0],(s,t,p)=>{const x=p[0]*30,z=p[2]*30,v=Math.sin(x+Math.sin(z*1.1)*2)*Math.sin(z*1.2+Math.sin(x*.8));return[...mix('#1d6f8c','#7fe0e6',.5+.5*v),.95]},{f:8,sp:SP*.8});
 blob(P(.6,.2,-.85),.5,'#5fd0e0',{a:.08,s:[1.2,.2,.5]});
 // fire pit
 cyl(P(-.5,0,.25),.17,.08,(p,th)=>mul('#8b847c',.7+.4*h3(Math.floor(th*3),0,4)),{top:(p,r)=>r<.72?[...mix('#ff7a2a','#3a1208',r/.72),1.2]:jit('#8b847c',.15)});
 for(let k=0;k<Math.round(240/Q);k++){const y=rnd()**1.4*.34,rr=(1-y/.34)*.09*Math.sqrt(rnd()),a=rnd()*PI2,t=y/.34;
   const c=t<.3&&rr<.04?mix('#fff2b0','#ffb347',t*3):t<.65?mix('#ffb347','#ff6a1a',(t-.3)/.35):mix('#ff6a1a','#b8201a',(t-.65)/.35);
   const r=.012+rnd()*.016;blob(P(-.5+Math.cos(a)*rr,.08+y,.25+Math.sin(a)*rr),r,c,{e:1.5,a:.55,f:1,s:[1,1.8,1]})}
 for(let k=0;k<25;k++)blob(P(-.5+(rnd()-.5)*.1,.15+rnd()*.1,.25+(rnd()-.5)*.1),.004,'#ffb060',{e:2,f:4});
 blob(P(-.5,.3,.25),.55,'#ff8a3a',{a:.2,f:1});
 // bean bags
 for(const [x,z,c] of[[-1.0,-.05,'#e0735e'],[-.05,.68,'#3a8f8c'],[-.98,.66,'#e3a548']])sph(P(x,.09,z),.16,c,{s:[1,.62,1],j:.08});
 // daybed + pillows + phone
 b(.95,0,-.3,1.43,.22,.65,'#f2ebe1');b(.97,.22,-.28,1.41,.29,.63,'#fbf6ee');
 obox(P(1.33,.38,-.05),AZ(.35),[.035,.1,.11],'#3a8f8c');obox(P(1.33,.38,.33),AZ(.35),[.035,.1,.11],'#e0735e');
 const PA=AY(.4);obox(P(1.12,.297,.18),PA,[.024,.004,.048],'#151518');quad(loc(P(1.12,.302,.18),PA,[-.02,0,-.043]),sc(PA[0],.04),sc(PA[2],.086),[0,1,0],(s,t)=>t>.55&&t<.75&&s>.15&&s<.85?[1,.45,.62,1.3]:[.95,.88,.92,1.2],{sp:.008});
 blob(P(1.12,.32,.18),.08,'#ffc0d6',{a:.3,f:1});
 // neon heart
 for(let k=0;k<Math.round(170/Q);k++){const t=k/Math.round(170/Q)*PI2,hx=16*Math.sin(t)**3,hy=13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);
   const p=P(HW-.012,1.15+hy*.011,.18+hx*.011);blob(p,.006,'#ff6b9a',{e:1.7});if(k%5==0)blob(p,.045,'#ff4f8a',{a:.12,f:1})}
 // string lights
 for(const z of[-.8,-.15,.5]){const n=26;let prev=null;for(let k=0;k<=n;k++){const t=k/n,p=P(-HW+t*2*HW,1.7-.13*4*t*(1-t),z);if(prev)line(prev,p,.003,'#2a1e18');prev=p;
   if(k%2==1){blob(add(p,[0,-.02,0]),.014,'#ffd08a',{e:1.8,f:1});blob(add(p,[0,-.02,0]),.05,'#ffc070',{a:.22})}}}
 // cocktails on the pool edge
 for(const x of[.3,.46]){cyl(P(x,.17,-.54),.02,.06,'#e8eef2',{a:.35,e:.95,top:false});cyl(P(x,.172,-.54),.018,.045,'#f28a3a',{a:.85,e:.5});blob(P(x+.01,.245,-.54),.025,'#ff5f8a',{sh:1,s:[1,.2,1]});line(P(x,.2,-.54),P(x-.02,.27,-.54),.003,'#f6f0e8')}
 // potted palm
 cyl(P(-1.22,0,-1.0),.1,.16,'#b8643e',{r1:.12});line(P(-1.22,.16,-1.0),P(-1.18,.62,-.98),.018,'#6b4a2e');
 for(let k=0;k<8;k++){const a=k/8*PI2;let pr=P(-1.18,.62,-.98);for(let s=1;s<=5;s++){const p=add(P(-1.18,.62,-.98),[Math.cos(a)*s*.05,.04*s-.018*s*s*.5,Math.sin(a)*s*.05]);line(pr,p,.02-s*.003,'#3f6e3a');pr=p}}}

// ================= ROOM 5: THE CURD CELLAR (Wisconsin cheese) =================
if(!HQ){const R=ROOMS[4],{P,b}=L(R);
 enter(R,[[-.9,1.3,-.2,[1,.72,.4],1.0,.8],[-.2,1.25,.3,[1,.72,.4],1.0,.8],[.6,1.33,-.3,[1,.72,.4],1.0,.8]],[.2,.16,.12]);
 const stone=(h,y)=>{const row=Math.floor(y/.12),u=h/.22+(row&1)*.5,i=Math.floor(u);return(fr(y/.12)<.08||fr(u)<.05)?C('#3e3228'):mul('#8b7a66',.75+.4*h3(i,row,7))};
 shell(R,{wall:stone,floor:(x,z)=>{const u=x/.3+fbm(x*2,z*2)*.6,v=z/.3+fbm(z*2,x*2)*.6,i=Math.floor(u),j=Math.floor(v);return(fr(u)<.06||fr(v)<.06)?C('#2e2620'):mul('#6e6358',.75+.4*h3(i,j,3))},ceil:'#cdbfa8',trim:'#4a3322'});
 for(const z of[-.9,-.2,.5,1.15])b(-HW,1.7,z,HW,1.8,z+.1,'#4a3322',{skip:'y+'});
 // shelves of wheels
 const wd='#5e3c24';for(const x of[-1.42,-.42,.58])b(x,0,-1.22,x+.04,1.5,-.84,wd);
 const shelfY=[.02,.42,.82,1.22];for(const y of shelfY)b(-1.42,y,-1.22,.62,y+.03,-.84,wd);
 const kinds=[{rind:'#d9a441',paste:'#f1d27a'},{rind:'#a3242a',paste:'#f0d68a'},{rind:'#c98a2e',paste:'#e9b858'},{rind:'#e8e2d2',paste:'#eeeadc',blue:1}];
 let kk=0;for(const y of shelfY)for(let x=-1.28;x<.55;x+=.26){const K=kinds[kk++%4];
   if(kk%5==0){b(x-.1,y+.03,-1.12,x+.1,y+.15,-.95,'#e07a1f');continue}
   const top=K.blue?(p)=>h3(Math.floor(p[0]*80),Math.floor(p[2]*80),1)>.8?C('#4a6a8a'):jit(K.paste,.05):(p,r)=>r>.9?C(K.rind):jit(K.paste,.06);
   cyl(P(x,y+.03,-1.03),.11,.09,(p,th,yf)=>mul(K.rind,.85+.25*Math.sin(yf*Math.PI)),{top});
   if(kk%3==0)cyl(P(x,y+.12,-1.03),.1,.08,(p,th,yf)=>mul(K.rind,.85+.25*Math.sin(yf*Math.PI)),{top})}
 // gingham table with a cheese board
 const ging=(s,t,p)=>{const a=fr(p[0]*14)<.5,c=fr(p[2]*14)<.5;return a&&c?C('#b3282d'):a||c?C('#d9787a'):jit('#f3ece0',.03)};
 b(-.78,.4,-.22,.18,.44,.52,ging);for(const [x,z] of[[-.72,-.16],[.12,-.16],[-.72,.46],[.12,.46]])b(x-.02,0,z-.02,x+.02,.4,z+.02,'#5e3c24');
 b(-.56,.44,-.04,-.1,.465,.34,'#a8774a');
 wedge(P(-.5,.465,.08),.35,.28,.09,.13,'#d8a23e',swiss('#f3d67e','#b48a38'));
 for(let k=0;k<6;k++)b(-.2-.03*(k%2),.466+k*.006,.02+k*.035,-.13-.03*(k%2),.472+k*.006,.06+k*.035,'#d9b07a');
 for(let k=0;k<16;k++)sph(P(-.3+(rnd()-.5)*.08,.48+rnd()*.03,.25+(rnd()-.5)*.08),.014,'#5a2a4a',{sp:.006});
 cyl(P(-.66,.44,.4),.075,.05,(p,th,yf)=>fr(th*4+yf*3)<.5?C('#b88a4e'):C('#8a6232'),{top:false,bot:'#8a6232'});
 for(let k=0;k<40;k++){const a=rnd()*PI2,r=Math.sqrt(rnd())*.065;blob(P(-.66+Math.cos(a)*r,.47+rnd()*.03,.4+Math.sin(a)*r),.012,'#f4e3a8',{sh:1,s:[1.3,.8,.9]})}
 // edison bulbs
 for(const [x,y,z] of[[-.9,1.3,-.2],[-.2,1.25,.3],[.6,1.33,-.3]]){line(P(x,1.8,z),P(x,y+.04,z),.003,'#1e1814');blob(P(x,y,z),.028,'#ffb257',{e:1.3,a:.9,s:[1,1.3,1]});blob(P(x,y,z),.008,'#fff0c0',{e:2});blob(P(x,y,z),.24,'#ffb050',{a:.2,f:1})}
 // barrel topped with a cheese-wedge hat
 cyl(P(1.05,0,-.85),.22,.46,(p,th,yf)=>(Math.abs(yf-.18)<.03||Math.abs(yf-.82)<.03)?C('#3a3530'):mul('#8a5a32',.75+.35*h3(Math.floor(th/PI2*18),0,9)),{top:(p,r)=>fr(r*5)<.1?C('#5e3c24'):jit('#8a5a32',.08)});
 wedge(P(.9,.46,-.9),.2,.32,.15,.15,'#f5c542',swiss('#f7cf52','#c99a24',.06));
 // milk can
 cyl(P(1.25,0,.2),.07,.2,'#b9bcc0',{top:false});cyl(P(1.25,.2,.2),.07,.06,'#b9bcc0',{r1:.045,top:false});cyl(P(1.25,.26,.2),.05,.02,'#a8abb0');
 // cow
 {const c=P(.85,0,.62),A=AY(-.6),spot=(s,t,p)=>fbm(p[0]*28+3,p[1]*28+p[2]*28)>.55?C('#1c1a1a'):jit('#f4f1ea',.04);
  obox(loc(c,A,[0,.13,0]),A,[.09,.05,.045],spot);obox(loc(c,A,[.11,.16,0]),A,[.035,.032,.032],spot);obox(loc(c,A,[.152,.148,0]),A,[.01,.018,.026],'#e59a9a');
  for(const [x,z] of[[-.06,-.03],[-.06,.03],[.06,-.03],[.06,.03]])obox(loc(c,A,[x,.04,z]),A,[.012,.04,.012],spot);
  for(const z of[-.025,.025])blob(loc(c,A,[.12,.2,z]),.008,'#e9dcc0',{sh:1});line(loc(c,A,[-.09,.16,0]),loc(c,A,[-.11,.07,0]),.004,'#1c1a1a')}}

// ================= ROOM 6: CLANDESTINO (35 Canal St) =================
if(!HQ){const R=ROOMS[5],{P,b}=L(R);
 const globes=[[-.4,1.22,.55],[-.4,1.22,-.05],[-.4,1.22,-.65]];
 enter(R,globes.map(l=>[...l,[1,.88,.7],.9,.9]).concat([[.6,1.1,-.9,[1,.8,.6],.6,.9],[1.0,1.3,.3,[1,.85,.7],.5,1.0]]),[.3,.25,.2]);
 const cream=(h,y)=>Math.abs(y-1.66)<.03?C('#cbbd98'):mul('#e3d3a6',.9+.12*fbm(h*4,y*4));
 const brick=(h,y)=>{const r=Math.floor(y/.045),u=h/.1+(r&1)*.5;return(fr(y/.045)<.1||fr(u)<.05)?C('#7a6a5a'):mul('#8e3e2c',.72+.38*h3(Math.floor(u),r,6))};
 const ribs=(h,y)=>y<.12?C('#3a1e10'):mul('#9e5e2c',.66+.4*Math.sin(h*230)**2*(.9+.2*fbm(h*2,y*6)));
 const tin=(s,t,p)=>{const u=fr(p[0]/.12),v=fr(p[2]/.12),dx=Math.abs(u-.5),dy=Math.abs(v-.5),m=Math.max(dx,dy),r=Math.hypot(dx,dy),pe=Math.cos(Math.atan2(dy,dx)*8);
   const k=m>.47?.7:m>.43?1.12:Math.abs(r-.26-.03*pe)<.025?1.22:r<.1?1.18:Math.abs(r-.17)<.02?.82:.97;return mul('#ddd0ae',k)};
 shell(R,{wall:brick,side:(h,y,p,sd)=>sd<0?cream(h,y):ribs(h,y),
  floor:(x,z)=>{const j=Math.floor(x/.085);return(fr(x/.085)<.05||fr((z+h3(j,0,1)*2)/.8)<.01)?C('#1c100a'):mul('#4e2e1c',.7+.45*h3(j,2,3))},ceil:tin,trim:'#d4c49c'});
 // ornate cornice
 for(const [x0,x1,z0,z1] of[[-HW,HW,ZB,ZB+.06],[-HW,-HW+.06,ZB,ZF],[HW-.06,HW,ZB,ZF]])b(x0,1.7,z0,x1,1.8,z1,(s,t,p)=>mul('#d9cba6',.8+.3*Math.abs(Math.sin((p[0]+p[2])*90))));
 // posters, certificates, chalkboards on the cream wall (no real text)
 const pq=(z0,y0,w,h,fn)=>quad(P(-HW+.006,y0,z0),[0,0,w],[0,h,0],[1,0,0],(s,t)=>fn(s,t),{sp:SP*.45});
 pq(.95,.72,.26,.36,(s,t)=>s<.05||s>.95||t<.04||t>.96?C('#bfa97e'):fr(t*5.5)<.55&&t>.18?C('#2a2420'):t<.12&&fr(s*8)<.6?C('#4a3a2a'):C('#c9b48a'));
 pq(.62,.9,.22,.16,(s,t)=>s<.06||s>.94||t<.08||t>.92?C('#f2f0ea'):jit(mix('#2a2a2e','#e8b0a0',fbm(s*6,t*6)),.1));
 pq(1.02,1.14,.18,.14,(s,t)=>s<.06||s>.94?C('#f4f2ee'):jit(mix('#1a1a1e','#d8d0c8',fbm(s*7+3,t*7)),.12));
 pq(.78,1.12,.17,.12,(s,t)=>s<.06||s>.94?C('#f4f2ee'):jit(mix('#2a1a1a','#e07050',fbm(s*5,t*5+2)),.12));
 pq(.85,1.38,.2,.22,(s,t)=>s<.05||s>.95||t<.05||t>.95?C('#f6f4f0'):jit(mix('#1e1c1e','#a8a0a0',fbm(s*5+7,t*5)),.1));
 pq(.58,1.28,.1,.14,(s,t)=>t<.25?C('#2a3a6a'):t>.8?C('#e0d080'):C('#f0e6a8'));
 pq(.6,1.12,.1,.08,(s,t)=>Math.abs(t-.5)<.15&&s>.15&&s<.85?C('#f4f4f4'):C('#1e2a5a'));
 pq(.38,1.5,.14,.1,(s,t)=>s<.08||s>.92||t<.1||t>.9?C('#c9a25a'):C('#f1eadc'));pq(.55,1.45,.14,.12,(s,t)=>s<.1||s>.9||t<.1||t>.9?C('#d97a3a'):C('#f0e2d0'));pq(.22,1.4,.1,.08,(s,t)=>s<.12||s>.88?C('#1a1a1a'):C('#f4f0e6'));
 const chalk=(s,t)=>s<.05||s>.95||t<.06||t>.94?C('#2a1a10'):(fr(t*8)<.22&&h3(Math.floor(s*30),Math.floor(t*8),2)>.25&&s<.35+h3(Math.floor(t*8),3,3)*.55?C('#e4e0d4'):jit('#1e221e',.04));
 pq(-.05,1.22,.22,.36,chalk);pq(-.75,1.25,.2,.34,chalk);
 // oscillating fan
 line(P(-HW,1.25,.3),P(-1.36,1.25,.3),.008,'#8a8a8a');ring(P(-1.32,1.28,.3),[0,1,0],nrm([.3,0,1]),.06,.06,.005,'#a0a0a4');
 for(let k=0;k<3;k++){const a=k/3*PI2;blob(add(P(-1.32,1.28,.3),[0,Math.cos(a)*.03,Math.sin(a)*.03]),.02,'#7a7a80',{sh:1,s:[.2,1,.6]})}
 // back bar: cabinet, two floating shelves of bottles and glassware, small mirror
 b(-1.45,0,-1.0,-1.18,.5,.75,(s,t,p,id)=>id=='x+'&&fr(p[2]*5)<.05?C('#1a0e08'):jit('#3a2214',.05),{skip:'x-'});
 b(-1.45,.5,-1.02,-1.15,.53,.77,'#2a1a10');
 const bp=['#7a3a14','#c9802a','#2a5a2a','#e8e4da','#a02020','#5a3a1a','#e0c070','#1e3a1e','#d8d0b8'];
 const bottles=(y,z0,z1,x)=>{for(let z=z0;z<z1;z+=.042+rnd()*.012){const h=.08+rnd()*.06,c=bp[Math.floor(rnd()*bp.length)];
   cyl(P(x,y,z),.017,h,c,{e:.75,a:.9,top:false,sp:.011*Q});cyl(P(x,y+h,z),.017,.035,c,{r1:.006,e:.75,a:.9,sp:.007*Q})}};
 bottles(.53,-.95,.7,-1.3);
 for(const y of[.92,1.12]){b(-1.45,y,-.9,-1.27,y+.015,.42,'#3a2214');line(P(-1.42,y,-.85),P(-1.33,y-.06,-.85),.006,'#2a1a10');line(P(-1.42,y,.35),P(-1.33,y-.06,.35),.006,'#2a1a10')}
 bottles(1.135,-.85,.38,-1.36);
 for(let z=-.85;z<.38;z+=.035)cyl(P(-1.36,.935,z),.013,.035,'#eef2f4',{a:.4,e:1,sp:.007*Q});
 quad(P(-HW+.006,.6,-1.2),[0,0,.16],[0,.42,0],[1,0,0],(s,t)=>s<.1||s>.9||t<.05||t>.95?C('#2a1a10'):[...mix('#8a7a6a','#d8d0c4',t),.9],{sp:SP*.5});
 // L-shaped mahogany bar
 const panel=(s,t,p,id)=>(id=='x+'||id=='z+')&&(fr((p[0]+p[2])*4)<.04||t<.1)?C('#1e100a'):jit('#3e2414',.05);
 b(-.62,0,-.72,-.28,.55,.88,panel);b(-1.12,0,.6,-.28,.55,.88,panel);
 const top=(s,t,p)=>mul('#3e120e',.8+.3*Math.abs(Math.sin(p[2]*14+p[0]*9+fbm(p[0]*5,p[2]*5)*3)));
 b(-.68,.55,-.78,-.2,.6,.95,top);b(-1.18,.55,.54,-.2,.6,.95,top);
 // taps + register near the far end
 for(let k=0;k<4;k++){const z=-.55+k*.05;line(P(-.5,.6,z),P(-.5,.7,z),.006,'#c9c9cf');blob(P(-.5,.73,z),.008,['#1a1a1a','#e03a2a','#e8e0c8','#2a5aa0'][k],{sh:1,s:[1,2.4,1]})}
 b(-.6,.6,-.35,-.48,.7,-.25,'#1e1e22');quad(P(-.475,.62,-.34),[0,0,.08],[0,.06,0],[1,0,0],()=>[.6,.75,.9,1.1],{sp:.008});
 // red votives on bar, ledge and tables
 const votive=p=>{cyl(p,.016,.03,'#d42a24',{a:.8,e:.9,top:false,sp:.008*Q});blob(add(p,[0,.035,0]),.006,'#ffd890',{e:2,f:1,s:[.7,1.3,.7]});blob(add(p,[0,.03,0]),.09,'#ff6a40',{a:.18,f:1})};
 for(const z of[-.6,-.1,.35,.75])votive(P(-.36,.6,z));votive(P(-.85,.6,.75));
 // wooden bar chairs with orange seats
 const chair=(c,A)=>{for(const [dx,dz] of[[-.06,-.06],[.06,-.06],[-.06,.06],[.06,.06]])line(loc(c,A,[dx,0,dz]),loc(c,A,[dx*.85,.42,dz*.85]),.009,'#94562a');
   ring(loc(c,A,[0,.17,0]),A[0],A[2],.065,.065,.006,'#94562a');cyl(loc(c,A,[0,.42,0]),.085,.035,'#94562a',{A,top:'#cf5a2c'});
   for(const dx of[-.06,.06])line(loc(c,A,[dx,.45,.07]),loc(c,A,[dx,.75,.085]),.009,'#94562a');
   obox(loc(c,A,[0,.68,.085]),A,[.075,.05,.01],'#9c5c2c');obox(loc(c,A,[0,.55,.08]),A,[.065,.012,.008],'#94562a')};
 const toBar=AY(-Math.PI/2);for(let z=-.55;z<.6;z+=.29)chair(P(-.08,0,z),toBar);
 for(const x of[-.95,-.6])chair(P(x,0,1.12),AY(Math.PI));
 // ribbed-wood right wall: long drink ledge, chairs, B&W photos, AC unit
 b(1.2,.52,-1.15,1.45,.56,1.05,top);for(const z of[-.9,0,.9])line(P(1.44,.42,z),P(1.3,.52,z),.008,'#2a1a10');
 for(let z=-.85;z<.9;z+=.34)chair(P(1.0,0,z),AY(Math.PI/2));
 for(const z of[-.7,.15,.85])votive(P(1.32,.56,z));
 const photo=(o,u,v,n,pic)=>quad(o,u,v,n,(s,t)=>s<.06||s>.94||t<.06||t>.94?C('#141414'):s<.14||s>.86||t<.14||t>.86?C('#f2efe8'):pic(s,t),{sp:SP*.4});
 const bw=k=>(s,t)=>{const g=fbm(s*5+k*3,t*5+k)*.8+(t>.5?.15:0);return mul('#d8d6d2',.25+g*.8)};
 for(const [z,y,w] of[[-.75,1.0,.24],[-.1,1.12,.2],[.55,1.05,.32]])photo(P(HW-.006,y,z+w),[0,0,-w],[0,w*.8,0],[-1,0,0],bw(z));
 photo(P(-.6,.85,ZB+.006),[.26,0,0],[0,.2,0],[0,0,1],bw(5));photo(P(.25,.9,ZB+.006),[.34,0,0],[0,.24,0],[0,0,1],bw(7));
 b(1.3,1.42,.35,1.45,1.6,.95,'#f2f0ec');b(1.3,1.42,.35,1.31,1.45,.95,'#c8c8c8');
 // back tables
 for(const x of[.15,.75]){b(x-.13,.38,-1.05,x+.13,.41,-.79,'#4a2414');line(P(x,0,-.92),P(x,.38,-.92),.012,'#1a1a1a');cyl(P(x,0,-.92),.08,.01,'#1a1a1a');votive(P(x,.41,-.92));chair(P(x,0,-.62),I3)}
 // speakers
 b(-1.4,1.48,-1.2,-1.25,1.62,-1.08,'#141416');b(1.25,1.48,-1.2,1.4,1.62,-1.08,'#141416');
 // white globe pendants
 for(const [x,y,z] of globes){line(P(x,1.8,z),P(x,y+.09,z),.004,'#b8b8bc');cyl(P(x,1.77,z),.025,.03,'#b8b8bc');
   sph(P(x,y,z),.085,(p,n)=>[...mix('#fff8ea','#f4e2c8',(1-n[1])*.5),1.25],{sp:.012*Q});blob(P(x,y,z),.3,'#ffe6c0',{a:.16})}
 // ceiling fans
 for(const z of[.35,-.6]){const c=P(.7,1.66,z);line(P(.7,1.8,z),c,.012,'#5a5a5e');cyl(add(c,[0,-.04,0]),.04,.05,'#4a4a50');
   for(let k=0;k<4;k++){const A=AY(k*Math.PI/2+.4);obox(loc(add(c,[0,-.015,0]),A,[.17,0,0]),AM(A,AX(.15)),[.13,.005,.035],'#6a4a30')}}
 // disco ball with a little plant
 line(P(.15,1.8,.75),P(.15,1.6,.75),.003,'#888888');sph(P(.15,1.55,.75),.05,()=>rnd()<.25?[1,1,1,1.6]:jit('#a8aab0',.4),{sp:.008});
 for(let k=0;k<12;k++){const a=rnd()*PI2;blob(P(.15+Math.cos(a)*.04,1.6+rnd()*.03,.75+Math.sin(a)*.04),.012,'#4a7a32',{sh:1,s:[1.3,.4,.6]})}}

// ================= FOURTH WALLS (only drawn while you're inside that room) =================
if(!HQ){const FZ=ZF-.02;
 const fw=(k,fn,props)=>{const R=ROOMS[k];ROOM=CTX[k];FW=(k+1)<<8;const x0=R.cx-HW;
   quad([x0,R.fy,FZ],[2*HW,0,0],[0,H,0],[0,0,-1],(s,t,p)=>fn(p[0]-R.cx,p[1]-R.fy,p),{sp:SP*.75});
   if(props)props(L(R),R);FW=0};
 const pal=['#7a2430','#1f3557','#b8862f','#2f5a3c','#e6dcc4','#5c2c4a','#a44a2a','#3d6b73','#d8b27a'];
 // Reading Nook: a second wall of books around a doorway
 fw(0,(h,y)=>{if(Math.abs(h)<.3&&y<1.25)return Math.abs(h)>.27||y>1.22?C('#5a3a24'):mul('#3a2414',.8+.3*Math.sin(h*40)**2);
   if(Math.abs(h)<1.38&&y<1.62){const row=Math.floor(y/.32),f=fr(y/.32);if(f>.9||Math.abs(h)<.34||Math.abs(h)>1.34)return C('#4a2b1b');
     const bi=Math.floor((h+row*.37)/.042),top=.6+.28*h3(bi,row,2);return f<top?mul(pal[Math.floor(h3(bi,row,1)*pal.length)],fr((h+row*.37)/.042)<.1?.6:1):C('#1a100a')}
   return fr(h/.14)<.07?C('#a08348'):jit('#2d4a3a',.05)},
  ({P})=>{blob(P(0,1.4,FZ-.03),.03,'#ffd59a',{e:1.6});blob(P(0,1.4,FZ-.05),.2,'#ffc070',{a:.2,f:1})});
 // Picture Palace: padded doors, a glowing exit light, the projection-booth window
 fw(1,(h,y)=>{if(Math.abs(h)<.18&&y>1.28&&y<1.48)return Math.abs(h)>.16||y<1.3||y>1.46?C('#111111'):[1,.85,.6,1.3];
   if(h>.55&&h<1.15&&y<1.22){const q=fr(h/.15),r=fr(y/.15);return Math.abs(h-.85)<.008?C('#2a0a10'):mul('#8c1f2b',(q<.1||r<.1)?.6:.95)}
   if(h>.75&&h<.95&&y>1.3&&y<1.38)return[1,.15,.12,1.6];
   if(h>-1.15&&h<-.55&&y>.6&&y<1.45){if(h<-1.12||h>-.58||y<.63||y>1.42)return C('#c9a25a');const u=(h+1.12)/.54,v=(y-.63)/.79;return Math.hypot(u-.5,v-.62)<.22?C('#e8c070'):mix('#2a1a3a','#c2412d',v)}
   return mul('#3b1d2e',.85+.2*Math.abs(Math.sin(h*18)*Math.sin(y*18)))},
  ({P})=>{blob(P(.85,1.34,FZ-.04),.12,'#ff3020',{a:.2});blob(P(0,1.38,FZ-.04),.25,'#ffd090',{a:.18,f:1})});
 // Reunion Lounge: arched doorway into a glowing pink foyer, gold sconces, portraits
 fw(2,(h,y)=>{const arch=Math.abs(h)<.42&&(y<1.1||Math.hypot(h,(y-1.1)*1.0)<.42);const archO=Math.abs(h)<.48&&(y<1.1||Math.hypot(h,y-1.1)<.48);
   if(arch){const v=y/1.5;return y<.05?[...C('#e9d6c8'),1]:[...mix('#ffd9d0','#d98aa0',v),1.05]}if(archO)return mul('#d4ad5c',.8+.3*Math.abs(Math.sin((h+y)*60)));
   for(const cx of[-1.0,1.0]){const e=((h-cx)/.2)**2+((y-1.0)/.27)**2;if(e<1.15)return e>1?C('#d4ad5c'):Math.hypot((h-cx)*1.2,y-1.05)<.12?mix('#e9b6b8','#f6e6dc',y-.9):C('#5a2a3a')}
   if(Math.abs(y-1.42)<.012)return C('#c9a25a');const v=Math.sin(h*26)*Math.sin(y*22)+.5*Math.sin((h+y)*17);return v>.8?C('#efc9c2'):v<-.9?C('#c99a94'):jit('#e0b0aa',.04)},
  ({P})=>{for(const x of[-.62,.62]){blob(P(x,1.15,FZ-.03),.03,'#fff1cf',{e:1.6});blob(P(x,1.15,FZ-.05),.16,'#ffd9a8',{a:.22,f:1})}});
 // Villa Terrace: the other way, a starry dusk over the sea and distant island lights
 fw(3,(h,y)=>{if(y<.5){const c=mix('#3a4a7a','#0e1a30',Math.min(1,(.5-y)*2.5));const moon=Math.abs(h+.55)<.05*(1-(.5-y))&&fr(y*40)<.5;return[...(moon?mix(c,'#e8eef8',.6):c),1]}
   if(y<.53&&fr(h*7)<.06)return[1,.85,.5,1.6];
   const m=Math.hypot(h+.55,y-1.3);if(m<.09)return[.98,.97,.92,1.3];
   if(h3(Math.floor(h*80),Math.floor(y*80),4)>.985&&y>.8)return[1,1,.95,1.4];
   return[...mix(mix('#e8906a','#6a4a8a',ss(.5,.9,y)),'#1a1a3a',ss(.9,1.8,y)),1]},
  ({P})=>{for(const x of[-1.1,-.4,.3,1.0]){}});
 // Curd Cellar: stone, an arched plank door with iron bands, wall lanterns
 fw(4,(h,y)=>{const inA=Math.abs(h)<.36&&(y<1.0||Math.hypot(h,y-1.0)<.36);const inO=Math.abs(h)<.44&&(y<1.0||Math.hypot(h,y-1.0)<.44);
   if(inA){if(Math.abs(y-.3)<.025||Math.abs(y-.95)<.025)return C('#2a2420');return mul('#6e4428',fr(h/.09)<.08?.55:.85+.3*h3(Math.floor(h/.09),2,2))}
   if(inO)return mul('#9a8a74',.8+.3*h3(Math.floor(Math.atan2(y-1,h)*6),Math.floor(y*8),3));
   const row=Math.floor(y/.12),u=h/.22+(row&1)*.5;return(fr(y/.12)<.08||fr(u)<.05)?C('#3e3228'):mul('#8b7a66',.75+.4*h3(Math.floor(u),row,7))},
  ({P})=>{ring(P(.24,.62,FZ-.02),[1,0,0],[0,1,0],.03,.03,.005,'#2a2420');for(const x of[-.75,.75]){box(ROOMS[4].cx+x-.04,1.1,FZ-.08,ROOMS[4].cx+x+.04,1.22,FZ,'#2a2420');blob(P(x,1.15,FZ-.05),.025,'#ffb257',{e:1.5});blob(P(x,1.15,FZ-.08),.2,'#ffb050',{a:.2,f:1})}});
 // Clandestino: the storefront onto Canal Street at night
 const street=(u,v)=>{let c=mix('#1a2030','#0a0c14',v);const bk=[[.15,.7,'#ffb050'],[.3,.62,'#ff3a2a'],[.55,.75,'#5aff9a'],[.72,.58,'#ffd080'],[.88,.68,'#ff6a40'],[.42,.5,'#ffe0b0'],[.65,.45,'#ff4040']];
   for(const [bx,by,bc] of bk){const d=Math.hypot(u-bx,(v-by)*1.4);if(d<.08)c=mix(c,bc,(1-d/.08)*.9)}if(v<.22)c=mix('#2a2a30','#4a4040',v*4);if(Math.abs(v-.3)<.02&&fr(u*3)<.7)c=mix(c,'#ffe8c0',.5);return c};
 fw(5,(h,y)=>{if(y>1.58)return Math.abs(y-1.66)<.03?C('#cbbd98'):mul('#e3d3a6',.95);if(y<.42)return fr(h*6)<.05?C('#1e100a'):jit('#3a2214',.05);
   if(h>-.08&&h<.4){if(h<-.05||h>.37||y>1.55||(y<.75&&y>.7))return C('#2a1a10');return y>.75?[...street((h+.05)/.42,(y-.75)/.8),1]:mul('#3a2214',.9)}
   if(y<.47||y>1.53||Math.abs(h+.7)<.025||Math.abs(h-.87)<.025||h<-1.4||h>1.4||Math.abs(h+.1)<.03||Math.abs(h-.42)<.03)return C('#2a1a10');
   const u=h<0?(h+1.4)/1.3:(h-.42)/.98;return[...street(u,(y-.47)/1.06),1]},
  ({P})=>{blob(P(-.7,1.1,FZ-.02),.5,'#ffb070',{a:.06});blob(P(.9,1.0,FZ-.02),.5,'#ff6040',{a:.05})});
}

// ================= HIGH-DETAIL ROOMS (built only when you step inside) =================
if(opt.room===5){const R=ROOMS[5],{P,b}=L(R),cx=R.cx,FZ=ZF-.02;
 const W=(x,y,z)=>[cx+x,y,z];
 const wood=(u,v,base,dk,k=55)=>{const g=Math.sin((u+fbm(u*4,v*.8)*.5)*k)*.5+.5;return mix(base,dk,g*g*.5+fbm(u*40,v*5)*.22)};
 const globes=[[-.42,1.24,.55],[-.42,1.24,-.05],[-.42,1.24,-.65]];
 const votives=[[-.36,.6,-.6],[-.36,.6,-.1],[-.36,.6,.35],[-.85,.6,.75],[1.32,.56,-.7],[1.32,.56,.15],[1.32,.56,.85],[.15,.41,-.92],[.75,.41,-.92]];
 enter(R,globes.map(g=>[...g,[1,.8,.58],1.05,1.05,.07]).concat(
   votives.map(v=>[v[0],v[1]+.04,v[2],[1,.5,.25],.16,.22]),
   [[.45,1.5,-.9,[1,.78,.55],.55,.9,.06],[0,.95,1.15,[.55,.65,.95],.3,1.3,.3],[-1.32,1.0,-.25,[1,.72,.42],.35,.55]]),[.05,.04,.035]);
 ROOM.sky=[.13,.11,.085];ROOM.ground=[.085,.05,.035];
 // shadow casters (registered before anything is lit)
 OCC.push(W(-.62,0,-.72).concat(W(-.28,.55,.88)),W(-1.12,0,.6).concat(W(-.28,.55,.88)),W(-.68,.55,-.78).concat(W(-.2,.6,.95)),W(-1.18,.55,.54).concat(W(-.2,.6,.95)),
   W(-1.45,0,-1.0).concat(W(-1.18,.53,.75)),W(1.2,.52,-1.15).concat(W(1.45,.56,1.05)),W(.02,.38,-1.05).concat(W(.28,.41,-.79)),W(.62,.38,-1.05).concat(W(.88,.41,-.79)),
   W(-1.45,.92,-.9).concat(W(-1.27,.935,.42)),W(-1.45,1.12,-.9).concat(W(-1.27,1.135,.42)));
 const chairsAt=[];for(let z=-.55;z<.6;z+=.29)chairsAt.push([-.08,z,-Math.PI/2]);chairsAt.push([-.95,1.12,Math.PI],[-.6,1.12,Math.PI]);
 for(let z=-.85;z<.9;z+=.34)chairsAt.push([1.0,z,Math.PI/2]);chairsAt.push([.15,-.62,0],[.75,-.62,0]);
 for(const [x,z] of chairsAt)OCC.push(W(x-.075,.4,z-.075).concat(W(x+.075,.46,z+.075)));
 // --- surfaces ---
 const BW=.075,BH=.032;
 const brickId=(h,y)=>{const r=Math.floor(y/BH),u=h/BW+(r&1)*.5;return[Math.floor(u),r,fr(u),fr(y/BH)]};
 const brick=(h,y)=>{const [i,r,fu,fv]=brickId(h,y);if(fv<.13||fu<.055)return mul('#8d8172',.8+.3*fbm(h*60,y*60));
   const k=h3(i,r,6),base=k<.12?C('#5e2a20'):k>.9?C('#a85a40'):C('#8e3e2c');return mul(base,(.78+.3*h3(i+1,r,2))*(.85+.3*fbm(h*90,y*90)))};
 const brickB=(p)=>{const h=p[0]-cx,y=p[1];const [,,fu,fv]=brickId(h,y);return(fv<.13||fu<.055)?-.0025:.0012*fbm(h*120,y*120)};
 const cream=(h,y)=>{if(Math.abs(y-1.66)<.025)return mul('#cbbd98',fr(y*120)<.5?.9:1.05);const g=y<.7?.88+.12*y/.7:1;return mul('#e3d3a6',g*(.92+.1*fbm(h*6,y*6)))};
 const creamB=(p)=>.0008*fbm(p[2]*40,p[1]*40)+(Math.abs(p[1]-1.66)<.025?.002:0);
 const ribs=(h,y)=>y<.1?mul('#3a1e10',.9):mul(wood(h*3,y,'#a8662f','#6e3a18',30),.88+.12*Math.sin(h*314)**2);
 const ribsB=(p)=>p[1]<.1?0:.0025*Math.sin(p[2]*157)**2;
 const plank=(x,z)=>{const j=Math.floor(x/.07),w=fr(x/.07);if(w<.04)return C('#140a06');const seam=fr((z+h3(j,0,1)*3)/.9);if(seam<.006)return C('#140a06');
   let c=wood(z*.6+j*3.1,x*10,mul('#5a341e',.8+.35*h3(j,2,3)),'#2e180c',38);const wear=Math.exp(-((x-.18)**2)/.06)*.25;return mix(c,'#8a6a50',wear*fbm(x*20,z*8))};
 const plankB=(p)=>{const x=p[0]-cx,w=fr(x/.07);return w<.04?-.002:.0004*fbm(p[2]*30,x*30)};
 const tinH=(p)=>{const u=fr(p[0]/.1),v=fr(p[2]/.1),dx=Math.abs(u-.5),dy=Math.abs(v-.5),m=Math.max(dx,dy),r=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
   let h=0;if(m>.44&&m<.48)h=1;else if(m>.4&&m<.42)h=.5;else if(r<.09+.035*Math.cos(a*8))h=.9;else if(Math.abs(r-.22-.025*Math.cos(a*8))<.02)h=.7;else if(Math.abs(dx-dy)<.018&&m<.38&&m>.12)h=.55;return h};
 const tin=(s,t,p)=>mul('#dccca2',(.82+.2*tinH(p))*(.92+.12*fbm(p[0]*3,p[2]*3)));
 const tinB=(p)=>tinH(p)*.0022;
 shell(R,{wall:brick,bw:brickB,side:(h,y,p,sd)=>sd<0?cream(h,y):ribs(h,y),bl:creamB,br:ribsB,floor:plank,bf:plankB,ceil:tin,bc:tinB});
 // cornice and baseboards
 for(const [x0,x1,z0,z1,sk] of[[-HW,HW,ZB,ZB+.07,'z-'],[-HW,-HW+.07,ZB,FZ,'x-'],[HW-.07,HW,ZB,FZ,'x+'],[-HW,HW,FZ-.07,FZ,'z+']])
   b(x0,1.69,z0,x1,1.8,z1,(s,t,p)=>mul('#d9cba6',.78+.3*Math.abs(Math.sin(p[1]*260))),{skip:sk+'y+',bump:(q)=>.0015*Math.sin(q[1]*260)});
 b(-HW,0,ZB,HW,.06,ZB+.015,'#2a1810',{skip:'z-'});
 // --- front wall: storefront onto Canal Street ---
 const street=(u,v)=>{let c=mix('#1c2232','#0a0c14',v);const bk=[[.12,.72,'#ffb050'],[.3,.62,'#ff3a2a'],[.55,.78,'#5aff9a'],[.72,.6,'#ffd080'],[.9,.7,'#ff6a40'],[.42,.52,'#ffe0b0'],[.65,.46,'#ff4040'],[.2,.4,'#ffd0a0']];
   for(const [bx,by,bc] of bk){const d=Math.hypot(u-bx,(v-by)*1.4);if(d<.09)c=mix(c,bc,(1-d/.09)**1.5*.95)}if(v<.22)c=mix('#24242a','#3e3a3a',v*4);if(Math.abs(v-.3)<.015&&fr(u*3)<.7)c=mix(c,'#ffe8c0',.5);return c};
 quad(W(-HW,0,FZ),[2*HW,0,0],[0,H,0],[0,0,-1],(s,t,p)=>{const h=p[0]-cx,y=p[1];
   if(y>1.58)return cream(h,y);if(y<.42)return fr(h*6)<.04?C('#1e100a'):wood(h*2,y,'#3a2214','#24140a');
   if(h>-.08&&h<.4){if(h<-.05||h>.37||y>1.55||(y<.75&&y>.7))return C('#2a1a10');return y>.75?[...street((h+.05)/.42,(y-.75)/.8),1]:wood(h,y*3,'#3a2214','#24140a')}
   if(y<.47||y>1.53||Math.abs(h+.7)<.022||Math.abs(h-.87)<.022||h<-1.4||h>1.4||Math.abs(h+.1)<.028||Math.abs(h-.42)<.028)return C('#2a1a10');
   const u=h<0?(h+1.4)/1.3:(h-.42)/.98,v=(y-.47)/1.06,hl=fr((u+v)*1.7)<.04?.18:0;return[...mix(street(u,v),[1,1,1],hl),1]},{bump:(q)=>(q[1]<.42?.001*Math.sin((q[0]-cx)*40):0)});
 blob(W(-.7,1.05,FZ-.02),.55,'#9ab0ff',{a:.05});blob(W(.9,1.0,FZ-.02),.5,'#ff8060',{a:.04});
 // --- posters & signs on the cream wall (generic, no text) ---
 const pq=(z0,y0,w,h,fn,tilt=0)=>{const A=AM(AY(Math.PI/2),AZ(0)),c0=W(-HW+.007,y0+h/2,z0+w/2);
   quad(add(c0,[0,-h/2+tilt*w/2,-w/2]),[0,-tilt*w,w],[0,h,0],[1,0,0],(s,t)=>fn(s,t),{sp:.0065*Q});
   for(const [a,c2] of[[0,1],[1,1]])blob(add(c0,[.001,h/2-.006,(a?1:-1)*(w/2-.01)]),.007,'#e8dcc0',{sh:1,a:.7,s:[.2,1,1.4]})};
 pq(.95,.72,.26,.36,(s,t)=>s<.05||s>.95||t<.04||t>.96?C('#c9b48a'):t>.82?(fr(s*9)<.7?C('#2a2420'):C('#c9b48a')):t>.55?(fr(s*7)<.62&&fr(t*14)<.6?C('#2a2420'):C('#c9b48a')):t>.25?(fr(s*5)<.7&&fr(t*10)<.5?C('#3a2a20'):C('#c9b48a')):(fr(s*14)<.5&&fr(t*24)<.5?C('#4a3a2a'):C('#c9b48a')),.02);
 pq(.62,.9,.22,.16,(s,t)=>s<.06||s>.94||t<.08||t>.92?C('#f2f0ea'):jit(mix('#2a2a2e','#e8b0a0',fbm(s*6,t*6)),.1),-.02);
 pq(1.02,1.14,.18,.14,(s,t)=>s<.06||s>.94?C('#f4f2ee'):jit(mix('#1a1a1e','#d8d0c8',fbm(s*7+3,t*7)),.12));
 pq(.78,1.12,.17,.12,(s,t)=>s<.06||s>.94?C('#f4f2ee'):jit(mix('#2a1a1a','#e07050',fbm(s*5,t*5+2)),.12),.03);
 pq(.85,1.36,.2,.24,(s,t)=>s<.05||s>.95||t<.05||t>.95?C('#f6f4f0'):t<.2?C('#202020'):jit(mix('#1e1c1e','#b0a8a0',fbm(s*5+7,t*5)),.1));
 pq(.56,1.26,.11,.15,(s,t)=>t>.82?C('#2a2a2a'):fr(t*12)<.4&&s>.12&&s<.88&&t<.75?C('#3a3020'):C('#f0e090'));
 pq(.58,1.1,.11,.08,(s,t)=>Math.abs(t-.5)<.13&&s>.12&&s<.88?C('#f4f4f4'):C('#1e2a5a'));
 pq(.36,1.5,.15,.11,(s,t)=>s<.08||s>.92||t<.1||t>.9?C('#b08a4a'):fr(t*7)<.3&&s>.2&&s<.8?C('#8a8070'):C('#f1eadc'));
 pq(.53,1.46,.15,.13,(s,t)=>s<.09||s>.91||t<.09||t>.91?C('#d0703a'):t>.7&&s>.2&&s<.8?C('#3a3a3a'):C('#f0e2d0'));
 pq(.2,1.4,.11,.09,(s,t)=>s<.12||s>.88||t<.12||t>.88?C('#151515'):C('#f4f0e6'));
 const chalk=(s,t)=>{if(s<.05||s>.95||t<.06||t>.94)return wood(s*3,t,'#3a2414','#24140a');const ln=Math.floor(t*9),ink=fr(t*9)<.2&&h3(Math.floor(s*36),ln,2)>.3&&s<.3+h3(ln,3,3)*.62;
   return ink?mix('#e8e4d8','#a8b0a8',fbm(s*30,t*30)*.6):mix('#1c201e','#3a403c',fbm(s*8,t*8)*.6)};
 pq(-.05,1.22,.22,.36,chalk);pq(-.75,1.25,.2,.34,chalk);
 // oscillating fan
 {const c=W(-1.3,1.28,.3),A=[[0,1,0],nrm([1,0,-.25]),[0,0,1]];line(W(-HW,1.25,.3),W(-1.36,1.25,.3),.006,'#8a8a8e');cyl(W(-1.37,1.2,.3),.025,.07,'#9a9aa0');
  for(let k=0;k<6;k++)ring(c,[0,1,0],nrm([.25,0,1]),.065-k*.002,.065-k*.002,.002,'#b8b8be',{});for(let k=0;k<8;k++){const a=k/8*Math.PI;line(add(c,[0,Math.cos(a)*.065,Math.sin(a)*.065]),add(c,[0,-Math.cos(a)*.065,-Math.sin(a)*.065]),.0015,'#a8a8ae')}
  for(let k=0;k<3;k++){const a=k/3*PI2;blob(add(c,[-.005,Math.cos(a)*.03,Math.sin(a)*.03]),.024,'#8a8a92',{sh:1,s:[.12,1,.55]})}blob(c,.012,'#555555',{sh:1})}
 // --- back bar ---
 b(-1.45,0,-1.0,-1.18,.5,.75,(s,t,p,id)=>{if(id!='x+')return C('#2a160c');const z=p[2],y=p[1],pz=fr((z+1)/.35),py=y/.5;return(pz<.06||pz>.94||py<.08||py>.92)?C('#1a0e08'):wood(z,y*4,'#4a2a16','#2a160a')},
   {skip:'x-',bump:(q)=>{const pz=fr((q[2]+1)/.35);return pz<.06||pz>.94?-.002:0}});
 b(-1.45,.5,-1.02,-1.15,.53,.77,(s,t,p)=>wood(p[0]*9,p[2],'#3a2214','#1e1008'));
 const bp=[['#6a2a0e','#e8d8b0'],['#c9802a','#1e1e1e'],['#1f4a22','#f0e6c8'],['#d8dcd8','#2a3a6a'],['#8a1414','#f4ecd8'],['#4a2a10','#d8b060'],['#e0c070','#3a2010'],['#18301a','#e8c040'],['#cfc8b0','#9a1a1a'],['#2a1a10','#f0f0e8']];
 const bottle=(base,h,ci,face)=>{const [gc,lc]=bp[ci%bp.length],lev=.55+h3(ci,h*100,1)*.35;
   cyl(base,.016,h,(q,th,yf)=>{const f=Math.cos(th-face);if(f>.2&&yf>.22&&yf<.58){const lf=(yf-.22)/.36;return fr(lf*6)<.18&&f>.6?mul(lc,.4):C(lc)}
     const hl=Math.abs(th-face-.7)<.18||Math.abs(th-face+.9)<.08;const c=yf>lev?mul(gc,.6):C(gc);return hl?mix(c,[1,1,1],.6):c},{glow:.22,a:.92,top:false,sp:.0055*Q});
   cyl(add(base,[0,h,0]),.016,.025,(q,th)=>Math.abs(th-face-.7)<.25?mix(gc,'#ffffff',.5):C(gc),{r1:.0065,glow:.2,a:.92,top:false,sp:.005*Q});
   cyl(add(base,[0,h+.025,0]),.0068,.014,ci%3?'#c9a25a':'#1a1a1a',{sp:.004*Q})};
 {let i=0;for(let z=-.95;z<.7;z+=.036+rnd()*.008)bottle(W(-1.3,.53,z),.07+rnd()*.06,i++,0);
  for(const y of[.92,1.12]){b(-1.45,y,-.9,-1.27,y+.015,.42,(s,t,p)=>wood(p[2]*.5,p[0]*20,'#4a2a16','#2a160a'));for(const z of[-.85,.35])line(W(-1.43,y,z),W(-1.33,y-.07,z),.005,'#1e120a')}
  for(let z=-.85;z<.38;z+=.034)bottle(W(-1.36,1.135,z),.075+rnd()*.05,i++,0);
  for(let z=-.85;z<.38;z+=.03)cyl(W(-1.36,.935,z),.012,.034,(q,th,yf)=>yf>.88?C('#ffffff'):Math.abs(Math.cos(th)-.8)<.15?C('#f4f8fa'):C('#c8d4d8'),{a:.35,e:1,top:false,sp:.004*Q});
  for(const y of[.92,1.12])blob(W(-1.3,y-.02,-.25),.65,'#ffb060',{a:.05,s:[.25,.06,1.1]})}
 quad(W(-HW+.007,.6,-1.2),[0,0,.16],[0,.42,0],[1,0,0],(s,t)=>s<.1||s>.9||t<.05||t>.95?wood(s,t*3,'#3a2214','#1e1008'):[...mix('#7a6a5a','#e0d8cc',t*.7+fr((s+t)*3)*.15),.9],{sp:.008*Q});
 // --- L-shaped mahogany bar ---
 const panel=(s,t,p,id)=>{if(id!='x+'&&id!='z+')return C('#2a160c');const a=id=='x+'?p[2]:p[0],y=p[1],pa=fr((a+2)/.4),py=(y-.06)/.42;
   if(y<.06)return C('#1a0e08');if(pa<.07||pa>.93||py>.92)return wood(a*2,y*3,'#4a2814','#2a160a');return wood(a,y*5,'#3e2010','#24120a')};
 const panelB=(p,s,t)=>{const y=p[1];const a=Math.abs(p[0]-(cx-.28))<.002?p[2]:p[0];const pa=fr((a+2)/.4);return(y<.06||pa<.07||pa>.93||(y-.06)/.42>.92)?.002:0};
 b(-.62,0,-.72,-.28,.55,.88,panel,{bump:panelB});b(-1.12,0,.6,-.28,.55,.88,panel,{bump:panelB});
 const top=(s,t,p)=>{const c=wood(p[2]*2+p[0],p[0]*8,'#3e1a10','#1c0a06',42);let hl=0;for(const g of globes){const d=Math.hypot(p[0]-(cx+g[0]+.05),p[2]-g[2]);hl+=Math.exp(-d*d/.003)*.35}return mix(c,'#ffe2c0',Math.min(.5,hl))};
 b(-.68,.55,-.78,-.2,.6,.95,top);b(-1.18,.55,.54,-.2,.6,.95,top);
 cyl(W(-.66,.08,-.75),.009,1.65,(q,th)=>Math.abs(Math.cos(th)-.7)<.2?C('#fff0c0'):C('#b8903a'),{A:[[1,0,0],[0,0,1],[0,1,0]],sp:.004*Q,top:false});
 for(let z=-.7;z<.9;z+=.4)line(W(-.66,.09,z),W(-.62,.09,z),.005,'#b8903a');
 // taps, register, caddies
 b(-.56,.6,-.6,-.44,.62,-.38,'#9a9aa0');for(let k=0;k<4;k++){const z=-.57+k*.055;cyl(W(-.5,.62,z),.006,.07,'#d0d0d6',{sp:.003*Q});blob(W(-.5,.72,z),.008,['#151515','#c42a1e','#e8e0c8','#2a5aa0'][k],{sh:1,s:[1,2.6,1]})}
 b(-.62,.6,-.32,-.48,.68,-.22,'#1e1e22');quad(W(-.478,.62,-.31),[0,0,.08],[0,.055,0],[1,0,0],()=>[.55,.72,.88,1.15],{sp:.004});
 for(const z of[-.15,.5])b(-.5,.6,z,-.42,.64,z+.05,'#c42a1e');
 // votives
 const votive=p=>{cyl(p,.014,.028,(q,th,yf)=>[...mix('#ff5a3a','#a0140e',yf),.9],{a:.85,top:false,sp:.004*Q});blob(add(p,[0,.034,0]),.005,'#fff0b0',{e:2,f:1,s:[.6,1.4,.6]});
   blob(add(p,[0,.002,0]),.06,'#ff7040',{a:.22,s:[1,.05,1]});blob(add(p,[0,.03,0]),.08,'#ff6a40',{a:.14,f:1})};
 for(const v of votives)votive(W(v[0],v[1],v[2]));
 // --- wooden bar chairs with orange vinyl seats ---
 const chair=(c,A)=>{const wc='#9a5a2a',wd=(q)=>wood(q[1]*3,q[0]+q[2],wc,'#6a3a18',60);
   for(const [dx,dz] of[[-.058,-.058],[.058,-.058],[-.058,.058],[.058,.058]])line(loc(c,A,[dx,0,dz]),loc(c,A,[dx*.88,.42,dz*.88]),.0085,wd);
   ring(loc(c,A,[0,.16,0]),A[0],A[2],.062,.062,.005,wd);ring(loc(c,A,[0,.28,0]),A[0],A[2],.058,.058,.004,wd);
   cyl(loc(c,A,[0,.42,0]),.082,.03,(q,th,yf)=>yf>.8?C('#a8441e'):mul('#6a3a18',.9),{A,sp:.006*Q,top:(q,r)=>r>.9?C('#9a3a18'):mix('#d0602e','#f09060',Math.max(0,1-r*1.6)*.35*(Math.cos(Math.atan2(q[2]-c[2],q[0]-c[0])-.6)+1)/2)});
   for(const dx of[-.055,.055])line(loc(c,A,[dx,.45,.068]),loc(c,A,[dx*1.05,.78,.09]),.008,wd);
   for(let k=0;k<7;k++){const a=(k/6-.5)*1.1;obox(loc(c,A,[Math.sin(a)*.07,.72,.09-(1-Math.cos(a))*.06]),AM(A,AY(-a)),[.012,.045,.009],(s,t,p)=>wd(p),{sp:.006*Q})}
   obox(loc(c,A,[0,.56,.078]),A,[.058,.008,.006],(s,t,p)=>wd(p),{sp:.005*Q});
   blob(loc(c,A,[0,.003,0]),.11,'#000000',{a:.25,s:[1,.02,1]})};
 for(const [x,z,a] of chairsAt)chair(W(x+(rnd()-.5)*.02,0,z),AY(a+(rnd()-.5)*.12));
 // --- right wall drink ledge, photos, AC ---
 b(1.2,.52,-1.15,1.45,.56,1.05,top);for(const z of[-.9,0,.9])line(W(1.44,.42,z),W(1.3,.52,z),.006,'#2a1a10');
 const photo=(o,u,v,n,k)=>quad(o,u,v,n,(s,t)=>{if(s<.05||s>.95||t<.05||t>.95)return C('#121212');if(s<.15||s>.85||t<.15||t>.85)return C('#efece4');
   const g=fbm(s*5+k*3,t*5+k)*.8+(t>.5?.15:0),hl=fr((s+t)*1.3+k)<.05?.25:0;return mix(mul('#d8d6d2',.22+g*.8),[1,1,1],hl)},{sp:.006*Q});
 for(const [z,y,w,k] of[[-.75,1.0,.24,1],[-.1,1.12,.2,2],[.55,1.05,.32,3]])photo(W(HW-.007,y,z+w),[0,0,-w],[0,w*.8,0],[-1,0,0],k);
 photo(W(-.6,.85,ZB+.007),[.26,0,0],[0,.2,0],[0,0,1],5);photo(W(.25,.9,ZB+.007),[.34,0,0],[0,.24,0],[0,0,1],7);
 b(1.3,1.42,.35,1.45,1.6,.95,(s,t,p,id)=>id=='y-'&&fr(p[2]*40)<.5?C('#c8c8c4'):C('#f0eeea'));blob(W(1.3,1.62,.9),.006,'#40ff60',{e:1.5});
 // back tables
 for(const x of[.15,.75]){b(x-.13,.38,-1.05,x+.13,.41,-.79,(s,t,p)=>wood(p[0]*2,p[2]*9,'#4a2414','#2a120a'));line(W(x,0,-.92),W(x,.38,-.92),.011,'#1a1a1a');cyl(W(x,0,-.92),.075,.008,'#1a1a1a');
   blob(W(x,.003,-.92),.2,'#000000',{a:.3,s:[1,.02,.8]})}
 // speakers
 for(const x of[-1.32,1.32])b(x-.08,1.48,-1.2,x+.08,1.62,-1.08,(s,t,p,id)=>id=='z+'&&(fr(p[0]*80)<.5^fr(p[1]*80)<.5)?C('#1e1e20'):C('#141416'));
 // white globe pendants
 for(const [x,y,z] of globes){line(W(x,1.8,z),W(x,y+.1,z),.003,'#a8a8ac');cyl(W(x,1.77,z),.03,.03,'#b8b8bc');cyl(W(x,y+.075,z),.022,.02,'#c8c8cc');
   sph(W(x,y,z),.085,(q,n)=>[...mix('#fff6e6','#e8cca8',(1-n[1])*.6),1.12],{sp:.007*Q,a:.97});blob(W(x,y,z),.32,'#ffe2b8',{a:.16})}
 // ceiling fans
 for(const z of[.35,-.6]){const c=W(.7,1.66,z);line(W(.7,1.8,z),c,.01,'#4a4a50');cyl(add(c,[0,-.045,0]),.04,.055,'#3e3e44',{sp:.006*Q});cyl(add(c,[0,-.06,0]),.025,.015,'#c9a25a');
   for(let k=0;k<4;k++){const A=AY(k*Math.PI/2+.4);obox(loc(add(c,[0,-.02,0]),A,[.17,0,0]),AM(A,AX(.12)),[.13,.004,.034],(s,t,p)=>wood(s*4,t,'#6a4a30','#3a2414',30),{sp:.008*Q})}}
 // disco ball + plant
 line(W(.15,1.8,.75),W(.15,1.6,.75),.002,'#888888');sph(W(.15,1.55,.75),.05,()=>rnd()<.22?[1,1,1,1.7]:jit('#9a9ca4',.45),{sp:.0055,f:0});
 for(let k=0;k<16;k++){const a=rnd()*PI2;blob(W(.15+Math.cos(a)*.045,1.6+rnd()*.04,.75+Math.sin(a)*.045),.012,'#4a7a32',{sh:1,s:[1.3,.35,.6]})}
 // dust motes in the lamp light
 for(let k=0;k<Math.round(50/Q);k++){const g=globes[k%3];blob(W(g[0]+(rnd()-.5)*.5,g[1]-.12-rnd()*.5,g[2]+(rnd()-.5)*.4),.0018,'#fff0d0',{e:1.2,a:.35,f:2})}
}

if(opt.room===3){const R=ROOMS[3],{P,b}=L(R),cx=R.cx,fy=R.fy,FZ=ZF-.02;
 const W=(x,y,z)=>[cx+x,fy+y,z],box2=(x0,y0,z0,x1,y1,z1)=>W(x0,y0,z0).concat(W(x1,y1,z1));
 const wood=(u,v,base,dk,k=55)=>{const g=Math.sin((u+fbm(u*4,v*.8)*.5)*k)*.5+.5;return mix(base,dk,g*g*.5+fbm(u*40,v*5)*.22)};
 const sun=[.25,.8];
 enter(R,[[sun[0],.85,-1.5,[1,.62,.38],1.35,2.6,.35],[-.5,.32,.25,[1,.5,.2],1.25,.75,.05],[1.36,1.15,.18,[1,.3,.55],.45,.55],
   [.6,.25,-.85,[.35,.85,.9],.35,.6],[0,1.62,-.8,[1,.78,.45],.25,1.2],[0,1.62,-.15,[1,.78,.45],.25,1.2],[0,1.62,.5,[1,.78,.45],.25,1.2],[0,1.4,1.1,[.45,.4,.75],.3,1.4]],[.05,.04,.05]);
 ROOM.sky=[.16,.11,.17];ROOM.ground=[.1,.06,.04];
 // shadow casters
 OCC.push(box2(-.15,0,-1.2,1.35,.17,-.5),box2(.95,0,-.3,1.43,.3,.65),box2(-.7,0,-1.15,-.38,.22,-.5),box2(-.67,0,.08,-.33,.09,.42));
 for(const x of[-1.1,-.4,.3,1.0])OCC.push(box2(x,1.7,ZB,x+.06,1.78,ZF));
 for(let z=-1.1;z<1.3;z+=.22)OCC.push(box2(-HW,1.66,z,HW,1.7,z+.03));
 // --- sunset view (back wall) ---
 const seg=(px,py,ax,ay,bx,by)=>{const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy)));return[Math.hypot(px-ax-dx*t,py-ay-dy*t),t]};
 const palm=(h,y,bx,lean,top=1.3)=>{const cyy=top,cxx=bx+lean;const [dt,tt]=seg(h,y,bx,.55,cxx,cyy);if(dt<.02-tt*.009&&y>.55)return 1;
   for(let k=0;k<9;k++){const a=k/9*Math.PI*1.25-.1,ex=cxx+Math.cos(a+Math.PI*.9)*.3,ey=cyy+Math.sin(a+Math.PI*.9)*.12-.06;const [d,t]=seg(h,y,cxx,cyy,ex,ey-.05);if(d<.022*(1-t)+.003)return 1}return 0};
 const HZ=.62;
 const skyc=(h,y)=>{let c=mix(mix(mix('#ffd896','#f39062',ss(HZ,.95,y)),'#b65f7c',ss(.95,1.3,y)),'#463a70',ss(1.3,1.8,y));
   const cl=ss(.52,.68,fbm(h*1.5+3,y*5.5))*ss(.72,.85,y)*(1-ss(1.45,1.6,y));if(cl>0){const lit=mix('#ffb48a','#7a4a6a',ss(0,.5,fbm(h*3,y*9)));c=mix(c,lit,cl*.85)}
   const r=Math.hypot(h-sun[0],y-sun[1]);if(r<.12)return[...mix('#fff6da','#ffd27a',(r/.12)**2),1.45];c=mix(c,'#ffe0a0',Math.exp(-r*r/.06)*.5);return[...c,1]};
 const view=(h,y)=>{if(y>HZ){if(palm(h,y,-1.2,.14)||palm(h,y,1.18,-.16,1.38)||palm(h,y,-.95,.06,1.1))return[.13,.07,.1,1];
     if(y<HZ+.11*Math.exp(-(((h+.85)/.3)**2))){return h3(Math.floor(h*90),Math.floor(y*90),1)>.985?[1,.8,.5,1.4]:[...mix('#3c2a46','#5a3a50',(y-HZ)*6),1]}return skyc(h,y)}
   let c=mix(mix('#f0a06e','#3a5a7a',ss(HZ,HZ-.18,y)),'#163448',ss(HZ-.18,0,y));const wv=fr(y*70+Math.sin(h*22)*.4+fbm(h*4,y*30)*.8);c=mul(c,wv<.25?.85:1.03);
   const col=Math.abs(h-sun[0])<.035+(HZ-y)*.35;if(col&&h3(Math.floor(h*160),Math.floor(y*220),3)>.55)c=mix(c,'#ffe2a8',.75*(1-(HZ-y)*1.2));return[...c,1]};
 // --- materials ---
 const stucco=(h,y)=>y<.08?mul('#c56a42',.85+.25*h3(Math.floor(h/.06),0,3)):mul('#efe2d0',.92+.1*fbm(h*14,y*14));
 const stuccoB=(p)=>p[1]-fy<.08?(fr(p[2]/.06)<.08?-.0015:0):.0012*fbm(p[2]*60,p[1]*60)+.0006*fbm(p[2]*200,p[1]*200);
 const deck=(x,z)=>{const j=Math.floor(z/.065),w=fr(z/.065);if(w<.05)return C('#2a1a0e');if(fr((x+h3(j,0,0)*3)/.75)<.006)return C('#2a1a0e');
   return wood(x*.7+j*2.3,z*12,mul('#a87048',.82+.3*h3(j,1,2)),'#6a4226',30)};
 const deckB=(p)=>fr(p[2]/.065)<.05?-.002:.0004*fbm(p[0]*40,p[2]*40);
 shell(R,{wall:view,side:(h,y,p,sd)=>stucco(h,y),bl:stuccoB,br:stuccoB,floor:deck,bf:deckB,
   ceil:(s,t,p)=>[...mix('#6a4a80','#3a3366',s*.3+t*.7),1]});
 // pergola beams and slats
 for(const x of[-1.1,-.4,.3,1.0])b(x,1.7,ZB,x+.06,1.78,FZ,(s,t,p)=>wood(p[2]*.3,p[1]*20,'#b07a4a','#7a4a28'),{skip:'y+'});
 for(let z=-1.1;z<1.3;z+=.22)b(-HW,1.66,z,HW,1.7,z+.03,(s,t,p)=>wood(p[0]*.3,p[2]*30,'#c08a58','#80502c'),{skip:'y+'});
 // --- fourth wall: dusk over the sea ---
 quad(W(-HW,0,FZ),[2*HW,0,0],[0,H,0],[0,0,-1],(s,t,p)=>{const h=p[0]-cx,y=p[1]-fy;
   if(y<.42){return y<.38?[...mix('#ece4d8','#d8cebe',fbm(h*20,y*20)),0]:C('#f4ece0')}
   if(y<.6){let c=mix('#3a4a7a','#101a30',(.6-y)*3);if(fr(h*7+.3)<.05&&y>.56)return[1,.85,.5,1.6];return[...c,1]}
   const m=Math.hypot(h+.55,y-1.32);if(m<.08)return[.98,.97,.92,1.35];if(h3(Math.floor(h*90),Math.floor(y*90),4)>.986&&y>.85)return[1,1,.95,1.4];
   return[...mix(mix('#e8906a','#6a4a8a',ss(.6,.95,y)),'#1a1a3a',ss(.95,1.8,y)),1]},{bump:(q)=>q[1]-fy<.38?.001*fbm(q[0]*60,q[1]*60):0});
 for(let x=-1.4;x<1.42;x+=.12)cyl(W(x,.4,FZ-.03),.012,.2,'#f4ece0',{sp:.005*Q});b(-HW,.6,FZ-.05,HW,.63,FZ,'#f4ece0');
 // --- plunge pool: rim, tiled walls under translucent water, underwater light ---
 const stone=(s,t,p)=>mul('#e8ddcc',.86+.16*fbm(p[0]*30,p[2]*30+p[1]*30));
 const rim=(x0,z0,x1,z1)=>b(x0,0,z0,x1,.17,z1,stone,{bump:(q)=>.0008*fbm(q[0]*80,q[2]*80+q[1]*80)});
 rim(-.15,-1.2,1.35,-1.12);rim(-.15,-.58,1.35,-.5);rim(-.15,-1.12,-.07,-.58);rim(1.27,-1.12,1.35,-.58);
 const tile=(u,v)=>(fr(u/.022)<.1||fr(v/.022)<.1)?C('#d8f0f0'):mul(h3(Math.floor(u/.022),Math.floor(v/.022),2)<.2?'#2a8aa8':'#3aa8c0',.85+.2*h3(Math.floor(v/.022),Math.floor(u/.022),5));
 quad(W(-.07,.02,-1.12),[1.34,0,0],[0,0,.54],[0,1,0],(s,t,p)=>[...tile(p[0],p[2]),.75]);
 quad(W(-.07,.02,-.58),[1.34,0,0],[0,.12,0],[0,0,-1],(s,t,p)=>[...tile(p[0],p[1]),.8]);quad(W(-.07,.02,-1.12),[1.34,0,0],[0,.12,0],[0,0,1],(s,t,p)=>[...tile(p[0],p[1]),.8]);
 quad(W(-.07,.02,-1.12),[0,0,.54],[0,.12,0],[1,0,0],(s,t,p)=>[...tile(p[2],p[1]),.8]);quad(W(1.27,.02,-1.12),[0,0,.54],[0,.12,0],[-1,0,0],(s,t,p)=>[...tile(p[2],p[1]),.8]);
 quad(W(-.07,.145,-1.12),[1.34,0,0],[0,0,.54],[0,1,0],(s,t,p)=>{const x=p[0]*34,z=p[2]*34,v=Math.sin(x+Math.sin(z*1.1)*2)*Math.sin(z*1.2+Math.sin(x*.8)),back=ss(-.75,-1.12,p[2]);
   let c=mix('#1f7a96','#8ae6ea',.5+.5*v);c=mix(c,'#ffb47a',back*.55*(Math.abs((p[0]-cx)-sun[0])<.12?1:.45));return[...c,.95,.62]},{f:8,sp:.012*Q});
 for(const x of[.2,.9])blob(W(x,.06,-.585),.05,'#9ff8ff',{e:1.4,a:.6});blob(W(.6,.15,-.85),.55,'#5fd8e8',{a:.07,s:[1.3,.15,.5]});
 // sun loungers by the pool
 for(const x of[-.66,-.44]){const c0=W(x,0,-.85);for(const [dx,dz] of[[-.08,-.28],[.08,-.28],[-.08,.26],[.08,.26]])line(add(c0,[dx,0,dz]),add(c0,[dx,.1,dz]),.007,'#e8e0d0');
   b(x-.1,.1,-1.15,x+.1,.12,-.55,(s,t,p)=>wood(p[0]*9,p[2],'#b07a4a','#7a4a28',40));
   obox(add(c0,[0,.135,.08]),I3,[.095,.015,.2],(s,t,p,id)=>fr((p[0]-c0[0])*30)<.5?C('#f4f0e8'):C('#3aa0b0'),{sp:.006*Q});
   obox(add(c0,[0,.2,-.24]),AX(-.7),[.095,.015,.09],(s,t,p,id)=>fr((p[0]-c0[0])*30)<.5?C('#f4f0e8'):C('#3aa0b0'),{sp:.006*Q});
   blob(add(c0,[0,.003,0]),.32,'#000000',{a:.25,s:[.4,.02,1]})}
 // rolled towels + cocktails on the pool edge
 for(const x of[.1,1.15])cyl(W(x-.06,.18,-1.16),.025,.12,(q,th,yf)=>fr(yf*6)<.5?C('#f4f0e8'):C('#e86a5a'),{A:[[0,1,0],[1,0,0],[0,0,1]],sp:.005*Q});
 for(const x of[.3,.46]){cyl(W(x,.17,-.54),.02,.06,(q,th,yf)=>Math.abs(Math.cos(th)+.6)<.2?C('#ffffff'):C('#dfe8ec'),{a:.32,e:1,top:false,sp:.004*Q});
   cyl(W(x,.172,-.54),.018,.044,(q,th,yf)=>[...mix('#ff5a3a','#ffb050',yf),.55],{a:.85,sp:.004*Q});blob(W(x+.012,.218,-.54),.008,'#ffcc30',{sh:1});
   cyl(W(x-.005,.245,-.54),.028,.012,(q,th)=>Math.floor(th/PI2*8)%2?C('#ff5f8a'):C('#ffe0ea'),{r1:.002,sp:.004*Q});line(W(x,.2,-.54),W(x-.02,.27,-.54),.0025,'#f6f0e8')}
 // --- fire pit with flames, embers and stone bowl ---
 cyl(W(-.5,0,.25),.17,.09,(q,th,yf)=>mul('#8b847c',.68+.42*h3(Math.floor(th*4),Math.floor(yf*3),4)),{top:(q,r)=>r<.72?[...mix('#ff8a3a','#2a0c06',(r/.72)**.7),1.25]:jit('#9a938a',.15),sp:.009*Q});
 for(let k=0;k<12;k++){const a=k/12*PI2;obox(W(-.5+Math.cos(a)*.07,.1,.25+Math.sin(a)*.07),AM(AY(a),AZ(.5)),[.05,.008,.008],'#3a2414',{sp:.005*Q})}
 for(let k=0;k<Math.round(420/Q);k++){const y=rnd()**1.4*.36,rr=(1-y/.36)*.085*Math.sqrt(rnd()),a=rnd()*PI2,t=y/.36;
   const c=t<.3&&rr<.04?mix('#fff4c0','#ffb347',t*3):t<.65?mix('#ffb347','#ff6a1a',(t-.3)/.35):mix('#ff6a1a','#a8201a',(t-.65)/.35);
   blob(W(-.5+Math.cos(a)*rr,.1+y,.25+Math.sin(a)*rr),.008+rnd()*.012,c,{e:1.5,a:.5,f:1,s:[1,1.9,1]})}
 for(let k=0;k<40;k++)blob(W(-.5+(rnd()-.5)*.1,.16+rnd()*.1,.25+(rnd()-.5)*.1),.0028,'#ffb060',{e:2,f:4});
 blob(W(-.5,.3,.25),.55,'#ff8a3a',{a:.17,f:1});blob(W(-.5,.003,.25),.45,'#ff7a30',{a:.18,s:[1,.02,1],f:1});
 // --- curved outdoor sofa + colourful bean bags around the fire ---
 const rattan=(s,t,p)=>mul('#a07848',.7+.35*Math.abs(Math.sin(p[0]*300+p[1]*300)*Math.sin(p[2]*300-p[1]*300)));
 for(let k=0;k<5;k++){const a=Math.PI*.55+k*.22,c0=W(-.5+Math.cos(a)*.5,0,.25+Math.sin(a)*.5),A=AY(-a+Math.PI/2);
   obox(add(c0,[0,.07,0]),A,[.11,.07,.09],rattan,{sp:.007*Q});obox(add(c0,[0,.165,0]),A,[.105,.025,.085],(s,t,p)=>mul('#f6f0e6',.94+.08*fbm(p[0]*50,p[2]*50)),{sp:.007*Q});
   obox(loc(c0,A,[0,.24,.08]),AM(A,AX(.15)),[.105,.07,.02],(s,t,p)=>mul('#f6f0e6',.94+.08*fbm(p[1]*50,p[0]*50)),{sp:.007*Q})}
 for(const [x,z,c,pat] of[[-1.05,-.15,'#e0735e',0],[-.05,.72,'#3a8f8c',1],[-.98,.66,'#e3a548',2],[.2,.2,'#f2a0b8',0]])
   sph(W(x,.09,z),.15,(q,n)=>{const g=fbm(n[0]*20+5,n[2]*20+n[1]*20);let cc=mul(c,.88+.18*g);if(pat==1&&fr(n[1]*5)<.25)cc=mix(cc,'#f4f0e8',.8);if(pat==2&&fr((n[0]+n[2])*4)<.3)cc=mix(cc,'#f4f0e8',.7);return cc},{s:[1,.6,1]});
 for(const [x,z] of[[-1.05,-.15],[-.05,.72],[-.98,.66],[.2,.2]])blob(W(x,.003,z),.2,'#000000',{a:.28,s:[1,.02,1]});
 // --- daybed with patterned cushions, the phone that just lit up ---
 b(.95,0,-.3,1.43,.18,.65,rattan,{bump:(q)=>.0006*Math.sin(q[0]*300+q[1]*300)});
 b(.97,.18,-.28,1.41,.27,.63,(s,t,p)=>mul('#fbf6ee',.93+.08*fbm(p[0]*40,p[2]*40)),{bump:(q)=>.0012*fbm(q[0]*30,q[2]*30)});
 const stripe=(c1,c2,k=30)=>(s,t,p)=>fr((p[1]+p[2])*k)<.5?C(c1):C(c2);
 obox(W(1.34,.37,-.1),AZ(.35),[.035,.1,.12],stripe('#3a8f8c','#f4f0e8'));obox(W(1.34,.37,.28),AZ(.35),[.035,.1,.12],stripe('#e0735e','#f8e0c8'));
 obox(W(1.25,.33,.5),AM(AZ(.25),AY(.4)),[.03,.07,.07],(s,t,p)=>Math.hypot(fr(p[1]*40)-.5,fr(p[2]*40)-.5)<.25?C('#ff5f8a'):C('#ffe8f0'));
 const PA=AY(.4);obox(W(1.12,.277,.18),PA,[.024,.004,.048],'#151518');quad(loc(W(1.12,.282,.18),PA,[-.02,0,-.043]),sc(PA[0],.04),sc(PA[2],.086),[0,1,0],(s,t)=>t>.55&&t<.75&&s>.15&&s<.85?[1,.45,.62,1.4]:[.95,.88,.92,1.25],{sp:.004});
 blob(W(1.12,.3,.18),.08,'#ffc0d6',{a:.3,f:1});
 // --- neon heart (glass tube + glow) on the right wall ---
 {const n=Math.round(260/Q);for(let k=0;k<n;k++){const t=k/n*PI2,hx=16*Math.sin(t)**3,hy=13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);
   const p=W(HW-.02,1.15+hy*.011,.18+hx*.011);blob(p,.005,'#fff0f4',{e:1.5});blob(p,.009,'#ff5c90',{e:1.4,a:.7});if(k%6==0)blob(add(p,[-.01,0,0]),.05,'#ff4f8a',{a:.1,f:1})}
  for(const dz of[-.12,.12])line(W(HW,1.32,.18+dz),W(HW-.02,1.28,.18+dz),.002,'#c8c8cc')}
 // --- bougainvillea climbing the left wall ---
 {const vines=[];for(let k=0;k<5;k++){let z=-1.12+k*.07,y=0,pr=W(-HW+.015,0,z);const pts=[];for(let s=1;s<=14;s++){y=s*.12;z+=Math.sin(s*.9+k*2)*.05+.045+(y>1.2?.06:0);if(y>1.62)y=1.62;const p=W(-HW+.016,y,z);line(pr,p,.0045-s*.0002,'#5a3a24');pts.push(p);pr=p}vines.push(pts)}
  const NC=Math.round(70/Math.sqrt(Q));for(let c=0;c<NC;c++){const v=vines[c%5],p0=v[4+Math.floor(rnd()*(v.length-4))],ctr=add(p0,[.012,(rnd()-.4)*.1,(rnd()-.5)*.12]),R0=.045+rnd()*.05;
   for(let k=0;k<Math.round(26/Q);k++){const a=rnd()*PI2,r=Math.sqrt(rnd())*R0,p=add(ctr,[rnd()*.03,Math.sin(a)*r*.8,Math.cos(a)*r]);
     if(rnd()<.42){const fc=mix('#c41a6a','#ff5aa8',rnd()*.8);for(let q=0;q<3;q++)blob(add(p,[.003,(rnd()-.5)*.012,(rnd()-.5)*.012]),.0055+rnd()*.003,fc,{sh:1,s:[.45,1,1.15]})}
     else blob(p,.008+rnd()*.005,mix('#24481f','#4f7a3a',rnd()),{sh:1,s:[.35,.8,1.4]})}}}
 // --- string lights draped under the pergola ---
 for(const z of[-.8,-.15,.5]){const n=30;let pr=null;for(let k=0;k<=n;k++){const t=k/n,p=W(-HW+t*2*HW,1.64-.13*4*t*(1-t),z);if(pr)line(pr,p,.0022,'#2a1e18');pr=p;
   if(k%2==1){const q=add(p,[0,-.018,0]);blob(q,.011,'#ffe0a0',{e:1.7,f:1,s:[1,1.25,1]});blob(q,.004,'#fff8e0',{e:2.2});blob(q,.045,'#ffc070',{a:.2})}}}
 // --- potted palm, succulents and floor lanterns ---
 cyl(W(-1.22,0,1.0),.1,.18,(q,th,yf)=>mul('#b8643e',.85+.2*fbm(th*3,yf*6)),{r1:.12,top:(q,r)=>r>.88?C('#a85a38'):jit('#3a2418',.2),sp:.008*Q});
 line(W(-1.22,.17,1.0),W(-1.17,.7,.98),.016,(q)=>mul('#6b4a2e',fr(q[1]*40)<.3?.7:1));
 for(let k=0;k<11;k++){const a=k/11*PI2;let pr=W(-1.17,.7,.98);for(let s=1;s<=6;s++){const p=add(W(-1.17,.7,.98),[Math.cos(a)*s*.045,.035*s-.009*s*s,Math.sin(a)*s*.045]);
   line(pr,p,.003,'#3a6a32');for(const sd of[-1,1])line(p,add(p,[Math.cos(a+sd*1.4)*.035,-.02,Math.sin(a+sd*1.4)*.035]),.0035,mix('#3f7a3a','#5a9a4a',rnd()));pr=p}}
 for(const [x,z] of[[.75,.95],[.45,1.05]]){cyl(W(x,0,z),.05,.06,'#e8ddcc',{sp:.006*Q});for(let k=0;k<14;k++){const a=rnd()*PI2;blob(W(x+Math.cos(a)*.025,.07+rnd()*.03,z+Math.sin(a)*.025),.012,mix('#5a8a6a','#8ab08a',rnd()),{sh:1,s:[.5,1.4,.5]})}}
 for(const [x,z] of[[-1.25,.45],[.55,-.4],[.92,.85]]){const c0=W(x,0,z);cyl(c0,.035,.11,(q,th,yf)=>fr(th*3)<.5&&yf>.15&&yf<.85?[1,.72,.4,.9]:C('#8a6a3a'),{sp:.005*Q});
   cyl(add(c0,[0,.11,0]),.035,.03,'#8a6a3a',{r1:.008,sp:.005*Q});blob(add(c0,[0,.055,0]),.12,'#ffb060',{a:.16,f:1});blob(add(c0,[0,.003,0]),.12,'#ffa050',{a:.2,s:[1,.02,1]})}
}
// ================= EXTERIOR =================
if(!HQ){
ROOM={lights:[{p:[-7,11,9],c:[1,.82,.62],i:2.3,r:14},{p:[7,4,8],c:[.55,.48,.62],i:.6,r:10},{p:[0,2,4],c:[1,.75,.5],i:.5,r:4}],amb:[.16,.12,.12],box:null};
const siding=(s,t,p)=>{const r=fr(p[1]/.12);return mul('#7d998a',(r<.12?.7:.93+.07*r)*(.97+.06*rnd()))};
const ivory='#efe3cf';
box(-3.12,-.02,-1.38,-2.95,5.84,1.3,(s,t,p,id)=>id=='x-'?siding(s,t,p):jit(ivory,.04),{skip:'x+y-z-',sp:SP*1.25});
box(2.95,-.02,-1.38,3.12,5.84,1.3,(s,t,p,id)=>id=='x+'?siding(s,t,p):jit(ivory,.04),{skip:'x-y-z-',sp:SP*1.25});
quad([-3.12,-.02,-1.38],[6.24,0,0],[0,5.86,0],[0,0,-1],siding,{sp:SP*1.7});
const slab=(s,t)=>t<.18||t>.82?C(ivory):fr(s*60)<.5?C('#7a4c2c'):C('#6b4228');
for(const y of[1.8,3.75,5.7])quad([-3.12,y,1.3],[6.24,0,0],[0,.14,0],[0,0,1],slab,{sp:.03});
for(const fy of[0,1.95,3.9])quad([-.05,fy,1.3],[.1,0,0],[0,1.8,0],[0,0,1],ivory,{sp:.03});
// plinth + brass plate
box(-3.4,-.3,-1.6,3.4,0,1.65,(s,t,p,id)=>id=='y+'?jit('#5a3624',.06):mul('#4a2c1e',.85+.25*Math.sin(p[0]*7+fbm(p[0],p[1]*9)*4)),{skip:'y-',sp:SP*1.4});
box(-.35,-.2,1.65,.35,-.1,1.66,'#c9a25a');
// roof
const shingle=(s,t,p)=>{const row=Math.floor(s*14),f=fr(s*14),cc=Math.floor(p[2]/.14+(row&1)*.5);return mul('#6a3b34',(.72+.32*h3(row,cc,5))*(f<.12?.55:1)*(fr(p[2]/.14+(row&1)*.5)<.05?.6:1))};
for(const sg of[-1,1])quad([sg*3.35,5.74,-1.6],[-sg*3.35,1.72,0],[0,0,3.2],nrm([sg*1.72,3.35,0]),shingle,{sp:SP*1.3});
for(const z of[1.6,-1.6])for(const sg of[-1,1])line([sg*3.35,5.74,z],[0,7.46,z],.035,ivory);
line([0,7.47,-1.62],[0,7.47,1.62],.04,'#4a2824');
const gable=z=>quad([-3.1,5.84,z],[6.2,0,0],[0,1.6,0],[0,0,z>0?1:-1],(s,t,p)=>{const y=p[1],hw=3.35*(7.44-y)/1.7;if(Math.abs(p[0])>hw)return null;
  if(z>0){const d=Math.hypot(p[0],y-6.55);if(d<.3)return Math.abs(p[0])<.015||Math.abs(y-6.55)<.015?C('#3a2a20'):[...mix('#ffd48a','#f0a050',d/.3),1.15];if(d<.36)return C('#5a3a28')}
  return fr(p[0]*8)<.07?mul(ivory,.75):jit(ivory,.04)},{sp:SP*(z>0?1:1.6)});
gable(1.31);gable(-1.39);
blob([0,6.55,1.36],.5,'#ffc070',{a:.12});
box(1.55,6.3,-.7,1.95,7.75,-.3,(s,t,p)=>{const r=Math.floor(p[1]/.07),u=(p[0]+p[2])/.14+(r&1)*.5;return(fr(p[1]/.07)<.15||fr(u)<.07)?C('#c9b8a0'):mul('#8a3a2a',.8+.35*h3(Math.floor(u),r,2))});
box(1.5,7.75,-.75,2.0,7.82,-.25,'#5a3a30');
for(let k=0;k<34;k++)blob([1.75+(rnd()-.5)*.2,7.85+rnd()*.3,-.5+(rnd()-.5)*.2],.1+rnd()*.12,'#cfc2b8',{a:.1,f:4});
// bushes
for(const x of[-3.18,3.18])sph([x,.16,1.45],.16,(p,n)=>mul('#4f6e3e',.7+.5*h3(Math.floor(n[0]*6),Math.floor(n[1]*6),Math.floor(n[2]*6))),{});
// tabletop
quad([-8,-.3,-6],[16,0,0],[0,0,13],[0,1,0],(s,t,p)=>{const g=Math.sin(p[2]*3+fbm(p[2]*.7,p[0]*5)*6),d=Math.hypot(p[0],(p[2]-1)*1.15);
  const c=mix('#5a3a26','#7e5638',.5+.5*g);return[...c.map(v=>v),undefined,Math.max(0,Math.min(1,1-(d-4.5)/4.5))]},{sp:.15*Math.sqrt(Q)});
// giant pencil
{const ax=nrm([1,0,.12]),A=[[0,1,0],ax,cross([0,1,0],ax)],b0=[-4.6,-.1,3.1];
 const at=t=>add(b0,sc(ax,t));
 cyl(at(0),.2,.3,'#d98a8a',{A,bot:'#d98a8a',top:false,sp:.05});cyl(at(.3),.205,.28,(p,th,yf)=>fr(yf*5)<.3?C('#8f9096'):C('#c2c3c8'),{A,top:false,sp:.05});
 cyl(at(.58),.2,4.2,(p,th)=>mul('#d9a62e',.85+.15*Math.cos(Math.round(th/PI2*6)*PI2/6*1+.5)),{A,top:false,sp:.05});
 cyl(at(4.78),.2,.62,'#e3c08f',{A,r1:.05,top:false,sp:.04});cyl(at(5.4),.05,.15,'#3a3a3e',{A,r1:.004,top:false,sp:.02})}
// giant teacup
{const c=[5.0,-.3,-2.4];cyl(c,1.0,.04,'#f2ede6',{sp:.06,top:(p,r)=>r>.8&&r<.86?C('#3a5a8a'):jit('#f2ede6',.03)});
 cyl(add(c,[0,.04,0]),.5,.85,(p,th,yf)=>yf>.78&&yf<.84?C('#3a5a8a'):jit('#f2ede6',.03),{r1:.72,sp:.06,top:(p,r)=>r>.95?C('#f2ede6'):jit('#7a4a24',.05),j:.03});
 ring(add(c,[.85,.5,0]),[1,0,0],[0,1,0],.18,.22,.045,'#f2ede6');
 for(let k=0;k<26;k++)blob(add(c,[(rnd()-.5)*.6,1.0+rnd()*.4,(rnd()-.5)*.6]),.15+rnd()*.12,'#e8ddd4',{a:.07,f:4})}

}
return{pos,cov,col,flg,n:pos.length/3};
}
if(typeof module!=='undefined')module.exports=buildWorld;
