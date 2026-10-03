import * as THREE from 'three';

export const HERITAGE_PLOTS = [{z:6,width:16},{z:-26,width:10},{z:-50,width:16},{z:-72,width:16}] as const;

/** Authored street modules: reserved plots, arched glazing, cornices, balconies and mansard roofs. */
export function heritageStreet(city:number,stoneMap:THREE.Texture,stoneMaterial?:THREE.MeshStandardMaterial){
  const root=new THREE.Group();root.name='BLU heritage promenade';const signs:{material:THREE.MeshBasicMaterial;url:string}[]=[];const resources:{dispose():void}[]=[];const blockers:THREE.Mesh[]=[];
  const cube=new THREE.BoxGeometry(1,1,1);resources.push(cube);
  const stone=stoneMaterial ?? new THREE.MeshStandardMaterial({color:0xc6b395,map:stoneMap,roughness:.82});
  const trim=new THREE.MeshStandardMaterial({color:0xe4d3b6,roughness:.65});
  const iron=new THREE.MeshStandardMaterial({color:0x26333e,metalness:.65,roughness:.4});
  const fabric=new THREE.MeshStandardMaterial({color:0x9c2933,roughness:.96});
  const slate=new THREE.MeshStandardMaterial({color:0x233044,metalness:.15,roughness:.65});
  const glass=new THREE.MeshStandardMaterial({color:0xc0dbdf,metalness:0,roughness:.16,transparent:true,opacity:.23,depthWrite:false,side:THREE.DoubleSide});
  const wood=new THREE.MeshStandardMaterial({color:0x886344,roughness:.78});
  const interior=new THREE.MeshStandardMaterial({color:0xf2d4a0,roughness:.85,emissive:0xffba67,emissiveIntensity:.38});resources.push(stone,trim,iron,slate,glass,wood,interior,fabric);
  const parts:{parent:THREE.Group;mat:THREE.Material;x:number;y:number;z:number;w:number;h:number;d:number}[]=[];
  const box=(g:THREE.Group,mat:THREE.Material,w:number,h:number,d:number,x:number,y:number,z:number)=>parts.push({parent:g,mat,w,h,d,x,y,z});
  const arch=new THREE.Shape();arch.moveTo(-.7,0);arch.lineTo(.7,0);arch.lineTo(.7,1.5);arch.absarc(0,1.5,.7,0,Math.PI,false);arch.lineTo(-.7,0);
  const archGeo=new THREE.ExtrudeGeometry(arch,{depth:.06,bevelEnabled:false,curveSegments:10});resources.push(archGeo);
  const surround=new THREE.Shape();surround.moveTo(-.95,-.15);surround.lineTo(.95,-.15);surround.lineTo(.95,1.5);surround.absarc(0,1.5,.95,0,Math.PI,false);surround.lineTo(-.95,-.15);
  const opening=new THREE.Path();opening.moveTo(-.7,0);opening.lineTo(.7,0);opening.lineTo(.7,1.5);opening.absarc(0,1.5,.7,0,Math.PI,false);opening.lineTo(-.7,0);surround.holes.push(opening);
  const bay=new THREE.Shape();bay.moveTo(-1.275,-.25);bay.lineTo(1.275,-.25);bay.lineTo(1.275,2.65);bay.lineTo(-1.275,2.65);bay.lineTo(-1.275,-.25);
  const bayOpening=new THREE.Path();bayOpening.moveTo(-.95,-.15);bayOpening.lineTo(.95,-.15);bayOpening.lineTo(.95,1.5);bayOpening.absarc(0,1.5,.95,0,Math.PI,false);bayOpening.lineTo(-.95,-.15);bay.holes.push(bayOpening);
  const bayGeo=new THREE.ExtrudeGeometry(bay,{depth:.65,bevelEnabled:false,curveSegments:10});resources.push(bayGeo);
  const frameGeo=new THREE.ExtrudeGeometry(surround,{depth:.28,bevelEnabled:false,curveSegments:10});resources.push(frameGeo);
  for(let i=0;i<4;i++){
    const g=new THREE.Group();g.position.set(-25,0,HERITAGE_PLOTS[i].z);g.rotation.y=Math.PI/2;g.scale.x=HERITAGE_PLOTS[i].width/16;root.add(g);
    const h=city===2?10:14+(i%2)*3;
    // Full plot proxy is only for camera clearance; visible walls leave actual room cavities.
    const proxy=new THREE.Mesh(new THREE.BoxGeometry(16,h,8),stone);resources.push(proxy.geometry);proxy.position.y=h/2;proxy.visible=false;proxy.name='reserved building plot';g.add(proxy);blockers.push(proxy);
    box(g,stone,16,h,5,0,h/2,-1.5);
    for(const x of [-7.65,7.65])box(g,stone,.7,h,3,x,h/2,2.5);
    for(const x of [-8,-4,0,4,8])box(g,stone,1.45,h-3.6,.65,x,(h+3.6)/2,3.85);
    box(g,stone,16,.55,.7,0,h-.275,3.85);
    g.userData.interiorDepth=2.8;
    box(g,trim,16.4,.45,8.3,0,.3,0);box(g,trim,16.6,.4,8.6,0,3.6,0);box(g,trim,17,.45,8.8,0,h+.2,0);
    for(const x of [-7.8,-4,0,4,7.8])box(g,trim,.35,h-.5,.35,x,h/2,4.15);
    for(let y=4.2;y+2.6<h;y+=3.5)for(const x of [-6,-2,2,6]){
      box(g,stone,4,1.2,.65,x,y-.6,3.85);
      const wallBay=new THREE.Mesh(bayGeo,stone);wallBay.name='window wall bay';wallBay.position.set(x,y,3.5);g.add(wallBay);
      const frame=new THREE.Mesh(frameGeo,trim);frame.name='arched window reveal';frame.position.set(x,y,3.95);frame.castShadow=true;g.add(frame);
      const window=new THREE.Mesh(archGeo,glass);window.name='recessed glazing';window.position.set(x,y,3.83);g.add(window);
      box(g,interior,1.7,2.3,.08,x,y+1.1,2.8);
      box(g,wood,.45,1.8,.12,x-.52,y+.9,2.95);
      box(g,iron,.065,2.15,.1,x,y+1.1,4.36);box(g,iron,1.35,.06,.1,x,y+1.3,4.36);
      box(g,trim,2.1,.18,.6,x,y-.1,4.35);
      if(i%2===0){box(g,trim,2.4,.18,1,x,y-.15,4.6);box(g,iron,2.4,.08,.08,x,y+.7,5.05);for(let k=-1;k<=1;k++)box(g,iron,.06,.85,.06,x+k,y+.3,5.05);}
    }
    // Shop interiors have floors, rear shelving, counters and pendant fixtures behind glazing.
    box(g,wood,15,.14,3,0,.12,2.5);box(g,interior,14,2.8,.1,0,1.6,1.2);
    for(const x of [-6,-2,2,6]){
      box(g,glass,3.1,2.4,.05,x,1.65,3.95);box(g,iron,.1,2.8,.16,x,1.6,4.16);
      for(const y of [.75,1.5,2.25]){box(g,wood,2.9,.12,.6,x,y,1.65);for(let k=-1;k<=1;k++)box(g,k===0?trim:slate,.3,.35,.3,x+k*.65,y+.23,1.8);}
      box(g,wood,2.7,.9,.65,x,.55,2.85);box(g,trim,2.9,.12,.85,x,1.04,2.85);
      box(g,iron,.035,.7,.035,x,2.8,2.6);box(g,interior,.5,.15,.45,x,2.42,2.6);
    }
    box(g,iron,1.6,2.7,.18,0,1.35,3.95);box(g,glass,1.25,2.35,.06,0,1.4,4.06);box(g,trim,.07,.5,.1,.5,1.25,4.2);
    box(g,trim,2,.6,1.4,0,.3,5.7);
    // Outdoor seating occupies the outer sidewalk; the road and crossings stay open.
    for(const x of [-5,4]){
      box(g,wood,1.1,.12,1.1,x,.85,6.1);box(g,iron,.13,.8,.13,x,.4,6.1);
      for(const side of [-1,1]){const cx=x+side*.85;box(g,wood,.55,.12,.6,cx,.5,6.1);box(g,wood,.1,.65,.6,cx+side*.22,.85,6.1);for(const dz of [-.22,.22])box(g,iron,.07,.5,.07,cx,.25,6.1+dz);}
    }
    const signMaterial=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide});
    const signGeo=new THREE.PlaneGeometry(3.68,1.15);resources.push(signMaterial,signGeo);
    const sign=new THREE.Mesh(signGeo,signMaterial);sign.position.set(0,3.25,5.4);sign.scale.x=1/g.scale.x;g.add(sign);
    signs.push({material:signMaterial,url:'/sponsors/'+['neon-cafe.svg','spark-bakery.svg','blu-grocery.svg','blu-services.svg'][i]});
    // Striped café awnings and a quiet roofline, outside the walking corridor.
    for(let k=0;k<12;k++)box(g,fabric,1.25,.15,1.5,-7.1+k*1.3,3.2,4.6);
    const roof=new THREE.Mesh(new THREE.CylinderGeometry(4.5,5.5,2,4),slate);roof.rotation.y=Math.PI/4;roof.scale.x=1.7;roof.position.y=h+1.4;roof.castShadow=true;g.add(roof);resources.push(roof.geometry);
    for(const x of [-5,5]){box(g,stone,.8,2,.8,x,h+2.4,-1);box(g,trim,1,.2,1,x,h+3.4,-1);}
  }
  // Batch all moldings and railings by material in world-local coordinates.
  root.updateMatrixWorld(true);
  const shaped:THREE.Mesh[]=[];root.traverse(o=>{if(o instanceof THREE.Mesh&&(o.name==='arched window reveal'||o.name==='recessed glazing'||o.name==='window wall bay'))shaped.push(o);});
  for(const name of ['arched window reveal','recessed glazing','window wall bay']){const selected=shaped.filter(o=>o.name===name);const batch=new THREE.InstancedMesh(selected[0].geometry,selected[0].material,selected.length);batch.name=name;batch.castShadow=name!=='recessed glazing';batch.receiveShadow=true;selected.forEach((o,i)=>{batch.setMatrixAt(i,o.matrixWorld);o.removeFromParent();});root.add(batch);resources.push(batch);}
  const dummy=new THREE.Object3D();
  for(const mat of [trim,iron,slate,glass,stone,wood,interior,fabric]){const selected=parts.filter(p=>p.mat===mat);if(!selected.length)continue;const mesh=new THREE.InstancedMesh(cube,mat,selected.length);mesh.castShadow=mat!==glass;mesh.receiveShadow=true;resources.push(mesh);
    selected.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.scale.set(p.w,p.h,p.d);dummy.rotation.set(0,0,0);dummy.updateMatrix();mesh.setMatrixAt(i,new THREE.Matrix4().multiplyMatrices(p.parent.matrixWorld,dummy.matrix));});root.add(mesh);
  }
  return {root,blockers,signs,dispose(){resources.forEach(r=>r.dispose());}};
}
