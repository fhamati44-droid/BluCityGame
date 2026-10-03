import * as THREE from 'three';

/** Authored street modules: reserved plots, arched glazing, cornices, balconies and mansard roofs. */
export function heritageStreet(city:number,stoneMap:THREE.Texture,stoneMaterial?:THREE.MeshStandardMaterial){
  const root=new THREE.Group();root.name='BLU heritage promenade';const resources:{dispose():void}[]=[];const blockers:THREE.Mesh[]=[];
  const cube=new THREE.BoxGeometry(1,1,1);resources.push(cube);
  const stone=stoneMaterial ?? new THREE.MeshStandardMaterial({color:0xc6b395,map:stoneMap,roughness:.82});
  const trim=new THREE.MeshStandardMaterial({color:0xe4d3b6,roughness:.65});
  const iron=new THREE.MeshStandardMaterial({color:0x26333e,metalness:.65,roughness:.4});
  const slate=new THREE.MeshStandardMaterial({color:0x233044,metalness:.15,roughness:.65});
  const glass=new THREE.MeshStandardMaterial({color:0xbecfce,metalness:0,roughness:.12,emissive:0xffc471,emissiveIntensity:.8});resources.push(stone,trim,iron,slate,glass);
  const parts:{parent:THREE.Group;mat:THREE.Material;x:number;y:number;z:number;w:number;h:number;d:number}[]=[];
  const box=(g:THREE.Group,mat:THREE.Material,w:number,h:number,d:number,x:number,y:number,z:number)=>parts.push({parent:g,mat,w,h,d,x,y,z});
  const arch=new THREE.Shape();arch.moveTo(-.7,0);arch.lineTo(.7,0);arch.lineTo(.7,1.5);arch.absarc(0,1.5,.7,0,Math.PI,false);arch.lineTo(-.7,0);
  const archGeo=new THREE.ExtrudeGeometry(arch,{depth:.06,bevelEnabled:false,curveSegments:10});resources.push(archGeo);
  for(let i=0;i<4;i++){
    const g=new THREE.Group();g.position.set(-25,0,6-i*22);g.rotation.y=Math.PI/2;root.add(g);
    const h=city===2?10:14+(i%2)*3;
    const body=new THREE.Mesh(new THREE.BoxGeometry(16,h,8),stone);resources.push(body.geometry);body.position.y=h/2;body.castShadow=true;body.receiveShadow=true;g.add(body);blockers.push(body);
    box(g,trim,16.4,.45,8.3,0,.3,0);box(g,trim,16.6,.4,8.6,0,3.6,0);box(g,trim,17,.45,8.8,0,h+.2,0);
    for(const x of [-7.8,-4,0,4,7.8])box(g,trim,.35,h-.5,.35,x,h/2,4.15);
    for(let y=4.2;y<h-2;y+=3.5)for(const x of [-6,-2,2,6]){
      box(g,trim,2,2.7,.15,x,y+1.15,4.15);
      const window=new THREE.Mesh(archGeo,glass);window.position.set(x,y,4.25);g.add(window);
      box(g,iron,.065,2.15,.1,x,y+1.1,4.36);box(g,iron,1.35,.06,.1,x,y+1.3,4.36);
      box(g,trim,2.1,.18,.6,x,y-.1,4.35);
      if(i%2===0){box(g,trim,2.4,.18,1,x,y-.15,4.6);box(g,iron,2.4,.08,.08,x,y+.7,5.05);for(let k=-1;k<=1;k++)box(g,iron,.06,.85,.06,x+k,y+.3,5.05);}
    }
    for(const x of [-6,-2,2,6]){box(g,glass,3.1,2.4,.1,x,1.8,4.15);box(g,iron,.1,2.7,.15,x,1.8,4.3);}
    // Striped café awnings and a quiet roofline, outside the walking corridor.
    for(let k=0;k<12;k++)box(g,k%2?trim:slate,1.25,.15,1.5,-7.1+k*1.3,3.2,4.6);
    const roof=new THREE.Mesh(new THREE.CylinderGeometry(4.5,5.5,2,4),slate);roof.rotation.y=Math.PI/4;roof.scale.x=1.7;roof.position.y=h+1.4;roof.castShadow=true;g.add(roof);resources.push(roof.geometry);
    for(const x of [-5,5]){box(g,stone,.8,2,.8,x,h+2.4,-1);box(g,trim,1,.2,1,x,h+3.4,-1);}
  }
  // Batch all moldings and railings by material in world-local coordinates.
  root.updateMatrixWorld(true);
  const dummy=new THREE.Object3D();
  for(const mat of [trim,iron,slate,glass,stone]){const selected=parts.filter(p=>p.mat===mat);if(!selected.length)continue;const mesh=new THREE.InstancedMesh(cube,mat,selected.length);mesh.castShadow=mat!==glass;mesh.receiveShadow=true;resources.push(mesh);
    selected.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.scale.set(p.w,p.h,p.d);dummy.rotation.set(0,0,0);dummy.updateMatrix();mesh.setMatrixAt(i,new THREE.Matrix4().multiplyMatrices(p.parent.matrixWorld,dummy.matrix));});root.add(mesh);
  }
  return {root,blockers,dispose(){resources.forEach(r=>r.dispose());}};
}
