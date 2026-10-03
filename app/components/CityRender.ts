import * as THREE from 'three';

/** One HDR target and one combined bloom/output pass. DOM HUD never enters the pass. */
export class CityRender {
  private target: THREE.WebGLRenderTarget | null = null;
  private screen = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  private material: THREE.ShaderMaterial | null = null;
  private quad: THREE.Mesh | null = null;
  private environment: THREE.WebGLRenderTarget | null = null;
  private frames=0; private elapsed=0; private tier=2;
  private width=1; private height=1;
  readonly supported: boolean;
  constructor(private renderer:THREE.WebGLRenderer, private scene:THREE.Scene, private light:THREE.DirectionalLight) {
    this.supported=!!renderer.capabilities && typeof renderer.setRenderTarget==='function';
    if(!this.supported)return;
    try {
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-20;light.shadow.camera.right=20;light.shadow.camera.top=20;light.shadow.camera.bottom=-20;light.shadow.camera.near=1;light.shadow.camera.far=75;light.shadow.bias=-.0004;light.shadow.normalBias=.06;light.shadow.camera.updateProjectionMatrix();
    scene.add(light.target);
    // A baked-style studio environment gives metal and wet stone actual PBR reflections.
    const probe=new THREE.Scene();probe.background=new THREE.Color(0x607b93);
    const cards:THREE.Mesh[]=[];
    for(const [x,y,z,w,h,color,intensity] of [[-8,4,-6,3,8,0xffc580,3],[8,4,-6,3,8,0xffc580,3],[0,10,0,20,8,0xc5d9e9,1.2]] as number[][]){
      const mat=new THREE.MeshBasicMaterial({color});mat.color.multiplyScalar(intensity);
      const card=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);card.position.set(x,y,z);card.lookAt(0,2,0);probe.add(card);cards.push(card);
    }
    const pmrem=new THREE.PMREMGenerator(renderer);
    try {this.environment=pmrem.fromScene(probe,.04,.1,50);scene.environment=this.environment.texture;scene.environmentIntensity=.65;}
    finally {cards.forEach(c=>{c.geometry.dispose();(c.material as THREE.Material).dispose();});pmrem.dispose();}
    const hdr=renderer.extensions.has('EXT_color_buffer_float');
    this.target=new THREE.WebGLRenderTarget(1,1,{type:hdr?THREE.HalfFloatType:THREE.UnsignedByteType,depthBuffer:true});
    this.material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:true,uniforms:{image:{value:this.target.texture},texel:{value:new THREE.Vector2(1,1)},glow:{value:.3}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
      uniform sampler2D image;uniform vec2 texel;uniform float glow;varying vec2 vUv;
      vec3 bright(vec2 offset){vec3 c=texture2D(image,clamp(vUv+offset,texel,1.-texel)).rgb;return c*max(0.,dot(c,vec3(.2126,.7152,.0722))-.85)/(max(.001,dot(c,vec3(.2126,.7152,.0722))));}
      void main(){vec3 c=texture2D(image,vUv).rgb;vec3 bloom=vec3(0.);
        for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 direction=vec2(cos(a),sin(a));bloom+=bright(direction*texel*3.)*.07+bright(direction*texel*8.)*.045;}
        gl_FragColor=vec4(c+bloom*glow,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    this.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.material);this.quad.frustumCulled=false;this.screen.add(this.quad);
    } catch {
      this.dispose();this.target=null;this.supported=false;
      renderer.setRenderTarget(null);renderer.shadowMap.enabled=false;
      light.castShadow=false;
    }
  }
  resize(width:number,height:number){this.width=width;this.height=height;this.applySize();}
  private applySize(){const ratio=Math.min(typeof devicePixelRatio==='number'?devicePixelRatio:1,this.tier===2?1.5:this.tier===1?1.15:1);this.renderer.setPixelRatio(ratio);this.renderer.setSize(this.width,this.height,false);this.target?.setSize(Math.max(1,Math.floor(this.width*ratio)),Math.max(1,Math.floor(this.height*ratio)));this.material?.uniforms.texel.value.set(1/(this.width*ratio),1/(this.height*ratio));}
  render(camera:THREE.Camera,player:THREE.Vector3,delta:number,active:boolean){
    if(!this.supported){this.renderer.render(this.scene,camera);return;}
    this.light.position.set(player.x-14,player.y+26,player.z+10);this.light.target.position.set(player.x,player.y,player.z-8);this.light.target.updateMatrixWorld();
    // Downshift only; no repeated quality oscillation or resource allocation during play.
    if(active&&delta>0&&delta<.15){this.elapsed+=delta;this.frames++;if(this.frames>=180){if(this.elapsed/this.frames>.029&&this.tier>0){this.tier--;if(this.tier===0)this.renderer.shadowMap.enabled=false;this.applySize();}this.frames=0;this.elapsed=0;}}
    if(this.tier===0||!this.target){this.renderer.setRenderTarget(null);this.renderer.render(this.scene,camera);return;}
    this.renderer.setRenderTarget(this.target);this.renderer.render(this.scene,camera);this.renderer.setRenderTarget(null);this.renderer.render(this.screen,this.camera);
  }
  dispose(){this.scene.environment=null;this.environment?.dispose();this.target?.dispose();this.material?.dispose();this.quad?.geometry.dispose();}
}
