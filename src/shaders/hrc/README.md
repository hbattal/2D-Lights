Implementations:

- https://github.com/Yaazarai/Volumetric-HRC (My implementation is based on this, thanks Yaazarai)
- https://github.com/entropylost/amitabha (One of the paper's author's reference implementation, magic rust code)
- https://github.com/folk-js/folkjs/blob/main/packages/labs/src/folk-holographic-rc.ts ([webgpu hrc](https://folkjs.org/demos/shaders/holographic-rc.html) its extremely fast with light bounce support)
- There is a paper someone wrote in the discord group (on the #resources-rc channel) that break down the equations. It was pretty helpful.
- A lot more in the discord gc

Resources:

- HRC: https://arxiv.org/pdf/2505.02041 (paper)
- DDA alg: https://aaaa.sh/creatures/dda-algorithm-interactive/

Optimizations:

- per rgb transmittance cuz fps
- optional half probes in a plane as they go unused except in c0-c1 and interp in c0 - gives around 2x boost
- 2 MRT is done but doesn't save much. Dunno how 4 MRT is possible
- look into rgb9e5 after learning webgpu
