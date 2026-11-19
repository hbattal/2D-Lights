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
- [x] Light bounce

</details>

## Technical

2D Global Illumination via (Holographic) Radiance Cascades.

The HRC impl is vanilla (as there have been more variations of it). With extensions and some other optimizations, performance is favorable even with igpu's. Even though it runs fast, the performance definitely can be further improved. Some ideas are using MRT's to pack all 4 directions at once and data packing. Also, volumetrics are free thanks to extensions, and they look pretty cool. Since each pixel has the total incoming direct light after the first pass, the same pixel can be treated as a diffuse bounce emission in the next frame after multiplying by its albedo.

The RC impl contains both direction major (pre averaged) and probe major. It relies on a DF produced by the JFA to skip empty space when tracing rays (no volumetrics).

In both implementations, the operations are done in a downscaled texture. This is a perfect way to optimize, as if you model the scene using completely opaque objects (neglecting transmission), you can rerender the objects in full res (without HRC) on top of the downscaled radiance texture. This way the objects stay high quality. You still upscale, but since the radiance field is smooth (I don't know the proper terminology for this), the quality loss is negligible.

## Gallery

[Arcane](https://www.youtube.com/watch?v=j-Ls8z5Ft2w)

## Credits

The (Holographic) Radiance Cascade implementation is based on [Volumetric-HRC](https://github.com/Yaazarai/Volumetric-HRC) and [GMShaders-Radiance-Cascades](https://github.com/Yaazarai/GMShaders-Radiance-Cascades) [by Yaazarai](https://github.com/Yaazarai), used under the Unlicense.

Some old parts of this project are based on code from [Radiance Cascades](https://jason.today/rc) ([by Jason McGhee](https://github.com/jasonjmcghee)), used under the MIT License.
