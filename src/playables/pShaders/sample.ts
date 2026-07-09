import * as THREE from "three";

export function sampleVideo() {
    return new THREE.ShaderMaterial({
        uniforms: {
            video: { value: null },
            size: { value: null },

            init: { value: null },
            time: { value: null },
        },
        glslVersion: THREE.GLSL3,
        vertexShader: `
            out vec3 vWorldPos;

            void main() {
                vWorldPos = (instanceMatrix * vec4(position, 1.0)).rgb;
                gl_Position = projectionMatrix * viewMatrix * instanceMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            precision highp float;
            in vec3 vWorldPos;

            uniform sampler2D video;
            uniform vec2 size;

            uniform bool init;
            uniform float time;

            out vec4 fragColor;

            void main() {
                vec2 uv = (vWorldPos.xy + (size / 2.0)) / size;
                if(init) {
                    fragColor = vec4(vec3(1.0), 30.0);
                }
                else {
                    fragColor = vec4(texture(video, uv).rgb, 30.0);
                }
            }
        `,
    });
}
