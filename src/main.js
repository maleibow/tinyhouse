{
const $=s=>document.querySelector(s);
const cv=$('#c'),loadEl=$('#load');
const MOBILE=matchMedia('(pointer:coarse)').matches||Math.min(innerWidth,innerHeight)<620;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const INFO=[
 {name:'The Reading Nook',theme:'Books',dot:'#5f8a6a',blurb:'Shelves to the ceiling, a rolling ladder, a globe and one lamp still on well past midnight. Moonlight comes in through the side window.'},
 {name:'The Picture Palace',theme:'Film',dot:'#b3263a',blurb:'Velvet seats and red curtains. A humming projector throws its beam through floating dust onto a countdown leader that never quite reaches one.'},
 {name:'The Reunion Lounge',theme:'The Real Housewives',dot:'#e7a9a3',blurb:'A crystal chandelier, champagne on ice, leopard-print pillows and a glass of rosé that someone definitely knocked over on purpose.'},
 {name:'The Villa Terrace',theme:'Love Island',dot:'#f08a5d',blurb:'Sunset over a plunge pool, a fire pit for the big chats, a neon heart, and a phone on the daybed that just lit up.'},
 {name:'The Curd Cellar',theme:'Wisconsin cheese',dot:'#e9b44c',blurb:'Shelves of aging wheels, a gingham table with a holey wedge and squeaky curds, a wedge hat on the barrel and one very proud cow.'},
 {name:'Clandestino',theme:'Chinatown bar · 35 Canal St',dot:'#d63a2f',blurb:'A long, narrow barroom under a cream pressed-tin ceiling: an L-shaped mahogany bar with orange-seated wooden chairs, a cream wall covered in flyers, ribbed wood along the drink ledge, exposed brick at the back, globe lights and red votives.'}];
const ROOMS=[[-1.5,3.9],[1.5,3.9],[-1.5,1.95],[1.5,1.95],[-1.5,0],[1.5,0]];
const gl=cv.getContext('webgl2',{antialias:false,alpha:true,premultipliedAlpha:true,powerPreference:'high-performance'});
if(!gl){loadEl.innerHTML='<p>This dollhouse needs WebGL2. Try a recent version of Chrome, Safari or Firefox.</p>';}
else setTimeout(start,40);

function start(){
const t0=performance.now();
const DETAIL=[0,1,2,3,4,5],pend=new Set(),MAXD=MOBILE?2:6;
function ensureDetail(k){const id='r'+k;if(!DETAIL.includes(k)||sets[id]||pend.has(id)||!sets.base)return;pend.add(id);gw.postMessage({id,Q:MOBILE?1.35:1,room:k})}
function dropSet(id){const s=sets[id];if(!s)return;gl.deleteTexture(s.tex);gl.deleteBuffer(s.ixb);gl.deleteVertexArray(s.vao);delete sets[id]}
// ---- generation worker: builds and packs splat sets off the main thread ----
const gsrc=buildWorld.toString()+`
const fb=new Float32Array(1),ib=new Uint32Array(fb.buffer);
const half=v=>{fb[0]=v;const f=ib[0],s=(f>>>31)&1,e=(f>>>23)&255;let m=f&0x7fffff,ne;
  if(e==0)ne=0;else if(e<113){ne=0;m|=0x800000;m>>=(113-e);if(m&0x1000000){ne=1;m=0}}else if(e<142)ne=e-112;else{ne=31;m=0}return(s<<15)|(ne<<10)|(m>>13)};
const ph=(a,b)=>(half(a*1000)|(half(b*1000)<<16))>>>0;
onmessage=e=>{const {id,Q,room}=e.data,W=buildWorld(Q,room===undefined?{}:{room}),N=W.n,rows=Math.max(1,Math.ceil(N/1024)),data=new Uint32Array(2048*rows*4),fdat=new Float32Array(data.buffer);
 for(let i=0;i<N;i++){const o=8*i,c=W.cov,k=6*i,q=4*i;fdat[o]=W.pos[3*i];fdat[o+1]=W.pos[3*i+1];fdat[o+2]=W.pos[3*i+2];data[o+3]=W.flg[i];
  data[o+4]=ph(c[k],c[k+1]);data[o+5]=ph(c[k+2],c[k+3]);data[o+6]=ph(c[k+4],c[k+5]);data[o+7]=(W.col[q]|(W.col[q+1]<<8)|(W.col[q+2]<<16)|(W.col[q+3]<<24))>>>0}
 const P=new Float32Array(W.pos);postMessage({id,N,rows,data,P},[data.buffer,P.buffer])}`;
const gw=new Worker(URL.createObjectURL(new Blob([gsrc],{type:'text/javascript'})));

const vs=`#version 300 es
precision highp float;precision highp int;precision highp usampler2D;
uniform usampler2D u_tex;uniform mat4 proj,view;uniform vec2 focal,viewport;uniform float time;uniform int uRoom;
in vec2 position;in int index;out vec4 vColor;out vec2 vPos;
void main(){
 uint ui=uint(index);ivec2 tc=ivec2(int((ui&1023u)<<1),int(ui>>10));
 uvec4 a=texelFetch(u_tex,tc,0),b=texelFetch(u_tex,tc+ivec2(1,0),0);
 vec3 p=uintBitsToFloat(a.xyz);uint fl=a.w;float ph=float(ui%997u)*.618;
 int wr=int((fl>>8)&7u);if(wr!=0&&wr!=uRoom){gl_Position=vec4(0,0,2,1);return;}
 vec4 col=vec4(float(b.w&255u),float((b.w>>8)&255u),float((b.w>>16)&255u),float(b.w>>24))/255.;
 if((fl&1u)!=0u)col.a*=.74+.26*sin(time*(3.+mod(ph,4.))+ph*7.);
 if((fl&2u)!=0u)p+=vec3(sin(time*.5+ph),sin(time*.37+ph*1.7)*1.3,cos(time*.43+ph*2.3))*.018;
 if((fl&4u)!=0u){float k=fract(time*.3+ph*.13);p.y+=k*.4;p.x+=sin(time*2.+ph)*.03*k;col.a*=(1.-k)*smoothstep(0.,.15,k);}
 if((fl&8u)!=0u)col.rgb*=.85+.22*sin(time*1.6+p.x*40.+p.z*30.);
 if((fl&16u)!=0u){float k=fract(time*.6+ph*.13);p.y+=k*.05;col.a*=1.-k;}
 vec4 cam=view*vec4(p,1.);
 if(cam.z<.015){gl_Position=vec4(0,0,2,1);return;}
 vec4 p2=proj*cam;float clip=1.2*p2.w;
 if(abs(p2.x)>clip||abs(p2.y)>clip){gl_Position=vec4(0,0,2,1);return;}
 vec2 u1=unpackHalf2x16(b.x),u2=unpackHalf2x16(b.y),u3=unpackHalf2x16(b.z);
 mat3 Vrk=mat3(u1.x,u1.y,u2.x,u1.y,u2.y,u3.x,u2.x,u3.x,u3.y)*.001;
 mat3 J=mat3(focal.x/cam.z,0.,-(focal.x*cam.x)/(cam.z*cam.z),0.,-focal.y/cam.z,(focal.y*cam.y)/(cam.z*cam.z),0.,0.,0.);
 mat3 T=transpose(mat3(view))*J;mat3 c2=transpose(T)*Vrk*T;c2[0][0]+=.3;c2[1][1]+=.3;
 float mid=(c2[0][0]+c2[1][1])*.5,rad=length(vec2((c2[0][0]-c2[1][1])*.5,c2[0][1])),l1=mid+rad,l2=mid-rad;
 if(l2<0.){gl_Position=vec4(0,0,2,1);return;}
 vec2 dg=normalize(vec2(c2[0][1],l1-c2[0][0]));
 vec2 ma=min(sqrt(2.*l1),1024.)*dg,mi=min(sqrt(2.*l2),1024.)*vec2(dg.y,-dg.x);
 vColor=col;vPos=position;
 gl_Position=vec4(p2.xy/p2.w+2.*(position.x*ma+position.y*mi)/viewport,0.,1.);
}`;
const fs=`#version 300 es
precision highp float;in vec4 vColor;in vec2 vPos;out vec4 o;
void main(){float A=-dot(vPos,vPos);if(A<-4.)discard;float B=exp(A)*vColor.a;o=vec4(B*vColor.rgb,B);}`;
const sh=(t,s)=>{const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(x));return x};
const prog=(v,f)=>{const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,v));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p};
const pr=prog(vs,fs);gl.useProgram(pr);
const U=n=>gl.getUniformLocation(pr,n);const uProj=U('proj'),uView=U('view'),uFocal=U('focal'),uVp=U('viewport'),uTime=U('time'),uRoom=U('uRoom');
gl.uniform1i(U('u_tex'),0);
gl.disable(gl.DEPTH_TEST);
const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-2,-2,2,-2,2,2,-2,2]),gl.STATIC_DRAW);
const aPos=gl.getAttribLocation(pr,'position'),aIdx=gl.getAttribLocation(pr,'index');

// ---- splat sets: the whole house, plus high-detail rooms used while you're inside them ----
const sets={};
const wsrc=`const S={};onmessage=e=>{const d=e.data;if(d.P){S[d.id]=d.P;return}const P=S[d.id],n=P.length/3;
const v=d.v,z=new Float32Array(n);let mn=1e9,mx=-1e9;
for(let i=0;i<n;i++){const q=v[2]*P[3*i]+v[6]*P[3*i+1]+v[10]*P[3*i+2];z[i]=q;if(q<mn)mn=q;if(q>mx)mx=q}
const B=65536,cnt=new Uint32Array(B),k=new Uint16Array(n),s=(B-1)/((mx-mn)||1);
for(let i=0;i<n;i++){const b=((z[i]-mn)*s)|0;k[i]=b;cnt[b]++}
for(let i=1;i<B;i++)cnt[i]+=cnt[i-1];
const o=new Int32Array(n);for(let i=n-1;i>=0;i--)o[--cnt[k[i]]]=i;postMessage({id:d.id,o},[o.buffer])}`;
const sw=new Worker(URL.createObjectURL(new Blob([wsrc],{type:'text/javascript'})));
function makeSet(m){const vao=gl.createVertexArray();gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.enableVertexAttribArray(aPos);gl.vertexAttribPointer(aPos,2,gl.FLOAT,false,0,0);
  const ixb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,ixb);gl.bufferData(gl.ARRAY_BUFFER,m.N*4,gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(aIdx);gl.vertexAttribIPointer(aIdx,1,gl.INT,0,0);gl.vertexAttribDivisor(aIdx,1);gl.bindVertexArray(null);
  const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
  for(const [k,v] of[[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE],[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST]])gl.texParameteri(gl.TEXTURE_2D,k,v);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32UI,2048,m.rows,0,gl.RGBA_INTEGER,gl.UNSIGNED_INT,m.data);
  sw.postMessage({id:m.id,P:m.P},[m.P.buffer]);
  return{id:m.id,N:m.N,vao,ixb,tex,have:false,sorting:false,lastSent:null}}
gw.onmessage=e=>{const m=e.data;pend.delete(m.id);sets[m.id]=makeSet(m);sets[m.id].used=performance.now();
  if(m.id!=='base'){const ds=Object.values(sets).filter(x=>x.id!=='base').sort((a,b)=>a.used-b.used);while(ds.length>MAXD){const o=ds.shift();if(o.id!=='r'+mode)dropSet(o.id)}}
  if(m.id==='base'){$('#count').textContent=Math.round(m.N/1000)+',000';console.log('base splats',m.N,Math.round(performance.now()-t0),'ms');
    if(mode>=0)ensureDetail(mode)}
  else console.log('detail',m.id,m.N)};
gw.postMessage({id:'base',Q:MOBILE?1.45:1});
sw.onmessage=e=>{const s=sets[e.data.id];gl.bindBuffer(gl.ARRAY_BUFFER,s.ixb);gl.bufferData(gl.ARRAY_BUFFER,e.data.o,gl.DYNAMIC_DRAW);s.have=true;s.sorting=false;
  if(s.id==='base'&&loadEl.isConnected&&!loadEl.classList.contains('gone')){loadEl.classList.add('gone');setTimeout(()=>loadEl.remove(),700)}};
function requestSort(s,V){if(!s||s.sorting)return;let ch=!s.lastSent;if(s.lastSent)for(let i=0;i<16;i++)if(Math.abs(V[i]-s.lastSent[i])>1e-4){ch=true;break}
  if(ch){s.sorting=true;s.lastSent=V;sw.postMessage({id:s.id,v:V})}}

// ---- post-processing: bloom, miniature depth-of-field, filmic grade, vignette, grain ----
const fsv=`#version 300 es
out vec2 uv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const BG=`vec3 bgc(vec2 uv){float d=length((uv-vec2(.28,.9))*vec2(1.25,1.));return mix(vec3(.34,.19,.14),vec3(.075,.038,.05),smoothstep(0.,1.15,d));}`;
const pPrep=prog(fsv,`#version 300 es
precision highp float;uniform sampler2D t;uniform vec2 px;in vec2 uv;out vec4 o;${BG}
void main(){vec4 s=(texture(t,uv+px*vec2(-1,-1))+texture(t,uv+px*vec2(1,-1))+texture(t,uv+px*vec2(-1,1))+texture(t,uv+px*vec2(1,1)))*.25;o=vec4(s.rgb+bgc(uv)*(1.-s.a),1.);}`);
const pBright=prog(fsv,`#version 300 es
precision highp float;uniform sampler2D t;in vec2 uv;out vec4 o;
void main(){vec3 c=texture(t,uv).rgb;float l=max(c.r,max(c.g,c.b));o=vec4(c*smoothstep(.62,1.,l),1.);}`);
const pBlur=prog(fsv,`#version 300 es
precision highp float;uniform sampler2D t;uniform vec2 dir;in vec2 uv;out vec4 o;
void main(){o=texture(t,uv)*.227027+(texture(t,uv+dir*1.3846)+texture(t,uv-dir*1.3846))*.3162162+(texture(t,uv+dir*3.2308)+texture(t,uv-dir*3.2308))*.0702703;}`);
const pComp=prog(fsv,`#version 300 es
precision highp float;uniform sampler2D sc,bl,bm;uniform vec2 res;uniform float time,tilt,bloomK;in vec2 uv;out vec4 o;${BG}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){vec4 s=texture(sc,uv);vec3 c=s.rgb+bgc(uv)*(1.-s.a);
 vec2 q=(uv-.5)*vec2(res.x/res.y,1.);
 float f=clamp(max(smoothstep(.14,.5,abs(uv.y-.5)),smoothstep(.4,1.,length(q))*.8)*tilt,0.,1.);
 c=mix(c,texture(bl,uv).rgb,f);
 c+=texture(bm,uv).rgb*bloomK;
 c=c*1.05/(1.+c*.12);
 float L=dot(c,vec3(.299,.587,.114));c=mix(vec3(L),c,1.07);
 c=pow(max(c,0.),vec3(.98,1.,1.07));
 c=clamp(c,0.,1.);c=mix(c,c*c*(3.-2.*c),.22);
 c=mix(c,c*vec3(1.04,1.,.92),smoothstep(.6,0.,L)*.4);
 c*=1.-.42*pow(length(q*vec2(.9,1.05)),2.2);
 c+=(hash(uv*res+fract(time*7.)*vec2(37.,91.))-.5)*.03;
 o=vec4(clamp(c,0.,1.),1.);}`);
const evao=gl.createVertexArray();
const UL=(p,n)=>gl.getUniformLocation(p,n);
let RT=null;
function mkT(w,h){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);for(const [k,v] of[[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE],[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR]])gl.texParameteri(gl.TEXTURE_2D,k,v);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);return{t,f,w,h}}
function ensureRT(w,h){if(RT&&RT.w===w&&RT.h===h)return;if(RT)for(const k of['sc','a','b','c','d']){gl.deleteTexture(RT[k].t);gl.deleteFramebuffer(RT[k].f)}
  const qw=Math.max(1,w>>2),qh=Math.max(1,h>>2);RT={w,h,sc:mkT(w,h),a:mkT(qw,qh),b:mkT(qw,qh),c:mkT(qw,qh),d:mkT(qw,qh)};gl.bindFramebuffer(gl.FRAMEBUFFER,null)}
function pass(p,dst,tex,setU){gl.useProgram(p);gl.bindFramebuffer(gl.FRAMEBUFFER,dst?dst.f:null);gl.viewport(0,0,dst?dst.w:cv.width,dst?dst.h:cv.height);
  tex.forEach((t,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,t.t)});if(setU)setU();gl.bindVertexArray(evao);gl.drawArrays(gl.TRIANGLES,0,3)}
function blur(src,tmp,sc){pass(pBlur,tmp,[src],()=>{gl.uniform1i(UL(pBlur,'t'),0);gl.uniform2f(UL(pBlur,'dir'),sc/src.w,0)});pass(pBlur,src,[tmp],()=>{gl.uniform1i(UL(pBlur,'t'),0);gl.uniform2f(UL(pBlur,'dir'),0,sc/src.h)})}
let tiltV=1;
function renderFrame(act,V,now){
  ensureRT(cv.width,cv.height);
  gl.bindFramebuffer(gl.FRAMEBUFFER,RT.sc.f);gl.viewport(0,0,cv.width,cv.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
  if(act&&act.have){gl.useProgram(pr);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.ONE_MINUS_DST_ALPHA,gl.ONE,gl.ONE_MINUS_DST_ALPHA,gl.ONE);
    const fy=cv.height/(2*Math.tan(cam.fv/2)),zn=.015,zf=80;
    gl.uniformMatrix4fv(uProj,false,new Float32Array([2*fy/cv.width,0,0,0,0,-2*fy/cv.height,0,0,0,0,zf/(zf-zn),1,0,0,-zf*zn/(zf-zn),0]));
    gl.uniformMatrix4fv(uView,false,V);gl.uniform2f(uFocal,fy,fy);gl.uniform2f(uVp,cv.width,cv.height);gl.uniform1f(uTime,now/1000);gl.uniform1i(uRoom,act.id==='base'?uRoomV:0);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,act.tex);gl.bindVertexArray(act.vao);gl.drawArraysInstanced(gl.TRIANGLE_FAN,0,4,act.N);gl.disable(gl.BLEND)}
  pass(pPrep,RT.a,[RT.sc],()=>{gl.uniform1i(UL(pPrep,'t'),0);gl.uniform2f(UL(pPrep,'px'),1/cv.width,1/cv.height)});
  pass(pBright,RT.b,[RT.a],()=>gl.uniform1i(UL(pBright,'t'),0));
  blur(RT.a,RT.c,1);blur(RT.b,RT.d,1.6);blur(RT.b,RT.d,3);
  pass(pComp,null,[RT.sc,RT.a,RT.b],()=>{gl.uniform1i(UL(pComp,'sc'),0);gl.uniform1i(UL(pComp,'bl'),1);gl.uniform1i(UL(pComp,'bm'),2);
    gl.uniform2f(UL(pComp,'res'),cv.width,cv.height);gl.uniform1f(UL(pComp,'time'),now/1000);gl.uniform1f(UL(pComp,'tilt'),tiltV);gl.uniform1f(UL(pComp,'bloomK'),.6)});
  gl.activeTexture(gl.TEXTURE0)}

// ---- camera ----
const nrm=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
let cw=1,ch=1,dpr=1,dscale=1,fovOut=.87,fovIn=1.2;
const cam={tx:0,ty:3.6,tz:0,yaw:.5,pitch:.16,dist:20,fv:.87};
let mode=-1,tween=null,queue=[],lastInput=performance.now(),uRoomV=0;
const keys=new Set();
function overview(){const asp=cw/ch,tv=Math.tan(fovOut/2),th=tv*asp;const por=asp<.8;return{tx:0,ty:por?3.9:3.55,tz:0,yaw:.38,pitch:.15,dist:Math.max(4.6/tv,(por?3.7:4.2)/th)+(por?.6:1.6),fv:fovOut}}
function doorway(i){const [cx,fy]=ROOMS[i],por=cw<ch;return{tx:cx,ty:fy+.86,tz:-.4,yaw:0,pitch:.06,dist:por?3.1:2.45,fv:fovOut}}
function insideGoal(i){const [cx,fy]=ROOMS[i];return{tx:cx,ty:fy+.92,tz:.5,yaw:0,pitch:.06,dist:.04,fv:fovIn}}
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function roomOfEye(e){for(let k=0;k<6;k++){const [cx,fy]=ROOMS[k];if(Math.abs(e[0]-cx)<1.45&&e[1]>fy&&e[1]<fy+1.8&&e[2]>-1.25&&e[2]<1.25)return k}return-1}
function clampCam(){if(mode<0){cam.pitch=Math.max(-.06,Math.min(1.2,cam.pitch));cam.dist=Math.max(4.5,Math.min(30,cam.dist))}
  else{cam.pitch=Math.max(-1.25,Math.min(1.25,cam.pitch));cam.fv=Math.max(.45,Math.min(fovIn*1.08,cam.fv));
    if(!tween){const [cx]=ROOMS[mode];cam.tx=Math.max(cx-1.1,Math.min(cx+1.1,cam.tx));cam.tz=Math.max(-.85,Math.min(.85,cam.tz))}}}
function nextTween(){if(!queue.length){tween=null;arrived();return}const to=queue.shift();cam.yaw=wrap(cam.yaw);
  const dd=Math.hypot(to.tx-cam.tx,to.ty-cam.ty,to.tz-cam.tz)+Math.abs(to.dist-cam.dist)*.5;
  tween={from:{...cam},to,t0:performance.now(),dur:RM?1:Math.min(1300,500+dd*120)}}
function go(i){const cur=mode,B=basis();queue=[];
  if(cur>=0&&roomOfEye(B.e)===cur)queue.push(doorway(cur));
  if(i<0)queue.push(overview());else{queue.push(doorway(i));queue.push(insideGoal(i))}
  mode=i;if(i>=0)ensureDetail(i);nextTween();ui()}
let quietT=0;
function arrived(){if(mode>=0){clearTimeout(quietT);quietT=setTimeout(()=>document.body.classList.add('quiet'),6500)}}
function basis(){const cp=Math.cos(cam.pitch),e=[cam.tx+cam.dist*cp*Math.sin(cam.yaw),cam.ty+cam.dist*Math.sin(cam.pitch),cam.tz+cam.dist*cp*Math.cos(cam.yaw)];
  const f=nrm([cam.tx-e[0],cam.ty-e[1],cam.tz-e[2]]),r=nrm(cross(f,[0,1,0])),u=cross(r,f);return{e,f,r,u}}
function viewMat(B){const{e,f,r,u}=B,d=[-u[0],-u[1],-u[2]];
  return new Float32Array([r[0],d[0],f[0],0,r[1],d[1],f[1],0,r[2],d[2],f[2],0,-dot(r,e),-dot(d,e),-dot(f,e),1])}
function ray(px,py){const B=basis(),tv=Math.tan(cam.fv/2),x=(px/cw*2-1)*tv*cw/ch,y=(1-py/ch*2)*tv;
  return{B,d:nrm([B.f[0]+B.r[0]*x+B.u[0]*y,B.f[1]+B.r[1]*x+B.u[1]*y,B.f[2]+B.r[2]*x+B.u[2]*y])}}
function walkTo(px,py){const {B,d}=ray(px,py);if(d[1]>-.04)return;const fy=ROOMS[mode][1],t=(fy-B.e[1])/d[1];
  const [cx]=ROOMS[mode],tx=Math.max(cx-1.1,Math.min(cx+1.1,B.e[0]+d[0]*t)),tz=Math.max(-.85,Math.min(.85,B.e[2]+d[2]*t));
  const fx=tx-cam.tx,fz=tz-cam.tz,L=Math.hypot(fx,fz);if(L<.02)return;
  queue=[];tween={from:{...cam},to:{...cam,tx,tz},t0:performance.now(),dur:RM?1:350+L*650,walk:1}}

// ---- input ----
const pts=new Map();let tap=null,pinch0=0,dist0=0,fv0=1;
function interacted(){lastInput=performance.now();hideHint();if(mode>=0){document.body.classList.add('quiet');$('#rhint').classList.add('gone')}}
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);interacted();
  if(tween&&tween.walk){tween=null}
  tap=pts.size==1?{x:e.clientX,y:e.clientY,t:performance.now(),moved:0}:null;
  if(pts.size==2){const [a,b]=[...pts.values()];pinch0=Math.hypot(a[0]-b[0],a[1]-b[1]);dist0=cam.dist;fv0=cam.fv}});
cv.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;const pv=pts.get(e.pointerId),dx=e.clientX-pv[0],dy=e.clientY-pv[1];pts.set(e.pointerId,[e.clientX,e.clientY]);lastInput=performance.now();
  if(tap)tap.moved+=Math.abs(dx)+Math.abs(dy);if(tween)return;
  if(pts.size==1){if(mode<0){cam.yaw-=dx*.006;cam.pitch+=dy*.005}else{const k=cam.fv/ch*1.1;cam.yaw+=dx*k;cam.pitch-=dy*k}clampCam()}
  else if(pts.size==2){const [a,b]=[...pts.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch0>0){if(mode<0)cam.dist=dist0*pinch0/d;else cam.fv=fv0*pinch0/d;clampCam()}}});
const up=e=>{if(!pts.has(e.pointerId))return;pts.delete(e.pointerId);
  if(tap&&tap.moved<8&&performance.now()-tap.t<400&&!tween){if(mode<0){const i=pick(e.clientX,e.clientY);if(i>=0)go(i)}else walkTo(e.clientX,e.clientY)}tap=null;pinch0=0};
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
cv.addEventListener('wheel',e=>{e.preventDefault();if(tween)return;interacted();if(mode<0)cam.dist*=Math.exp(e.deltaY*.0012);else cam.fv*=Math.exp(e.deltaY*.0009);clampCam()},{passive:false});
const MOVE=['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'];
addEventListener('keydown',e=>{if(e.target.closest&&e.target.closest('button')&&(e.key=='Enter'||e.key==' '))return;const k=e.key.toLowerCase();
  if(k>='1'&&k<='6'){go(+k-1);return}if(k=='escape'||k=='0'){go(-1);return}
  if(MOVE.includes(k)){keys.add(k);interacted();e.preventDefault();return}
  if(k=='+'||k=='='){if(mode<0)cam.dist*=.9;else cam.fv*=.92;clampCam()}else if(k=='-'){if(mode<0)cam.dist*=1.1;else cam.fv*=1.08;clampCam()}});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());
function keyMove(dt){if(tween||!keys.size)return;const K=k=>keys.has(k);
  if(mode<0){if(K('arrowleft')||K('a'))cam.yaw+=1.4*dt;if(K('arrowright')||K('d'))cam.yaw-=1.4*dt;if(K('arrowup')||K('w'))cam.pitch+=dt;if(K('arrowdown')||K('s'))cam.pitch-=dt;clampCam();return}
  if(K('arrowleft'))cam.yaw+=1.6*dt;if(K('arrowright'))cam.yaw-=1.6*dt;
  const f=(K('w')||K('arrowup')?1:0)-(K('s')||K('arrowdown')?1:0),st=(K('d')?1:0)-(K('a')?1:0),v=.85*dt,sy=Math.sin(cam.yaw),cy=Math.cos(cam.yaw);
  cam.tx+=(-sy*f+cy*st)*v;cam.tz+=(-cy*f-sy*st)*v;clampCam()}
function pick(px,py){const {B,d}=ray(px,py);let best=-1,bt=1e9;
  ROOMS.forEach(([cx,fy],i)=>{const lo=[cx-1.5,fy,-1.25],hi=[cx+1.5,fy+1.8,1.3];let t0=0,t1=1e9;
    for(let k=0;k<3;k++){const inv=1/d[k];let a=(lo[k]-B.e[k])*inv,b=(hi[k]-B.e[k])*inv;if(a>b)[a,b]=[b,a];t0=Math.max(t0,a);t1=Math.min(t1,b)}
    if(t0<=t1&&t0<bt){bt=t0;best=i}});return best}

// ---- UI ----
const dock=$('#dock'),card=$('#card'),labels=$('#labels');
dock.innerHTML=`<button data-i="-1">Whole house</button>`+INFO.map((r,i)=>`<button data-i="${i}"><i style="background:${r.dot}"></i>${r.name}</button>`).join('');
labels.innerHTML=INFO.map((r,i)=>`<button data-i="${i}" tabindex="-1"><i style="background:${r.dot}"></i>${r.name}</button>`).join('');
const lbls=[...labels.children];
for(const el of[dock,labels])el.addEventListener('click',e=>{const b=e.target.closest('button');if(b)go(+b.dataset.i)});
$('#prev').onclick=()=>go((mode+5)%6);$('#next').onclick=()=>go((mode+1)%6);$('#home').onclick=()=>go(-1);
$('#cname').onclick=()=>{document.body.classList.toggle('quiet');clearTimeout(quietT)};
$('#rhint').textContent=MOBILE?'Drag to look around · tap the floor to walk · pinch to zoom':'Drag to look around · click the floor or use WASD to walk · arrows turn · scroll to zoom';
function ui(){for(const b of dock.children)b.setAttribute('aria-pressed',+b.dataset.i===mode);
  const act=dock.querySelector('[aria-pressed=true]');if(act)act.scrollIntoView({inline:'center',block:'nearest',behavior:RM?'auto':'smooth'});
  document.body.classList.toggle('inroom',mode>=0);document.body.classList.remove('quiet');clearTimeout(quietT);
  if(mode>=0){const r=INFO[mode];$('#ctheme').textContent=r.theme;$('#cname').textContent=r.name;$('#cblurb').textContent=r.blurb;$('#ctheme').style.setProperty('--dot',r.dot)}}
let hinted=false;function hideHint(){if(!hinted){hinted=true;$('#hint').classList.add('gone')}}

function resize(){const w=cv.clientWidth,h=cv.clientHeight;dpr=Math.min(devicePixelRatio||1,MOBILE?1.5:2)*dscale;
  const W2=Math.round(w*dpr),H2=Math.round(h*dpr);if(cv.width!==W2||cv.height!==H2){cv.width=W2;cv.height=H2}
  const nf=w<h?1.08:.87;if(cw!==w||ch!==h||fovOut!==nf){const first=cw===1;cw=w;ch=h;fovOut=nf;fovIn=w<h?1.35:1.2;
    if(first){const o=overview();Object.assign(cam,o,{dist:o.dist*1.5,yaw:1.1,pitch:.42});go(-1)}
    else if(mode<0&&!tween){const o=overview();cam.fv=fovOut;cam.dist=Math.max(cam.dist,o.dist*.7)}}}
let last=performance.now(),slow=0,fast=0;
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.1,(now-last)/1000);last=now;resize();
  if(tween){const t=Math.min(1,(now-tween.t0)/tween.dur),k=t<.5?4*t*t*t:1-(-2*t+2)**3/2;
    for(const key in tween.to)cam[key]=tween.from[key]+(tween.to[key]-tween.from[key])*k;if(t>=1)nextTween()}
  else if(mode<0&&!RM&&now-lastInput>6000){cam.yaw+=(.42*Math.sin(now*.00011)-wrap(cam.yaw))*Math.min(1,dt*.25)}
  keyMove(dt);
  const B=basis(),V=viewMat(B),inR=roomOfEye(B.e);uRoomV=inR+1;
  const det=inR>=0?sets['r'+inR]:null,act=det&&det.have?det:sets.base;if(det)det.used=now;
  requestSort(act,V);if(det&&!det.have)requestSort(det,V);
  tiltV+=((inR>=0?.26:1)-tiltV)*Math.min(1,dt*3);
  renderFrame(act,V,now);
  // floating labels in the overview
  const fcss=ch/(2*Math.tan(cam.fv/2)),face=Math.cos(wrap(cam.yaw));
  lbls.forEach((el,i)=>{const [cx,fy2]=ROOMS[i],p=[cx,fy2+1.88,1.34],q=[p[0]-B.e[0],p[1]-B.e[1],p[2]-B.e[2]],z=dot(q,B.f);
    const vis=mode<0&&!tween&&z>.5&&face>.35;el.classList.toggle('on',vis);
    if(vis)el.style.transform=`translate(${(cw/2+fcss*dot(q,B.r)/z).toFixed(1)}px,${(ch/2-fcss*dot(q,B.u)/z).toFixed(1)}px) translate(-50%,-50%)`});
  // adaptive resolution
  if(dt>.034)slow+=dt;else slow=Math.max(0,slow-dt*.5);if(dt<.019)fast+=dt;else fast=0;
  if(slow>1.2&&dscale>.5){dscale*=.85;slow=0}if(fast>4&&dscale<1){dscale=Math.min(1,dscale*1.12);fast=0}}
requestAnimationFrame(frame);}
}
