## 2D Lights

A 2D light playground on the web. Sometime ago, I saw Lusion's light tracing [website](https://akari.lusion.co/#home) and was amazed. Since that website was published, 2D light algorithms have improved significantly, so I decided to make a continuation of it.

<details>
  <summary>Todos</summary>

- [x] Cleanup/structure code -> More work?
- [x] Radiance Cascades -> Look into Holographic radiance cascades
- [ ] Optimize and cleanup + look into webgpu
- [x] Switch to TypeScript as a learning experience because it looks way better
- [x] colorspace -> solved (https://threejs.org/manual/#en/color-management | https://discourse.threejs.org/t/updates-to-color-management-in-three-js-r152/50791)
- [ ] Need a whole lot more modes
- [ ] Light bounce

</details>

## Technical

2D Global Illumination via (Holographic) Radiance Cascades.

The HRC impl is vanilla (as there have been more variations of it). With extensions and some other optimizations, performance is really favorable even with igpu's and thanks to extensions it has free volumetrics. The performance can defintely be improved, with MRTs where you can pack all 4 directions at once.

The RC impl contains both direction major (pre averaged) and probe major. It relies on a DF produced by the JFA to skip empty space when tracing rays (no volumetrics).

I also overlay non volumetric objects on top in full resolution as upscaling blurs things.

## Gallery

Will update

## Credits

The (Holographic) Radiance Cascade implementation is based on [Volumetric-HRC](https://github.com/Yaazarai/Volumetric-HRC) and [GMShaders-Radiance-Cascades](https://github.com/Yaazarai/GMShaders-Radiance-Cascades) [by Yaazarai](https://github.com/Yaazarai), used under the Unlicense.

Some old parts of this project are based on code from [Radiance Cascades](https://jason.today/rc) ([by Jason McGhee](https://github.com/jasonjmcghee)), used under the MIT License.