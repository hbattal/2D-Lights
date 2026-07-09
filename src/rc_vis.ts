import * as THREE from "three";
import { cover } from "three/src/extras/TextureUtils.js";
import { seed } from "./shaders/rc/seed.ts";
import { jfa } from "./shaders/rc/jfa.ts";
import { ray } from "./shaders/utils/ray.ts";
import { bilateral } from "./shaders/utils/bilateral.ts";
import { rcV2, rcV2Bilinear } from "./shaders/rc/rc_direction_major.ts";
import { rcV1, collapse } from "./shaders/rc/rc_probe_major.ts";
import type { State } from "./state.js";

//old setup for RC

//https://www.typescriptlang.org/docs/handbook/2/classes.html
export class RC {
    state: State;
    renderer: THREE.WebGLRenderer;

    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;

    width: number;
    height: number;

    fixWidth: number;
    fixHeight: number;
    cCount: number;
    opt: number;

    rc: boolean;
    bilinear: boolean;
    major: number;
    blueNoise: THREE.Texture;

    modelRT: THREE.WebGLRenderTarget;
    seedRT: THREE.WebGLRenderTarget;
    curJFA: THREE.WebGLRenderTarget;
    prevJFA: THREE.WebGLRenderTarget;
    curCascade: THREE.WebGLRenderTarget;
    prevCascade: THREE.WebGLRenderTarget;
    collapseRT: THREE.WebGLRenderTarget;
    bilateralRT: THREE.WebGLRenderTarget;
    overlayRT: THREE.WebGLRenderTarget;

    seedShader: THREE.ShaderMaterial;
    jfaShader: THREE.ShaderMaterial;
    bilateralShader: THREE.ShaderMaterial;
    traceShader: THREE.ShaderMaterial;
    rcShader: THREE.ShaderMaterial;
    collapseShader: THREE.ShaderMaterial;

    displayMaterial: THREE.MeshBasicMaterial;

    geometry: THREE.PlaneGeometry;
    mesh: THREE.Mesh;

    frameCount: number;

    constructor(state: State, rc: boolean, bilinear: boolean) {
        this.state = state;
        this.rc = rc;
        this.bilinear = bilinear;
        this.major = 1;
        if (this.bilinear || !this.rc) this.major = 1;

        this.renderer = new THREE.WebGLRenderer({ canvas: this.state.canvas, antialias: true });
        this.renderer.autoClear = false;
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.info.autoReset = false;
        this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

        this.calculateBounds();
        this.renderer.setSize(this.width, this.height, false);

        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        this.calculateBounds();
        this.targets();
        this.shaders();

        this.renderer.setSize(this.width, this.height, false);
        this.renderer.setAnimationLoop(this.render.bind(this));

        this.frameCount = 0;
    }

    calculateBounds() {
        this.width = Math.floor(this.state.canvas.clientWidth * this.state.dpr);
        this.height = Math.floor(this.state.canvas.clientHeight * this.state.dpr);

        this.opt = 2;
        const w = Math.floor(this.width / this.opt);
        const h = Math.floor(this.height / this.opt);

        //geometric series once again
        //1 - 4^x / -3 >= hyp
        const needed = (w: number, h: number) => Math.ceil(Math.log(3 * Math.hypot(w, h) + 1) / Math.log(4));

        const err = Math.pow(2.0, needed(w, h) - 1);
        this.fixWidth = Math.ceil(w / err) * err;
        this.fixHeight = Math.ceil(h / err) * err;

        this.cCount = needed(this.fixWidth, this.fixHeight);
    }

    targets() {
        const nearestRT = {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            type: THREE.HalfFloatType,
        };

        const linearRT = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            type: THREE.HalfFloatType,
        };

        this.dispose(false);

        this.modelRT = new THREE.WebGLRenderTarget(this.fixWidth, this.fixHeight, nearestRT);
        this.seedRT = this.modelRT.clone();
        this.curJFA = this.modelRT.clone();
        this.prevJFA = this.modelRT.clone();
        this.bilateralRT = this.modelRT.clone();

        this.curCascade = new THREE.WebGLRenderTarget(this.fixWidth * this.major, this.fixHeight * this.major, this.bilinear ? nearestRT : linearRT);
        this.prevCascade = this.curCascade.clone();
        this.collapseRT = this.modelRT.clone();

        this.overlayRT = new THREE.WebGLRenderTarget(this.fixWidth * this.opt, this.fixHeight * this.opt, nearestRT);
    }

    shaders() {
        this.seedShader = seed();
        this.jfaShader = jfa();

        if (this.major > 1) {
            this.rcShader = rcV1();
            this.collapseShader = collapse();
        } else {
            this.rcShader = this.bilinear ? rcV2Bilinear() : rcV2();
        }

        this.traceShader = ray();
        this.traceShader.uniforms.blueNoise.value = this.blueNoise = new THREE.TextureLoader().load("LDR_LLL1_0.png");
        this.traceShader.uniforms.rays.value = 64;

        this.bilateralShader = bilateral();
        this.bilateralShader.uniforms.sigmaD.value = 2.0;
        this.bilateralShader.uniforms.sigmaR.value = 2.0;
        this.bilateralShader.uniforms.size.value = 2.0;

        this.displayMaterial = new THREE.MeshBasicMaterial();

        this.geometry = new THREE.PlaneGeometry(2, 2);
        this.mesh = new THREE.Mesh(this.geometry, this.seedShader);
        this.scene.add(this.mesh);
    }

    dispose(all: boolean) {
        this.modelRT?.dispose();
        this.seedRT?.dispose();
        this.curJFA?.dispose();
        this.prevJFA?.dispose();
        this.bilateralRT?.dispose();
        this.curCascade?.dispose();
        this.prevCascade?.dispose();
        this.collapseRT?.dispose();
        this.overlayRT?.dispose();

        if (!all) return;

        this.mesh.geometry.dispose();

        this.blueNoise.dispose();

        this.seedShader.dispose();
        this.jfaShader.dispose();
        this.traceShader.dispose();
        this.bilateralShader.dispose();
        this.rcShader.dispose();
        this.collapseShader?.dispose();
        this.displayMaterial.dispose();

        this.renderer.setAnimationLoop(null);
        this.renderer.dispose();
    }

    resize() {
        this.calculateBounds();
        this.targets();
        this.state.active.resize(this.fixWidth, this.fixHeight);
        this.renderer.setSize(this.width, this.height, false);
    }

    render() {
        if (Math.floor(this.state.canvas.clientWidth * this.state.dpr) !== this.width || Math.floor(this.state.canvas.clientHeight * this.state.dpr) !== this.height) {
            this.resize();
        }

        this.state.update();
        this.state.active.volumetrics(false);

        this.renderer.setRenderTarget(this.modelRT);
        this.renderer.clear();
        this.renderer.render(this.state.active.scene, this.state.active.camera);

        //seed phase
        this.mesh.material = this.seedShader;
        this.seedShader.uniforms.scene.value = this.modelRT.texture;

        this.renderer.setRenderTarget(this.seedRT);
        this.renderer.render(this.scene, this.camera);

        // jfa + distance phase
        this.mesh.material = this.jfaShader;
        this.jfaShader.uniforms.size.value = [this.fixWidth, this.fixHeight];

        const passes = Math.ceil(Math.log2(Math.max(this.fixWidth, this.fixHeight)));
        for (let i = 0; i < passes; i++) {
            this.jfaShader.uniforms.prev.value = i === 0 ? this.seedRT.texture : this.prevJFA.texture;
            this.jfaShader.uniforms.offset.value = Math.pow(2, passes - i - 1);
            this.jfaShader.uniforms.isLast.value = i === passes - 1;

            this.renderer.setRenderTarget(this.curJFA);
            this.renderer.render(this.scene, this.camera);

            [this.curJFA, this.prevJFA] = [this.prevJFA, this.curJFA];
        }

        //RC phase
        if (this.rc) {
            this.mesh.material = this.rcShader;
            this.rcShader.uniforms.count.value = this.cCount;
            this.rcShader.uniforms.scene.value = this.modelRT.texture;
            this.rcShader.uniforms.dist.value = this.prevJFA.texture;

            this.rcShader.uniforms.size.value = [this.fixWidth, this.fixHeight];
            this.rcShader.uniforms.multiplier.value = this.state.settings.fluence;

            for (let i = this.cCount; i >= 0; i--) {
                this.rcShader.uniforms.cascade.value = i;
                this.rcShader.uniforms.nCascade.value = this.prevCascade.texture;

                this.renderer.setRenderTarget(this.curCascade);
                this.renderer.render(this.scene, this.camera);

                [this.curCascade, this.prevCascade] = [this.prevCascade, this.curCascade];
            }
        } else {
            this.mesh.material = this.traceShader;
            this.traceShader.uniforms.scene.value = this.modelRT.texture;
            this.traceShader.uniforms.dist.value = this.prevJFA.texture;
            this.traceShader.uniforms.size.value = [this.fixWidth, this.fixHeight];
            this.traceShader.uniforms.time.value = performance.now();
            this.traceShader.uniforms.multiplier.value = this.state.settings.fluence;

            this.renderer.setRenderTarget(this.prevCascade);
            this.renderer.render(this.scene, this.camera);
        }

        if (this.major > 1) {
            this.mesh.material = this.collapseShader;
            this.collapseShader.uniforms.cascade0.value = this.prevCascade.texture;
            this.collapseShader.uniforms.multiplier.value = this.state.settings.fluence;

            this.renderer.setRenderTarget(this.collapseRT);
            this.renderer.render(this.scene, this.camera);
        }

        //bilateral filter phase (to smooth out noise/artifacts) - forgor that prevcascade could be linear so like there is that but im lazy
        this.mesh.material = this.bilateralShader;
        this.bilateralShader.uniforms.tex.value = this.major > 1 ? this.collapseRT.texture : this.prevCascade.texture;

        this.renderer.setRenderTarget(this.bilateralRT);
        this.renderer.render(this.scene, this.camera);

        //because of the error calculation there will be a mismatch between the main rendering and the other resolutions.
        //to solve this everything renders into overlayRT (which is the same res as RC) and fit to cover

        this.mesh.material = this.displayMaterial;
        this.displayMaterial.map = this.bilateralRT.texture;

        this.renderer.setRenderTarget(this.overlayRT);
        this.renderer.render(this.scene, this.camera);

        //overlay phase (to display text/video on full res)
        this.state.active.volumetrics(true);
        this.renderer.render(this.state.active.volScene, this.state.active.camera);

        cover(this.overlayRT.texture, this.width / this.height);
        this.mesh.material = this.displayMaterial;
        this.displayMaterial.map = this.overlayRT.texture;

        this.renderer.setRenderTarget(null);
        this.renderer.render(this.scene, this.camera);

        this.frameCount = this.frameCount + 1; // % 2;

        this.state.stats.update();

        const fps = this.state.stats.getData().fps;
        const ms = (1000 / fps).toFixed(1);

        document.getElementById("fps")!.textContent = fps + " (" + ms + "ms)";

        this.renderer.info.reset();
    }
}
