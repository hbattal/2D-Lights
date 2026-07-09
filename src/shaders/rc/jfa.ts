import * as THREE from "three";

//https://en.wikipedia.org/wiki/Jump_flooding_algorithm
export function jfa() {
    return new THREE.ShaderMaterial({
        uniforms: {
            prev: { value: null },
            size: { value: null },
            offset: { value: null },
            isLast: { value: null },
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

            uniform sampler2D prev;
            uniform ivec2 size;
            uniform float offset;
            uniform bool isLast;

            out vec4 fragColor;

            void main() {
                vec4 nearest = vec4(0.0);
                float mnDist = 9999999.9; //make sure its larger then the biggest pixel distance^2

                //prove why the algo works

                for(float y = -1.; y <= 1.; ++y){
                    for(float x = -1.; x <= 1.; ++x){

                        vec2 pos = (gl_FragCoord.xy + vec2(x, y) * offset) / vec2(size);

                        if (floor(pos) != vec2(0.0)) continue;

                        vec4 val = texture(prev, pos);

                        if(val.a != 0.0) {
                            vec2 diff = val.xy - gl_FragCoord.xy;
                            float sqr = dot(diff, diff);

                            if(sqr < mnDist){
                                mnDist = sqr;
                                nearest = val;
                            }
                        }
                    }
                }

                if(isLast == false) {
                    fragColor = nearest;
                    return;
                }

                //distance calculation last pass
                vec2 diff = nearest.xy - gl_FragCoord.xy;

                fragColor = vec4(length(diff), 0., 0., 1.);

            }
        `,
    });
}
