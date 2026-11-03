# Privacy / 隐私说明

figma动效预设-SVGA在 Figma 插件沙箱中本地处理动效，不使用自建服务器。

- 仅为预览和导出读取用户选择的图层；读取自定义序列帧时处理用户主动选择的各帧。
- 画面参数和素材保存在本次插件会话内存中。关闭插件后不会通过本插件保存到远端。
- 不收集账户资料、行为分析、遥测、广告标识或素材内容。
- 不向第三方上传 Figma 文档、图片或导出结果。
- 24 个预设序列帧的缩略图内置；点击素材时，从公开 GitHub 仓库的固定提交下载原始 WebP 图集，校验 SHA-256 后在本地预览。已加载图集在本次会话内存中复用。
- 仅允许访问 `https://raw.githubusercontent.com`。静态素材请求不包含账号凭据、来源网址、Figma 文档或图片；GitHub/CDN 仍会接收到常规请求信息，例如 IP 地址和所请求素材的 URL。
- 基础动效、GIF 编码库和 WebP 编码器随插件分发。动效合成与导出在本地运行；首次使用某个预设序列帧需要网络，自定义 PNG/Figma 帧不需要该下载。
- 导出文件通过 Figma/浏览器下载机制保存到用户选择的位置。
- 如用户主动向 GitHub Issues 上传示例或日志，该内容由用户自行提供，并适用 GitHub 的服务政策；请勿包含未授权公开的设计。

Figma 本身的账户、文档同步和平台数据处理适用 Figma 的隐私政策。本说明仅描述本插件的行为。

## English

The plugin processes selected layers and user-supplied animation frames locally inside Figma's plugin sandbox. It has no hosted backend, analytics, advertising or telemetry. Selecting a preset sequence downloads its original CC0 WebP sheet from a fixed public GitHub commit at raw.githubusercontent.com and verifies its SHA-256. Requests omit credentials and referrers and contain no user artwork, document contents or export data; GitHub/CDN receives normal request information such as the IP address and requested asset URL. Posters and export encoders are bundled. Loaded sheets and working parameters are held in session memory; exported files are saved through the platform download mechanism. Material a user voluntarily posts to GitHub Issues is governed separately by GitHub's policies.
