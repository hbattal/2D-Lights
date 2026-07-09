import * as THREE from "three";

//hrc but no extensions every ray is DDA traced from its probe
//you can also have non volumetric impl to raymarch an empty space with a SDF from a JFA (changes stuff a lil)

export function hrcBrute() {
    return new THREE.ShaderMaterial({
        uniforms: {
            cascade: { value: null },
            frustum: { value: null },

            nCones: { value: null },
            absorption: { value: null },
            emissivity: { value: null },
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
            uniform int cascade;
            uniform int frustum;
            uniform sampler2D nCones;
            uniform sampler2D absorption;
            uniform sampler2D emissivity;
            uniform ivec2 size;

            out vec4 fragColor;

            struct Light {
                vec4 rad;
                vec4 tran;
            };

            Light DDA(vec2 probe, vec2 dir) {
                Light r;
                r.rad = vec4(0.0);
                r.tran = vec4(1.0);

                //DDA from probe to probe + dir where each pair of endpoints tell us the step length where emiss and absorp are from that pixels endpoint
                vec2 sgn = sign(dir);
                vec2 base = floor(probe);

                vec2 dist = vec2(sqrt(1.0 + (dir.y / dir.x) * (dir.y / dir.x)),
                                 sqrt(1.0 + (dir.x / dir.y) * (dir.x / dir.y)));

                vec2 frac = fract(probe);
                vec2 ray;

                ray.x = (dir.x < 0.0) ? (frac.x * dist.x) : ((1.0 - frac.x) * dist.x);
                ray.y = (dir.y < 0.0) ? (frac.y * dist.y) : ((1.0 - frac.y) * dist.y);

                float cur = 0.0;
                float mx = length(dir);

                for(int i = 0; ; ++i) {
                    if(cur >= mx) break;
                    float next = min(ray.x, ray.y); //careful this is the actual length
                    float step = min(next, mx) - cur;
                    cur = next;

                    vec2 c = (base + vec2(0.5)) / vec2(size);

                    if(floor(c) != vec2(0.0)) break;

                    vec2 rotate[4];
                    rotate[0] = c;
                    rotate[1] = vec2(1.0 - c.y, c.x);
                    rotate[2] = 1.0 - c;
                    rotate[3] = vec2(c.y, 1.0 - c.x);

                    vec4 emiss = pow( texture(emissivity, rotate[frustum]), vec4(2.2) );
                    vec4 absrp = pow( texture(absorption, rotate[frustum]), vec4(2.2) );

                    vec4 tran = exp(-absrp * step);
                    vec4 rad = emiss * (1.0 - tran); //this is not even right but im not questioning it anymore the actual eq comes out to be divided by abrsp that everyone seems to omit

                    r.rad += r.tran * rad;
                    r.tran *= tran;

                    if (ray.x < ray.y) {
                        base.x += sgn.x;
                        ray.x += dist.x;
                    } else {
                        base.y += sgn.y;
                        ray.y += dist.y;
                    }
                }

                return r;
            }

            vec4 nextCone(vec2 probe, int ind) {
                //sample next cascade with the next index to offset from the next probe
                //two edge cases: sample falls outside of the tex so cone becomes val 0
                //in the last cascade there are two planes in which both planes guarantee that shooting a ray from it will sample outside so vec4(0.0)

                vec2 pos = vec2(probe.x + float(ind), probe.y);
                pos /= vec2(size);

                if(floor(pos) != vec2(0.0)) return vec4(0.0);
                return texture(nCones, pos);
            }

            void main() {
                ivec2 coord = ivec2(gl_FragCoord.xy);

                int twoN = 1 << cascade;
                int twoN1 = twoN * 2;

                //first find out which plane this cone originates from (this is only the index of the plane)
                int plane = coord.x / twoN;

                //we also need the index of the cone relative to its probe
                int ind = coord.x % twoN;

                //finally we need the probe location centered on the pixel
                vec2 probe = vec2(plane * twoN,  coord.y) + 0.5;

                //if we are at an even plane since we need to merge with the next plane the rays need be 2 v_n(k)
                int even = plane % 2 == 0 ? 2 : 1;

                //v_n(k) = (2^n, 2k - 2^n) from the paper where k can be represented as as the cone index for left and one more for right
                ivec2 dRay = even * ivec2(twoN, 2 * ind - twoN);
                ivec2 uRay = even * ivec2(twoN, 2 * (ind + 1) - twoN);

                //the above rays are weighted according to their cones they are merging with in the next cascade
                int dCone = ind * 2;
                int uCone = ind * 2 + 1;

                //A_n+1(j) = ang(v_n+1(j + 1/2)) - ang(v_n+1(j - 1/2)) eq 13 there is a little switch up between the paper and integer indexes here
                float one = atan(float(2 * dCone - twoN1), float(twoN1));
                float two = atan(float(2 * uCone - twoN1), float(twoN1));
                float three = atan(float(2 * (uCone + 1) - twoN1), float(twoN1));

                //quick note, we do the below calc as we need angular fluence (not to be confused with radiance)
                //fluence: light arriving from all directions (integral of radiance over the unit circle)
                //radiance: light traveling from a singular direction
                //in the hrc impl it is explicity stored as ang fluence and then normalized at the end 0 to 1. This normalization makes it equal to mean radiance
                //in the rc impl it is implicit, each ray actually is the normalized fluence of the cone (normalized fluence = mean radiance in this context)

                float dWeight = two - one;
                float uWeight = three - two;

                //now for both rays trace and merge
                Light dTrace = DDA(probe, vec2(dRay));
                Light uTrace = DDA(probe, vec2(uRay));

                vec4 dVal = nextCone(probe + vec2(dRay), dCone);
                vec4 uVal = nextCone(probe + vec2(uRay), uCone);

                //merge operations again per paper merge_r no need for transmittance
                vec4 dRad = dWeight * dTrace.rad + dTrace.tran * dVal;
                vec4 uRad = uWeight * uTrace.rad + uTrace.tran * uVal;

                //at this point we have eq 14 and 17 down yay!
                //bad news is for even planes we gotta go the extra step eq 15, 16
                //the reason for this is not clear in my head rn
                if(even == 2) {
                    vec4 dNear = nextCone(probe, dCone);
                    vec4 uNear = nextCone(probe, uCone);
                    dRad = (dRad + dNear) / 2.0;
                    uRad = (uRad + uNear) / 2.0;
                }

                fragColor = dRad + uRad;
            }

        `,
    });
}
