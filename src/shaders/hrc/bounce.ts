import * as THREE from "three";

export function hrcBounce() {
    return new THREE.ShaderMaterial({
        uniforms: {
            radiance: { value: null },
            world: { value: null },

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

            uniform sampler2D radiance;
            uniform sampler2D world;

            uniform ivec2 size;

            out vec4 fragColor;

            #define TAU 6.283185

            bool wall(float op) {
                if(abs(op) >= 1.0) return true;
                return false;
            }

            void main() {

                ivec2 coord = ivec2(gl_FragCoord.xy);
                vec4 pixel = texelFetch(world, coord, 0);

                //not sure what the correct way to do this is
                //you can treat it as "how much light is in this pixel" -> the denser it is, the less its aware of the incoming light -> https://github.com/entropylost/amitabha/blob/main/src/bin/multibounce.rs
                //but then you cant achieve a bounce from a hard wall look, which in that case you would need incoming light from the surrounding area
                //perhaps this is better? -> https://github.com/OrionReed/radiance/blob/main/site/hrc/hrc.ts#L2100

                if(pixel.a >= 0.0) {
                    fragColor = vec4(0.0);
                    return;
                }

                vec3 albedo = pow(pixel.rgb, vec3(2.2));
                fragColor = vec4(texelFetch(radiance, coord, 0).rgb * albedo, 1.0);

                //completely will change below

                // if(!wall(pixel.a) || pixel.a >= 0.0) {

                //     //rn non emissive objects have neg absrp factor, topdown view doesnt make a lot of sense for this but might change the color to non emissive albedo

                //     fragColor = vec4(0.0);
                //     return;
                // }

                // int cnt = 0;
                // vec3 nxt = vec3(0.0);

                // for(int i = -1; i <= 1; ++i) {
                //     for(int j = -1; j <= 1; ++j) {

                //         if(i == 0 && j == 0) continue;

                //         //check if in bounds
                //         int cx = coord.x + j;
                //         int cy = coord.y + i;
                //         if(cx < 0 || cx >= size.x || cy < 0 || cy >= size.y) continue;

                //         //check if its a wall
                //         if(wall(texelFetch(world, ivec2(cx, cy), 0).a)) continue;

                //         ++cnt;
                //         nxt += texelFetch(radiance, ivec2(cx, cy), 0).rgb;
                //     }
                // }

                // fragColor = cnt > 0 ? vec4(nxt / float(cnt) * albedo, 0.0) : vec4(0.0);
            }

        `,
    });
}
