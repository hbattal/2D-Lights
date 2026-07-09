import * as THREE from "three";

//superseded by radiance cascades

export function ray() {
    return new THREE.ShaderMaterial({
        uniforms: {
            scene: { value: null },
            dist: { value: null },
            size: { value: null },

            rays: { value: null },
            blueNoise: { value: null },
            time: { value: null },

            multiplier: { value: null },
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
            uniform sampler2D scene;
            uniform sampler2D dist;
            uniform ivec2 size;

            uniform float rays;
            uniform sampler2D blueNoise;
            uniform float time;

            uniform float multiplier;

            out vec4 fragColor;

            #define TAU 6.283185
            #define PHI 1.618033988749

            void main() {
                float noise = texelFetch(blueNoise, ivec2(gl_FragCoord.xy) % 128, 0).r;
                noise = fract(noise + time * PHI);

                vec4 radiance = vec4(0.0);

                for(float i = 0.0; i < rays; ++i) {
                    float angle = (TAU / rays) * (float(i) + noise);
                    vec2 dir = vec2(cos(angle), sin(angle));

                    vec2 pos = vUv;
                    vec4 rad = vec4(0.0);

                    for (int j = 0; j < 50; ++j) {
                        float step = texture(dist, pos).r;

                        pos += (dir * step) / vec2(size);

                        if (floor(pos) != vec2(0.0)) break;

                        if (step == 0.0) {
                            rad += pow(texture(scene, pos), vec4(2.2));
                            break;
                        }
                    }

                    radiance += rad / rays;
                }

                fragColor = pow(radiance * multiplier, vec4(1.0 / 2.2));
            }

        `,
    });
}
