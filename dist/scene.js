import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

const C={sand:0xe8d19d,grass:0x93ae60,wood:0x8b6444,darkwood:0x624937,cream:0xf2dfb3,orange:0xd97757,leaf:0x4e7b4d};
const Y=.72;
const materials=new Map();
function mat(color){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.88,metalness:0}));return materials.get(color);}
function mesh(geo,color,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geo,typeof color==='number'?mat(color):color);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(p,w,h,d,color,x=0,y=0,z=0){return mesh(new THREE.BoxGeometry(w,h,d),color,p,x,y,z);}
function cylinder(p,rt,rb,h,color,x=0,y=0,z=0,n=10){return mesh(new THREE.CylinderGeometry(rt,rb,h,n),color,p,x,y,z);}
function sphere(p,r,color,x=0,y=0,z=0){return mesh(new THREE.IcosahedronGeometry(r,1),color,p,x,y,z);}
function group(p,x=0,y=0,z=0){const g=new THREE.Group();g.position.set(x,y,z);p.add(g);return g;}
function rod(p,a,b,r,color){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),v=bv.clone().sub(av);const m=cylinder(p,r,r,v.length(),color,0,0,0,6);m.position.copy(av.add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return m;}
function seeded(seed=42){let v=seed;return ()=>{v=(1664525*v+1013904223)>>>0;return v/4294967296;};}
// Merge static meshes by material while preserving each clickable building and animated pivot.
function batchStatic(parent){
  if(parent.userData.dynamic)return;
  for(const child of [...parent.children])if(child.isGroup)batchStatic(child);
  const buckets=new Map();
  for(const child of [...parent.children]){if(!child.isMesh||child.userData.dynamic||child.material.map||!(child.material instanceof THREE.MeshStandardMaterial))continue;const key=child.material.uuid;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(child);}
  for(const meshes of buckets.values()){if(meshes.length<2)continue;const geometries=meshes.map(m=>{m.updateMatrix();let g=m.geometry.clone();if(g.index)g=g.toNonIndexed();g.applyMatrix4(m.matrix);return g;});const merged=mergeGeometries(geometries,false);if(!merged)continue;const m=new THREE.Mesh(merged,meshes[0].material);m.castShadow=true;m.receiveShadow=true;parent.add(m);for(const old of meshes)parent.remove(old);geometries.forEach(g=>g.dispose());}
}
const random=seeded();
function label(text,{bg='#5c4737',fg='#f4e8c8',width=256,height=64,font=28}={}){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const c=canvas.getContext('2d');c.fillStyle=bg;c.fillRect(0,0,width,height);c.strokeStyle='#ffffff18';c.lineWidth=4;c.strokeRect(5,5,width-10,height-10);c.fillStyle=fg;c.font=`600 ${font}px sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(text,width/2,height/2,width-18);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function sign(p,text,x,y,z,w=1.4){const texture=label(text);const m=mesh(new THREE.PlaneGeometry(w,w/4),new THREE.MeshBasicMaterial({map:texture}),p,x,y,z);return m;}
function terrain(rx,rz,top,bottom,color){
  const N=72,positions=[],indices=[];
  positions.push(0,top,0);
  for(let ring=0;ring<2;ring++)for(let i=0;i<N;i++){const a=i/N*Math.PI*2;const irregular=1+.035*Math.sin(a*5+.4)+.023*Math.cos(a*9);const s=ring===0?.94:1;positions.push(Math.cos(a)*rx*s*irregular,ring===0?top:bottom,Math.sin(a)*rz*s*irregular);}
  for(let i=0;i<N;i++){const j=(i+1)%N;indices.push(0,1+j,1+i,1+i,1+N+j,1+N+i,1+i,1+j,1+N+j);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();return new THREE.Mesh(geo,mat(color));
}

function house(parent,{x,z,w=2.0,d=1.8,h=1.75,roof=0xb36a4b,wall=C.cream,name='',rotation=0}){
  const g=group(parent,x,Y,z);g.rotation.y=rotation;
  box(g,w+.25,.15,d+.24,0xb7a07a,0,.075,0);box(g,w,h,d,wall,0,h/2+.1,0);
  // Visible wooden corners, timber frame, and rustic planking.
  for(const sx of [-1,1])for(const sz of [-1,1])box(g,.105,h+.12,.1,C.wood,sx*(w/2-.025),h/2+.13,sz*(d/2+.025));
  box(g,w+.1,.11,d+.1,C.wood,0,h-.03,0);box(g,w+.1,.11,d+.1,C.wood,0,.19,0);
  for(let i=0;i<5;i++)box(g,w,.025,.027,0xdfc9a4,0,.38+i*.25,d/2+.012);
  // Pitched tiled roof, ridge along Z.
  const rw=w/2+.24,rh=.83,angle=Math.atan(rh/rw),slant=Math.hypot(rw,rh);
  for(const side of [-1,1]){const roofPlane=box(g,slant,.16,d+.48,roof,side*rw/2,h+.11+rh/2,0);roofPlane.rotation.z=-side*angle;
    for(let row=0;row<4;row++)for(let col=0;col<5;col++){const t=(row+.5)/4;const tile=box(g,slant/4-.025,.06,(d+.48)/5-.018,row%2?roof:0xac6449,side*(rw*(1-t)),h+.23+rh*t,-(d+.48)/2+(col+.5)*(d+.48)/5);tile.rotation.z=-side*angle;}}
  rod(g,[0,h+.16+rh,-d/2-.27],[0,h+.16+rh,d/2+.27],.105,0x94553c);
  const shape=new THREE.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(0,.8);shape.closePath();mesh(new THREE.ShapeGeometry(shape),wall,g,0,h+.1,d/2+.018);
  box(g,.46,.86,.06,C.darkwood,-w*.23,.57,d/2+.04);box(g,.05,.8,.075,C.wood,-w*.23,.58,d/2+.08);sphere(g,.028,0xe3bd66,-w*.23+.15,.6,d/2+.09);
  const win=box(g,.46,.46,.05,0x486d72,w*.24,.94,d/2+.047);box(g,.53,.065,.1,C.wood,w*.24,.68,d/2+.07);box(g,.53,.065,.1,C.wood,w*.24,1.2,d/2+.07);box(g,.06,.51,.1,C.wood,w*.24,.94,d/2+.08);box(g,.5,.04,.1,C.wood,w*.24,.94,d/2+.08);
  win.userData.dynamic=true;
  box(g,.48,.22,.3,C.wood,w*.24,.55,d/2+.15);for(let i=0;i<4;i++){sphere(g,.11,0x577d42,w*.24-.18+i*.12,.72,d/2+.17);sphere(g,.052,[0xd48988,0xf2da82,0xe4c5d5][i%3],w*.24-.18+i*.12,.81,d/2+.17);}
  if(name)sign(g,name,0,h-.22,d/2+.07,w*.73);
  box(g,.35,.78,.38,0xa08b77,w*.26,h+.78,-d*.2);box(g,.43,.1,.46,0xcab29a,w*.26,h+1.18,-d*.2);
  return {g,win};
}
function awning(p,w,d,color,y,z){for(let i=0;i<8;i++){const m=box(p,w/8,.055,d,i%2?C.cream:color,-w/2+(i+.5)*w/8,y,z);m.rotation.x=-.16;}for(let s of [-1,1])cylinder(p,.035,.035,y,C.wood,s*(w/2-.04),y/2,z+d/2);}
function barrel(p,x,z){const g=group(p,x,Y,z);cylinder(g,.19,.22,.42,0x947047,0,.21,0,12);for(const y of [.07,.34])cylinder(g,.224,.224,.045,0x545c59,0,y,0,12);return g;}
function bench(p,x,z,rot=0){const g=group(p,x,Y,z);g.rotation.y=rot;box(g,1.0,.1,.38,C.wood,0,.34,0);box(g,1.0,.33,.08,C.wood,0,.6,-.16);for(const s of [-1,1])box(g,.08,.38,.35,C.darkwood,s*.37,.17,0);return g;}
function tree(p,x,z,s=1){const g=group(p,x,Y,z);g.scale.setScalar(s);cylinder(g,.1,.16,1.4,0x8d7152,0,.7,0,7);sphere(g,.62,0x6d954f,0,1.65,0);sphere(g,.47,0x7a9d56,.35,1.6,.12);sphere(g,.46,0x638b48,-.3,1.48,-.15);for(let i=0;i<4;i++)sphere(g,.066,0xe6b75f,Math.sin(i*2)*.45,1.5+i*.13,Math.cos(i*2)*.43);return g;}
function palm(p,x,z,s=1){const g=group(p,x,Y,z);g.scale.setScalar(s);const a=[0,0,0],b=[.25,2.9,0];rod(g,a,b,.13,0x9a7953);for(let i=0;i<8;i++){const t=i/8*Math.PI*2;const leaf=mesh(new THREE.SphereGeometry(1,8,4),0x527849,g,.25+Math.cos(t)*.75,2.86,Math.sin(t)*.75);leaf.scale.set(1.25,.075,.23);leaf.rotation.y=-t;leaf.rotation.z=Math.cos(t)*-.16;}sphere(g,.15,0x826646,.17,2.68,.13);sphere(g,.13,0x826646,.41,2.65,0);return g;}
function boat(p,{x,z,scale=1,sail=false,color=0x6c94a6,rotation=0}){
  const g=group(p,x,.1,z);g.scale.setScalar(scale);g.rotation.y=rotation;
  const hull=mesh(new THREE.SphereGeometry(1,12,8),color,g);hull.scale.set(.48,.28,1.05);box(g,.73,.06,1.35,C.wood,0,.2,0);box(g,.07,.12,1.7,C.cream,-.4,.24,0);box(g,.07,.12,1.7,C.cream,.4,.24,0);
  for(let i=0;i<3;i++)box(g,.8,.07,.12,C.wood,0,.3,-.45+i*.45);
  if(sail){rod(g,[0,.3,0],[0,2.4,0],.035,C.wood);const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute([0,2.27,0,0,.62,.85,0,.62,0],3));geom.computeVertexNormals();mesh(geom,new THREE.MeshStandardMaterial({color:0xf5e8c8,side:THREE.DoubleSide,roughness:1}),g);rod(g,[0,.58,0],[0,.58,.9],.023,C.wood);}
  else{rod(g,[-.35,.35,-.15],[-1.0,.05,.8],.025,C.wood);rod(g,[.35,.35,-.15],[1.0,.05,.8],.025,C.wood);}
  return g;
}
function mascot(parent,{scale=1,color=C.orange,name=null,accessory=0}={}){
  const root=group(parent);root.scale.setScalar(scale);const body=group(root,0,.39,0);
  box(body,.72,.48,.44,color,0,.12,0);box(body,.92,.24,.39,color,0,.1,0);
  const eyes=[];for(const side of [-1,1]){const eye=box(body,.09,.11,.025,0x172627,side*.2,.17,.231);eyes.push(eye);}
  const legs=[];for(const side of [-1,1])for(const z of [-.12,.13]){const pivot=group(root,side*.24,.29,z);box(pivot,.12,.28,.13,color,0,-.14,0);legs.push(pivot);}
  const arms=[];for(const s of [-1,1]){const arm=group(body,s*.42,.12,0);box(arm,.13,.22,.17,color,0,-.06,0);arms.push(arm);}
  if(accessory%3===1){box(body,.69,.065,.5,0x598398,0,.4,0);box(body,.42,.12,.35,0x598398,0,.49,0);}
  if(accessory%3===2){box(body,.74,.085,.48,0x9db77a,0,-.04,0);box(body,.12,.2,.05,0x9db77a,.14,-.17,.26);}
  let tag=null;if(name){tag=new THREE.Sprite(new THREE.SpriteMaterial({map:label(name,{bg:'#183b4be0',fg:'#e3eee8',width:256,height:64,font:25}),transparent:true,depthTest:false}));tag.position.set(0,1.3,0);tag.scale.set(1.5,.37,1);tag.visible=false;root.add(tag);}
  return {root,body,legs,arms,eyes,tag,phase:random()*Math.PI*2};
}

export class IslandWorld{
  constructor(canvas,{onVisit,onReady,onManualActivity}){
    this.canvas=canvas;this.onVisit=onVisit;this.onManualActivity=onManualActivity;this.time=0;this.scale=1;this.targetScale=1;this.level=0;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.mobile=innerWidth<901;this.manual=false;this.follow=false;this.keys=new Set();this.residents=[];this.colliders=[];this.interactables=[];this.lights=[];this.expansions=[];this.weather='sun';
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0xb9dfe8);this.scene.fog=new THREE.Fog(0xb9dfe8,45,145);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
    this.camera=new THREE.PerspectiveCamera(36,1,.1,220);this.camera.position.set(19,18,24);
    this.controls=new OrbitControls(this.camera,canvas);this.controls.target.set(0,.5,0);this.controls.enableDamping=true;this.controls.dampingFactor=.07;this.controls.minDistance=7;this.controls.maxDistance=110;this.controls.minPolarAngle=.2;this.controls.maxPolarAngle=Math.PI/2.15;this.controls.enablePan=true;this.controls.screenSpacePanning=true;this.controls.maxTargetRadius=15;
    this.controls.addEventListener('start',()=>{this.follow=false;document.getElementById('focus-claude').setAttribute('aria-pressed','false');});
    this.hemi=new THREE.HemisphereLight(0xf5f8e5,0x61837a,2.7);this.scene.add(this.hemi);this.sun=new THREE.DirectionalLight(0xfff1d0,3.8);this.sun.position.set(-10,20,14);this.sun.castShadow=true;this.sun.shadow.mapSize.set(this.mobile?1024:2048,this.mobile?1024:2048);Object.assign(this.sun.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:1,far:70});this.sun.shadow.normalBias=.04;this.sun.shadow.bias=-.0001;this.scene.add(this.sun);
    this.island=group(this.scene);this.land=group(this.island);this.land.add(terrain(9.15,7.7,.5,-.35,C.sand));this.land.add(terrain(8.35,6.88,Y,.50,C.grass));this.land.children.forEach(m=>{m.receiveShadow=true;});
    this.buildWater();this.buildVillage();this.buildDetails();this.buildHarbor();this.buildClouds();this.buildExpansion();
    this.main=mascot(this.island,{scale:1.05});this.main.root.userData.dynamic=true;this.main.root.position.set(-2.6,Y,.2);this.position=this.main.root.position;this.activity='code';this.walking=false;this.destination='pc';this.actionTime=0;this.wait=18;this.route=[];
    this.nodes={pc:[-2.6,.2],cross:[-1.2,1.25],square:[.8,1.25],home:[-3.6,-.3],books:[.8,-1.55],market:[3.7,.45],cafe:[-3.7,3.8],dock:[3.5,5.6],beach:[5.2,3.15],garden:[-5.8,.25],orchard:[-1.0,-4.5]};
    this.edges=[['pc','cross'],['home','pc'],['cross','square'],['square','books'],['square','market'],['cross','cafe'],['square','dock'],['market','beach'],['cross','garden'],['books','orchard']];
    for(const expansion of this.expansionNodes){this.nodes[expansion.name]=expansion.point;this.edges.push([expansion.connector,expansion.name]);}
    this.buildPaths();batchStatic(this.island);this.boats.forEach(b=>batchStatic(b));this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.startPointer=null;
    canvas.addEventListener('pointerdown',e=>{this.startPointer=[e.clientX,e.clientY];});canvas.addEventListener('pointerup',e=>{if(!this.startPointer||Math.hypot(e.clientX-this.startPointer[0],e.clientY-this.startPointer[1])>7)return;this.pick(e);});
    canvas.addEventListener('pointermove',e=>{if(e.buttons)return;this.hover(e);});canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();const t=document.getElementById('toast');t.textContent='La vista 3D è stata interrotta. Ricarica per riaprire l’isola: i progressi sono salvati.';t.hidden=false;});
    addEventListener('resize',()=>this.resize());this.resize();this.controls.update();this.renderer.render(this.scene,this.camera);onReady();
  }
  tag(object,visit){object.userData.visit=visit;this.interactables.push(object);}
  buildVillage(){
    const home=house(this.island,{x:-3.1,z:-2.1,w:2.45,d:2.1,h:1.85,name:'CASA DI CLAUDE',roof:0xc07755});this.home=home;this.tag(home.g,'pc');this.colliders.push({x:-3.1,z:-2.1,w:2.8,d:2.45});
    // Porch, visible outdoor computer desk, and warm lamp.
    const porch=group(this.island,-2.6,Y,-.7);box(porch,2.05,.13,1.6,0xad855b,0,.08,.05);for(let i=0;i<8;i++)box(porch,.22,.04,1.57,0xb58e66,-.89+i*.25,.17,.05);
    const desk=group(this.island,-2.6,Y,-.42);box(desk,1.2,.12,.58,0x9b7451,0,.77,0);for(const x of [-.49,.49])for(const z of [-.21,.21])box(desk,.075,.72,.075,C.darkwood,x,.38,z);box(desk,.08,.24,.08,0x37494c,0,.95,-.1);box(desk,.57,.4,.075,0x29373d,0,1.2,-.12);this.screenCanvas=document.createElement('canvas');this.screenCanvas.width=256;this.screenCanvas.height=160;this.screenTexture=new THREE.CanvasTexture(this.screenCanvas);this.screenTexture.colorSpace=THREE.SRGBColorSpace;mesh(new THREE.PlaneGeometry(.49,.31),new THREE.MeshBasicMaterial({map:this.screenTexture}),desk,0,1.2,-.075);box(desk,.45,.025,.17,0x354448,0,.85,.15);for(let i=0;i<7;i++)box(desk,.035,.01,.13,0x93b5ac,-.2+i*.065,.868,.15);cylinder(desk,.085,.07,.15,0xdecbaa,.43,.91,.13);this.tag(desk,'pc');this.desk=desk;
    const light=new THREE.PointLight(0xffca79,0,4,2);light.position.set(-2.6,2.4,-.4);this.scene.add(light);this.lights.push(light);
    const cafe=house(this.island,{x:-4.0,z:2.05,w:2.05,d:1.7,h:1.55,name:'LE PETIT CAFÉ',roof:0x6b8b7a,rotation:.13});this.tag(cafe.g,'cafe');this.colliders.push({x:-4,z:2.05,w:2.4,d:1.9});awning(cafe.g,2.25,.8,0x9caa73,1.15,1.18);const table=cylinder(this.island,.36,.36,.1,C.wood,-2.68,Y+.57,3.35,12);cylinder(this.island,.06,.1,.6,C.darkwood,-2.68,Y+.3,3.35);for(let i=0;i<2;i++)cylinder(this.island,.16,.16,.4,C.wood,-2.68+(i===0?.6:-.6),Y+.2,3.35);cylinder(this.island,.048,.048,.07,0xe3d6bb,-2.7,Y+.67,3.3);
    const market=house(this.island,{x:4.0,z:-1.25,w:1.95,d:1.8,h:1.6,name:'EMPORIO',roof:0xba7354,rotation:-.12});this.tag(market.g,'market');this.colliders.push({x:4,z:-1.25,w:2.3,d:2.1});awning(market.g,2.16,.75,0xcf975c,1.15,1.21);const stalls=group(market.g,0,.44,1.24);box(stalls,1.65,.45,.45,C.wood);for(let j=0;j<3;j++){box(stalls,.48,.05,.35,0x705139,-.55+j*.55,.26,0);for(let i=0;i<5;i++)sphere(stalls,.06,[0xca624b,0xe6bd59,0x83a454][j],-.7+j*.55+(i%3)*.12,.34,Math.floor(i/3)*.14-.1);}barrel(this.island,5.1,-.65);
    const books=house(this.island,{x:.6,z:-3.05,w:1.95,d:1.8,h:1.7,name:'LIBRERIA',roof:0x667d91});this.tag(books.g,'books');this.colliders.push({x:.6,z:-3.05,w:2.3,d:2.1});box(books.g,.45,.7,.28,C.wood,-.77,.56,1.15);for(let i=0;i<5;i++)box(books.g,.04,.23+i%2*.04,.2,[0x976954,0x839960,0xe6c991,0x6a8f99][i%4],-.93+i*.075,.67,1.15);this.bookshop=books.g;
    // Fountain and seats in the village square.
    const fountain=group(this.island,.8,Y,2.7);cylinder(fountain,.6,.65,.22,0xc1b996,0,.11,0,14);cylinder(fountain,.49,.49,.04,0x72b4bd,0,.245,0,14);cylinder(fountain,.11,.15,.65,0xc8c4a7,0,.5,0,8);sphere(fountain,.17,0xddccb0,0,.93,0);this.fountain=fountain;bench(this.island,2.25,2.65,.8);bench(this.island,-.4,3.05,-.5);
    this.addLamp(-.7,1.85);this.addLamp(2.4,.7);this.addLamp(3.0,4.7);
  }
  addLamp(x,z){const g=group(this.island,x,Y,z);cylinder(g,.035,.07,1.75,0x485c54,0,.875,0,7);box(g,.27,.33,.27,0xefd5a2,0,1.77,0);box(g,.36,.06,.36,0x546556,0,1.96,0);for(const s of [-1,1])box(g,.025,.35,.3,0x53604e,s*.13,1.78,0);const l=new THREE.PointLight(0xffd68d,0,5,2);l.position.set(x,Y+1.77,z);this.scene.add(l);this.lights.push(l);}
  buildWater(){
    this.waterUniforms={time:{value:0},storm:{value:0},night:{value:0}};
    const m=new THREE.ShaderMaterial({uniforms:this.waterUniforms,vertexShader:`uniform float time;uniform float storm;varying vec3 vWorld;void main(){vec3 p=position;float a=.06+storm*.08;p.z+=sin(p.x*.7+time*.8)*a+cos(p.y*.8-time*.5)*a;vec4 world=modelMatrix*vec4(p,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,fragmentShader:`uniform float time;uniform float night;uniform float storm;varying vec3 vWorld;void main(){float wave=sin(vWorld.x*1.7+vWorld.z*.8-time*.9)*cos(vWorld.z*1.9-vWorld.x*.3+time*.4);vec3 shallow=vec3(.37,.72,.79);vec3 deep=vec3(.20,.55,.68);float d=length(vWorld.xz*vec2(.8,1.));vec3 color=mix(shallow,deep,smoothstep(8.,55.,d));float sparkle=pow(max(0.,wave),18.)*.12;color+=sparkle;color=mix(color,vec3(.12,.30,.38),storm*.45);color=mix(color,color*.29+vec3(.025,.06,.12),night*.87);gl_FragColor=vec4(color,1.);}`});
    const water=mesh(new THREE.PlaneGeometry(300,300,100,100),m,this.scene,0,-.05,0);water.rotation.x=-Math.PI/2;water.castShadow=false;water.receiveShadow=false;
    this.foam=[];for(let i=0;i<3;i++){const ring=mesh(new THREE.RingGeometry(1,1.008,100),new THREE.MeshBasicMaterial({color:0xd9f1df,transparent:true,opacity:.20,side:THREE.DoubleSide}),this.scene,0,.04+i*.012,0);ring.rotation.x=-Math.PI/2;ring.scale.set(9.8+i*.44,8.2+i*.38,1);ring.castShadow=false;this.foam.push(ring);}
    this.waveStrokes=group(this.scene);for(let i=0;i<80;i++){const x=(random()-.5)*70,z=(random()-.5)*65;if(x*x/110+z*z/85<1.5)continue;const stroke=mesh(new THREE.PlaneGeometry(.2+random()*1.2,.024),new THREE.MeshBasicMaterial({color:0xd5f0e9,transparent:true,opacity:.12+random()*.12}),this.waveStrokes,x,.025,z);stroke.rotation.x=-Math.PI/2;stroke.rotation.z=random()*.3;stroke.castShadow=false;stroke.userData.phase=random()*6;}
    const rp=[];for(let i=0;i<450;i++)rp.push((random()-.5)*32,random()*20,(random()-.5)*28);const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.Float32BufferAttribute(rp,3));this.rain=new THREE.Points(rainGeo,new THREE.PointsMaterial({color:0xd9ecf0,size:.065,transparent:true,opacity:.7}));this.rain.visible=false;this.scene.add(this.rain);
  }
  buildDetails(){
    palm(this.island,-6.1,-2.6,.94);palm(this.island,5.45,1.5,1.07);palm(this.island,-5.6,4.2,.8);palm(this.island,3.8,-4.45,.75);tree(this.island,-.9,-5.1,.85);tree(this.island,2.2,-4.8,.9);tree(this.island,-6.8,.6,.75);
    for(let i=0;i<24;i++){const a=i/24*Math.PI*2;const x=Math.cos(a)*(7.5+random()*.3),z=Math.sin(a)*(5.9+random()*.3);if(z>4&&x>1&&x<5)continue;const r=sphere(this.island,.2+random()*.32,0xa2ada1,x,Y-.05,z);r.scale.set(1,.6,1.0+random());r.rotation.set(random(),random(),random());}
    for(let i=0;i<85;i++){const a=random()*Math.PI*2,r=.8+random()*.22;const x=Math.cos(a)*7.6*r,z=Math.sin(a)*6.1*r;const s=.06+random()*.1;const bush=sphere(this.island,s*1.7,0x7b9850,x,Y,z);bush.scale.y=.8;for(let j=0;j<2;j++){const flower=sphere(this.island,.036,[0xf1d78b,0xdeb0b5,0xf6edc6][i%3],x+(random()-.5)*.2,Y+s+.05,z+(random()-.5)*.2);flower.castShadow=false;}}
    const fence=group(this.island);for(let i=0;i<6;i++){box(fence,.06,.5,.06,0xbea27a,-5.2+i*.4,Y+.25,-3.65);if(i<5){box(fence,.4,.05,.04,0xbea27a,-5+i*.4,Y+.18,-3.65);box(fence,.4,.05,.04,0xbea27a,-5+i*.4,Y+.39,-3.65);}}
    barrel(this.island,-4.75,-.7);barrel(this.island,.1,-1.85);
    this.birds=[];for(let i=0;i<5;i++){const b=group(this.scene);const wings=[];for(const s of [-1,1]){const w=box(b,.3,.025,.1,0xf1f0df,s*.15,0,0);wings.push(w);}this.birds.push({g:b,wings,phase:random()*6});}
  }
  buildHarbor(){
    this.harbor=group(this.island,3.5,0,5.75);for(let i=0;i<15;i++)box(this.harbor,1.25,.12,.23,0xb08a5d,0,.55,i*.25);for(let side of [-1,1])for(let i=0;i<4;i++){cylinder(this.harbor,.065,.09,1.05,0x8f7355,side*.56,.36,i*.95);cylinder(this.harbor,.078,.078,.055,0xd5b98c,side*.56,.9,i*.95);}box(this.harbor,.11,.1,3.8,0x917454,-.4,.45,1.76);box(this.harbor,.11,.1,3.8,0x917454,.4,.45,1.76);this.tag(this.harbor,'dock');
    this.boats=[boat(this.scene,{x:5.1,z:8.15,color:0x729a9b,rotation:-.2}),boat(this.scene,{x:2.1,z:8.75,color:0x976651,rotation:.3}),boat(this.scene,{x:-10.5,z:2.7,scale:1.25,sail:true,color:0xe4d8ba,rotation:.8})];
  }
  buildClouds(){this.clouds=[];for(let i=0;i<9;i++){const g=group(this.scene,(random()-.5)*80,14+random()*7,-20-random()*40);for(let j=0;j<5;j++){const s=sphere(g,.7+random()*.65,0xf4f4e4,j*.8,Math.sin(j)*.3,0);s.scale.set(1.3,.65,.75);s.castShadow=false;}this.clouds.push(g);}}
  buildExpansion(){
    const cottages=[[-8,-2.8,.3],[7.8,-3.8,-.5],[-6.9,6.1,2.7],[6.8,6.5,3.55],[-.6,-8.5,0],[9.8,1.3,-1.57]];
    const connectors=['garden','market','cafe','dock','orchard','beach'];const startPoints=[[-5.8,.25],[3.7,.45],[-3.7,3.8],[3.5,5.6],[-1,-4.5],[5.2,3.15]];this.expansionNodes=[];
    cottages.forEach(([x,z,rotation],i)=>{const unlock=4+i*4;const h=house(this.island,{x,z,w:1.65,d:1.4,h:1.4,roof:[0x8c9971,0xad7454,0x6c8797][i%3],name:['HAIKU','SONNET','OPUS','INSTANT','FABLE','ATELIER'][i],rotation});h.g.visible=false;h.g.userData.unlock=unlock;this.expansions.push(h.g);this.colliders.push({x,z,w:2,d:1.75,unlock});const t=tree(h.g,-1.3,-.7,.7);t.position.y=0;const entrance=[x+Math.sin(rotation)*1.4,z+Math.cos(rotation)*1.4];const name=`neighborhood-${i}`;this.tag(h.g,name);this.expansionNodes.push({name,point:entrance,connector:connectors[i],unlock});
      const road=group(this.island);road.userData.unlock=unlock;road.visible=false;this.expansions.push(road);const A=startPoints[i],B=entrance;const length=Math.hypot(B[0]-A[0],B[1]-A[1]);const path=box(road,.38,.025,length,0xc6bf8d,(A[0]+B[0])/2,Y+.008,(A[1]+B[1])/2);path.rotation.y=Math.atan2(B[0]-A[0],B[1]-A[1]);for(let j=0;j<7;j++){const f=(j+.5)/7;const tt=tree(road,A[0]+(B[0]-A[0])*f+.8,(A[1]+(B[1]-A[1])*f)-.2,.32+random()*.16);}
    });
    const lighthouse=group(this.island,-9.6,Y,4.15);cylinder(lighthouse,.37,.62,2.4,0xf0e0b7,0,1.2,0,12);cylinder(lighthouse,.39,.45,.4,0xbb7554,0,1.45,0,12);cylinder(lighthouse,.54,.55,.1,C.wood,0,2.43,0,12);cylinder(lighthouse,.35,.35,.45,0xedd79e,0,2.67,0,10);cylinder(lighthouse,.0,.51,.45,0x697d72,0,3.03,0,10);this.expansions.push(lighthouse);lighthouse.userData.unlock=12;lighthouse.visible=false;const lamp=new THREE.PointLight(0xffe4a6,0,9,2);lamp.position.set(-9.6,Y+2.8,4.15);this.scene.add(lamp);this.lights.push(lamp);
  }
  buildPaths(){
    const paths=[['home','pc'],['pc','cross'],['cross','square'],['square','books'],['square','market'],['cross','cafe'],['square','dock'],['market','beach'],['cross','garden'],['books','orchard']];
    for(const [a,b] of paths){const A=this.nodes[a],B=this.nodes[b],dist=Math.hypot(A[0]-B[0],A[1]-B[1]);const m=box(this.island,.46,.027,dist,0xc6bf8d,(A[0]+B[0])/2,Y+.007,(A[1]+B[1])/2);m.rotation.y=Math.atan2(B[0]-A[0],B[1]-A[1]);for(let i=0;i<dist*4;i++){const t=(i+.5)/(dist*4);const stone=cylinder(this.island,.09+random()*.04,.09,.025,0xd3ccab,A[0]+(B[0]-A[0])*t+(random()-.5)*.17,Y+.03,A[1]+(B[1]-A[1])*t+(random()-.5)*.17,6);stone.rotation.y=random()*6;}}
  }
  resize(){const w=this.canvas.clientWidth,h=this.canvas.clientHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();if(this.mobile!==(w<901)){this.mobile=w<901;this.resetCamera();}else if(!this.didResize){this.resetCamera();this.didResize=true;}}
  resetCamera(){const s=Math.max(1,this.targetScale*.92);this.camera.position.set(this.mobile?23*s:18*s,this.mobile?25*s:17*s,this.mobile?31*s:23*s);this.controls.target.set(0,.55,0);if(this.mobile){const distance=22.5*s/(2*Math.tan(THREE.MathUtils.degToRad(18))*this.camera.aspect);const offset=this.camera.position.clone().sub(this.controls.target).setLength(Math.min(110,Math.max(35*s,distance)));this.camera.position.copy(this.controls.target).add(offset);}this.camera.zoom=1;this.camera.updateProjectionMatrix();this.controls.update();this.follow=false;}
  focusMain(){const offset=this.camera.position.clone().sub(this.controls.target).setLength(this.mobile?14:12);this.controls.target.copy(this.position).add(new THREE.Vector3(0,.4,0));this.camera.position.copy(this.controls.target).add(offset);this.follow=true;}
  zoom(amount){const v=this.camera.position.clone().sub(this.controls.target);v.multiplyScalar(amount);const distance=THREE.MathUtils.clamp(v.length(),this.controls.minDistance,this.controls.maxDistance);v.setLength(distance);this.camera.position.copy(this.controls.target).add(v);}
  setManual(enabled){this.manual=enabled;this.walking=false;this.route=[];this.wait=3;this.keys.clear();}
  canStand(x,z){const sx=8.1*this.scale,sz=6.6*this.scale;if(x*x/(sx*sx)+z*z/(sz*sz)>1)return false;for(const c of this.colliders){if(c.unlock&&this.level<c.unlock)continue;if(Math.abs(x-c.x)<c.w/2+.17&&Math.abs(z-c.z)<c.d/2+.17)return false;}return true;}
  routeTo(destination){
    if(!this.nodes[destination])return;const nearest=Object.keys(this.nodes).filter(n=>!n.startsWith('neighborhood-')||this.level>=this.expansionNodes.find(e=>e.name===n).unlock).sort((a,b)=>this.position.distanceTo(new THREE.Vector3(this.nodes[a][0],Y,this.nodes[a][1]))-this.position.distanceTo(new THREE.Vector3(this.nodes[b][0],Y,this.nodes[b][1])))[0];
    const queue=[[nearest]],seen=new Set();let path=[];while(queue.length){const p=queue.shift(),n=p.at(-1);if(n===destination){path=p;break;}if(seen.has(n))continue;seen.add(n);for(const [a,b] of this.edges){const next=a===n?b:b===n?a:null;if(next&&!seen.has(next))queue.push([...p,next]);}}
    this.route=path.map(n=>new THREE.Vector3(this.nodes[n][0],Y,this.nodes[n][1]));this.destination=destination;this.activity='walk';this.walking=true;
  }
  visit(destination){this.setManual(false);this.routeTo(destination);}
  pick(event){this.rayFrom(event);const hits=this.raycaster.intersectObjects(this.interactables,true);for(const hit of hits){let o=hit.object;while(o&&!o.userData.visit)o=o.parent;if(o){this.onVisit(o.userData.visit);return;}}
    for(const resident of this.residents){const hits=this.raycaster.intersectObject(resident.root,true);if(hits.length){this.onVisit('resident:'+resident.name);return;}}
    const ground=this.raycaster.intersectObjects(this.land.children,true);if(ground.length){const p=ground[0].point;const nearest=Object.keys(this.nodes).sort((a,b)=>Math.hypot(p.x-this.nodes[a][0],p.z-this.nodes[a][1])-Math.hypot(p.x-this.nodes[b][0],p.z-this.nodes[b][1]))[0];this.onVisit(nearest);}
  }
  rayFrom(e){const r=this.canvas.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);}
  hover(e){this.rayFrom(e);const hits=this.raycaster.intersectObjects(this.interactables,true);this.canvas.style.cursor=hits.length?'pointer':'grab';for(const r of this.residents){const hit=this.raycaster.intersectObject(r.root,true).length>0;r.tag.visible=hit;if(hit)this.canvas.style.cursor='pointer';}}
  growth(level,models){
    this.level=level;this.targetScale=1+level*.023;if(this.time<.5){this.scale=this.targetScale;this.land.scale.set(this.scale,1,this.scale);this.resetCamera();}const mainSize=1.05+level*.012;this.main.root.scale.setScalar(mainSize);this.expansions.forEach(g=>{g.visible=level>=g.userData.unlock;});
    const wanted=Math.min(12,Math.floor(level/2));while(this.residents.length<wanted){const i=this.residents.length;const name=models[Math.min(i*2,models.length-1)].name;const r=mascot(this.island,{scale:.62+i%3*.045,color:[0xd18a61,0xe0b27d,0xc47858,0xbb896b][i%4],name,accessory:i+1});r.name=name;r.root.position.set(Math.sin(i*2)*4,Y,Math.cos(i*2)*3);r.goal=new THREE.Vector3(0,Y,1);r.rest=random()*4;this.residents.push(r);}
    while(this.residents.length>wanted){const r=this.residents.pop();this.island.remove(r.root);}
    document.getElementById('population-label').textContent=`${1+this.residents.length} ${this.residents.length?'abitanti':'abitante'} · ${level<7?'Piccola isola':level<17?'Villaggio in crescita':'Villaggio di Claude'}`;
  }
  setWeather(weather){this.weather=weather;this.rain.visible=weather!=='sun';}
  updateScreen(text){const c=this.screenCanvas.getContext('2d');c.fillStyle='#142a30';c.fillRect(0,0,256,160);c.fillStyle='#d97757';c.fillRect(0,0,256,13);c.font='13px monospace';text.split('\n').slice(0,7).forEach((line,i)=>{c.fillStyle=i%3===0?'#b8ddbb':'#88b0b7';c.fillText(line,12,35+i*18,234);});this.screenTexture.needsUpdate=true;}
  animateCharacter(r,t,walking,activity){
    const motion=this.reduced?.25:1;r.body.position.y=.39+(walking?Math.abs(Math.sin(t*10+r.phase))*.07:Math.sin(t*2+r.phase)*.023)*motion;
    r.legs.forEach((leg,i)=>{leg.rotation.x=walking?Math.sin(t*10+r.phase+i*Math.PI)*.45*motion:0;});r.arms.forEach((arm,i)=>{arm.rotation.x=activity==='code'?-.65+Math.sin(t*15+i*3)*.17*motion:activity==='celebrate'?Math.sin(t*9+i)*.8:walking?Math.sin(t*10+i*3)*.2:0;});
    const blink=Math.sin(t*.7+r.phase)>.995;r.eyes.forEach(e=>e.scale.y=blink?.1:1);
    if(activity==='sleep'){r.body.rotation.z=.12;r.eyes.forEach(e=>e.scale.y=.12);}else r.body.rotation.z=activity==='think'?Math.sin(t*1.3)*.06:0;
  }
  update(dt,{paused,speed,hour}){
    if(paused){this.controls.update();this.renderer.render(this.scene,this.camera);return;}
    this.time+=dt;const t=this.time,visualDt=dt*Math.min(Math.sqrt(speed),3),gameDt=dt*speed;
    this.scale=THREE.MathUtils.damp(this.scale,this.targetScale,1.2,dt);this.land.scale.set(this.scale,1,this.scale);this.foam.forEach((f,i)=>{f.scale.set((9.65+i*.5)*this.scale+(Math.sin(t*.4+i)*.08),(8.15+i*.4)*this.scale+(Math.sin(t*.4+i)*.08),1);f.material.opacity=.12+Math.sin(t*.55+i)*.045;});
    this.harbor.position.z=5.75*this.scale;this.nodes.dock=[3.5,5.6*this.scale];this.boats[0].position.z=5.75*this.scale+2.4;this.boats[1].position.z=5.75*this.scale+3.0;
    const night=hour<5.5?1:hour<7.5?1-(hour-5.5)/2:hour<17.5?0:hour<20?(hour-17.5)/2.5:1;const storm=this.weather==='storm'?1:this.weather==='rain'?.5:0;
    this.waterUniforms.time.value=this.reduced?t*.2:t;this.waterUniforms.storm.value=THREE.MathUtils.damp(this.waterUniforms.storm.value,storm,2,dt);this.waterUniforms.night.value=night;
    const sky=new THREE.Color(0xb9dfe8).lerp(new THREE.Color(0x192e49),night).lerp(new THREE.Color(0x718c9c),storm*.5);this.scene.background.copy(sky);this.scene.fog.color.copy(sky);const cameraDistance=this.camera.position.distanceTo(this.controls.target);this.scene.fog.near=cameraDistance+20;this.scene.fog.far=cameraDistance+110;document.body.classList.toggle('night',night>.35||storm>.8);this.hemi.intensity=2.7-night*1.6-storm*.7;this.sun.intensity=3.8-night*3.4-storm*2.2;this.lights.forEach(l=>l.intensity=night*2.8);this.home.win.material=night>.6?mat(0xe6c179):mat(0x486d72);
    this.waveStrokes.children.forEach((s,i)=>{s.position.y=.04+Math.sin(t*.6+i)*.01;s.material.opacity=(.1+Math.sin(t*.5+s.userData.phase)*.045)*(1-night*.5);});
    this.clouds.forEach((c,i)=>{c.position.x+=dt*.09*(storm?2:1);if(c.position.x>40)c.position.x=-40;c.children.forEach(m=>m.material=mat(storm?0x9caeb7:0xf4f4e4));});
    this.boats.forEach((b,i)=>{b.position.y=.13+Math.sin(t*1.2+i)*.065;b.rotation.z=Math.sin(t*.8+i)*.03;if(i===2){b.position.x=-12.0+Math.sin(t*.035)*5;b.position.z=3.0+Math.cos(t*.035)*7;b.rotation.y=-t*.035+.8;}});
    if(this.rain.visible){const p=this.rain.geometry.attributes.position;for(let i=0;i<p.count;i++){let y=p.getY(i)-dt*(this.weather==='storm'?17:11);if(y<Y)y=20;p.setY(i,y);}p.needsUpdate=true;}
    this.birds.forEach((b,i)=>{b.g.position.set(Math.sin(t*.09+b.phase)*(12+i),7+Math.sin(t*.2+i),Math.cos(t*.09+b.phase)*(9+i));b.g.rotation.y=-t*.09-b.phase;b.wings.forEach((w,j)=>w.rotation.z=Math.sin(t*8+b.phase)*(j?1:-1)*.35);});
    if(this.manual){this.updateManual(visualDt);}
    else if(this.route.length){const goal=this.route[0],delta=goal.clone().sub(this.position),distance=delta.length(),step=visualDt*1.4;if(distance<step){this.position.copy(goal);this.route.shift();}else{this.position.addScaledVector(delta.normalize(),step);this.main.root.rotation.y=Math.atan2(delta.x,delta.z);}this.walking=true;if(!this.route.length){this.walking=false;this.activity={pc:'code',home:'sleep',books:'read',market:'shop',cafe:'coffee',dock:'think',beach:'think',garden:'rest',orchard:'rest'}[this.destination]||'rest';this.wait=this.activity==='code'?22:this.activity==='think'?13:9;this.actionTime=0;if(this.activity==='code')this.main.root.rotation.y=Math.PI;}}
    else{this.walking=false;this.actionTime+=gameDt;if(this.actionTime>this.wait){const choices=['pc','pc','books','market','cafe','dock','garden','orchard'];const next=hour>22||hour<5?'home':choices[Math.floor(random()*choices.length)];this.routeTo(next);}}
    this.animateCharacter(this.main,t*Math.min(Math.sqrt(speed),2),this.walking,this.activity);
    this.residents.forEach((r,i)=>{if(r.rest>0){r.rest-=visualDt;this.animateCharacter(r,t,false,'rest');return;}const d=r.goal.clone().sub(r.root.position);if(d.length()<.13){r.rest=2+random()*8;const names=Object.keys(this.nodes),node=this.nodes[names[Math.floor(random()*names.length)]];r.goal.set(node[0],Y,node[1]);}else{const v=d.normalize().multiplyScalar(visualDt*.55);const nx=r.root.position.x+v.x,nz=r.root.position.z+v.z;if(this.canStand(nx,nz)){r.root.position.x=nx;r.root.position.z=nz;r.root.rotation.y=Math.atan2(v.x,v.z);}else{r.goal.set(1+(random()-.5)*4,Y,1.2+random()*2);r.rest=1;}}this.animateCharacter(r,t+i,true,'walk');});
    if(this.follow){const target=this.position.clone().add(new THREE.Vector3(0,.6,0));const delta=target.clone().sub(this.controls.target).multiplyScalar(Math.min(1,dt*3));this.controls.target.add(delta);this.camera.position.add(delta);}
    this.controls.update();this.renderer.render(this.scene,this.camera);
  }
  updateManual(dt){
    let forward=0,right=0;if(this.keys.has('w')||this.keys.has('arrowup'))forward++;if(this.keys.has('s')||this.keys.has('arrowdown'))forward--;if(this.keys.has('a')||this.keys.has('arrowleft'))right--;if(this.keys.has('d')||this.keys.has('arrowright'))right++;
    this.walking=!!(forward||right);if(!this.walking){this.activity='rest';return;}
    const f=this.controls.target.clone().sub(this.camera.position);f.y=0;f.normalize();const r=new THREE.Vector3(-f.z,0,f.x);const delta=f.multiplyScalar(forward).addScaledVector(r,right).normalize().multiplyScalar(dt*1.65);
    const nx=this.position.x+delta.x,nz=this.position.z+delta.z;if(this.canStand(nx,nz)){this.position.x=nx;this.position.z=nz;}else{if(this.canStand(nx,this.position.z))this.position.x=nx;if(this.canStand(this.position.x,nz))this.position.z=nz;}
    this.main.root.rotation.y=Math.atan2(delta.x,delta.z);this.activity='walk';
  }
  speechPosition(){const v=this.position.clone().add(new THREE.Vector3(0,1.4+this.level*.02,0)).project(this.camera);return {x:(v.x*.5+.5)*this.canvas.clientWidth,y:(-.5*v.y+.5)*this.canvas.clientHeight,visible:v.z>-1&&v.z<1&&Math.abs(v.x)<1&&Math.abs(v.y)<1};}
}
