import * as THREE from "three";

//Based on
//https://github.com/Yaazarai/GMShaders-Radiance-Cascades/
//https://m4xc.dev/articles/fundamental-rc/

//direction major and pre averaged + bilinear fix

export function rcV2() {
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
            out vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            precision highp float;
            in vec2 vUv;

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

            void main() {
                ivec2 coord = ivec2(gl_FragCoord.xy);

                int twoN = 1 << cascade; //linear or angular axis
                int twoN1 = twoN * 2; //next linear or next angular axis
                int fourN = 1 << cascade * 2; //angular

                ivec2 dirSize = size / twoN;
                ivec2 dir2D = coord / dirSize;
                int dir1D = dir2D.x + twoN * dir2D.y;
                int nRayBase = dir1D * 4;

                vec2 probeInd = vec2(coord % dirSize);
                vec2 origin = (probeInd + 0.5) * float(twoN);

                //s_n = a_1 * (1 - r ^ n) / (1 - r) a_1 = 1, r = 4
                float offset = (1.0 - float(fourN)) / -3.0;
                float range = float(fourN) + length(vec2(twoN1));

                vec4 rad = vec4(0.0);
                float spacing = TAU / float(fourN * 4);

                for(int i = 0; i < 4; ++i) {
                    int nRayInd = nRayBase + i;
                    float theta = float(nRayInd) * spacing;
                    vec2 dir = vec2(cos(theta), sin(theta));
                    vec2 start = origin + (dir * offset);

                    vec4 hit = raymarch(start, dir, range);

                    //DEBUG rad = vec4(vec3(theta / TAU), 1.0);

                    if (hit.a == 0.0 && cascade != count - 1) {
                        ivec2 nSize = size / twoN1;
                        ivec2 nDir = ivec2(nRayInd % twoN1, nRayInd / twoN1) * nSize;
                        vec2 nClamp = clamp((probeInd + 0.5) / 2.0, vec2(0.5), vec2(nSize) - 0.5);

                        vec2 nProbe = vec2(nDir) + nClamp;

                        hit = texture(nCascade, nProbe / vec2(size));
                    }

                    rad += hit * 0.25;
                }

                if (cascade == 0) {
                    rad.rgb *= multiplier;
                    rad = pow(rad, vec4(1.0 / 2.2));
                }

                fragColor = rad;
            }

        `,
    });
}

export function rcV2Bilinear() {
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
            out vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            precision highp float;
            in vec2 vUv;

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

            void main() {
                ivec2 coord = ivec2(gl_FragCoord.xy);

                int twoN = 1 << cascade;
                int twoN1 = twoN * 2;
                int fourN = 1 << cascade * 2;

                ivec2 dirSize = size / twoN;
                ivec2 dir2D = coord / dirSize;
                int dir1D = dir2D.x + twoN * dir2D.y;
                int nRayBase = dir1D * 4;

                vec2 probeInd = vec2(coord % dirSize);
                vec2 origin = (probeInd + 0.5) * float(twoN);

                //s_n = a_1 * (1 - r ^ n) / (1 - r) a_1 = 1, r = 4
                float offset = (1.0 - float(fourN)) / -3.0;
                float range = float(fourN);

                vec2 probeC = probeInd + 0.5;
                vec2 bilinearC = (probeC - 1.0) / 2.0;
                vec2 ratio = fract(bilinearC);

                vec2 probes[4];
                probes[0] = floor(bilinearC);
                probes[1] = probes[0] + vec2(1.0, 0.0);
                probes[2] = probes[0] + vec2(0.0, 1.0);
                probes[3] = probes[0] + vec2(1.0, 1.0);

                vec4 rad = vec4(0.0);
                float spacing = TAU / float(fourN * 4);

                for(int i = 0; i < 4; ++i) {
                    int nRayInd = nRayBase + i;
                    float theta = float(nRayInd) * spacing;
                    vec2 dir = vec2(cos(theta), sin(theta));

                    float pTheta = floor(float(nRayInd) / 4.0) * (spacing * 4.0);
                    vec2 pDir = vec2(cos(pTheta), sin(pTheta));
                    vec2 start = origin + (pDir * offset);

                    vec4 rays[4];
                    for(int j = 0; j < 4; ++j) {
                        vec2 nOrigin = (probes[j] + 0.5) * float(twoN1);
                        vec2 end = nOrigin + dir * (offset + range);
                        rays[j] = raymarch(start, normalize(end - start), length(end - start));
                        if (rays[j].a == 0.0 && cascade != count - 1) {
                            ivec2 nSize = size / twoN1;
                            ivec2 nDir = ivec2(nRayInd % twoN1, nRayInd / twoN1) * nSize;
                            vec2 nClamp = clamp(probes[j] + 0.5, vec2(0.5), vec2(nSize) - 0.5);

                            vec2 nProbe = vec2(nDir) + nClamp;

                            rays[j] = texture(nCascade, nProbe / vec2(size));
                        }
                    }

                    rad += ((1.0 - ratio.x) * (1.0 - ratio.y) * rays[0] +
                             ratio.x * (1.0 - ratio.y) * rays[1] +
                             (1.0 - ratio.x) * ratio.y * rays[2] +
                             ratio.x * ratio.y * rays[3]) * 0.25;
                }

                if (cascade == 0) {
                    rad.rgb *= multiplier;
                    rad = pow(rad, vec4(1.0 / 2.2));
                }

                fragColor = rad;
            }

        `,
    });
}
