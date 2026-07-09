import * as THREE from "three";

//note that I was not able to find one true implementation of the bilateral filter, thus decided to stick to the equations given in
//https://people.csail.mit.edu/sparis/bf_course/course_notes.pdf
//https://www.shadertoy.com/view/4dfGDH //has constants that cancel out, which turns out to be the same as the wiki page
//https://en.wikipedia.org/wiki/Bilateral_filter
export function bilateral() {
    return new THREE.ShaderMaterial({
        uniforms: {
            tex: { value: null },
            sigmaR: { value: null },
            sigmaD: { value: null },
            size: { value: null },
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

            uniform sampler2D tex;
            uniform float sigmaR;
            uniform float sigmaD;
            uniform int size;

            out vec4 fragColor;

            void main() {
                vec2 pos = gl_FragCoord.xy;
                vec3 color = texelFetch(tex, ivec2(pos), 0).rgb;

                vec3 num = vec3(0.0);
                float denom = 0.0;

                for(int i = -size; i <= size; ++i) {
                    for(int j = -size; j <= size; ++j) {
                        vec2 neigh = pos + vec2(i, j);
                        vec3 neighColor = texelFetch(tex, ivec2(neigh), 0).rgb;

                        float w = exp( -((pos.x - neigh.x) * (pos.x - neigh.x) + (pos.y - neigh.y) * (pos.y - neigh.y)) / (2.0 * sigmaD * sigmaD) - dot(color - neighColor, color - neighColor) / (2.0 * sigmaR * sigmaR));

                        num += neighColor * w;
                        denom += w;
                    }
                }

                fragColor = vec4(num / denom, 1.0);
            }
        `,
    });
}
