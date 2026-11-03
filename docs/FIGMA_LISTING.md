# Figma Community listing draft

Status: submitted for review on 2026-11-03. Figma displayed “We have received your submission” and “Our team will review this resource and contact you when it’s ready.” Public installation is pending approval. Community URL: https://www.figma.com/community/plugin/1699346735533425751. Publisher: 阿咻 (personal creator). The owner accepted the Community Creator Agreement. Code uses Figma-assigned ID `1699346735533425751`; the submitted build loads unchanged sequence sheets on demand and is approximately 1.05 MB. The original offline build remains available in GitHub release v1.0.0.

## Name

figma动效预设-SVGA

## Tagline

在 Figma 中预览、叠加动效，一键导出 SVGA / WebP / GIF / Lottie / WebM

## Description (中文)

给 Figma 图层添加动效，实时预览，调整参数，再导出动画。

figma动效预设-SVGA以 SVGA 为默认导出格式，适合需要快速制作图片动效、粒子装饰和序列帧合成的设计师。

主要功能
• 基础动效、扫光、发光、光照、粒子、序列帧、置换和其他效果。
• 单选模式逐个挑选效果；叠加模式组合多个独立效果层。
• 每层独立调参，支持显隐与删除。
• 粒子预设保留各自的样式、大小和不透明度变化。
• 24 个原始序列帧素材（按需加载）；也可导入 PNG 序列，或读取 Figma 多选图层。
• 默认导出 SVGA 2.0；另可导出无损动态 WebP、GIF、Lottie JSON 和透明 WebM。

格式说明
• 需要保留颜色、半透明和柔光时，优先选择 SVGA 或无损 WebP。
• GIF 受 256 色和单比特透明度限制，可选择黑色、白色或透明背景。
• Lottie JSON 内嵌逐帧 PNG，保留画面，但不是可编辑的矢量关键帧，文件可能较大。
• WebM 使用高质量有损视频编码，透明播放需要播放器支持，编码需要运行环境支持 WebCodecs / VP8。

隐私与使用
• 动效和编码在本地插件沙箱处理；不上传文档或图片，不使用遥测或分析。
• 预设序列帧首次使用时从 GitHub 下载原始素材，并验证文件校验和；缩略图与编码器内置，已加载素材在本次会话中复用。
• 仅下载静态素材，不发送文档、图片或导出结果；首次使用预设序列帧需要网络。
• 工作内容保存在本次插件会话中；关闭前请导出需要保存的结果。
• 优先使用较新的 Figma 桌面版本。

内置序列帧来自 para 和 Soluna Software 的 CC0 资源，完整来源与第三方许可证随开源项目提供。

## Description (English)

Add motion to selected Figma layers, preview the result, adjust parameters and export animation.

Use single mode to audition one preset at a time, or stack independent effects with per-layer settings, visibility and removal. Includes basic motion, sweep highlights, glow, lighting, particles, displacement and 24 original CC0 animation sheets loaded on demand. Import PNG sequences or read multiple selected Figma layers as source frames.

SVGA 2.0 is the default output. Also supports lossless animated WebP, GIF, raster-frame Lottie JSON and transparent WebM. GIF has palette and transparency limits; Lottie embeds PNG frames rather than editable vector keyframes; WebM uses lossy VP8 video with a separate alpha channel and requires WebCodecs support.

Motion and export run locally. Preset sheets are downloaded from a fixed public GitHub commit and SHA-256 verified; loading them for the first time needs network access. The plugin does not upload artwork and has no analytics or telemetry. Working parameters remain in session memory. Please export before closing.

## Category and images

- Category: Design tools (choose the closest available category in the publishing dialog).
- Icon: `docs/images/icon-128.png` (128 × 128).
- Cover: `docs/images/cover-1920x1080.png` (1920 × 1080).
- Do not upload local `artifacts/` screenshots or private Figma files.
- Free Community release. Source: https://github.com/klinghui80-web/figma-motion-presets-svga. Project code uses MIT; third-party licenses remain separate.
- Support: https://github.com/klinghui80-web/figma-motion-presets-svga/issues. No personal email needs to be added to source files.

## Security disclosure evidence

- Static asset downloads only: `networkAccess.allowedDomains = ["https://raw.githubusercontent.com"]`. Requests omit credentials and referrers, and do not transmit user artwork. GitHub/CDN receives normal request information such as the IP address and asset URL.
- Reads selected Figma nodes as PNG for preview/export and user-selected frames for sequence import.
- No hosted backend, account system, analytics, tracking or advertising.
- No custom persistent storage; session state is held in memory.
- Export files are saved through the platform download mechanism.
- Privacy statement: `PRIVACY.md`.

Official publishing guide: https://help.figma.com/hc/en-us/articles/360042293394-Publish-classic-plugins-to-the-Figma-Community
