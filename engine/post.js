// Post-processing: AO, DOF, bloom, tone-mapping, lalu "grade" (saturasi, kontras, vignette,
// ketajaman, grain). Tiap pass opsional: kalau gagal dimuat, dilewati (tidak menjatuhkan render).
import * as THREE from 'three';

export async function buildPost({ renderer, scn, cam, W, H, post, pal }) {
  let composer = null, bokeh = null, gradePass = null;
  try {
    const { EffectComposer } = await import('three/addons/postprocessing/EffectComposer.js');
    const { RenderPass } = await import('three/addons/postprocessing/RenderPass.js');
    const { OutputPass } = await import('three/addons/postprocessing/OutputPass.js');
    const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scn, cam));
    if (post.ao) try {
      const { GTAOPass } = await import('three/addons/postprocessing/GTAOPass.js');
      const ao = new GTAOPass(scn, cam, W, H);
      try { ao.updateGtaoMaterial({ radius: post.aoRadius || 0.4 }); } catch (e) {}
      composer.addPass(ao);
    } catch (e) { console.warn('AO dilewati:', e.message); }
    if (post.dof) try {
      const { BokehPass } = await import('three/addons/postprocessing/BokehPass.js');
      bokeh = new BokehPass(scn, cam, { focus: 5, aperture: post.dof.aperture ?? 0.0002, maxblur: post.dof.maxblur ?? 0.01 });
      composer.addPass(bokeh);
    } catch (e) { console.warn('DOF dilewati:', e.message); }
    if (post.bloom) try {
      const { UnrealBloomPass } = await import('three/addons/postprocessing/UnrealBloomPass.js');
      composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), post.bloomStrength ?? 0.18, 0.6, 0.92));
    } catch (e) { console.warn('Bloom dilewati:', e.message); }
    composer.addPass(new OutputPass());
    if (post.grade !== false) {
      const { ShaderPass } = await import('three/addons/postprocessing/ShaderPass.js');
      gradePass = new ShaderPass({
        uniforms: {
          tDiffuse: { value: null }, px: { value: new THREE.Vector2(1 / W, 1 / H) },
          sat: { value: pal.saturation }, con: { value: pal.contrast }, vig: { value: pal.vignette },
          grain: { value: pal.grain }, sharp: { value: pal.sharpen }, gain: { value: pal.gain }, time: { value: 0 },
        },
        vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
        fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 px; uniform float sat,con,vig,grain,sharp,gain,time; varying vec2 vUv;
          float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
          void main(){
            vec4 c=texture2D(tDiffuse,vUv);
            // ketajaman (unsharp 4 tetangga) -> tekstur kain/rumput/aspal lebih "kerasa"
            vec3 nb=texture2D(tDiffuse,vUv+vec2(px.x,0.)).rgb+texture2D(tDiffuse,vUv-vec2(px.x,0.)).rgb
                   +texture2D(tDiffuse,vUv+vec2(0.,px.y)).rgb+texture2D(tDiffuse,vUv-vec2(0.,px.y)).rgb;
            c.rgb+=(c.rgb-nb*.25)*sharp;
            c.rgb*=gain;
            float l=dot(c.rgb,vec3(.2126,.7152,.0722));
            c.rgb=mix(vec3(l),c.rgb,sat); c.rgb=(c.rgb-.5)*con+.5;
            float d=distance(vUv,vec2(.5)); c.rgb*=1.0-vig*smoothstep(.35,.85,d);
            c.rgb+=(h(vUv*1000.+time)-.5)*grain; gl_FragColor=vec4(clamp(c.rgb,0.,1.),c.a); }`,
      });
      composer.addPass(gradePass);
    }
  } catch (e) { console.warn('Post-processing mati, pakai render biasa:', e.message); composer = null; }
  return { composer, bokeh, gradePass };
}
