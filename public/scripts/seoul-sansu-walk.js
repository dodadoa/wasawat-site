(() => {
/* ---------- geography (km from City Hall: E = east, N = north) ---------- */
const EXAG = 3, HALF = 25, SEG = 520;
const KM = (lat,lon) => [ (lon-126.978)*88.2, (lat-37.566)*111.0 ];   // km east / north of City Hall
const P = (ko,en,m,lat,lon,r,lbl=true) => { const [E,N]=KM(lat,lon); return {ko,en,m,E,N,r,lbl}; };
const peaks = [
  P("북한산","Bukhansan",836,37.6589,126.9788,1.5),
  P("인수봉","Insubong",811,37.6606,126.9840,.7,false),
  P("의상봉","Uisangbong",502,37.6380,126.9550,.8,false),
  P("도봉산","Dobongsan",740,37.6983,127.0155,1.3),
  P("사패산","Sapaesan",552,37.7180,127.0300,1.1,false),
  P("수락산","Suraksan",638,37.6960,127.0830,1.3),
  P("불암산","Buramsan",508,37.6480,127.0900,1.0),
  P("봉화산","Bonghwasan",160,37.6100,127.0800,.6,false),
  P("망우산","Mangusan",282,37.5950,127.1000,.7,false),
  P("용마산","Yongmasan",348,37.5745,127.0947,.8),
  P("아차산","Achasan",295,37.5570,127.1030,.9),
  P("남산","Namsan",262,37.5512,126.9882,.85),
  P("북악산","Bugaksan",342,37.5920,126.9810,.8),
  P("인왕산","Inwangsan",338,37.5850,126.9580,.8),
  P("안산","Ansan",296,37.5740,126.9450,.7),
  P("낙산","Naksan",125,37.5800,127.0070,.5,false),
  P("백련산","Baengnyeonsan",216,37.5900,126.9250,.7,false),
  P("관악산","Gwanaksan",632,37.4452,126.9640,1.6),
  P("삼성산","Samseongsan",481,37.4470,126.9160,1.1,false),
  P("청계산","Cheonggyesan",618,37.4300,127.0540,1.5),
  P("구룡산","Guryongsan",306,37.4700,127.0540,.8,false),
  P("대모산","Daemosan",293,37.4720,127.0810,.8,false),
  P("우면산","Umyeonsan",293,37.4660,127.0130,.9),
  P("남한산성","Namhansanseong",497,37.4790,127.1800,2.0),
  P("검단산","Geomdansan",657,37.5450,127.2350,1.6,false),
  P("덕양산","Deogyangsan",125,37.6030,126.8300,.7,false),
  P("개화산","Gaehwasan",128,37.5760,126.8060,.7,false),
];
const RG = (aLat,aLon,bLat,bLon,h,r) => { const a=KM(aLat,aLon), b=KM(bLat,bLon); return [a[0],a[1],b[0],b[1],h,r]; };
const ridges = [
  RG(37.5920,126.9810, 37.6320,126.9580, .30,1.0),   // 북악 → 비봉
  RG(37.6320,126.9580, 37.6589,126.9788, .58,1.2),   // 비봉 → 백운대
  RG(37.6589,126.9788, 37.6983,127.0155, .56,1.3),   // 백운대 → 도봉
  RG(37.6983,127.0155, 37.7180,127.0300, .45,1.1),   // 도봉 → 사패
  RG(37.6589,126.9788, 37.6380,126.9550, .40,1.0),   // 의상능선
  RG(37.6960,127.0830, 37.6480,127.0900, .38,1.0),   // 수락 → 불암
  RG(37.6480,127.0900, 37.6100,127.0800, .16,.8),    // 불암 → 봉화
  RG(37.5950,127.1000, 37.5570,127.1030, .22,.8),    // 망우 → 용마 → 아차
  RG(37.4470,126.9160, 37.4452,126.9640, .38,1.2),   // 삼성 → 관악
  RG(37.4452,126.9640, 37.4600,126.9900, .26,1.0),   // 관악 → 사당
  RG(37.4300,127.0540, 37.4470,127.0300, .34,1.1),   // 청계
  RG(37.4700,127.0540, 37.4720,127.0810, .24,.9),    // 구룡 → 대모
  RG(37.5850,126.9580, 37.5740,126.9450, .22,.6),    // 인왕 → 안산
  RG(37.5920,126.9810, 37.5800,127.0070, .13,.6),    // 북악 → 낙산
  RG(37.4790,127.1800, 37.5000,127.2000, .34,1.6),   // 남한산성
  RG(37.5450,127.2350, 37.5600,127.2700, .42,1.6),   // 검단
];
const LINE = pts => pts.map(q => KM(q[0],q[1]));
const han = LINE([[37.600,127.330],[37.577,127.230],[37.572,127.145],[37.545,127.112],[37.522,127.090],
  [37.512,127.060],[37.515,127.020],[37.523,126.992],[37.520,126.965],[37.517,126.945],[37.527,126.920],
  [37.541,126.898],[37.556,126.875],[37.575,126.858],[37.592,126.822],[37.615,126.760],[37.625,126.690]]);
const tribs = [
  LINE([[37.680,127.078],[37.640,127.072],[37.605,127.062],[37.570,127.048],[37.535,127.030]]),   // 중랑천
  LINE([[37.380,127.115],[37.440,127.105],[37.480,127.092],[37.513,127.077],[37.527,127.070]]),   // 탄천
  LINE([[37.390,126.930],[37.450,126.898],[37.500,126.872],[37.530,126.878],[37.548,126.877]]),   // 안양천
  LINE([[37.610,126.940],[37.585,126.918],[37.566,126.898]]),                                     // 홍제천
  LINE([[37.468,127.028],[37.487,127.058],[37.500,127.070]]),                                     // 양재천
  LINE([[37.570,126.977],[37.568,127.010],[37.562,127.038],[37.553,127.045]]),                    // 청계천
];
// ทะเลสาบดอยเต่า: the Bhumibol reservoir on the Ping, grafted onto the Han where it leaves the basin
const lake = [[-13,2.4,-16.5,4.0,1.4],[-16.5,4.0,-20,5.3,2.1],[-20,5.3,-27,6.5,2.6]];   // [E1,N1,E2,N2,half width]
[[-15.5,10.5,620],[-19.5,12,700],[-24,10.5,560],[-15.5,-1.8,480],[-19.5,-0.8,640],[-24,0.5,580],[-12,-6,420]]
  .forEach(([E,N,m])=>peaks.push({ko:"",en:"doi",m,E,N,r:1.7,lbl:false}));
ridges.push([-15.5,10.5,-24,10.5,.34,2.0],[-15.5,-1.8,-24,.5,.32,1.8],[-12,-6,-15.5,-1.8,.22,1.4]);
const ISL = (lat,lon,rx,rz,deg) => { const [E,N]=KM(lat,lon); return {E,N,rx,rz,a:deg*Math.PI/180}; };
const islands = [ ISL(37.525,126.930,1.9,.62,153), ISL(37.517,126.958,.22,.14,150),
                  ISL(37.524,126.944,.28,.16,150), ISL(37.543,126.898,.2,.12,120) ];  // 여의도, 노들섬, 밤섬, 선유도

/* ---------- noise ---------- */
function makeNoise(seed){
  const p = new Uint8Array(512); let s = seed;
  const rnd = () => (s = (s*16807) % 2147483647) / 2147483647;
  const perm = [...Array(256).keys()];
  for(let i=255;i>0;i--){ const j = Math.floor(rnd()*(i+1)); [perm[i],perm[j]]=[perm[j],perm[i]]; }
  for(let i=0;i<512;i++) p[i] = perm[i&255];
  const g = i => p[i]/255;
  return (x,y) => {
    const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi;
    const u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf), X=xi&255, Y=yi&255;
    const a=g(p[X]+Y), b=g(p[X+1]+Y), c=g(p[X]+Y+1), d=g(p[X+1]+Y+1);
    return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
  };
}
const n1 = makeNoise(1994), n2 = makeNoise(1021);
const fbm = (x,y,o=5) => { let v=0,a=.5; for(let i=0;i<o;i++){ v+=a*n1(x,y); x=x*2.03+17.1; y=y*2.03+3.7; a*=.5; } return v; };
const ridged = (x,y) => { let v=0,a=.5; for(let i=0;i<4;i++){ v+=a*(1-Math.abs(2*n2(x,y)-1)); x=x*2.1+5.3; y=y*2.1+9.1; a*=.5; } return v; };
const smax = (a,b,k) => { const h = Math.max(k-Math.abs(a-b),0)/k; return Math.max(a,b) + h*h*k*.25; };
function segDist(px,py,ax,ay,bx,by){
  const dx=bx-ax, dy=by-ay, t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy)));
  const x=ax+dx*t-px, y=ay+dy*t-py; return Math.hypot(x,y);
}
function lineDist(E,N,pts){ let d=1e9; for(let i=0;i<pts.length-1;i++) d=Math.min(d,segDist(E,N,pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1])); return d; }
const ss = (a,b,x) => { const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };

function terrain(E,N){
  let h = 0.018 + 0.035*fbm(E*.14+3,N*.14+8);
  let m = 0;
  for(const p of peaks){ const d=Math.hypot(E-p.E,N-p.N); m = smax(m,(p.m/1000-.03)*Math.exp(-(d*d)/(p.r*p.r)),.06); }
  for(const r of ridges){ const d=segDist(E,N,r[0],r[1],r[2],r[3]); m = smax(m,r[4]*Math.exp(-(d*d)/(r[5]*r[5])),.06); }
  m *= .72 + .56*ridged(E*.55,N*.55);
  const rim = ss(13,21,Math.hypot(E*.9,N));
  h += m + rim*.22*fbm(E*.2+40,N*.2);
  const dh = lineDist(E,N,han), dt = Math.min(...tribs.map(t=>lineDist(E,N,t)));
  h *= .2 + .8*ss(.6,3.4,dh);
  h *= .5 + .5*ss(.12,1.1,dt);
  let water = Math.max(ss(.7,.48,dh), ss(.17,.09,dt));
  let dl=1e9, rl=1; for(const L of lake){ const d=segDist(E,N,L[0],L[1],L[2],L[3]); if(d-L[4] < dl-rl){ dl=d; rl=L[4]; } }
  const shore = dl + (fbm(E*.45+9,N*.45+4)-.5)*1.4;                   // ragged drowned-valley shoreline
  h *= .25 + .75*ss(rl+.2, rl+3.5, shore);
  water = Math.max(water, ss(rl+.45, rl-.25, shore));
  let isl = 0;
  for(const s of islands){
    const dx=E-s.E, dz=N-s.N, ca=Math.cos(s.a), sa=Math.sin(s.a);
    isl = Math.max(isl, ss(1.06,.76, Math.hypot((dx*ca+dz*sa)/s.rx, (-dx*sa+dz*ca)/s.rz)));
  }
  water *= 1-isl;
  h = h*(1-water) - .004*water;
  h = Math.max(h, isl*.008);
  return {h, water};
}

/* ---------- renderer ---------- */
const canvas = document.getElementById("ssw-canvas");
const renderer = new THREE.WebGLRenderer({canvas, antialias:false, powerPreference:"high-performance"});
let dpr = Math.min(window.devicePixelRatio||1, 2);
renderer.setPixelRatio(dpr);
renderer.setClearColor(0xffffff,1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, .02, 400);

// terrain mesh
const _U=(n)=>{ const u=new Float32Array(n*2); for(let i=0;i<u.length;i+=2){ u[i]=.9; u[i+1]=.5; } return new THREE.BufferAttribute(u,2); };
const geo = new THREE.BufferGeometry();
const vc = (SEG+1)*(SEG+1);
const pos = new Float32Array(vc*3), wat = new Float32Array(vc);
for(let j=0;j<=SEG;j++) for(let i=0;i<=SEG;i++){
  const k=j*(SEG+1)+i, E=-HALF+2*HALF*i/SEG, N=HALF-2*HALF*j/SEG, t=terrain(E,N);
  pos[k*3]=E; pos[k*3+1]=t.h*EXAG; pos[k*3+2]=-N; wat[k]=t.water;
}
const idx = new Uint32Array(SEG*SEG*6); let q=0;
for(let j=0;j<SEG;j++) for(let i=0;i<SEG;i++){
  const a=j*(SEG+1)+i, b=a+1, c=a+SEG+1, d=c+1;
  idx[q++]=a; idx[q++]=c; idx[q++]=b; idx[q++]=b; idx[q++]=c; idx[q++]=d;
}
geo.setAttribute("position", new THREE.BufferAttribute(pos,3));
geo.setAttribute("aWater", new THREE.BufferAttribute(wat,1));
geo.setAttribute("uv", _U(vc));
geo.setIndex(new THREE.BufferAttribute(idx,1));
geo.computeVertexNormals();

const SURFACE_WATERCOLOR = .8;   // 0..1: watercolor painted into the surfaces themselves (ground, trees, figures, clouds), not over the screen
const GLSL_NOISE = `
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x), mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x), u.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p=p*2.03+17.1; a*=.5; } return v; }
// watercolor in the surface: it is anchored to the world, so the washes stay where they were painted as you walk past.
// s is how fine the brushwork is for this thing, rim is 1 at its silhouette, k scales the whole effect
vec3 wcolor(vec3 c, vec3 w, float s, float rim, float k){
  k *= ${SURFACE_WATERCOLOR.toFixed(2)};
  vec2 p = vec2(w.x + w.y*.6, w.z - w.y*.6)*s;
  float b = fbm(p*1.7 + 4.);
  float wash = .72 + .56*vnoise(p*.8 + 3.);                              // the brush carried more water here, less there
  float ring = smoothstep(.50,.58,b)*(1.-smoothstep(.58,.63,b));         // backrun: a bloom pushes its pigment out to a dark lip
  float inside = smoothstep(.58,.63,b);
  float gran = vnoise(p*30.)*.6 + vnoise(p*61. + 5.)*.4;                 // pigment settling in the tooth of the paper
  float dry = smoothstep(.6,.85, vnoise(p*vec2(7.,1.8) + 11.)*.7 + gran*.3);   // dry brush, the paper left showing in streaks
  float sep = vnoise(p*2.1 + 9.) - .5;                                   // two pigments in one wash drifting apart
  vec3 dens = 1.-c;
  dens *= 1. + k*sep*vec3(.45,-.1,-.4);
  dens *= mix(1., wash, k);
  dens *= 1. + k*(ring*.7 - inside*.28 + rim*.6 + (gran-.5)*.55);
  dens *= 1. - k*.5*dry;
  return 1.-clamp(dens,0.,1.);
}
`;

const GLSL_DITHER = `
uniform float uDpr, uH;
float bayer2(vec2 a){ a = floor(a); return fract(a.x/2. + a.y*a.y*.75); }
float bayer8(vec2 a){ return bayer2(.25*a)*.0625 + bayer2(.5*a)*.25 + bayer2(a); }
float ign(vec2 a){ return fract(52.9829189*fract(dot(floor(a), vec2(.06711056,.00583715)))); }
// four screens laid over each other: ordered, halftone dot, hatch, and a blue-ish noise.
// every one of them is always in the mix, the place and the tone only lean it one way or another
float screens(vec2 fc, float lum, float region, float region2){
  float tOrder = bayer8(fc);
  float ca = cos(.55), sa2 = sin(.55);
  vec2 rp = mat2(ca,-sa2,sa2,ca)*fc*.77;
  float tDot = .5 + .5*sin(rp.x*3.1416)*sin(rp.y*3.1416);
  float tLine = fract((fc.x + fc.y)*.39 + fbm(fc/13.)*.6);
  float tNoise = ign(fc + 11.);
  float lean = smoothstep(.40,.62,region);
  float wO = .85 - .45*lean, wD = .25 + .65*lean;
  float wL = .2 + .65*smoothstep(.52,.22,lum), wN = .35 + .45*smoothstep(.58,.78,region2);
  float t = (tOrder-.5)*wO + (tDot-.5)*wD + (tLine-.5)*wL + (tNoise-.5)*wN;
  return clamp(.5 + t/sqrt(wO*wO + wD*wD + wL*wL + wN*wN), 0., 1.);   // keep the spread of a single screen
}
// dither anchored to the world: cells live on the surface, sized to stay about two pixels on screen
vec3 dither(vec3 painted, vec3 w, float dist){
  vec2 uv = vec2(w.x + w.y*.7, w.z - w.y*.7);
  float lum = dot(painted, vec3(.33));
  float region = fbm(uv/2.4 + 3.), region2 = fbm(uv/1.1 + 19.);
  float k = max(dist,.02)*3.2/uH;          // world size of one dot, about two pixels
  float lg = log2(k), lv = floor(lg), f = lg-lv;
  float k0 = exp2(lv), k1 = k0*2.;
  float t = mix(screens(uv/k0,lum,region,region2), screens(uv/k1,lum,region,region2), f);
  float L = 5. + 2.*smoothstep(.42,.58,region);
  return clamp(floor(painted*L + .5 + (t-.5)*1.2)/L, 0., 1.);
}
`;

const terrainMat = new THREE.ShaderMaterial({
  uniforms:{ uExag:{value:EXAG}, uDpr:{value:1}, uH:{value:800}, uTime:{value:0}, tShadow:{value:null}, uShadowMat:{value:new THREE.Matrix4()}, uShadowTexel:{value:1/1024} },
  vertexShader:`
    attribute float aWater;
    uniform mat4 uShadowMat;
    varying vec3 vN; varying vec3 vW; varying float vWater; varying float vDist; varying vec4 vSC;
    void main(){
      vN = normal; vW = position; vWater = aWater;
      vSC = uShadowMat*vec4(position,1.);
      vec4 mv = modelViewMatrix*vec4(position,1.);
      vDist = length(mv.xyz);
      gl_Position = projectionMatrix*mv;
    }`,
  fragmentShader:`
    precision highp float;
    uniform float uExag, uTime;
    uniform sampler2D tShadow; uniform mat4 uShadowMat; uniform float uShadowTexel;
    varying vec3 vN; varying vec3 vW; varying float vWater; varying float vDist; varying vec4 vSC;
    ${GLSL_NOISE}
float shadowAt(vec4 sc){
  vec3 q = sc.xyz/sc.w;
  if(q.x<0.||q.x>1.||q.y<0.||q.y>1.||q.z>1.) return 1.;
  // dithered: the taps sit on a spiral turned a different way at every pixel, so the edge of a shadow
  // is a fine grain that fades out, not the square cells of the shadow map
  float sh = 0., a0 = hash(gl_FragCoord.xy)*6.2831;
  for(int i=0;i<12;i++){ float fi=float(i); float r=sqrt((fi+.5)/12.)*3.2, a=a0+fi*2.39996;
    sh += step(q.z-.0016, texture2D(tShadow, q.xy + vec2(cos(a),sin(a))*r*uShadowTexel).r); }
  return sh/12.;
}
    ${GLSL_DITHER}
    void main(){
      vec3 n = normalize(vN);
      vec3 L = normalize(vec3(-.55,.75,.35));
      float shade = smoothstep(-.15,.85,dot(n,L));
      float h = vW.y/uExag;
      float slope = 1.-n.y;
      float nz = fbm(vW.xz*.8);
      float hn = h + (nz-.5)*.02;
      vec3 low=vec3(.97,.97,.93), grass=vec3(.80,.90,.70), forest=vec3(.60,.82,.64), deep=vec3(.50,.74,.62), rock=vec3(.97,.97,.96);
      vec3 c = mix(low, grass, smoothstep(.05,.12,hn));
      c = mix(c, forest, smoothstep(.12,.28,hn));
      c = mix(c, deep, smoothstep(.3,.62,hn)*.6);
      c = mix(c, rock, smoothstep(.3,.58,slope*1.3+nz*.05-.03)*smoothstep(.25,.55,h));
      // roads: flat pale lines painted on the low ground, no geometry
      float lowland = 1.-smoothstep(.05,.14,hn);
      vec2 rp = vW.xz + (vec2(fbm(vW.xz*.22+9.), fbm(vW.xz*.22+21.))-.5)*1.1;
      float big = max(1.-smoothstep(.012,.032, abs(fract(rp.x/.9-.5)-.5)*.9),
                      1.-smoothstep(.012,.032, abs(fract(rp.y/.9-.5)-.5)*.9));
      vec2 rq = vec2(rp.x*.87+rp.y*.5, -rp.x*.5+rp.y*.87);
      float diag = max(1.-smoothstep(.010,.026, abs(fract(rq.x/1.3-.5)-.5)*1.3),
                       1.-smoothstep(.010,.026, abs(fract(rq.y/1.3-.5)-.5)*1.3));
      float small = max(1.-smoothstep(.004,.011, abs(fract(rp.x/.26-.5)-.5)*.26),
                        1.-smoothstep(.004,.011, abs(fract(rp.y/.26-.5)-.5)*.26));
      float road = max(max(big, diag*.8), small*.45*(1.-smoothstep(6.,18.,vDist)));
      c = mix(c, vec3(1.,1.,.99), road*lowland*(1.-vWater)*.7);
      // watercolor: uneven wash, pigment pooling where bands meet, granulation in the paper
      float m1 = smoothstep(.05,.12,hn), m2 = smoothstep(.12,.28,hn), m3 = smoothstep(.3,.62,hn), m4 = smoothstep(.04,.1,hn);
      float bandEdge = (m1*(1.-m1) + m2*(1.-m2) + m3*(1.-m3) + m4*(1.-m4))*4.;
      float wash = .82 + .36*fbm(vW.xz*.9 + 3.);
      float tooth = fbm(vW.xz*11.) ;
      vec3 V = normalize(cameraPosition - vW);
      float rim = pow(1.-max(dot(n,V),0.), 3.);
      vec3 dens = 1.-c;
      dens *= wash;
      dens *= 1. + bandEdge*.55 + rim*.9;
      dens *= 1. + (tooth-.5)*.5;
      c = 1.-clamp(dens,0.,1.);
      c = wcolor(c, vW, 1., 0., 1.);
      float sh = shadowAt(vSC);
      shade *= .12 + .88*sh;
      c = mix(c*vec3(.60,.69,.86), c, shade);
      c = mix(c, vec3(dot(c,vec3(.33))), .22);
      float wn1 = vnoise(vW.xz*.35+7.), wn2 = vnoise(vW.xz*.16+3.);
      vec3 water = mix(mix(vec3(.78,.94,.96), vec3(.86,.96,.93), wn1), vec3(.74,.94,.88), wn2);
      water = mix(water, vec3(1.,1.,1.), smoothstep(.4,.92, vnoise(vW.xz*vec2(.9,.22)+11.))*.65);
      // glitter: the sun on ripples, a field of cells that catch the light when you look toward it
      vec3 Vw = normalize(cameraPosition - vW);
      vec3 H = normalize(Vw + L);
      vec2 rip = vW.xz*38. + vec2(uTime*.35, -uTime*.22);
      vec3 nw = normalize(vec3((vnoise(rip)-.5)*.9, 1., (vnoise(rip+7.3)-.5)*.9));
      float spec = pow(max(dot(nw,H),0.), 90.);
      float cells = vnoise(vW.xz*140. + vec2(uTime*.8, uTime*.5));
      float glint = spec*(smoothstep(.55,.9,cells)*2.2 + .25);
      glint *= .6 + .4*sh;
      water += glint*vec3(1.,.97,.85);
      c = mix(c, water, smoothstep(.2,.8,vWater));
      float edge = smoothstep(24.5, 18.5, max(abs(vW.x),abs(vW.z)) + (nz-.5)*4.);
      float fog = 1.-smoothstep(4.,34.,vDist)*.85;
      c = mix(vec3(1.), c, edge*fog);
      gl_FragColor = vec4(c,1.);
    }`
});
scene.add(new THREE.Mesh(geo, terrainMat));

/* ---------- pines (소나무: red trunk, lean, flat umbrella crown) ---------- */
function part(g, col, m){
  g = g.index ? g.toNonIndexed() : g; g.applyMatrix4(m);
  if(g.attributes.uv){ const u=g.attributes.uv.array; for(let i=0;i<u.length;i+=2){ u[i]=.9; u[i+1]=.5; } }
  const n = g.attributes.position.count, c = new Float32Array(n*3);
  for(let i=0;i<n;i++){ c[i*3]=col[0]; c[i*3+1]=col[1]; c[i*3+2]=col[2]; }
  g.setAttribute("aCol", new THREE.BufferAttribute(c,3)); return g;
}
function merge(parts){
  let n=0; parts.forEach(p=>n+=p.attributes.position.count);
  const P=new Float32Array(n*3), N=new Float32Array(n*3), C=new Float32Array(n*3), U=new Float32Array(n*2); let o=0, ou=0;
  for(const p of parts){ if(!p.attributes.normal) p.computeVertexNormals();
    P.set(p.attributes.position.array,o); N.set(p.attributes.normal.array,o); C.set(p.attributes.aCol.array,o);
    if(p.attributes.uv) U.set(p.attributes.uv.array,ou); else U.fill(.9, ou, ou+p.attributes.position.count*2);
    o+=p.attributes.position.array.length; ou+=p.attributes.position.count*2; }
  const g=new THREE.BufferGeometry();
  g.setAttribute("position",new THREE.BufferAttribute(P,3)); g.setAttribute("normal",new THREE.BufferAttribute(N,3)); g.setAttribute("aCol",new THREE.BufferAttribute(C,3)); g.setAttribute("uv",new THREE.BufferAttribute(U,2));
  return g;
}
const M = (x,y,z,sx=1,sy=1,sz=1,rz=0,rx=0) => new THREE.Matrix4().compose(
  new THREE.Vector3(x,y,z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,0,rz)), new THREE.Vector3(sx,sy,sz));
// foliage: a cloud of small flat leaves (or needle tufts) filling an ellipsoid, shaded as one soft mass (bamboo tops)
let fseed = 4242; const frnd = () => (fseed = (fseed*16807) % 2147483647) / 2147483647;
function foliage(cx,cy,cz, rx,ry,rz, n, size, kind, cols){
  const P=[], N=[], C=[], q=new THREE.Quaternion(), e=new THREE.Euler(), v=new THREE.Vector3();
  n = Math.round(n*.65);
  const aspect = kind==="needle" ? .22 : .8;
  for(let i=0;i<n;i++){
    const u=frnd()*2-1, th=frnd()*6.283, r=Math.pow(frnd(),.4);
    const sr=Math.sqrt(1-u*u), d=new THREE.Vector3(sr*Math.cos(th), u, sr*Math.sin(th));
    const p=new THREE.Vector3(cx+d.x*r*rx, cy+d.y*r*ry, cz+d.z*r*rz);
    if(kind==="needle") e.set((frnd()-.5)*.6, frnd()*6.283, (frnd()-.5)*.5); else e.set(frnd()*6.283, frnd()*6.283, frnd()*6.283);
    q.setFromEuler(e);
    const nrm=new THREE.Vector3(d.x/rx, d.y/ry, d.z/rz).normalize().lerp(new THREE.Vector3(0,1,0),.25).normalize();
    const col=cols[Math.floor(frnd()*cols.length)], sh=.9+frnd()*.2;
    const w=size, h=size*aspect;
    const quad=[[-w,0,-h],[w,0,-h],[w,0,h],[-w,0,-h],[w,0,h],[-w,0,h]];
    for(const k of quad){ v.set(k[0],k[1],k[2]).applyQuaternion(q).add(p); P.push(v.x,v.y,v.z); N.push(nrm.x,nrm.y,nrm.z); C.push(col[0]*sh,col[1]*sh,col[2]*sh); }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute("position",new THREE.BufferAttribute(new Float32Array(P),3));
  g.setAttribute("normal",new THREE.BufferAttribute(new Float32Array(N),3));
  g.setAttribute("aCol",new THREE.BufferAttribute(new Float32Array(C),3));
  return g;
}

/* ---------- tree building blocks: indexed buffers, tubes along curves, leaf quads ---------- */
const mixc = (a,b,t) => [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
const tileUV = t => { const u0=t/8+.003, u1=(t+1)/8-.003; return [[u0,.004],[u1,.004],[u1,.996],[u0,.996]]; };
function Builder(){
  const P=[], N=[], C=[], U=[], I=[];
  const B = {
    v(p,n,c,u){ P.push(p.x,p.y,p.z); N.push(n.x,n.y,n.z); C.push(c[0],c[1],c[2]); U.push(u?u[0]:.9, u?u[1]:.5); return P.length/3-1; },
    tri(a,b,c){ I.push(a,b,c); },
    quad(corners, n, c, uv){ const id=corners.map((p,i)=>B.v(p,n,c,uv[i])); B.tri(id[0],id[1],id[2]); B.tri(id[0],id[2],id[3]); },
    geo(){ const g=new THREE.BufferGeometry();
      g.setAttribute("position",new THREE.Float32BufferAttribute(P,3));
      g.setAttribute("normal",new THREE.Float32BufferAttribute(N,3));
      g.setAttribute("aCol",new THREE.Float32BufferAttribute(C,3));
      g.setAttribute("uv",new THREE.Float32BufferAttribute(U,2));
      g.setIndex(I); return g; }
  };
  return B;
}
// a tube through sampled points, rings carried along with parallel transport so it never twists
function tube(B, pts, rad, segs, colAt){
  let prevT=null, nrm=null; const rings=[], last=pts.length-1;
  for(let i=0;i<=last;i++){
    const t=(i===0 ? pts[1].clone().sub(pts[0]) : i===last ? pts[i].clone().sub(pts[i-1]) : pts[i+1].clone().sub(pts[i-1])).normalize();
    if(!nrm){ const ref=Math.abs(t.y)<.95 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0); nrm=new THREE.Vector3().crossVectors(ref,t).normalize(); }
    else nrm.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(prevT,t)).normalize();
    const bin=new THREE.Vector3().crossVectors(t,nrm), ring=[];
    for(let j=0;j<segs;j++){
      const a=j/segs*Math.PI*2, d=nrm.clone().multiplyScalar(Math.cos(a)).addScaledVector(bin,Math.sin(a));
      ring.push(B.v(pts[i].clone().addScaledVector(d,rad[i]), d, colAt(i/last,j)));
    }
    rings.push(ring); prevT=t;
  }
  for(let i=0;i<last;i++) for(let j=0;j<segs;j++){
    const a=rings[i][j], b=rings[i][(j+1)%segs], c=rings[i+1][j], d=rings[i+1][(j+1)%segs];
    B.tri(a,c,b); B.tri(b,c,d);
  }
}

// recursive branch generator, after EZ-Tree: a queue of branches, each built section by section,
// with gnarliness (random per-section tilt), a growth force (rotate toward a direction, more for thin branches),
// child branches placed radially along the parent, and photographed leaf sprays on the last level
function growTree(o){
  let sd=o.seed||7; const rnd=(a=1,b=0)=>{ sd=(sd*16807)%2147483647; return b+(a-b)*(sd/2147483647); };
  const B=Builder(), Y=new THREE.Vector3(0,1,0);
  const qForce=new THREE.Quaternion().setFromUnitVectors(Y, new THREE.Vector3(...o.force.dir).normalize());
  const queue=[{origin:new THREE.Vector3(), q:new THREE.Quaternion(), len:o.length[0], rad:o.radius[0], level:0}];
  const leafPts=[];
  while(queue.length){
    const br=queue.shift(), L=br.level, secN=o.sections[L], segN=o.segments[L], secLen=br.len/secN;
    let origin=br.origin.clone(), q=br.q.clone(); const secs=[], rings=[];
    const c0=o.bark[Math.min(L,o.bark.length-1)];
    for(let i=0;i<=secN;i++){
      const tt=i/secN;
      let r = i===secN ? .001 : br.rad*(1-o.taper[L]*tt);
      if(L===0) r *= 1+.5*Math.exp(-tt*10);                      // root flare
      const ring=[];
      for(let j=0;j<segN;j++){
        const a=2*Math.PI*j/segN, d=new THREE.Vector3(Math.cos(a),0,Math.sin(a)).applyQuaternion(q), m=.86+.24*rnd();
        ring.push(B.v(d.clone().multiplyScalar(r).add(origin), d, [c0[0]*m,c0[1]*m,c0[2]*m]));
      }
      rings.push(ring); secs.push({origin:origin.clone(), q:q.clone(), r});
      const g=Math.max(1,1/Math.sqrt(Math.max(r,.004)))*o.gnarl[L]*.02;
      q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd(g,-g),0,rnd(g,-g))));
      q.multiply(new THREE.Quaternion().setFromAxisAngle(Y,o.twist[L]||0));
      const fs = Array.isArray(o.force.strength) ? o.force.strength[L] : o.force.strength;
      q.rotateTowards(qForce, fs/Math.max(r,.004)*.01);
      origin.add(Y.clone().applyQuaternion(q).multiplyScalar(secLen));
    }
    for(let i=0;i<secN;i++) for(let j=0;j<segN;j++){
      const a=rings[i][j], b=rings[i][(j+1)%segN], c=rings[i+1][j], d=rings[i+1][(j+1)%segN];
      B.tri(a,c,b); B.tri(b,c,d);
    }
    const along=(t)=>{ const k=Math.min(secN-1,Math.floor(t*secN)), al=t*secN-k, A=secs[k], Bs=secs[k+1];
      return {origin:A.origin.clone().lerp(Bs.origin,al), q:A.q.clone().slerp(Bs.q,al), r:A.r*(1-al)+Bs.r*al}; };
    if(L<o.levels){
      const n=o.children[L], off=rnd();
      for(let k=0;k<n;k++){
        const t=rnd(1,o.start[L]), at=along(t);
        const qc=at.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(Y, 2*Math.PI*(off+k/n)))
                            .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), o.angle[L]*Math.PI/180));
        queue.push({origin:at.origin, q:qc, len:o.length[L+1]*rnd(1.15,.85), rad:o.radius[L+1]*at.r, level:L+1});
      }
    }
    if(L===o.levels){
      for(let k=0;k<o.leaf.count;k++){
        const t=rnd(1,.15), at=along(t);
        const ql=at.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(Y, rnd(6.283)))
                            .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), o.leaf.angle*Math.PI/180));
        leafPts.push({p:at.origin, q:ql, s:rnd(1.2,.8)});
      }
    }
  }
  // sprays on two crossed quads, tinted by the species colour; normals point out of the crown's ellipsoid
  const cen=new THREE.Vector3(); leafPts.forEach(l=>cen.add(l.p)); if(leafPts.length) cen.divideScalar(leafPts.length);
  const ext=new THREE.Vector3(.02,.02,.02);
  leafPts.forEach(l=>{ ext.x=Math.max(ext.x,Math.abs(l.p.x-cen.x)); ext.y=Math.max(ext.y,Math.abs(l.p.y-cen.y)); ext.z=Math.max(ext.z,Math.abs(l.p.z-cen.z)); });
  const uv=tileUV(o.leaf.tile);
  for(const lf of leafPts){
    const c=o.leaf.cols[Math.floor(rnd(o.leaf.cols.length))], sh=rnd(1.1,.9), cc=[c[0]*sh,c[1]*sh,c[2]*sh];
    const d=lf.p.clone().sub(cen), n=new THREE.Vector3(d.x/ext.x, d.y/ext.y+.35, d.z/ext.z).normalize();
    const w=o.leaf.size*lf.s;
    for(const rot of [0,Math.PI/2]){
      const qa=lf.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(Y,rot));
      B.quad([[-w,0],[w,0],[w,2*w],[-w,2*w]].map(([x,y])=>new THREE.Vector3(x,y,0).applyQuaternion(qa).add(lf.p)), n, cc, uv);
    }
  }
  return B.geo();
}

/* ---------- pines, grown on purpose rather than by recursion ----------
   소나무 (Pinus densiflora): a trunk that leans and eases back, grey and plated below, orange-red above,
   bare for half its height, a few long branches held out nearly flat, needles gathered into cloud pads at the tips.
   สนสามใบ (Pinus kesiya): straighter, whorled, branches that droop, long needles hanging in tufts. */
function pineTree(o){
  let sd=o.seed; const r=(a=1,b=0)=>{ sd=(sd*16807)%2147483647; return b+(a-b)*(sd/2147483647); };
  const B=Builder(), Y=new THREE.Vector3(0,1,0), H=o.height, V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const CR=pts=>new THREE.CatmullRomCurve3(pts,false,"centripetal");
  const phi=r(6.283), lean=H*r(o.lean[1],o.lean[0]), lx=Math.cos(phi), lz=Math.sin(phi);
  const bend=[0,.4,.85,1,.9], side=[0,.1,-.14,.12,.04].map(v=>v*r(1.5,.5)), hs=[0,.26,.52,.76,1];
  const trunk=CR(hs.map((h,i)=>V(lx*lean*bend[i]-lz*lean*side[i], h*H, lz*lean*bend[i]+lx*lean*side[i])));
  const TS=12, tp=trunk.getSpacedPoints(TS);
  const rT=t=>o.radius*(1-.74*t)*(1+.55*Math.exp(-t*13));
  tube(B, tp, tp.map((_,i)=>rT(i/TS)), 8, (t,j)=>{
    const c=mixc(o.barkLo,o.barkHi,ss(.16,.5,t)), m=(.86+.26*r())*(t<.4 && j%2 ? .88 : 1);
    return [c[0]*m,c[1]*m,c[2]*m];
  });
  // a few dead stubs on the bare trunk
  for(let k=0;k<o.stubs;k++){
    const t=.16+r(.26), b=trunk.getPointAt(t), th=r(6.283), dh=V(Math.cos(th),-.12,Math.sin(th)).normalize();
    tube(B, [b.clone(), b.clone().addScaledVector(dh,H*.025), b.clone().addScaledVector(dh,H*.045)], [rT(t)*.3,rT(t)*.22,rT(t)*.17], 4, ()=>o.barkLo);
  }
  const pads=[];
  function branch(t, th, L, eDeg, subs, rScale){
    const base=trunk.getPointAt(Math.min(t,1)), dh=V(Math.cos(th),0,Math.sin(th)), ph=V(-dh.z,0,dh.x);
    const e=eDeg*Math.PI/180, ce=Math.cos(e), se=Math.sin(e), wig=r(.1,-.1);
    const cur=CR([ base.clone(),
      base.clone().addScaledVector(dh,L*.32*ce).addScaledVector(Y,L*(.32*se-o.droop*.5)),
      base.clone().addScaledVector(dh,L*.68*ce).addScaledVector(Y,L*(.68*se-o.droop)).addScaledVector(ph,L*wig),
      base.clone().addScaledVector(dh,L*ce).addScaledVector(Y,L*(se-o.droop*.5+o.lift)).addScaledVector(ph,L*wig*.4) ]);
    const bp=cur.getSpacedPoints(o.bSec), rb0=rT(t)*o.bRad*rScale;
    tube(B, bp, bp.map((_,k)=>rb0*(1-.78*k/o.bSec)+.0012), 5, tt=>mixc(o.barkHi,o.twig,tt*.7));
    pads.push({p:bp[o.bSec], d:dh, s:H*o.pad*(.7+L/H*.9)});
    for(let k=0;k<o.midPads;k++){ const mt=.5+.35*(k+.5)/o.midPads+r(.05,-.05);
      pads.push({p:cur.getPointAt(mt).add(V(0,H*o.pad*.08,0)), d:dh, s:H*o.pad*(.55+L/H*.6)*r(1.1,.85), thin:true}); }
    const flip=r()<.5?1:-1;
    for(let k=0;k<subs;k++){
      const st=.42+.42*(k+.5)/subs+r(.05,-.05), sp=cur.getPointAt(st);
      const yaw=(k%2?-1:1)*flip*(.6+r(.45)), sdir=dh.clone().applyAxisAngle(Y,yaw);
      const sL=L*o.subLen*r(1.2,.8), se2=Math.sin(e+.2);
      const spts=CR([sp.clone(), sp.clone().addScaledVector(sdir,sL*.5).addScaledVector(Y,sL*(.5*se2-.03)),
                     sp.clone().addScaledVector(sdir,sL).addScaledVector(Y,sL*(se2+.06))]).getSpacedPoints(3);
      const rs0=rb0*(1-.78*st)*.75;
      tube(B, spts, spts.map((_,q)=>rs0*(1-.7*q/3)+.001), 4, ()=>o.twig);
      pads.push({p:spts[3], d:sdir, s:H*o.pad*(.55+L/H*.6), thin:true});
    }
  }
  for(let i=0;i<o.branches;i++){
    const f=(i+.5)/o.branches, t=o.crownStart+(o.top-o.crownStart)*f+r(.025,-.025);
    const th=o.whorl ? Math.floor(i/3)*1.3+(i%3)*2.094+r(.35,-.35) : i*2.39996+r(.5,-.5);
    branch(t, th, H*(o.len[0]+(o.len[1]-o.len[0])*f)*r(1.2,.8), o.elev[0]+(o.elev[1]-o.elev[0])*f+r(8,-8), o.subs, 1);
  }
  if(r()<o.twin) branch(.5+r(.08), phi+Math.PI*r(1.3,.7), H*.5, 58+r(10), 2, 1.5);   // a second leader
  pads.push({p:tp[TS].clone(), d:V(lx,0,lz), s:H*o.pad*1.3});                       // the crown top
  // pads: flat layers seen from above, plus radial brushes that give the silhouette from the side
  const cc0=new THREE.Vector3(); pads.forEach(p=>cc0.add(p.p)); cc0.divideScalar(pads.length);
  const padUV=tileUV(o.padTile), brushUV=tileUV(o.brushTile);
  for(const pd of pads){
    const s=pd.s, c=pd.p, nc=o.needle[Math.floor(r(o.needle.length))], sh=r(1.08,.92), cc=[nc[0]*sh,nc[1]*sh,nc[2]*sh];
    const oh=V(c.x-cc0.x,0,c.z-cc0.z); if(oh.lengthSq()<1e-6) oh.copy(pd.d); oh.normalize();
    const nTop=V(0,.85,0).addScaledVector(oh,.4).normalize();
    for(let l=0;l<(pd.thin?1:o.layers);l++){
      const ls=s*(1-l*.3)*r(1.1,.9), a=r(6.283), ca=Math.cos(a), sa=Math.sin(a);
      const cen=c.clone().addScaledVector(pd.d,s*.1).add(V(0,s*(.05+.17*l),0));
      B.quad([[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>V(cen.x+(x*ca-z*sa)*ls*.5, cen.y, cen.z+(x*sa+z*ca)*ls*.5)), nTop, cc, padUV);
    }
    const nbr=pd.thin?o.brushes-1:o.brushes;
    for(let k=0;k<nbr;k++){
      const a=k/nbr*6.283+r(.5,-.5), dH=V(Math.cos(a),0,Math.sin(a));
      const el=(o.brushEl+r(10,-10))*Math.PI/180, dir=dH.clone().multiplyScalar(Math.cos(el)).addScaledVector(Y,Math.sin(el));
      const w=new THREE.Vector3().crossVectors(new THREE.Vector3().crossVectors(Y,dH),dir).normalize();
      const len=s*.58*r(1.15,.85), wid=len*1.1, b0=c.clone().addScaledVector(dH,s*.04).add(V(0,s*.06,0));
      const nb=nTop.clone().multiplyScalar(.75).addScaledVector(dH,.35).normalize();
      B.quad([b0.clone().addScaledVector(w,-wid*.5), b0.clone().addScaledVector(w,wid*.5),
              b0.clone().addScaledVector(w,wid*.5).addScaledVector(dir,len), b0.clone().addScaledVector(w,-wid*.5).addScaledVector(dir,len)], nb, cc, brushUV);
    }
  }
  return B.geo();
}
const SONAMU = {height:1.15, radius:.045, lean:[.1,.24], crownStart:.52, top:.95, branches:7, whorl:false,
  len:[.38,.18], elev:[-6,26], droop:.07, lift:.08, bSec:5, bRad:.5, subs:3, subLen:.34, midPads:2, pad:.19, layers:2, brushes:5, brushEl:10,
  padTile:5, brushTile:4, twin:.45, stubs:3,
  barkLo:[.44,.39,.35], barkHi:[.74,.48,.34], twig:[.62,.46,.36], needle:[[.30,.46,.32],[.36,.52,.35],[.43,.58,.38]]};
const KESIYA = {height:1.3, radius:.04, lean:[.01,.05], crownStart:.34, top:.97, branches:13, whorl:true,
  len:[.28,.1], elev:[-16,20], droop:.09, lift:.05, bSec:4, bRad:.45, subs:2, subLen:.4, midPads:1, pad:.15, layers:1, brushes:5, brushEl:-8,
  padTile:5, brushTile:6, twin:0, stubs:1,
  barkLo:[.42,.36,.32], barkHi:[.58,.40,.31], twig:[.52,.40,.33], needle:[[.24,.40,.31],[.28,.45,.34],[.33,.49,.36]]};
const UP={dir:[0,1,0],strength:.35}, DOWN={dir:[0,-1,0],strength:[0,.45,.6]};

/* ---------- leaf atlas: eight 256 px tiles in one row ----------
   0-3 photographed sprays from EZ-Tree (pine, oak, ash, aspen; MIT, Daniel Greenheck), baked into the page
   4 소나무 shoot from the side, 5 소나무 pad from above, 6 สนสามใบ hanging tuft, 7 solid (bark and everything else) */
const AT=256, ATW=AT*8;
const atlasCanvas=document.createElement("canvas"); atlasCanvas.width=ATW; atlasCanvas.height=AT;
const actx=atlasCanvas.getContext("2d",{willReadFrequently:true});
const leafTex=new THREE.DataTexture(new Uint8Array(ATW*AT*4), ATW, AT, THREE.RGBAFormat);
leafTex.minFilter=THREE.LinearMipmapLinearFilter; leafTex.magFilter=THREE.LinearFilter; leafTex.generateMipmaps=true;
leafTex.wrapS=leafTex.wrapT=THREE.ClampToEdgeWrapping; leafTex.flipY=false; leafTex.unpackAlignment=4;
leafTex.anisotropy=Math.min(4, renderer.capabilities.getMaxAnisotropy());
function paintNeedles(){
  let s=1234567; const r=()=>(s=(s*16807)%2147483647)/2147483647;
  const g=actx; g.lineCap="round";
  // palette centred on the tint reference (.36,.47,.26); the shader multiplies it by each species' green
  const pal=[[52,76,38],[70,96,50],[88,116,62],[106,136,76],[128,156,92]];
  const col=(k,a)=>{ const c=pal[k]; return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
  const stroke=(x,y,ang,len,bend,lw,c)=>{ g.strokeStyle=c; g.lineWidth=lw; g.beginPath(); g.moveTo(x,y);
    g.quadraticCurveTo(x+Math.cos(ang+bend)*len*.5, y+Math.sin(ang+bend)*len*.5, x+Math.cos(ang)*len, y+Math.sin(ang)*len); g.stroke(); };
  const wash=(x,y,rx,ry,rot,c,a)=>{ g.save(); g.translate(x,y); g.rotate(rot); g.scale(rx,ry);
    const gr=g.createRadialGradient(0,0,0,0,0,1);
    gr.addColorStop(0,`rgba(${c[0]},${c[1]},${c[2]},${a})`); gr.addColorStop(.7,`rgba(${c[0]},${c[1]},${c[2]},${a*.92})`); gr.addColorStop(1,`rgba(${c[0]},${c[1]},${c[2]},0)`);
    g.fillStyle=gr; g.beginPath(); g.arc(0,0,1,0,Math.PI*2); g.fill(); g.restore(); };
  // a shoot: a twig, paired needles leaning forward along it, denser toward the tip, a brush at the end
  const shoot=(x0,y0,a,L,nl,s0,s1,n,tip,k=1)=>{
    const x1=x0+Math.cos(a)*L, y1=y0+Math.sin(a)*L;
    g.strokeStyle="rgba(122,88,64,.9)"; g.lineWidth=AT*.012*k; g.beginPath(); g.moveTo(x0,y0); g.lineTo(x1,y1); g.stroke();
    for(let i=0;i<n;i++){
      const t=1-Math.pow(r(),1.5)*.72, x=x0+(x1-x0)*t, y=y0+(y1-y0)*t, sd=r()<.5?-1:1;
      stroke(x,y, a+sd*(s0+r()*(s1-s0)), nl*(.65+r()*.45)*(t>.92?.8:1), sd*r()*.25, AT*(.0045+r()*.004)*k, col(Math.floor(r()*5), .9+r()*.1));
    }
    for(let i=0;i<tip;i++) stroke(x1,y1, a+(r()-.5)*2.3, nl*(.45+r()*.5), (r()-.5)*.3, AT*(.004+r()*.004)*k, col(2+Math.floor(r()*3), .92));
  };
  const clip=t=>{ g.save(); g.beginPath(); g.rect(t*AT+3,3,AT-6,AT-6); g.clip(); };
  // 4: 소나무 shoot from the side, base at the bottom of the tile
  clip(4); { const ox=AT*4;
    wash(ox+AT*.5, AT*.42, AT*.22, AT*.3, 0, pal[1], .85);
    shoot(ox+AT*.5, AT*.98, -Math.PI/2+.04, AT*.62, AT*.26, .3, 1.05, 240, 50);
    shoot(ox+AT*.5, AT*.64, -Math.PI/2-.55, AT*.28, AT*.2, .3, 1.0, 70, 26, .8);
    shoot(ox+AT*.5, AT*.57, -Math.PI/2+.6, AT*.27, AT*.2, .3, 1.0, 70, 26, .8);
  } g.restore();
  // 5: 소나무 pad from above, shoots radiating over a soft wash
  clip(5); { const cx=AT*5.5, cy=AT*.5;
    wash(cx, cy, AT*.33, AT*.29, r()*3, pal[1], .88);
    wash(cx+AT*.05, cy-AT*.04, AT*.22, AT*.2, r()*3, pal[0], .7);
    for(let i=0;i<9;i++){ const a=i/9*Math.PI*2+r()*.4; shoot(cx+Math.cos(a)*AT*.03, cy+Math.sin(a)*AT*.03, a, AT*(.17+r()*.1), AT*.14, .35, 1.2, 62, 26, .8); }
    for(let i=0;i<3;i++) shoot(cx, cy, r()*6.28, AT*.08, AT*.13, .4, 1.3, 30, 20, .75);
  } g.restore();
  // 6: สนสามใบ tuft, long fine needles falling to the right (world down once on a branch)
  clip(6); { const ox=AT*6, x0=ox+AT*.3, y0=AT*.97, a=-Math.PI/2+.08, L=AT*.55, x1=x0+Math.cos(a)*L, y1=y0+Math.sin(a)*L;
    wash(ox+AT*.52, AT*.44, AT*.2, AT*.3, .5, pal[1], .75);
    g.strokeStyle="rgba(112,84,66,.9)"; g.lineWidth=AT*.011; g.beginPath(); g.moveTo(x0,y0); g.lineTo(x1,y1); g.stroke();
    for(let i=0;i<280;i++){
      const t=1-Math.pow(r(),1.4)*.7, x=x0+(x1-x0)*t, y=y0+(y1-y0)*t, right=r()<.8;
      stroke(x,y, right ? a+.35+r()*1.1 : a-.2-r()*.7, AT*(right ? .28+r()*.16 : .14+r()*.1), right ? .25+r()*.25 : -.1, AT*(.0035+r()*.003), col(Math.floor(r()*5), .9));
    }
  } g.restore();
  // 7: solid
  g.fillStyle="rgb(120,140,90)"; g.fillRect(AT*7,0,AT,AT);
}
function uploadAtlas(){
  const id=actx.getImageData(0,0,ATW,AT).data, out=leafTex.image.data;
  // transparent texels borrow their tile's mean colour, so filtering never drags black into the edges
  for(let t=0;t<8;t++){
    let R=0,G=0,Bl=0,W=0;
    for(let y=0;y<AT;y++) for(let x=t*AT;x<(t+1)*AT;x++){ const i=(y*ATW+x)*4; if(id[i+3]>128){ R+=id[i]; G+=id[i+1]; Bl+=id[i+2]; W++; } }
    const mr=W?R/W:120, mg=W?G/W:140, mb=W?Bl/W:90;
    for(let y=0;y<AT;y++){ const oy=AT-1-y;
      for(let x=t*AT;x<(t+1)*AT;x++){
        const i=(y*ATW+x)*4, o=(oy*ATW+x)*4, a=id[i+3], k=Math.min(1,a/96);
        out[o]=id[i]*k+mr*(1-k); out[o+1]=id[i+1]*k+mg*(1-k); out[o+2]=id[i+2]*k+mb*(1-k); out[o+3]=a;
      }
    }
  }
  leafTex.needsUpdate=true;
}
paintNeedles(); uploadAtlas();
const leafSheet=new Image();
leafSheet.onload=()=>{ actx.clearRect(0,0,AT*4,AT); actx.drawImage(leafSheet, 0,0,640,160, 0,0,AT*4,AT); uploadAtlas(); };
leafSheet.src="data:image/png;base64,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";
const pineMat = new THREE.ShaderMaterial({
  side:THREE.DoubleSide,
  uniforms:{ tLeaf:{value:leafTex}, uTime:{value:0}, uDpr:{value:1}, uH:{value:800}, tShadow:{value:null}, uShadowMat:{value:new THREE.Matrix4()}, uShadowTexel:{value:1/1024} },
  vertexShader:`
    uniform float uTime; uniform mat4 uShadowMat;
    attribute vec3 aCol;
    varying vec3 vN; varying vec3 vW; varying vec3 vCol; varying float vDist; varying vec4 vSC; varying vec2 vUv; varying float vVar;
    void main(){
      vUv = uv;
      #ifdef USE_INSTANCING
        mat4 im = instanceMatrix;
      #else
        mat4 im = mat4(1.);
      #endif
      vVar = fract(sin(dot(im[3].xz, vec2(12.9898,78.233)))*43758.5453);
      vec4 wp = modelMatrix*im*vec4(position,1.);
      // only the leaves stir: trunks, branches, the footpath and the walls all sit on the solid tile and stay put.
      // a leaf is pinned where it meets the twig (uv.y 0) and its tip rides the wind, each one a little out of step with the next
      float leaf = clamp(step(.01, abs(uv.x-.9)) + step(.01, abs(uv.y-.5)), 0., 1.) * uv.y;
      float gust = sin(uTime*.7 + wp.x*.9 + wp.z*.7) + .45*sin(uTime*1.5 + wp.z*1.9);
      float flut = sin(uTime*1.9 + wp.x*23. + wp.y*17. + wp.z*19.);
      vec3 stir = vec3(gust + .5*flut, .35*flut, .55*gust - .4*flut) * .004 * leaf;
      wp.xyz += stir;
      vW = wp.xyz; vCol = aCol;
      vN = normalize(mat3(modelMatrix)*mat3(im)*normal);
      vSC = uShadowMat*wp;
      vec4 mv = viewMatrix*wp; vDist = length(mv.xyz);
      gl_Position = projectionMatrix*mv;
    }`,
  fragmentShader:`
    precision highp float;
    uniform float uTime;
    uniform sampler2D tShadow; uniform mat4 uShadowMat; uniform float uShadowTexel;
    uniform sampler2D tLeaf;
    varying vec3 vN; varying vec3 vW; varying vec3 vCol; varying float vDist; varying vec4 vSC; varying vec2 vUv; varying float vVar;
    ${GLSL_NOISE}
    ${GLSL_DITHER}
float shadowAt(vec4 sc){
  vec3 q = sc.xyz/sc.w;
  if(q.x<0.||q.x>1.||q.y<0.||q.y>1.||q.z>1.) return 1.;
  // dithered: the taps sit on a spiral turned a different way at every pixel, so the edge of a shadow
  // is a fine grain that fades out, not the square cells of the shadow map
  float sh = 0., a0 = hash(gl_FragCoord.xy)*6.2831;
  for(int i=0;i<12;i++){ float fi=float(i); float r=sqrt((fi+.5)/12.)*3.2, a=a0+fi*2.39996;
    sh += step(q.z-.0016, texture2D(tShadow, q.xy + vec2(cos(a),sin(a))*r*uShadowTexel).r); }
  return sh/12.;
}
    void main(){
      vec3 n = normalize(vN);
      float shade = smoothstep(-.2,.9,dot(n,normalize(vec3(-.55,.75,.35))));
      vec4 tex = texture2D(tLeaf, vUv);
      if(tex.a < mix(.5,.3,smoothstep(2.5,22.,vDist))) discard;      // keep far crowns from thinning out
      float isLeaf = step(.01, abs(vUv.x-.9)) + step(.01, abs(vUv.y-.5));   // anything not on the solid tile
      isLeaf = clamp(isLeaf,0.,1.);
      // tint the photo toward the species colour
      vec3 leafCol = tex.rgb * (vCol/vec3(.36,.47,.26));
      leafCol *= mix(vec3(.94,.99,1.05), vec3(1.07,1.03,.9), vVar) * (.92+.16*fract(vVar*7.13));   // no two trees quite the same green
      vec3 base = mix(vCol, leafCol, isLeaf);
      vec3 c = mix(base*(.95+.1*vnoise(vW.xz*2.3)), vec3(1.), .28);
      vec3 V = normalize(cameraPosition - vW);
      float rim = pow(1.-max(dot(n,V),0.), 2.5);
      float wash = .78 + .5*fbm(vW.xz*6. + vW.y*4.);
      vec3 dens = (1.-c)*wash*(1. + rim*mix(1.4,.75,isLeaf));
      c = 1.-clamp(dens,0.,1.);
      c = wcolor(c, vW, 5., 0., 1.);
      float sh = shadowAt(vSC);
      shade *= .15 + .85*sh;
      c = mix(c*vec3(.62,.70,.87), c, shade);
      c = mix(c, vec3(dot(c,vec3(.33))), .2);
      // looking through the crown toward the sun: leaves go translucent and the gaps sparkle
      vec3 L = normalize(vec3(-.55,.75,.35));
      float sunward = pow(max(dot(-V, L),0.), 6.);
      float leafy = isLeaf;
      c = mix(c, vec3(.82,.92,.50), sunward*leafy*.55);
      float tw = hash(floor(vW.xz*55.) + floor(vW.y*40.));
      float twinkle = smoothstep(.86,.98, .5+.5*sin(uTime*2.2 + tw*6.283)) * step(.6,tw);
      c += sunward*leafy*twinkle*vec3(1.,.95,.75)*1.4;
      float nz = fbm(vW.xz*.8);
      float edge = smoothstep(24.5, 18.5, max(abs(vW.x),abs(vW.z)) + (nz-.5)*4.);
      float fog = 1.-smoothstep(4.,34.,vDist)*.85;
      gl_FragColor = vec4(mix(vec3(1.), c, edge*fog), 1.);
    }`
});
/* ---------- the rest of the forest ----------
   Seoul (Bukhansan etc): Q. mongolica on upper slopes and ridges, P. densiflora + Q. serrata / Q. acutissima low,
   Robinia at disturbed edges, Rhododendron mucronulatum under the oaks.
   Chiang Mai (Doi Suthep / Inthanon): dry dipterocarp + teak/bamboo mixed deciduous below ~1000 m,
   Pinus kesiya on ridges in the transition, Castanopsis hill evergreen above. Zones compressed to fit an 836 m city. */
const IC=(r,d=0)=>new THREE.IcosahedronGeometry(r,d), CY=(a,b,h,n=5)=>new THREE.CylinderGeometry(a,b,h,n), CO=(r,h,n=7)=>new THREE.ConeGeometry(r,h,n);
const grey=[.5,.48,.44];
const species = {
  singal: growTree({seed:11, levels:2, length:[.5,.5,.32], radius:[.045,.6,.6], sections:[7,4,2], segments:[7,4,3],
    taper:[.4,.5,.7], gnarl:[.6,1.0,1.4], twist:[0,0,0], force:UP, children:[5,4], angle:[58,48], start:[.45,.3],
    leaf:{count:6,size:.1,tile:1,angle:50,cols:[[.47,.58,.31],[.54,.63,.34],[.42,.55,.30]]}, bark:[grey,[.52,.5,.46]]}),
  lowOak: growTree({seed:12, levels:2, length:[.62,.38,.26], radius:[.04,.6,.6], sections:[7,4,2], segments:[7,4,3],
    taper:[.4,.5,.7], gnarl:[.4,.8,1.2], twist:[0,0,0], force:UP, children:[4,4], angle:[38,42], start:[.5,.3],
    leaf:{count:6,size:.092,tile:1,angle:50,cols:[[.56,.63,.34],[.61,.67,.37],[.5,.6,.33]]}, bark:[grey,[.52,.5,.46]]}),
  locust: growTree({seed:13, levels:2, length:[.6,.42,.3], radius:[.03,.6,.6], sections:[7,4,2], segments:[6,4,3],
    taper:[.5,.6,.7], gnarl:[1.2,1.6,2.0], twist:[0,0,0], force:UP, children:[4,4], angle:[52,46], start:[.4,.3],
    leaf:{count:7,size:.082,tile:2,angle:60,cols:[[.66,.72,.46],[.7,.76,.5],[.6,.68,.42]]}, bark:[[.52,.47,.4],[.55,.5,.43]]}),
  azalea: growTree({seed:14, levels:1, length:[.14,.2], radius:[.012,.5], sections:[2,3], segments:[4,4],
    taper:[.5,.8], gnarl:[1.,1.5], twist:[0,0], force:UP, children:[7], angle:[62], start:[.05],
    leaf:{count:5,size:.085,tile:3,angle:55,cols:[[.88,.56,.66],[.83,.47,.6],[.9,.62,.7]]}, bark:[[.5,.44,.4]]}),
  teak: growTree({seed:15, levels:2, length:[.78,.4,.28], radius:[.04,.55,.6], sections:[7,4,2], segments:[7,4,3],
    taper:[.4,.5,.7], gnarl:[.3,.6,.9], twist:[0,0,0], force:UP, children:[4,3], angle:[62,50], start:[.55,.3],
    leaf:{count:4,size:.13,tile:1,angle:45,cols:[[.53,.6,.28],[.6,.63,.3],[.56,.6,.3]]}, bark:[[.62,.56,.48],[.66,.6,.52]]}),
  dipt: growTree({seed:16, levels:2, length:[.9,.32,.22], radius:[.03,.5,.6], sections:[7,3,2], segments:[6,4,3],
    taper:[.35,.5,.7], gnarl:[.3,.8,1.0], twist:[0,0,0], force:UP, children:[3,3], angle:[58,50], start:[.65,.3],
    leaf:{count:5,size:.095,tile:2,angle:45,cols:[[.48,.55,.32],[.56,.6,.36],[.52,.58,.34]]}, bark:[[.68,.63,.55],[.7,.65,.57]]}),
  castan: growTree({seed:18, levels:2, length:[.48,.4,.3], radius:[.045,.6,.6], sections:[6,4,2], segments:[7,4,3],
    taper:[.4,.5,.7], gnarl:[.5,.9,1.2], twist:[0,0,0], force:UP, children:[5,4], angle:[46,42], start:[.5,.3],
    leaf:{count:6,size:.092,tile:1,angle:50,cols:[[.2,.33,.27],[.25,.38,.3],[.22,.36,.28]]}, bark:[[.45,.42,.38],[.48,.45,.41]]}),
  sonamu:  pineTree(Object.assign({}, SONAMU, {seed:3})),
  sonamu2: pineTree(Object.assign({}, SONAMU, {seed:21, branches:6, lean:[.18,.3]})),
  sonamu3: pineTree(Object.assign({}, SONAMU, {seed:57, branches:8, height:1.05, crownStart:.46})),
  kesiya:  pineTree(Object.assign({}, KESIYA, {seed:17})),
  kesiya2: pineTree(Object.assign({}, KESIYA, {seed:29, branches:11})),
  bamboo: (() => { // ไผ่ clump
    const ps=[], up=new THREE.Vector3();
    for(let i=0;i<8;i++){
      const a=i/8*6.283, lean=.16+.1*(i%3)/2, len=.75+.2*((i*7)%3)/2;
      const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(a)*lean,0,-Math.cos(a)*lean));
      const base=new THREE.Vector3(Math.cos(a)*.035,0,Math.sin(a)*.035);
      const mid=base.clone().add(up.set(0,len/2,0).applyQuaternion(q));
      const tip=base.clone().add(up.set(0,len*.92,0).applyQuaternion(q));
      ps.push(part(CY(.011,.015,len,4),[.64,.7,.38], new THREE.Matrix4().compose(mid,q,new THREE.Vector3(1,1,1))));
      ps.push(foliage(tip.x,tip.y,tip.z,.08,.2,.08, 14,.035,"needle",[[.5,.64,.36],[.56,.68,.4]]));
    }
    return merge(ps);
  })(),
};


// fast height lookup from the mesh we already built
function grid(E,N){
  const fi=Math.max(0,Math.min(SEG-1.001,(E+HALF)/(2*HALF)*SEG)), fj=Math.max(0,Math.min(SEG-1.001,(HALF-N)/(2*HALF)*SEG));
  const i=Math.floor(fi), j=Math.floor(fj), u=fi-i, v=fj-j, k=j*(SEG+1)+i, K=k+SEG+1;
  const L=(A,st,o)=>(A[k*st+o]*(1-u)+A[(k+1)*st+o]*u)*(1-v)+(A[K*st+o]*(1-u)+A[(K+1)*st+o]*u)*v;
  return {y:L(pos,3,1), w:L(wat,1,0)};
}
// exact height of the drawn mesh (each cell is two triangles split b-c), so nothing laid on it sinks or floats
function meshY(E,N){
  const fi=Math.max(0,Math.min(SEG-1.001,(E+HALF)/(2*HALF)*SEG)), fj=Math.max(0,Math.min(SEG-1.001,(HALF-N)/(2*HALF)*SEG));
  const i=Math.floor(fi), j=Math.floor(fj), u=fi-i, v=fj-j, k=j*(SEG+1)+i, K=k+SEG+1;
  const a=pos[k*3+1], b=pos[k*3+4], c=pos[K*3+1], d=pos[K*3+4];
  return u+v<=1 ? a+(b-a)*u+(c-a)*v : d+(c-d)*(1-u)+(b-d)*(1-v);
}

/* ---------- the footpath: one leg per line of the story, and the only place you walk ---------- */
// one straight line from Namsan to the Doi Tao lake, cut into even legs: no bends, the hills pass by on either side
const FROM=[1.35,-1.55], TO=[-21,2.6], LEGS=13;                                         // one leg per line
const route = Array.from({length:LEGS+1}, (_,k)=>[FROM[0]+(TO[0]-FROM[0])*k/LEGS, FROM[1]+(TO[1]-FROM[1])*k/LEGS]);
const segLen = route.slice(1).map((b,i)=>Math.hypot(b[0]-route[i][0], b[1]-route[i][1]));
const trail = (() => {
  const STEP=.04, R=i=>route[Math.max(0,Math.min(route.length-1,i))];
  // straight legs, and only the corners rounded: each bend is a short arc cut inside the corner, never wider than the legs allow
  const RAD=.4, last=route.length-1;
  const bend=j=>{
    if(j<=0 || j>=last) return null;
    const p=route[j], r=Math.min(RAD, segLen[j-1]*.45, segLen[j]*.45);
    const a=route[j-1], b=route[j+1];
    return [[p[0]+(a[0]-p[0])*r/segLen[j-1], p[1]+(a[1]-p[1])*r/segLen[j-1]], p, [p[0]+(b[0]-p[0])*r/segLen[j], p[1]+(b[1]-p[1])*r/segLen[j]]];
  };
  const arc=(c,u)=>{ const v=1-u; return [c[0][0]*v*v+c[1][0]*2*v*u+c[2][0]*u*u, c[0][1]*v*v+c[1][1]*2*v*u+c[2][1]*u*u]; };
  const E=[], N=[], seg0=[], segN=[];
  for(let i=0;i<route.length-1;i++){
    // a leg runs from the middle of one bend to the middle of the next, then the samples go down at even paces so a step is a step everywhere
    const c0=bend(i), c1=bend(i+1), pts=[], acc=[0], Q=16;
    if(c0) for(let k=0;k<=Q;k++) pts.push(arc(c0,.5+.5*k/Q)); else pts.push(R(i));
    if(c1) for(let k=0;k<=Q;k++) pts.push(arc(c1,.5*k/Q)); else pts.push(R(i+1));
    const K=pts.length-1;
    for(let k=1;k<=K;k++) acc.push(acc[k-1]+Math.hypot(pts[k][0]-pts[k-1][0], pts[k][1]-pts[k-1][1]));
    const m=Math.max(2,Math.ceil(acc[K]/STEP));
    seg0.push(E.length); segN.push(m);
    for(let k=0, j=0;k<m;k++){ const d=acc[K]*k/m;
      while(j<K-1 && acc[j+1]<d) j++;
      const u=(d-acc[j])/Math.max(1e-9,acc[j+1]-acc[j]);
      E.push(pts[j][0]+(pts[j+1][0]-pts[j][0])*u); N.push(pts[j][1]+(pts[j+1][1]-pts[j][1])*u); }
  }
  E.push(route[route.length-1][0]); N.push(route[route.length-1][1]);
  const n=E.length, g=E.map((e,k)=>meshY(e,N[k])), eye=new Float32Array(n);
  // the eye line: the ground, but a steep rise ahead lifts you early instead of filling the lens.
  // only what is in front counts, so coming down off a peak you stay on your feet
  const GRADE=.7, WIN=45, cone=new Float32Array(n);
  for(let k=0;k<n;k++){ let m=g[k];
    for(let j=k; j<=Math.min(n-1,k+WIN); j++) m=Math.max(m, g[j]-GRADE*Math.hypot(E[j]-E[k],N[j]-N[k]));
    cone[k]=m; }
  // then the bumps are taken out: the highest point within a few paces either side, and the average of those.
  // it never dips under the ground, and the eye glides over small rises instead of riding every one of them
  const SM=8, hi=new Float32Array(n);
  for(let k=0;k<n;k++){ let m=cone[k];
    for(let j=Math.max(0,k-SM); j<=Math.min(n-1,k+SM); j++) m=Math.max(m, cone[j]);
    hi[k]=m; }
  for(let k=0;k<n;k++){ let a=0, c=0;
    for(let j=Math.max(0,k-SM); j<=Math.min(n-1,k+SM); j++){ a+=hi[j]; c++; }
    eye[k]=a/c; }
  const L=(A,f)=>{ const k=Math.max(0,Math.min(n-2,Math.floor(f))), u=Math.max(0,Math.min(1,f-k)); return A[k]+(A[k+1]-A[k])*u; };
  return { n, E, N, seg0, segN,
    at: f => ({E:L(E,f), N:L(N,f), y:L(eye,f)}),
    dist: (e,nn) => { let d=1e9; for(let k=0;k<n;k++){ const x=E[k]-e, z=N[k]-nn, q=x*x+z*z; if(q<d) d=q; } return Math.sqrt(d); } };
})();

const forest = (() => {
  let sd = 20260922; const rnd = () => (sd = (sd*16807) % 2147483647) / 2147483647;
  const out = {}; for(const k in species) out[k]=[];
  const dum = new THREE.Object3D();
  const put = (k,E,N,y,sc,gx,gn,stretch=1) => {
    dum.position.set(E,y,-N);
    dum.rotation.set((rnd()-.5)*.25 - gn*.05, rnd()*6.283, (rnd()-.5)*.25 - gx*.05);
    dum.scale.set(sc,sc*stretch,sc); dum.updateMatrix(); out[k].push(dum.matrix.clone());
  };
  const pick = w => { let t=0; for(const k in w) t+=w[k]; let r=rnd()*t; for(const k in w){ r-=w[k]; if(r<=0) return k; } return null; };
  let n=0;
  for(let tries=0; tries<120000 && n<7500; tries++){
    const E=(rnd()*2-1)*22.5, N=(rnd()*2-1)*22.5, g=grid(E,N);
    if(g.w>.05) continue;
    const h=g.y/EXAG, a=grid(E+.06,N), b=grid(E,N+.06);
    const gx=(a.y-g.y)/.06, gn=(b.y-g.y)/.06, grad=Math.hypot(gx,gn);
    if(grad>2.4) continue;
    const south=ss(-.3,.6,gn/(grad+1e-4)), exposed=ss(1,2.2,grad), valley=1-ss(.2,1,grad);
    const dens=ss(.035,.09,h)*(1-ss(.72,.84,h))*ss(.25,.62,fbm(E*.9+7,N*.9+2));
    if(rnd() > dens*(.6+1.6*ss(.14,.34,h)) + (h<.06 ? .006 : 0)) continue;
    const th = Math.max(0,Math.min(1, ss(-4,-15,E) + (fbm(E*.22+50,N*.22+20)-.5)*1.3)), ko = 1-th;   // Doi Tao west, Seoul east, mixed between
    const w = {
      sonamu: ko*(.7*ss(.04,.1,h)*(1-ss(.45,.7,h))*(.5+.8*south) + exposed*ss(.1,.3,h) + .02),
      lowOak: ko*.75*ss(.03,.08,h)*(1-ss(.25,.4,h)),
      singal: ko*2.6*ss(.17,.34,h),
      locust: ko*.22*(1-ss(.08,.16,h)),
      teak:   th*ss(.02,.06,h)*(1-ss(.18,.28,h))*(1-.4*south) + .01,
      dipt:   th*ss(.04,.1,h)*(1-ss(.26,.36,h))*(.5+.8*south),
      bamboo: th*.5*(1-ss(.2,.3,h))*(.4+valley),
      kesiya: th*2.4*ss(.2,.34,h)*(1-ss(.62,.8,h))*(.6+exposed),
      castan: th*2.8*ss(.28,.44,h),
    };
    let k = pick(w); if(!k) continue;
    if(trail.dist(E,N) < .13) continue;                      // nothing grows on the footpath
    const base = {sonamu:.38,lowOak:.36,singal:.36,locust:.32,teak:.48,dipt:.46,bamboo:.3,kesiya:.4,castan:.44}[k];
    if(k==="sonamu") k = ["sonamu","sonamu2","sonamu3"][Math.floor(rnd()*3)];
    else if(k==="kesiya") k = rnd()<.5 ? "kesiya" : "kesiya2";
    put(k,E,N,g.y-.02, base*(.75+rnd()*.5)+(h<.06?.06:0), gx,gn, .9+rnd()*.25); n++;
  }
  // azalea understory, Korean patches only, thickest on ridges with Q. mongolica
  for(let tries=0; tries<40000 && out.azalea.length<1800; tries++){
    const E=(rnd()*2-1)*22.5, N=(rnd()*2-1)*22.5, g=grid(E,N), h=g.y/EXAG;
    if(g.w>.05) continue;
    const ko = 1-Math.max(0,Math.min(1, ss(-4,-15,E) + (fbm(E*.22+50,N*.22+20)-.5)*1.3));
    if(rnd() > ko*ss(.1,.3,h)*ss(.35,.6,fbm(E*1.7+3,N*1.7))*.9) continue;
    if(trail.dist(E,N) < .05) continue;
    put("azalea",E,N,g.y-.005, .05+rnd()*.05, 0,0, 1);
  }
  // chunk the forest: one instanced mesh per species per 5 km cell, with its own bounding sphere,
  // so whatever is behind you is never drawn
  const group = new THREE.Group(), CELL=5, pos=new THREE.Vector3();
  for(const k in out){ if(!out[k].length) continue;
    const cells = new Map();
    for(const mt of out[k]){ pos.setFromMatrixPosition(mt);
      const key = Math.floor(pos.x/CELL)+"_"+Math.floor(pos.z/CELL);
      (cells.get(key) || cells.set(key,[]).get(key)).push(mt); }
    for(const [key,mats] of cells){
      const g = new THREE.BufferGeometry(); g.attributes = species[k].attributes; g.index = species[k].index;
      const [cx,cz] = key.split("_").map(Number);
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3((cx+.5)*CELL, 1.2, (cz+.5)*CELL), CELL*.75+1.5);
      const m = new THREE.InstancedMesh(g, pineMat, mats.length);
      mats.forEach((mt,i)=>m.setMatrixAt(i,mt)); m.frustumCulled=true; m.userData.noShadow = (k==="azalea");
      group.add(m);
    }
  }
  scene.add(group); return group;
})();
/* ---------- postfx: a second dither that drifts across the glass ---------- */
const WATERCOLOR = 0;   // 0..1: how much of the paper, wash and pooling is laid over the plain picture, off for now
const INK_BLEED = 0;    // 0..1: dark marks creep out into the wet paper around them, off for now
const DOF = 2.5;         // depth of field: blur radius, in css pixels, of what lies furthest from the focus, 0 for none
const FOCUS = .45;      // how far away the eye is focused, in world units: about where the two friends walk
const LUMA_BLUR = 3;    // luma blur: extra radius, in css pixels, on the brightest places, so light goes soft and the darks stay crisp
const PIXEL_DITHER = 1.4; // the world is drawn small and stretched: each screen pixel reads it from a scattered spot this many world pixels wide, so blocks break into grain
const BLOOM = 1;        // 0..1: light spills out of the bright places
// the pass runs in this order: halftone, ink bleed, depth of field and luma blur, watercolor, bloom, then the dream light over all of it
const HALFTONE = 0;      // 0..1: how much of the picture is carried by the dot screen, off for now
const HALFTONE_CELL = 4; // dot pitch, in css pixels
const DREAM = 0;       // 0..1: soft glow, mist, lifted pastel light over everything
const DITHER = false;   // the dither on the glass, off for now
const DITHER_CELL = 2;  // size of one dither cell, in css pixels
const DITHER_BLUR = .7; // 0 hard cells and hard steps, 1 cells melt into each other
let rt;
function makeRT(w,h){ if(rt){ rt.depthTexture.dispose(); rt.dispose(); }
  rt = new THREE.WebGLRenderTarget(w,h,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
  rt.depthTexture = new THREE.DepthTexture(w,h); rt.depthTexture.type = THREE.UnsignedIntType; }   // the depth is kept for the focus
const post = new THREE.ShaderMaterial({
  depthTest:false, depthWrite:false,
  uniforms:{ tColor:{value:null}, tDepth:{value:null}, uFx:{value:WATERCOLOR}, uBleed:{value:INK_BLEED}, uBloom:{value:BLOOM}, uPix:{value:PIXEL_DITHER}, uDof:{value:DOF}, uFocus:{value:FOCUS}, uLuma:{value:LUMA_BLUR}, uNear:{value:.02}, uFar:{value:400}, uDither:{value:DITHER?1:0}, uDream:{value:DREAM}, uHalf:{value:HALFTONE}, uHCell:{value:HALFTONE_CELL}, uCell:{value:DITHER_CELL}, uBlur:{value:DITHER_BLUR}, uTime:{value:0}, uDpr:{value:1}, uRes:{value:new THREE.Vector2(1,1)}, uOut:{value:new THREE.Vector2(1,1)} },
  vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
  fragmentShader:`
    precision highp float;
    uniform sampler2D tColor, tDepth; uniform float uTime, uDpr, uFx, uDither, uCell, uBlur, uDream, uHalf, uHCell, uBleed, uBloom, uDof, uFocus, uLuma, uNear, uFar, uPix; uniform vec2 uRes, uOut; varying vec2 vUv;
    float bayer2(vec2 a){ a = floor(a); return fract(a.x/2. + a.y*a.y*.75); }
    float bayer8(vec2 a){ return bayer2(.25*a)*.0625 + bayer2(.5*a)*.25 + bayer2(a); }
    float ign(vec2 a){ return fract(52.9829189*fract(dot(floor(a), vec2(.06711056,.00583715)))); }
    float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
    float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x), mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x), u.y); }
    float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p=p*2.03+17.1; a*=.5; } return v; }
    // the cell screens read between cell centres, so a cell fades into its neighbours instead of ending at an edge
    float bayerS(vec2 p){ p -= .5; vec2 i=floor(p), f=fract(p);
      return mix(mix(bayer8(i),bayer8(i+vec2(1.,0.)),f.x), mix(bayer8(i+vec2(0.,1.)),bayer8(i+vec2(1.,1.)),f.x), f.y); }
    float ignS(vec2 p){ p -= .5; vec2 i=floor(p), f=fract(p);
      return mix(mix(ign(i),ign(i+vec2(1.,0.)),f.x), mix(ign(i+vec2(0.,1.)),ign(i+vec2(1.,1.)),f.x), f.y); }
    // one ink's screen: a grid turned by ang, each cell a dot whose area is a
    float dotCov(vec2 p, float ang, float a, float aa){
      float cs=cos(ang), sn=sin(ang); vec2 g = fract(mat2(cs,-sn,sn,cs)*p)-.5;
      float r = sqrt(a/3.14159);
      return 1.-smoothstep(r-aa, r+aa, length(g)); }
    // halftone: three inks on three angles. each dot is printed lighter than solid and so grows bigger,
    // which keeps the pale washes as soft dots instead of specks
    vec3 halftone(vec3 c, vec2 at){
      if(uHalf <= 0.) return c;
      vec2 hp = at/uHCell; float aa = 1.2/(uHCell*uDpr) + .03;
      vec3 ink = sqrt(clamp(1.-c, 0., 1.));              // density of the ink, and the share of the cell it covers
      vec3 cov = vec3(dotCov(hp,.26,ink.r,aa), dotCov(hp,1.31,ink.g,aa), dotCov(hp,.79,ink.b,aa));
      return mix(c, 1.-ink*cov, uHalf);
    }
    // ink bleed: the darkest thing nearby seeps into this spot, further where the paper is wetter,
    // so thin dark marks fatten and feather instead of ending on a clean edge
    vec3 inkBleed(vec3 c, vec2 uv, vec2 fc, vec2 px){
      if(uBleed <= 0.) return c;
      float wet = fbm(fc/38. + 2.), R = (2. + 6.*wet)*uDpr, a0 = fbm(fc/60. + 14.)*12.;
      vec3 m = c;
      for(int i=0;i<10;i++){ float fi=float(i); float k=sqrt((fi+.5)/10.), a=a0+fi*2.39996;
        vec3 t = texture2D(tColor, uv + vec2(cos(a),sin(a))*k*R*px).rgb;
        float inky = 1.-smoothstep(.3,.62, dot(t, vec3(.3,.59,.11)));   // only what is dark enough to be ink runs; the pale washes stay put
        m = min(m, mix(c, t, inky*(1.-k*k*.85))); }        // strongest close in, thinning as it travels
      return mix(c, m, uBleed);
    }
    // circle of confusion: nothing at the focus distance, growing both nearer and further
    float coc(vec2 uv){ float z = uNear*uFar/(uFar - texture2D(tDepth, uv).r*(uFar-uNear));
      float k = clamp(abs(1.-uFocus/z), 0., 1.); return k*sqrt(k); }
    void main(){
      vec2 fc = gl_FragCoord.xy/uDpr;
      vec2 px = 1./uOut;
      float paperLo = fbm(fc/240.);
      // wet paper: colour pulled from a wobbled spot
      vec2 wob = (vec2(fbm(fc/150.), fbm(fc/150.+31.7))-.5)*14.*uFx;
      vec2 suv = vUv + wob*px*uDpr;
      suv += (vec2(ign(gl_FragCoord.xy), ign(gl_FragCoord.yx + vec2(37.,17.))) - .5)*uPix/uRes;   // dithered read, hides the stair-steps of the small picture
      vec3 c = inkBleed(halftone(texture2D(tColor, suv).rgb, suv*uOut/uDpr), suv, fc, px);
      if(uDof > 0. || uLuma > 0.){
        // depth of field and luma blur in one gather: the radius comes from how far out of focus this spot is and how bright it is.
        // a tap counts for as much as it is itself out of focus, so what is sharp does not smear into the soft things behind it,
        // and bright taps count for more, so lights swell into discs
        float k0 = coc(suv), l0 = dot(c, vec3(.3,.59,.11));
        float SR = (uDof*k0 + uLuma*smoothstep(.55,.95,l0))*uDpr;
        vec3 acc = c; float wsum = 1.;
        for(int i=0;i<12;i++){ float fi=float(i); float r=sqrt((fi+.5)/12.)*SR; float a=fi*2.39996 + .7;
          vec2 tuv = suv + vec2(cos(a),sin(a))*r*px; vec3 t = texture2D(tColor, tuv).rgb;
          float w = (.15 + .85*max(coc(tuv), 1.-k0)) * (1. + 2.*uLuma/3.*smoothstep(.6,1., dot(t, vec3(.3,.59,.11))));
          acc += t*w; wsum += w; }
        c = acc/wsum;
      }
      if(uFx > 0.){
      // paper: cockle, tooth, fibres
      float paperHi = fbm(fc/7.);
      float fibre = vnoise(vec2(fc.x/2.5, fc.y/45.))*.5 + vnoise(vec2(fc.x/45., fc.y/2.5))*.5;
      float paperH = paperLo*.35 + paperHi*.5 + fibre*.15;
      // bleed: a soft ring, and pigment pooling where a wash meets another
      vec3 col = c, wide = vec3(0.);
      float R = 7.*uDpr, ang = hash(fc)*6.2831;
      for(int i=0;i<12;i++){ float fi=float(i); float r=sqrt((fi+.5)/12.)*R; float a=ang+fi*2.39996;
        wide += texture2D(tColor, suv + vec2(cos(a),sin(a))*r*px).rgb; }
      wide /= 12.;
      col = mix(col, wide, .3);
      vec3 dens = 1.-col;
      float turb = fbm(fc/90.+5.3);
      dens *= .78 + .46*turb;                               // uneven wash
      float ed = length(col-wide);
      dens += dens*ed*3.2;                                  // edge pooling
      dens *= 1. + (.5-paperH)*.6;                          // granulation in the tooth
      dens = mix(dens, floor(dens*6.+turb*.6)/6., .35);     // glazes
      // desaturate a little, on paper
      vec3 paper = vec3(.98,.965,.93)*(.955+.055*paperH);
      vec3 wc = paper*(1.-clamp(dens,0.,1.));
      wc = mix(vec3(dot(wc, vec3(.3,.59,.11))), wc, .7);
      c = mix(c, wc, uFx);
      }
      if(uDream > 0. || uBloom > 0.){
        // halation: the whole picture breathed out wide and laid back over itself
        vec3 glow = vec3(0.); float GR = 34.*uDpr;
        for(int i=0;i<14;i++){ float fi=float(i); float r=sqrt((fi+.5)/14.)*GR; float a=fi*2.39996 + 1.3;
          glow += texture2D(tColor, vUv + vec2(cos(a),sin(a))*r*px).rgb; }
        glow /= 14.;
        // bloom: only the bright places give light, and it lands on whatever is next to them
        float gl = dot(glow, vec3(.3,.59,.11));
        c = 1.-(1.-c)*(1.-glow*smoothstep(.5,.95,gl)*.8*uBloom);
        c = mix(c, glow*vec3(.99,.975,.96), .14*uDream);                       // soft focus
        c = 1.-(1.-c)*(1.-glow*glow*.18*uDream);                               // a faint lift everywhere
        // split tone: shadows drift lilac, lights go warm cream, nothing stays dark
        float dl = dot(c, vec3(.3,.59,.11));
        c = mix(c, vec3(.80,.78,.95), (1.-smoothstep(.15,.75,dl))*.30*uDream);
        c = mix(c, vec3(1.,.975,.93), smoothstep(.6,1.,dl)*.25*uDream);
        c = mix(c, vec3(dl), -.12*uDream);                                     // a little more colour back, pastel not grey
        // mist that drifts across the glass, and the edges of the page fading out
        float veil = fbm(fc/300. + vec2(uTime*.012, -uTime*.008))*.6 + fbm(fc/120. - vec2(uTime*.02, uTime*.006))*.4;
        c = mix(c, vec3(.985,.975,1.), smoothstep(.42,.8,veil)*.26*uDream);
        vec2 vg = (vUv-.5)*vec2(1.15,1.3);
        c = mix(c, vec3(.99,.98,.985), smoothstep(.32,.78,length(vg))*.5*uDream);
      }
      if(uDither < .5){ gl_FragColor = vec4(c,1.); return; }
      float lum = dot(c, vec3(.3,.59,.11));
      // a fine dither on the glass: ordered, halftone dot, noise and a faint hatch together, slow drift, the sun left alone
      vec2 drift = vec2(uTime*2., -uTime*3.), dc = gl_FragCoord.xy/max(1., uDpr*uCell);
      float tB = mix(bayer8(dc + drift), bayerS(dc + drift), uBlur);
      float tN = mix(ign(dc - drift.yx), ignS(dc - drift.yx), uBlur);
      float tH = fract((dc.x - dc.y)*.31 + paperLo*3.);
      vec2 rp = mat2(.8525,-.5227,.5227,.8525)*dc*.7;
      float tD = .5 + .5*sin(rp.x*3.1416)*sin(rp.y*3.1416);
      float lean = smoothstep(.4,.62, fbm(fc/170.+9.));        // patches where the dot screen takes over from the ordered one
      float wB = .8 - .4*lean, wD = .2 + .6*lean, wN = .55, wH = .15 + .45*smoothstep(.6,.25,lum);
      float t = clamp(.5 + ((tB-.5)*wB + (tD-.5)*wD + (tN-.5)*wN + (tH-.5)*wH)/sqrt(wB*wB + wD*wD + wN*wN + wH*wH), 0., 1.);
      float amp = (1.-smoothstep(.86,.98,lum))*.7;
      float L = 10.;
      vec3 v = c*L + (t-.5)*amp, fv = fract(v);
      float w = .5*uBlur;                                    // how far a step between two levels is feathered
      gl_FragColor = vec4((floor(v) + smoothstep(.5-w, .5+w+1e-4, fv))/L, 1.);
    }`
});
const postScene = new THREE.Scene();
const postCam = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2), post));

/* ---------- shadows: the sun draws the scene once from its side ---------- */
const SUN = new THREE.Vector3(-.55,.75,.35).normalize(), SHR = 7, SHN = 1024;
const shadowRT = new THREE.WebGLRenderTarget(SHN,SHN,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
shadowRT.depthTexture = new THREE.DepthTexture(SHN,SHN); shadowRT.depthTexture.type = THREE.UnsignedIntType;
const sunCam = new THREE.OrthographicCamera(-SHR,SHR,SHR,-SHR,1,80);
const depthMat = new THREE.MeshDepthMaterial({map:leafTex, alphaTest:.35, side:THREE.DoubleSide});
const biasM = new THREE.Matrix4().set(.5,0,0,.5, 0,.5,0,.5, 0,0,.5,.5, 0,0,0,1);
for(const m of [terrainMat, pineMat]) m.uniforms.tShadow.value = shadowRT.depthTexture;
// nothing that casts a shadow moves (the leaves stir only in the colour pass), so the map is good until the walker
// has gone far enough from its centre. drawing it is most of a frame, and doing that every other frame made the walk stutter
const shAt = new THREE.Vector3(1e9,0,0), shM = new THREE.Matrix4();
function renderShadows(){
  const tx = 2*SHR/SHN*24;                                     // re-centre in steps of 24 texels, a third of a km
  if(Math.max(Math.abs(me.x-shAt.x), Math.abs(me.y-shAt.y), Math.abs(me.z-shAt.z)) < tx*.75) return;
  const cx = Math.round(me.x/tx)*tx, cz = Math.round(me.z/tx)*tx, cy = Math.round(me.y/tx)*tx;
  shAt.set(cx,cy,cz);
  sunCam.position.set(cx+SUN.x*40, cy+SUN.y*40, cz+SUN.z*40);
  sunCam.lookAt(cx,cy,cz); sunCam.updateMatrixWorld(); sunCam.updateProjectionMatrix();
  shM.multiplyMatrices(sunCam.projectionMatrix, sunCam.matrixWorldInverse).premultiply(biasM);
  for(const m of [terrainMat, pineMat]) m.uniforms.uShadowMat.value.copy(shM);
  sky.dome.visible=false; clouds.group.visible=false; friends.show(false);
  const hidden=[]; forest.traverse(o=>{ if(o.userData.noShadow){ o.visible=false; hidden.push(o); } });
  for(const b of birds){ b.m.visible=false; hidden.push(b.m); }   // a bird's shadow would stay behind where it was
  scene.overrideMaterial = depthMat;
  renderer.setRenderTarget(shadowRT); renderer.render(scene, sunCam);
  scene.overrideMaterial = null;
  for(const o of hidden) o.visible=true;
  sky.dome.visible=true; clouds.group.visible=true; friends.show(true);
}

/* ---------- walker ---------- */
const EYE = .095;
const me = {x:.9, z:1.85, y:0, yaw:0, pitch:-.04};   // start on Namsan, facing north toward Bukhansan
{ const t = terrain(me.x,-me.z); me.y = t.h*EXAG + EYE; }
const LOOK = .0024;
function look(dx,dy){ me.yaw -= dx*LOOK; me.pitch = Math.max(-1.2, Math.min(1.2, me.pitch - dy*LOOK)); }

// mouse: drag to look. the wheel is left alone, it belongs to the walk
let dragging=false, lx=0, ly=0;
canvas.addEventListener("mousedown", e => { dragging=true; lx=e.clientX; ly=e.clientY; nudge(); });
addEventListener("mouseup", () => dragging=false);
addEventListener("mousemove", e => { if(dragging){ look(e.clientX-lx, e.clientY-ly); lx=e.clientX; ly=e.clientY; } });
addEventListener("keydown", () => nudge());

// touch: swiping up and down scrolls the page (and so walks), sideways looks
let lookT=null;
canvas.addEventListener("touchstart", e => { const t=e.changedTouches[0]; lookT={id:t.identifier,x:t.clientX}; }, {passive:true});
canvas.addEventListener("touchmove", e => { for(const t of e.changedTouches)
  if(lookT && t.identifier===lookT.id){ look((t.clientX-lookT.x)*1.4, 0); lookT.x=t.clientX; } }, {passive:true});
const tend = e => { for(const t of e.changedTouches) if(lookT && t.identifier===lookT.id) lookT=null; nudge(); };
canvas.addEventListener("touchend", tend); canvas.addEventListener("touchcancel", tend);

function nudge(){ startAudio(); }


/* ---------- landmarks: the things you navigate a city by ---------- */
(() => {
  const BX=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
  const at = (lat,lon) => { const [E,N]=KM(lat,lon); return {E,N,y:terrain(E,N).h*EXAG}; };
  const add = (g,x,y,z,ry=0) => { const m=new THREE.Mesh(g,pineMat); m.position.set(x,y,z); m.rotation.y=ry; m.frustumCulled=false; scene.add(m); return m; };
  const pale=[.88,.87,.85], grey=[.72,.71,.70], stone=[.80,.78,.74];

  // N서울타워, 236 m on 남산
  const ns = at(37.5512,126.9882);
  add(merge([
    part(CY(.018,.055,.44,8), pale, M(0,.22,0)),
    part(CY(.075,.055,.10,10), grey, M(0,.47,0)),
    part(CY(.055,.032,.07,10), pale, M(0,.56,0)),
    part(CY(.004,.013,.24,6), grey, M(0,.71,0)),
  ]), ns.E, ns.y-.02, -ns.N);

  // 롯데월드타워, 555 m at 잠실
  const lw = at(37.5126,127.1025);
  add(merge([
    part(CY(.042,.105,1.52,4), pale, M(0,.76,0)),
    part(CY(.004,.03,.18,4), grey, M(0,1.6,0)),
  ]), lw.E, lw.y-.02, -lw.N, Math.PI/4);

  // the old wall line, now just a road over the four inner mountains
  function ribbon(path, w, col, lift){
    const pts=[]; 
    for(let i=0;i<path.length-1;i++){
      const A=path[i], B=path[i+1], L=Math.hypot(B[0]-A[0],B[1]-A[1]), n=Math.max(2,Math.ceil(L/.05));
      for(let k=0;k<n;k++){ const t=k/n; pts.push([A[0]+(B[0]-A[0])*t, A[1]+(B[1]-A[1])*t]); }
    }
    pts.push(path[path.length-1]);
    const P=[], C=[], I=[];
    for(let i=0;i<pts.length;i++){
      const a=pts[Math.max(0,i-1)], b=pts[Math.min(pts.length-1,i+1)];
      let dx=b[0]-a[0], dn=b[1]-a[1]; const L=Math.hypot(dx,dn)||1; dx/=L; dn/=L;
      const px=-dn*w*.5, pn=dx*w*.5, y=terrain(pts[i][0],pts[i][1]).h*EXAG+lift;
      P.push(pts[i][0]+px, y, -(pts[i][1]+pn), pts[i][0]-px, y, -(pts[i][1]-pn));
      C.push(col[0],col[1],col[2], col[0],col[1],col[2]);
      if(i<pts.length-1){ const k=i*2; I.push(k,k+1,k+2, k+1,k+3,k+2); }
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(P),3));
    g.setAttribute("aCol", new THREE.BufferAttribute(new Float32Array(C),3));
    g.setAttribute("uv", _U(P.length/3));
    g.setIndex(I); g.computeVertexNormals();
    const m=new THREE.Mesh(g,pineMat); m.frustumCulled=false; scene.add(m); return m;
  }
  const wallPath = [[37.5850,126.9580],[37.5930,126.9670],[37.5920,126.9810],[37.5880,127.0050],
    [37.5800,127.0070],[37.5710,127.0100],[37.5650,127.0100],[37.5512,126.9882],[37.5600,126.9755],
    [37.5690,126.9680],[37.5850,126.9580]].map(q=>KM(q[0],q[1]));
  ribbon(wallPath, .045, [1.,1.,.985], .006);

  // the footpath itself: a worn strip pressed onto the ground, each edge at its own height so it hugs a side slope
  { const P=[], C=[], I=[], w=.06, col=[.96,.89,.76], SUB=2, n=(trail.n-1)*SUB+1;
    const xy = f => { const k=Math.max(0,Math.min(trail.n-2,Math.floor(f))), u=f-k;
      return [trail.E[k]+(trail.E[k+1]-trail.E[k])*u, trail.N[k]+(trail.N[k+1]-trail.N[k])*u]; };
    for(let i=0;i<n;i++){
      const f=i/SUB, c=xy(f), a=xy(Math.max(0,f-2)), b=xy(Math.min(trail.n-1,f+2));   // a long tangent keeps the edges from folding on a bend
      let dx=b[0]-a[0], dn=b[1]-a[1]; const L=Math.hypot(dx,dn)||1; dx/=L; dn/=L;
      for(const sd of [1,0,-1]){
        const e=c[0]-dn*w*.5*sd, nn=c[1]+dx*w*.5*sd;
        P.push(e, meshY(e,nn)+.007, -nn); C.push(col[0],col[1],col[2]);
      }
      if(i<n-1){ const k=i*3; I.push(k,k+1,k+3, k+1,k+4,k+3, k+1,k+2,k+4, k+2,k+5,k+4); }
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(P),3));
    g.setAttribute("aCol", new THREE.BufferAttribute(new Float32Array(C),3));
    g.setAttribute("uv", _U(P.length/3));
    g.setIndex(I); g.computeVertexNormals();
    // same paint as everything else, but always won against the ground under it, so no hill shows through in patches
    const pathMat=pineMat.clone(); pathMat.uniforms=pineMat.uniforms;
    pathMat.polygonOffset=true; pathMat.polygonOffsetFactor=-2; pathMat.polygonOffsetUnits=-4;
    const m=new THREE.Mesh(g,pathMat); m.frustumCulled=false; scene.add(m); }

  // แพ: raft houses moored on the Doi Tao lake
  const raft = merge([
    part(BX(.09,.008,.06), [.62,.5,.36], M(0,0,0)),
    part(BX(.05,.03,.04), [.72,.62,.5], M(0,.02,0)),
    part(BX(.06,.008,.05), [.36,.3,.3], M(0,.04,0)),
  ]);
  { let rs=99; const rr=()=>(rs=(rs*16807)%2147483647)/2147483647;
    for(let i=0;i<22;i++){
      const L=lake[Math.floor(rr()*lake.length)], t=rr();
      const E=L[0]+(L[2]-L[0])*t + (rr()-.5)*L[4]*1.2, N=L[1]+(L[3]-L[1])*t + (rr()-.5)*L[4]*1.2;
      if(E<-23.5 || terrain(E,N).water<.6) continue;
      add(raft, E, -.006, -N, rr()*6.283);
    } }

  // 한강 다리
  const deck = merge([ part(BX(1.6,.004,.085), stone, M(0,0,0)) ]);   // flat, just a painted strip
  for(const q of [[37.517,126.958],[37.512,126.997],[37.509,126.980],[37.539,127.038],[37.522,127.035],
                  [37.518,127.087],[37.535,126.949],[37.573,126.865],[37.528,127.070],[37.540,126.925]]){
    const [E,N]=KM(q[0],q[1]);
    let best=1e9, ang=0;                                   // lay the deck across the nearest bend of the river
    for(let i=0;i<han.length-1;i++){
      const d=segDist(E,N,han[i][0],han[i][1],han[i+1][0],han[i+1][1]);
      if(d<best){ best=d; ang=Math.atan2(han[i+1][1]-han[i][1], han[i+1][0]-han[i][0]); }
    }
    add(deck, E, .03, -N, -ang + Math.PI/2);
  }
})();

/* ---------- sky: cloud cover, and the sun somewhere behind it ---------- */
const sky = (() => {
  const mat = new THREE.ShaderMaterial({
    side:THREE.BackSide, depthWrite:false, depthTest:false,
    uniforms:{ uTime:{value:0}, uDpr:{value:1}, uH:{value:800} },
    vertexShader:`varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`
      precision highp float;
      uniform float uTime; varying vec3 vDir;
      ${GLSL_NOISE}
      ${GLSL_DITHER}
      void main(){
        vec3 d = normalize(vDir);
        float up = clamp(d.y,0.,1.);
        vec3 sun = normalize(vec3(-.55,.75,.35));
        float sd = dot(d,sun);
        vec3 col = mix(vec3(1.,1.,.99), vec3(.86,.95,.99), smoothstep(0.,.6,up));
        vec2 cp = d.xz/(abs(d.y)+.20);
        float c1 = fbm(cp*1.0 + vec2(uTime*.005, uTime*.0035));
        float c2 = fbm(cp*2.7 - vec2(uTime*.010, uTime*.002));
        float cov = smoothstep(.50,.80, c1*.66+c2*.34);
        vec3 cloud = mix(vec3(.86,.90,.94), vec3(1.,1.,1.), smoothstep(.28,.9,c2));
        col = mix(col, cloud, cov*(.35+.65*smoothstep(.0,.25,up)));
        float halo = pow(max(sd,0.),40.)*.85 + pow(max(sd,0.),5.)*.22;
        float disc = smoothstep(.9988,.9995, sd);
        col += (halo*.7 + disc*1.2)*.8*vec3(1.,.95,.86);
        gl_FragColor = vec4(min(col,vec3(1.)),1.);
      }`
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(200,32,20), mat);
  dome.frustumCulled=false; dome.renderOrder=-1; scene.add(dome);
  return {mat, dome};
})();

/* ---------- birds ---------- */
const birds = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
    0,0,0,  -.5,.1,-.22,  -.42,.02,.05,
    0,0,0,   .42,.02,.05,  .5,.1,-.22 ]),3));
  const c = new Float32Array(18); for(let i=0;i<18;i+=3){ c[i]=.34; c[i+1]=.3; c[i+2]=.28; }
  g.setAttribute("aCol", new THREE.BufferAttribute(c,3)); g.setAttribute("uv", _U(6)); g.computeVertexNormals();
  const arr=[]; let sd=7;
  const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;
  for(let f=0;f<4;f++){
    const cx=(rnd()*2-1)*11, cn=(rnd()*2-1)*11, alt=terrain(cx,cn).h*EXAG + .35+rnd()*1.1;
    for(let i=0;i<6;i++){
      const m=new THREE.Mesh(g,pineMat); m.scale.setScalar(.016+rnd()*.012); m.frustumCulled=false; scene.add(m);
      arr.push({m, cx, cn, alt:alt+rnd()*.5, r:1.2+rnd()*3.5, ph:rnd()*6.283, sp:.14+rnd()*.12, fl:9+rnd()*5, s:m.scale.x});
    }
  }
  return arr;
})();

/* ---------- frogs, birds, as sound ---------- */
let audio=null;
function startAudio(){
  if(audio) return;
  const AC = window.AudioContext||window.webkitAudioContext; if(!AC) return;
  const ctx = new AC(); const out = ctx.createGain(); out.gain.value=.5; out.connect(ctx.destination);
  audio = {ctx, out};

  const pan = v => { const p=ctx.createStereoPanner? ctx.createStereoPanner():null; if(p) p.pan.value=v; return p; };
  function croak(near){                                    // frog: pulsed saw through a bandpass
    const t=ctx.currentTime, o=ctx.createOscillator(), g=ctx.createGain(), bp=ctx.createBiquadFilter();
    o.type="sawtooth"; o.frequency.value=150+Math.random()*90;
    bp.type="bandpass"; bp.frequency.value=520+Math.random()*420; bp.Q.value=6;
    const pulse=ctx.createOscillator(), pg=ctx.createGain();
    pulse.type="square"; pulse.frequency.value=22+Math.random()*16; pg.gain.value=.5;
    pulse.connect(pg); pg.connect(g.gain);
    g.gain.value=.5;
    const env=ctx.createGain(); env.gain.setValueAtTime(0,t);
    env.gain.linearRampToValueAtTime(.16*near,t+.03);
    env.gain.setValueAtTime(.16*near,t+.18+Math.random()*.2);
    env.gain.linearRampToValueAtTime(0,t+.55);
    o.connect(bp); bp.connect(g); g.connect(env);
    const p=pan(Math.random()*1.6-.8); if(p){ env.connect(p); p.connect(out); } else env.connect(out);
    o.start(t); pulse.start(t); o.stop(t+.7); pulse.stop(t+.7);
  }
  function chirp(){                                        // bird: three quick sine sweeps
    let t=ctx.currentTime;
    for(let i=0;i<2+Math.floor(Math.random()*3);i++){
      const o=ctx.createOscillator(), g=ctx.createGain();
      const f=2200+Math.random()*1800;
      o.type="sine"; o.frequency.setValueAtTime(f,t); o.frequency.exponentialRampToValueAtTime(f*(.6+Math.random()*.9),t+.07);
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.05,t+.012); g.gain.exponentialRampToValueAtTime(.001,t+.1);
      o.connect(g); const p=pan(Math.random()*1.6-.8); if(p){ g.connect(p); p.connect(out); } else g.connect(out);
      o.start(t); o.stop(t+.12); t+=.09+Math.random()*.06;
    }
  }
  // frogs live by the water, birds in the trees
  const waterNear = () => {
    let d=9; for(let a=0;a<6.283;a+=.7) for(let r=.4;r<3.5;r+=.6)
      if(terrain(me.x+Math.cos(a)*r, -(me.z+Math.sin(a)*r)).water>.4) d=Math.min(d,r);
    return Math.max(0, 1-d/3.5);
  };
  (function frogs(){ const n=waterNear(); if(n>.05 && Math.random()<.8) croak(.35+n); setTimeout(frogs, 500+Math.random()*2200); })();
  (function bs(){ if(Math.random()<.6) chirp(); setTimeout(bs, 2500+Math.random()*7000); })();
}

/* ---------- scroll: the story is a path, and the scrollbar is your legs ---------- */
const story = [
  "I'm in Seoul with my friends, and they have an idea: get me to touch more grass.",
  "So here we are on Namsan, walking and chatting our way across the hills.",
  "I still look at my phone sometimes. A little later I decide to put it down.",
  "But I cannot stop thinking about work.",
  "The scenery up on Bugaksan is quite nice, though, and I like the pine trees a lot.",
  "Their shape is interesting. We don't have pines like this in Chiang Mai, my hometown, I think.",
  "Most of the time I'm in my room or in the city. I like the city a lot, I like to see people and buildings.",
  "But walking in nature reminds me of walking with a friend and my brother at Doi Tao Lake.",
  "Possibly because I don't go outside to nature much.",
  "This time, walking with friends feels quite fresh to me,",
  "even though my body is aching.",
  "I should start running.",
  "Not run from something. I should run for myself.",
];
const $ = id => document.getElementById(id);
const track = $("ssw-track"), lineEl = $("ssw-line"), countEl = $("ssw-count"), hintEl = $("ssw-hint");
const weight = segLen.map(l => 1 + l*.2);          // viewports of scroll per line, long legs take longer
const total = weight.reduce((a,b)=>a+b, 0);
track.style.height = (total+1)*100 + "vh";
// the walk runs up the page: you start at the bottom, and scrolling toward the top walks you forward
history.scrollRestoration = "manual";
scrollTo(0, document.documentElement.scrollHeight);
const walk = {line:-1, lit:-1, first:true, f:0, tilt:0, ground:0, vel:0};
const ease = (k,dt) => 1-Math.exp(-k*dt);          // the same easing whatever the frame rate
const PACE_TIME = .35;                              // seconds your feet take to catch up with the scrollbar
const LEAD = 10;                                    // how far ahead the two friends keep, in trail samples (about 400 m)
const MAX_PACE = 40;                                // the fastest the walk will go however hard you scroll, in trail samples a second (about 1.6 km)
function scrollStep(dt){
  // where the scrollbar says we are: which line, and how far along its leg
  const r = track.getBoundingClientRect();
  const p = 1 - Math.max(0, Math.min(1, -r.top/Math.max(1, r.height-innerHeight)));
  let u = p*total, i = 0;
  while(i<weight.length-1 && u>weight[i]){ u -= weight[i]; i++; }
  hintEl.classList.toggle("gone", p>.003);

  // the scrollbar only says how far along the footpath you want to be; your feet get there at their own pace,
  // so flinging the page does not fling you across the city
  const target = Math.min(trail.n-1-LEAD, trail.seg0[i] + Math.min(1, u/weight[i])*trail.segN[i]);
  if(walk.first){ walk.f = target; }
  // a critically damped spring: the pace builds up and dies away instead of jumping with every notch of the wheel
  { const om = 2/PACE_TIME, x = om*dt, ex = 1/(1 + x + .48*x*x + .235*x*x*x), lim = MAX_PACE*PACE_TIME;
    const gap = Math.max(-lim, Math.min(lim, walk.f-target)), to = walk.f-gap, tmp = (walk.vel + om*gap)*dt;
    walk.vel = (walk.vel - om*tmp)*ex;
    let f = to + (gap + tmp)*ex;
    if((target-walk.f > 0) === (f > target)){ f = target; walk.vel = 0; }      // never past where the scrollbar is
    walk.f = f; }

  // the story is read off where your feet are, not where the scrollbar is, so the line never runs ahead of the walk
  i = 0; while(i<weight.length-1 && walk.f >= trail.seg0[i+1]) i++;
  const t = Math.max(0, Math.min(1, (walk.f-trail.seg0[i])/trail.segN[i]));
  if(i!==walk.line){
    walk.line = i; walk.lit = -1;
    lineEl.innerHTML = story[i].split(" ").map(w=>`<span>${w}</span>`).join(" ");
    countEl.textContent = String(i+1).padStart(2,"0") + " / " + story.length;
  }
  // the line is written out by the walking: word by word, the whole of it there a little before the leg ends
  const spans = lineEl.children, lit = Math.max(1, Math.round(Math.min(1, t/.8)*spans.length));
  if(lit!==walk.lit){ for(let k=0;k<spans.length;k++) spans[k].classList.toggle("hit", k<lit); walk.lit = lit; }
  const here = trail.at(walk.f), ahead = trail.at(Math.min(trail.n-1, walk.f+4)), back = trail.at(Math.max(0, walk.f-4));
  const up = trail.at(Math.min(trail.n-1, walk.f+12)), dn = trail.at(Math.max(0, walk.f-12));   // the slope is read over a longer stretch than the heading, so the eyes do not nod at every bump
  const hx=ahead.E-back.E, hn=ahead.N-back.N, run=Math.hypot(hx,hn)||1;
  const heading = Math.atan2(-hx, hn);                          // yaw such that forward = -sin(yaw), -cos(yaw) in x,z
  const grade = Math.atan2(up.y-dn.y, Math.hypot(up.E-dn.E, up.N-dn.N)||1)*.6;            // lean the eyes with the slope, so a climb is not a wall
  me.x = here.E; me.z = -here.N; walk.ground = here.y + EYE;
  if(walk.first){ walk.first=false; me.yaw=heading; me.y=walk.ground; walk.tilt=grade; return; }
  walk.tilt += (grade-walk.tilt)*ease(1.5,dt);
  // the path turns your head only while you move, so you can stop and look around. the pull fades in and out with the pace,
  // so the turn does not start or stop with a jerk
  { let dy = heading - me.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); me.yaw += dy*ease(1.6*ss(.1,2.5,Math.abs(walk.vel)), dt); }
}

/* ---------- company: two friends a few paces ahead on the footpath ---------- */
const friends = (() => {
  const SP=r=>new THREE.SphereGeometry(r,8,6), BX=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
  // they are a memory, so they are painted the way the clouds are: the body swells a little like vapour,
  // the rim is torn away by noise, and the rest is stippled so the hills show through
  const mat = new THREE.ShaderMaterial({
    side:THREE.DoubleSide,
    uniforms:{ uTime:{value:0} },
    vertexShader:`
      uniform float uTime; attribute vec3 aCol;
      varying vec3 vN; varying vec3 vW; varying vec3 vCol; varying float vDist;
      void main(){
        vec4 wp = modelMatrix*vec4(position,1.); vN = normalize(mat3(modelMatrix)*normal);
        float puff = sin(wp.x*310. + uTime*.9)*sin(wp.y*270. - uTime*.7)*sin(wp.z*290. + uTime*.5);
        wp.xyz += vN*(.0022 + .0042*puff);
        vW = wp.xyz; vCol = aCol;
        vec4 mv = viewMatrix*wp; vDist = length(mv.xyz); gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader:`
      precision highp float;
      uniform float uTime; varying vec3 vN; varying vec3 vW; varying vec3 vCol; varying float vDist;
      ${GLSL_NOISE}
      void main(){
        vec3 n = normalize(vN), V = normalize(cameraPosition - vW);
        float facing = abs(dot(n,V));
        float rag = fbm(vW.xy*85. + vW.z*60. + vec2(uTime*.12, -uTime*.08));
        if(facing < .1 + rag*.66) discard;                                  // torn, drifting edge
        float thin = fbm(vW.xy*150. - vW.z*110. + vec2(-uTime*.2, uTime*.15) + 7.);
        float body = .36 + .4*smoothstep(.2,.9,facing) - .65*smoothstep(.4,.76,thin);
        if(hash(floor(gl_FragCoord.xy) + floor(uTime*8.)*.37) > body) discard;   // stipple: half there, half sky
        float lit = smoothstep(-.4,.9, dot(n, normalize(vec3(-.55,.75,.35))));
        vec3 c = vCol*(.8 + .35*lit);
        c = mix(c, vec3(.74,.79,.87), min(.92, .16 + (1.-facing)*.7 + rag*.32));            // the ink thins to cloud grey toward the rim
        c = 1.-(1.-c)*(.72 + .5*fbm(vW.xy*40. + vW.z*30.));
        c = wcolor(c, vW, 14., 0., .4);
        float nz = fbm(vW.xz*.8);
        float edge = smoothstep(24.5, 18.5, max(abs(vW.x),abs(vW.z)) + (nz-.5)*4.);
        float fog = 1.-smoothstep(4.,34.,vDist)*.85;
        gl_FragColor = vec4(mix(vec3(1.), c, edge*fog), 1.);
      }`
  });
  const mesh = parts => { const m=new THREE.Mesh(merge(parts), mat); m.frustumCulled=false; return m; };
  const limb = (parent,x,y,parts) => { const g=new THREE.Group(); g.position.set(x,y,0); g.add(mesh(parts)); parent.add(g); return g; };
  const dark=[.16,.14,.15];
  // +z is the way a figure faces. hips at .047, shoulders at .08, about .108 tall
  function build(o){
    const root=new THREE.Group(), body=new THREE.Group(), torso=new THREE.Group(), head=new THREE.Group();
    root.add(body); body.add(torso); torso.position.y=.046; torso.add(head); head.position.y=.041;
    torso.add(mesh([ part(CY(.0125,.0145,.037,7), o.coat, M(0,.02,0)), part(CY(.0042,.0042,.006,6), o.skin, M(0,.04,0)), ...o.torso ]));
    head.add(mesh([
      part(SP(.0105), o.skin, M(0,.012,0)),
      part(SP(.0109), o.hair, M(0,.0146,-.0036)),
      part(BX(.0022,.0022,.002), dark, M(.0038,.0128,.0098)), part(BX(.0022,.0022,.002), dark, M(-.0038,.0128,.0098)),
      ...o.head ]));
    const arm = sx => limb(torso, sx*.0165, .035, [ part(CY(.0043,.0036,.034,5), o.coat, M(0,-.017,0)), part(SP(.0044), o.skin, M(0,-.037,0)) ]);
    const leg = sx => limb(body, sx*.0066, .047, [ part(CY(.006,.0072,.044,6), o.legs, M(0,-.022,0)), part(BX(.0115,.0075,.0195), o.shoe, M(0,-.0435,.0035)) ]);   // wide trousers, heavy soles
    root.scale.setScalar(o.scale); scene.add(root);
    return { root, body, torso, head, arms:[arm(1),arm(-1)], legs:[leg(1),leg(-1)], side:o.side, lag:o.lag,
             yaw:0, hy:0, hp:0, tw:0, talk:0, first:true };
  }
  // both in black from head to foot, the way people dress in Seoul or Berlin: the blacks differ a little so the layers still read
  const ink=[.07,.07,.085], coal=[.11,.11,.125], soot=[.045,.045,.055], hairK=[.07,.06,.06];
  const shades = [ part(BX(.0052,.0038,.002), soot, M(.0036,.0128,.0101)), part(BX(.0052,.0038,.002), soot, M(-.0036,.0128,.0101)),
                   part(BX(.004,.0012,.002), soot, M(0,.0138,.0101)) ];
  const list = [
    // him: long wool coat to the knee, a cap with hair down past the ears, sunglasses, a tote on the shoulder
    build({ side:1, lag:0, scale:1, coat:ink, legs:coal, shoe:soot, skin:[.93,.76,.63], hair:hairK,
      torso:[ part(CY(.0146,.0185,.031,7), ink, M(0,-.0115,0)), part(CY(.0075,.0125,.008,7), soot, M(0,.037,0)),
              part(BX(.0045,.019,.016), coal, M(.0205,.004,.001)), part(BX(.0016,.03,.0016), coal, M(.0185,.027,.001)) ],
      head:[ part(SP(.011), hairK, M(0,.0092,-.0046,1,1.15,.88)),                                              // hair to the nape
             part(SP(.0113), coal, M(0,.0166,-.0008,1,.78,1)), part(BX(.0155,.0014,.0105), soot, M(0,.0172,.0138)),   // cap and its brim
             ...shades ] }),
    // her: cropped puffer over wide slacks, hair to the shoulders, sunglasses, a small bag worn across the chest
    build({ side:-1, lag:.5, scale:.94, coat:coal, legs:ink, shoe:soot, skin:[.94,.78,.66], hair:hairK,
      torso:[ part(CY(.0158,.0168,.0125,8), ink, M(0,.031,0)), part(CY(.0165,.0168,.0125,8), coal, M(0,.019,0)),
              part(CY(.0085,.011,.008,7), ink, M(0,.0385,0)), part(BX(.013,.0085,.005), soot, M(-.003,.02,.017)) ],
      head:[ part(SP(.0112), hairK, M(0,.0058,-.0046,1.03,1.7,.9)),                                            // long hair, down over the shoulders
             ...shades ] }),
  ];
  // what the two of them are up to: walking and looking ahead, talking to each other, glancing back at you,
  // or, once you have stood still a moment, turned right round to talk with you
  const st = { mode:"ahead", t:2.5, who:0, talker:0, talkT:1.5, phase:0, gait:0, still:0, dir:1 };
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a)), cl = (x,a,b) => Math.max(a,Math.min(b,x));
  function update(dt, T){
    mat.uniforms.uTime.value = T;
    const speed = Math.abs(walk.vel)*.04;                                   // km a second along the path
    const moving = speed > .004;
    st.still = moving ? 0 : st.still + dt;
    st.gait += ((moving?1:0) - st.gait)*Math.min(1,dt*5);
    st.phase += Math.min(speed/.05*6.283, 10.5)*dt;
    if(walk.vel > .6) st.dir = 1; else if(walk.vel < -.6) st.dir = -1;      // scroll back and they come back with you
    if(st.still > 1.1){ if(st.mode!=="face"){ st.mode="face"; st.talker=Math.random()<.5?0:1; st.talkT=1.6; } }
    else if(st.mode==="face"){ st.mode="ahead"; st.t=1.5+Math.random()*1.5; }
    else if((st.t -= dt) < 0){
      const r = Math.random();
      if(st.mode==="ahead"){ st.mode = r<.6 ? "chat" : "look"; }
      else if(st.mode==="chat"){ st.mode = r<.45 ? "look" : "ahead"; }
      else { st.mode = r<.6 ? "chat" : "ahead"; }
      st.t = st.mode==="chat" ? 4+Math.random()*5 : st.mode==="look" ? 2.2+Math.random()*1.8 : 1.5+Math.random()*2.5;
      st.who = Math.random()<.3 ? 2 : Math.random()<.5 ? 0 : 1;             // who glances back: one of them, now and then both
    }
    if((st.talkT -= dt) < 0){ st.talker = 1-st.talker; st.talkT = 1.1+Math.random()*1.8; }

    for(let k=0;k<2;k++){
      const f = list[k], o = list[1-k];
      const pf = Math.min(trail.n-1, walk.f + LEAD - f.lag);
      const c = trail.at(pf), a = trail.at(Math.max(0,pf-2)), b = trail.at(Math.min(trail.n-1,pf+2));
      let dx=b.E-a.E, dn=b.N-a.N; const L=Math.hypot(dx,dn)||1; dx/=L; dn/=L;
      const E = c.E - dn*f.side*.019, N = c.N + dx*f.side*.019;
      const x = E, z = -N, y = meshY(E,N) + .007;
      const toMe = Math.atan2(me.x-x, me.z-z);
      const lookers = st.mode==="look" && (st.who===2 || st.who===k);
      // body
      let yawT = Math.atan2(dx,-dn) + (st.dir<0 ? Math.PI : 0), rel = 0, pitchT = 0;
      if(st.mode==="face") yawT = toMe;
      if(st.mode==="face" || lookers){
        rel = wrap(toMe - yawT);
        if(Math.abs(rel) > 2.5) rel = -f.side*Math.abs(rel);               // over the shoulder on the friend's side
        yawT += cl(rel*.22, -.55, .55); rel = wrap(toMe - yawT);
        pitchT = -Math.atan2(me.y - (y+.095), Math.hypot(me.x-x, me.z-z));
      } else if(st.mode==="chat"){
        rel = wrap(Math.atan2(o.root.position.x-x, o.root.position.z-z) - yawT)*.62;
      } else rel = Math.sin(T*.4 + k*2.1)*.18;
      if(f.first){ f.first=false; f.yaw=yawT; }
      f.yaw += wrap(yawT-f.yaw)*Math.min(1,dt*4);
      const twT = cl(rel*.35, -.55, .55), hyT = cl(rel-twT, -1.25, 1.25);
      f.tw += (twT-f.tw)*Math.min(1,dt*4); f.hy += (hyT-f.hy)*Math.min(1,dt*5); f.hp += (cl(pitchT,-.4,.4)-f.hp)*Math.min(1,dt*5);
      // whoever has the word nods and moves a hand
      const speaking = st.mode!=="ahead" && st.talker===k && (st.mode!=="look" || lookers);
      f.talk += ((speaking?1:0) - f.talk)*Math.min(1,dt*4);
      const sw = Math.sin(st.phase + k*.9), g = st.gait;
      f.root.position.set(x, y + Math.abs(Math.cos(st.phase + k*.9))*.0022*g, z);
      f.root.rotation.y = f.yaw;
      f.body.rotation.set(.07*g, 0, Math.sin(T*.8 + k*1.7)*.025*(1-g));     // lean into the walk, shift weight when standing
      f.torso.rotation.set(Math.sin(T*1.3+k)*.01, f.tw, 0);
      f.head.rotation.set(f.hp + Math.sin(T*6.5 + k)*.06*f.talk, f.hy, Math.sin(T*2.1 + k)*.05*f.talk, "YXZ");
      f.legs[0].rotation.x = sw*.62*g; f.legs[1].rotation.x = -sw*.62*g;
      const hand = (st.mode==="chat" ? (f.side>0 ? 1 : 0) : (k===0 ? 0 : 1));   // the arm nearer whoever is listening
      for(let i=0;i<2;i++){
        const swing = (i===0 ? -sw : sw)*.5*g, tk = i===hand ? f.talk : 0;
        f.arms[i].rotation.set(swing*(1-tk) + (-1.05 + Math.sin(T*4.3 + k)*.28)*tk, 0, (i===0 ? 1 : -1)*(.06 + .25*tk));
      }
    }
  }
  const show = v => { for(const f of list) f.root.visible = v; };           // a memory casts no shadow
  return { list, update, show };
})();

/* ---------- clouds: slow white heaps over the basin, and mist caught on the shoulders of the hills ---------- */
const clouds = (() => {
  const mat = new THREE.ShaderMaterial({
    uniforms:{ uTime:{value:0} },
    vertexShader:`
      varying vec3 vN; varying vec3 vW; varying float vDist;
      void main(){
        vec4 wp = modelMatrix*vec4(position,1.); vW = wp.xyz; vN = normalize(mat3(modelMatrix)*normal);
        vec4 mv = viewMatrix*wp; vDist = length(mv.xyz); gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader:`
      precision highp float;
      uniform float uTime; varying vec3 vN; varying vec3 vW; varying float vDist;
      ${GLSL_NOISE}
      void main(){
        vec3 n = normalize(vN), V = normalize(cameraPosition - vW);
        // a wet edge: the rim of every heap is torn away by noise, so no hard ball outline is left
        float rag = fbm(vW.xz*1.3 + vW.y*1.9 + uTime*.015);
        if(abs(dot(n,V)) < .12 + rag*.62) discard;
        float lit = smoothstep(-.35,.85, dot(n, normalize(vec3(-.55,.75,.35))));
        float under = smoothstep(.15,-.7,n.y);
        vec3 c = mix(vec3(.90,.93,.97), vec3(1.), lit);
        c = mix(c, vec3(.80,.85,.92), under*.6);
        c = 1.-(1.-c)*(.6 + .8*fbm(vW.xz*2.2 + vW.y*3.));           // uneven wash, pigment pooling in the folds
        c = wcolor(c, vW, .9, 0., .6);
        float fog = 1.-smoothstep(10.,42.,vDist)*.7;
        gl_FragColor = vec4(mix(vec3(1.), c, fog), 1.);
      }`
  });
  let sd=4711; const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;
  const ball = new THREE.IcosahedronGeometry(1,2), group = new THREE.Group(), arr = [], RANGE = 26;
  function heap(E, N, y, size, flat, wind){
    const parts=[], n=5+Math.floor(rnd()*5);
    for(let i=0;i<n;i++){
      const t=i/(n-1)-.5, r=(.34+rnd()*.3)*(1-Math.abs(t)*.7);
      const g=ball.clone(); g.applyMatrix4(new THREE.Matrix4().compose(
        new THREE.Vector3(t*1.7+(rnd()-.5)*.3, r*flat*.75+(rnd()-.5)*.08, (rnd()-.5)*.55),
        new THREE.Quaternion(), new THREE.Vector3(r*1.25, r*flat, r)));
      parts.push(part(g,[1,1,1],new THREE.Matrix4()));
    }
    const m=new THREE.Mesh(merge(parts), mat); m.frustumCulled=false;
    m.scale.setScalar(size); m.rotation.y=rnd()*6.283; m.position.set(E,y,-N); group.add(m);
    arr.push({m, x0:E, sp:(.012+rnd()*.02)*wind, bob:rnd()*6.283});
  }
  // cumulus, well above the peaks
  for(let i=0;i<34;i++) heap((rnd()*2-1)*RANGE, (rnd()*2-1)*RANGE, 3.3+rnd()*2.6, 1.3+rnd()*2.2, .8, 1);
  // mist: long low banks lying against the higher ground
  for(let i=0, tries=0; i<26 && tries<4000; tries++){
    const E=(rnd()*2-1)*22, N=(rnd()*2-1)*22, h=terrain(E,N).h;
    if(h<.16 || h>.6 || trail.dist(E,N)<1.2) continue;
    heap(E, N, h*EXAG + .12 + rnd()*.25, .7+rnd()*.9, .3, .08); i++;      // mist barely moves
  }
  scene.add(group);
  function update(T){
    mat.uniforms.uTime.value = T;
    for(const c of arr){
      const x = c.x0 + T*c.sp;                                              // drift east on the wind, and come round again
      c.m.position.x = ((x + RANGE) % (2*RANGE) + 2*RANGE) % (2*RANGE) - RANGE;
      c.m.position.y += Math.sin(T*.11 + c.bob)*.00006;
    }
  }
  return { group, update };
})();

/* ---------- resize + loop ---------- */
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
let W=0,H=0;
let RSCALE = .6;     // world drawn at 60% size; drops toward 42% on its own if the frame rate sinks under 30
function resize(){
  W=canvas.clientWidth||innerWidth; H=canvas.clientHeight||innerHeight; dpr=Math.min(window.devicePixelRatio||1,1.5);
  renderer.setPixelRatio(dpr); renderer.setSize(W,H,false);
  camera.aspect=W/H; camera.updateProjectionMatrix();
  for(const m of [terrainMat, pineMat, sky.mat]){ m.uniforms.uDpr.value=dpr*RSCALE; m.uniforms.uH.value=H; }
  const rw=Math.floor(W*dpr*RSCALE), rh=Math.floor(H*dpr*RSCALE);
  makeRT(rw, rh);
  post.uniforms.tColor.value = rt.texture; post.uniforms.tDepth.value = rt.depthTexture; post.uniforms.uDpr.value = dpr; post.uniforms.uRes.value.set(rw, rh); post.uniforms.uOut.value.set(Math.floor(W*dpr), Math.floor(H*dpr));
}
addEventListener("resize", resize); resize();

let last = performance.now();
const fpsEl = document.getElementById("ssw-fps"); let fpsN=0, fpsT=performance.now(), fastT=0;
function frame(now){
  const dt = Math.min(.05,(now-last)/1000); last = now;
  fpsN++; if(now-fpsT>1000){
    const fps = fpsN*1000/(now-fpsT); fpsEl.textContent = Math.round(fps) + " fps"; fpsN=0; fpsT=now;
    if(fps<28 && RSCALE>.43){ RSCALE=Math.max(.42,RSCALE-.06); resize(); fastT=0; }
    else if(fps>57 && RSCALE<.6){ if(++fastT>=4){ RSCALE=Math.min(.6,RSCALE+.03); resize(); fastT=0; } }
    else fastT=0;
  }

  scrollStep(dt);
  me.y += (walk.ground - me.y)*ease(5,dt);
  friends.update(dt, now/1000); clouds.update(now/1000);

  const T = now/1000;
  pineMat.uniforms.uTime.value = T;
  sky.mat.uniforms.uTime.value = T; sky.dome.position.copy(camera.position);

  for(const b of birds){
    const a = b.ph + T*b.sp;
    b.m.position.set(b.cx + Math.cos(a)*b.r, b.alt + Math.sin(T*.5+b.ph)*.12, -(b.cn + Math.sin(a)*b.r));
    b.m.rotation.set(0, -a + Math.PI/2, Math.sin(a*2.)*.15);
    b.m.scale.y = b.s*(.35 + .95*Math.abs(Math.sin(T*b.fl + b.ph)));
  }

  camera.position.set(me.x, me.y, me.z);
  camera.rotation.set(me.pitch + walk.tilt, me.yaw, 0, "YXZ");

  post.uniforms.uTime.value = T; terrainMat.uniforms.uTime.value = T;
  renderShadows();
  renderer.setRenderTarget(rt); renderer.render(scene,camera);
  renderer.setRenderTarget(null); renderer.render(postScene,postCam);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
