import * as THREE from "three";

//probe major with no pre averaging.

export function rcV1() {
    return new THREE.ShaderMaterial({
        uniforms: {
            cascade: { value: null },
            count: { value: null },

            scene: { value: null },
            dist: { value: null },
            nCascade: { value: null },
            size: { value: null },

            multiplier: { value: null },
        },
        glslVersion: THREE.GLSL3,
        vertexShader: `
            void main() {
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            precision highp float;

            uniform int cascade;
            uniform int count;

            uniform sampler2D scene;
            uniform sampler2D dist;
            uniform sampler2D nCascade;
            uniform ivec2 size;

            uniform float multiplier;

            out vec4 fragColor;

            #define TAU 6.283185

            vec4 raymarch(vec2 pos, vec2 dir, float interval) {
                float traveled = 0.0;
                pos /= vec2(size);

                for(float i = 0.0; i < interval; ++i) {
                    float step = texture(dist, pos).r;

                    traveled += step;
                    pos += dir * step / vec2(size);

                    if (traveled >= interval || floor(pos) != vec2(0.0)) break;
                    if (step == 0.0) return pow(texture(scene, pos), vec4(2.2));
                }

                return vec4(0.0);
            }

            vec4 merge(int nRayInd, ivec2 ind) {
                int twoN2 = 1 << cascade + 2;
                ivec2 nProbesAxis = size * 2 / twoN2;

                //find bottom left probe in the upper cascade like this per yaazarai's explanation (makes so much sense btw)
                ivec2 adjusted = max(ind - 1, 0);
                ivec2 BL = adjusted / 2;

                //at this point is the bottom left probe in the upper cascade. But there is an exception where the bottom left might not have a right or top probe if its on the edge
                if (BL.x == nProbesAxis.x - 1) BL.x -= 1;
                if (BL.y == nProbesAxis.y - 1) BL.y -= 1;

                //ok that is the bottom left probe now offset
                ivec2 BR = BL + ivec2(1, 0);
                ivec2 TL = BL + ivec2(0, 1);
                ivec2 TR = BL + ivec2(1, 1);

                vec4 rads[4];
                ivec2 bilinear[4];
                ivec2 probes[4] = ivec2[4](BL, BR, TL, TR);

                for (int i = 0; i < 4; ++i) {
                    rads[i] = vec4(0.0);
                    bilinear[i] = probes[i] * twoN2 + twoN2 / 2;

                    for (int j = 0; j < 4; ++j) {
                        int ray = nRayInd + j;
                        ivec2 rayPos = ivec2(ray % twoN2, ray / twoN2);
                        ivec2 texel = probes[i] * twoN2 + rayPos;
                        rads[i] += texelFetch(nCascade, texel, 0) * 0.25;
                    }
                }

                //last step is getting the bilinear weights
                ivec2 pos = ind * twoN2 / 2 + twoN2 / 4;

                //now bilinear pos and pos is in cascade space
                pos = clamp(pos, bilinear[0], bilinear[3]);

                float h = float(pos.x - bilinear[0].x) / float(bilinear[1].x - bilinear[0].x);
                float v = float(pos.y - bilinear[0].y) / float(bilinear[2].y - bilinear[0].y);

                return rads[0] * (1.0 - h) * (1.0 - v) +
                       rads[1] * h * (1.0 - v) +
                       rads[2] * (1.0 - h) * v +
                       rads[3] * h * v;
            }

            //init ray 4 assuming cascadeRes is 4x scene Res
            void main() {
                ivec2 coord = ivec2(gl_FragCoord.xy);

                int twoN = 1 << cascade;
                int twoN1 = twoN * 2;
                int fourN = 1 << cascade * 2;

                //where in the block exactly
                ivec2 ind2D = coord % twoN1;
                int ind1D = ind2D.x + twoN1 * ind2D.y;
                int nRayBase = ind1D * 4;

                //get which block (probe) you are in in in this cascade level
                ivec2 probeInd = coord / twoN1;
                vec2 origin = (vec2(probeInd) + 0.5) * float(twoN); //IN SCENE PIXELS

                float offset = (1.0 - float(fourN)) / -3.0;
                float range = float(fourN) + length(vec2(twoN1));

                float spacing = TAU / float(fourN * 4);
                float theta = float(ind1D) * spacing;
                vec2 dir = vec2(cos(theta), sin(theta));
                vec2 start = origin + (dir * offset);

                vec4 hit = raymarch(start, dir, range);
                fragColor = hit;

                if (hit.a == 0.0 && cascade != count - 1) {
                    fragColor = merge(nRayBase, probeInd);
                }

            }
        `,
    });
}

export function collapse() {
    return new THREE.ShaderMaterial({
        uniforms: {
            cascade0: { value: null },
            multiplier: { value: null },
        },
        glslVersion: THREE.GLSL3,
        vertexShader: `
            void main() {
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            precision highp float;
            uniform sampler2D cascade0;
            uniform float multiplier;

            out vec4 fragColor;

            void main() {
                ivec2 coord = ivec2(gl_FragCoord.xy);

                vec4 rad = vec4(0.0);
                for (int i = 0; i < 4; ++i) {
                    rad += texelFetch(cascade0, ivec2(coord * 2 + ivec2(i % 2, i / 2)), 0) * 0.25;
                }

                fragColor = pow(rad * multiplier, vec4(1.0 / 2.2));
            }
        `,
    });
}
