import * as THREE from "three";

export function accumulate() {
    return new THREE.ShaderMaterial({
        uniforms: {
            m: { value: null },
            pm: { value: null },

            brushSize: { value: null },
            color: { value: null },
            alpha: { value: null },
            prev: { value: null },
        },
        glslVersion: THREE.GLSL3,
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

            uniform vec2 m;
            uniform vec2 pm;
            uniform float brushSize;
            uniform vec3 color;
            uniform float alpha;
            uniform sampler2D prev;

            out vec4 fragColor;

            //https://iquilezles.org/articles/distfunctions2d/
            float sdSegment( in vec2 p, in vec2 a, in vec2 b, in float r ) {
                vec2 ba = b-a;
                vec2 pa = p-a;
                float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
                return length(pa-h*ba)-r;
            }

            void main() {

                fragColor = texture(prev, vUv);

                if(sdSegment(gl_FragCoord.xy, pm, m, brushSize) < 0.0) {
                    fragColor = vec4(color, alpha);
                }
            }
        `,
    });
}
