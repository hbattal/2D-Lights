import * as THREE from "three";
import { Playable } from "./playable";
import { accumulate } from "./pShaders/accum";

export class Draw extends Playable {
    meshDraw: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
    sceneDraw: THREE.Scene;

    mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    meshOverlay: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
    ping: THREE.WebGLRenderTarget;
    pong: THREE.WebGLRenderTarget;

    constructor(width: number, height: number) {
        super(width, height);
        this.createScene();
    }

    reset() {
        this.scene.clear();
        this.volScene.clear();

        this.dispose();
        this.createScene();
    }

    createScene() {
        this.ping = new THREE.WebGLRenderTarget(this.width, this.height, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            type: THREE.HalfFloatType,
        });
        this.pong = this.ping.clone();

        const geom = new THREE.PlaneGeometry(this.width, this.height);
        const mat = accumulate();

        this.meshDraw = new THREE.Mesh(geom, mat);

        this.sceneDraw = new THREE.Scene();
        this.sceneDraw.add(this.meshDraw);

        this.mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ map: this.pong.texture, blending: THREE.NoBlending }));

        const customMat = new THREE.ShaderMaterial({
            uniforms: {
                map: { value: null },
            },
            glslVersion: THREE.GLSL3,
            blending: THREE.NoBlending,
            vertexShader: `
                out vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                precision highp float;

                in vec2 vUv;

                uniform sampler2D map;
                out vec4 fragColor;

                 void main() {
                    vec4 s = texture(map, vUv);
                    if(abs(s.a) < 0.99) discard;
                    fragColor = vec4(s.a > 0.0 ? s.rgb : vec3(0.0), 1.0);
                 }
            `,
        });

        this.meshOverlay = new THREE.Mesh(geom, customMat);

        this.scene.add(this.mesh);
        this.volScene.add(this.meshOverlay);
    }

    update(renderer: THREE.WebGLRenderer, input: boolean, ppos: { x: number; y: number }, mpos: { x: number; y: number }, val: { color: { r: number; g: number; b: number }; alpha: number; matType: boolean; size: number; clear: boolean }) {
        if (val.clear) {
            renderer.setRenderTarget(this.pong);
            renderer.clear();
            renderer.setRenderTarget(this.ping);
            renderer.clear();
        }

        if (!input) return;

        this.meshDraw.material.uniforms.color.value = [val.color.r / 255, val.color.g / 255, val.color.b / 255];
        this.meshDraw.material.uniforms.alpha.value = val.matType ? val.alpha : -val.alpha;
        this.meshDraw.material.uniforms.brushSize.value = val.size;
        this.meshDraw.material.uniforms.m.value = [mpos.x, mpos.y];
        this.meshDraw.material.uniforms.pm.value = [ppos.x, ppos.y];
        this.meshDraw.material.uniforms.prev.value = this.pong.texture;

        renderer.setRenderTarget(this.ping);
        renderer.render(this.meshDraw, this.camera);

        this.mesh.material.map = this.ping.texture;
        this.meshOverlay.material.uniforms.map.value = this.ping.texture;

        [this.ping, this.pong] = [this.pong, this.ping];
    }

    volumetrics(_toggle: boolean) {}

    dispose() {
        this.meshDraw.material.dispose();
        this.meshDraw.geometry.dispose();

        this.mesh.material.dispose();
        this.mesh.geometry.dispose();

        this.meshOverlay.material.dispose();
        this.meshOverlay.geometry.dispose();

        this.ping.dispose();
        this.pong.dispose();
    }
}
