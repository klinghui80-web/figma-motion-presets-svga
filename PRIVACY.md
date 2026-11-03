# Privacy / 隐私说明

figma动效预设-SVGA在 Figma 插件沙箱中本地处理动效，不使用自建服务器。

- 仅为预览和导出读取用户选择的图层；读取自定义序列帧时处理用户主动选择的各帧。
- 画面参数和素材保存在本次插件会话内存中。关闭插件后不会通过本插件保存到远端。
- 不收集账户资料、行为分析、遥测、广告标识或素材内容。
- 不向第三方上传 Figma 文档、图片或导出结果。
- 内置素材、GIF 编码库和 WebP 编码器均随插件离线分发。
- `manifest.json` 的 `networkAccess.allowedDomains` 为 `["none"]`。
- 导出文件通过 Figma/浏览器下载机制保存到用户选择的位置。
- 如用户主动向 GitHub Issues 上传示例或日志，该内容由用户自行提供，并适用 GitHub 的服务政策；请勿包含未授权公开的设计。

Figma 本身的账户、文档同步和平台数据处理适用 Figma 的隐私政策。本说明仅描述本插件的行为。

## English

The plugin processes selected layers and user-supplied animation frames locally inside Figma's plugin sandbox. It has no external network access, hosted backend, analytics, advertising or telemetry. Built-in assets and encoders are bundled offline. Working parameters are held in session memory; exported files are saved through the platform download mechanism. Material a user voluntarily posts to GitHub Issues is governed separately by GitHub's policies.
