import * as THREE from 'three';

type Surface = 'asphalt' | 'stone' | 'paving';
const tiles: Record<Surface, [number,number]> = { asphalt: [4,4], stone: [2.1,1.05], paving: [2,2] };

/** Photo-scanned CC0 surfaces. One texture set per surface, shared by all instances. */
export function cityMaterials(renderer: THREE.WebGLRenderer, fallback: Record<Surface, THREE.Texture>) {
  let disposed = false;
  const textures: THREE.Texture[] = [];
  const materials: Record<Surface, THREE.MeshStandardMaterial[]> = { asphalt: [], stone: [], paving: [] };
  const loaded: Partial<Record<Surface, THREE.Texture[]>> = {};
  const loader = new THREE.TextureLoader();
  const anisotropy = Math.min(renderer.capabilities?.getMaxAnisotropy?.() ?? 1, 4);
  for (const kind of ['asphalt', 'stone', 'paving'] as Surface[]) {
    const maps: THREE.Texture[] = []; let count = 0;
    ['color', 'normal', 'roughness'].forEach((map, index) => {
      const texture = loader.load(`/materials/${kind}-${map}.webp`, result => {
        if (disposed) { result.dispose(); return; }
        result.wrapS = result.wrapT = THREE.RepeatWrapping;
        result.anisotropy = anisotropy;
        result.colorSpace = index === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        maps[index] = result;
        if (++count === 3) {
          loaded[kind] = maps;
          materials[kind].forEach(material => apply(material, maps));
        }
      }, undefined, () => { /* Keep the lightweight fallback if any file fails. */ });
      if (texture) textures.push(texture);
    });
  }
  function apply(material: THREE.MeshStandardMaterial, maps: THREE.Texture[]) {
    material.map = maps[0]; material.normalMap = maps[1]; material.roughnessMap = maps[2];
    material.needsUpdate = true;
  }
  return {
    create(kind: Surface, color = 0xffffff, roughness = kind === 'asphalt' ? .48 : .9, wet = false) {
      const material = wet ? new THREE.MeshPhysicalMaterial({color,map:fallback[kind],roughness,metalness:0,clearcoat:.65,clearcoatRoughness:.18}) : new THREE.MeshStandardMaterial({ color, map: fallback[kind], roughness, metalness: 0 });
      material.normalScale.setScalar(kind === 'asphalt' ? .45 : .65);
      // World-meter UVs stop the shared unit cube from stretching stone across large facades.
      material.onBeforeCompile = shader => {
        shader.uniforms.bluTileMeters = { value: new THREE.Vector2(...tiles[kind]) };
        shader.vertexShader = 'uniform vec2 bluTileMeters;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
          #include <project_vertex>
          vec4 bluWorld = vec4(transformed, 1.0);
          vec3 bluNormal = objectNormal;
          #ifdef USE_INSTANCING
            bluWorld = instanceMatrix * bluWorld;
            bluNormal = mat3(instanceMatrix) * bluNormal;
          #endif
          bluWorld = modelMatrix * bluWorld;
          bluNormal = abs(normalize(mat3(modelMatrix) * bluNormal));
          vec2 bluSurfaceUv = bluNormal.y > max(bluNormal.x, bluNormal.z) ? bluWorld.xz :
            (bluNormal.x > bluNormal.z ? bluWorld.zy : bluWorld.xy);
          bluSurfaceUv /= bluTileMeters;
          #ifdef USE_MAP
            vMapUv = bluSurfaceUv;
          #endif
          #ifdef USE_NORMALMAP
            vNormalMapUv = bluSurfaceUv;
          #endif
          #ifdef USE_ROUGHNESSMAP
            vRoughnessMapUv = bluSurfaceUv;
          #endif
        `);
      };
      material.customProgramCacheKey = () => 'blu-world-surface-v1';
      materials[kind].push(material);
      if (loaded[kind]) apply(material, loaded[kind]!);
      return material;
    },
    dispose() { disposed = true; textures.forEach(texture => texture.dispose()); }
  };
}
