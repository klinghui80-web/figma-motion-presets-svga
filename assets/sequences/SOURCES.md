# 序列帧素材来源

这 24 个内置预设使用真实透明序列帧。2026-10-29 下载并核对作者页面的 CC0 标注；未使用 SVGA Editor 的专有素材。

许可：[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)。Explosion effects and more 同时提供 CC-BY 3.0 / CC0，本项目采用其中的 CC0 选项。

## 作者与资源包

- para：[Animated particle effects #1](https://opengameart.org/content/animated-particle-effects-1)、[Animated particle effects #2](https://opengameart.org/content/animated-particle-effects-2)。作者标注 1024×1024 图集、128×128 单帧、64 帧、30 FPS。
- Soluna Software：[Lots of game effects](https://opengameart.org/content/lots-of-game-effects)、[Explosion effects and more](https://opengameart.org/content/explosion-effects-and-more)。作者未指定帧率，本插件为这组预设选择 24 FPS，可在界面调整。

## 文件对应

| 插件预设 | 作者 | 原始文件 | 帧数 | 预设 FPS |
| --- | --- | --- | ---: | ---: |
| 流动火焰 | Soluna Software | [Fire01.png](https://opengameart.org/sites/default/files/Fire01.png) | 64 | 24 |
| 火光爆发 | Soluna Software | [Explosion25.png](https://opengameart.org/sites/default/files/Explosion25.png) | 16 | 24 |
| 火球爆炸 | Soluna Software | [Explosion03.png](https://opengameart.org/sites/default/files/Explosion03.png) | 16 | 24 |
| 火环爆破 | Soluna Software | [Explosion21.png](https://opengameart.org/sites/default/files/Explosion21.png) | 16 | 24 |
| 蓝色能量球 | Soluna Software | [Effect36.png](https://opengameart.org/sites/default/files/Effect36.png) | 16 | 24 |
| 能量冲击环 | Soluna Software | [Effect51.png](https://opengameart.org/sites/default/files/Effect51.png) | 16 | 24 |
| 蓝色落光 | Soluna Software | [Effect47.png](https://opengameart.org/sites/default/files/Effect47.png) | 16 | 24 |
| 冰霜扩散 | Soluna Software | [Effect95.png](https://opengameart.org/sites/default/files/Effect95.png) | 16 | 24 |
| 紫色光环 | Soluna Software | [Aura38.png](https://opengameart.org/sites/default/files/Aura38.png) | 32 | 24 |
| 卡通撞击 | Soluna Software | [ToonExplosion31.png](https://opengameart.org/sites/default/files/ToonExplosion31.png) | 16 | 24 |
| 橙色火苗 | para | [fire_01.png](https://opengameart.org/sites/default/files/fire_01.png) | 64 | 30 |
| 燃烧火焰 | para | [fire_02.png](https://opengameart.org/sites/default/files/fire_02.png) | 64 | 30 |
| 烛火 | para | [lighter_flame_01.png](https://opengameart.org/sites/default/files/lighter_flame_01.png) | 64 | 30 |
| 上升气泡 | para | [air_bubbles_01.png](https://opengameart.org/sites/default/files/air_bubbles_01.png) | 64 | 30 |
| 蓝色传送阵 | para | [teleporter_01.png](https://opengameart.org/sites/default/files/teleporter_01.png) | 64 | 30 |
| 传送落点 | para | [teleporter_hit.png](https://opengameart.org/sites/default/files/teleporter_hit.png) | 64 | 30 |
| 金色流光环 | para | [particlefx_01.png](https://opengameart.org/sites/default/files/para_CC0_particlefx-1.zip) | 64 | 30 |
| 灰色烟雾 | para | [particlefx_03.png](https://opengameart.org/sites/default/files/para_CC0_particlefx-1.zip) | 64 | 30 |
| 蓝色光雾 | para | [particlefx_07.png](https://opengameart.org/sites/default/files/para_CC0_particlefx-1.zip) | 64 | 30 |
| 燃烧光环 | para | [particlefx_09.png](https://opengameart.org/sites/default/files/para_CC0_particlefx-1.zip) | 64 | 30 |
| 火焰烟团 | para | [particlefx_10.png](https://opengameart.org/sites/default/files/para_CC0_particlefx-1.zip) | 64 | 30 |
| 紫色光雾 | para | [particlefx_12.png](https://opengameart.org/sites/default/files/para_CC0_particlefx-1.zip) | 64 | 30 |
| 金色光环 | para | [particlefx_13.png](https://opengameart.org/sites/default/files/para_CC0_particlefx-1.zip) | 64 | 30 |
| 星点扩散环 | para | [particlefx_14.png](https://opengameart.org/sites/default/files/para_CC0_particlefx-1.zip) | 64 | 30 |

## 打包说明

- 下载的透明 PNG 图集转换为无损 WebP，保持像素尺寸、逐帧排列及原始 alpha；从代表帧生成单帧缩略图。
- `catalog.json` 记录网格、单帧尺寸、帧数、播放帧率、代表帧、作者、来源、直接下载地址、许可及图集 SHA-256。
- 为支持 Figma 禁止联网的离线环境，`python3 scripts/build-sequence-library.py` 将本目录中的图集和缩略图，以及 `src/sequence.js` 嵌入 `ui.html`。现有包可直接使用，不需要运行构建。
- 添加预设时先保存图集和缩略图，再更新 catalog 并重新运行构建；不要直接修改 ui.html 中的生成区。
