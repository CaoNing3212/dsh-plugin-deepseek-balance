# dsh-plugin-deepseek-balance

在 Web 界面输入框下方的会话统计行(**「2 轮 · 110 步 | LLM …」**那行)**前面**显示 DeepSeek 官方账户余额的小插件,例如:`余额：¥69.94`。点击可刷新。

只在使用 **DeepSeek 官方接口**(`https://api.deepseek.com`)且已配置 API key 时显示;代理/网关、未配 key、查询失败时自动隐藏。

- **主机半**(`lib/index.js`):挂载 `GET /dsh-balance`,通过平台凭据服务读取 `DEEPSEEK_API_KEY`(设置 → 模型 页面写入的那个),调用官方 `/user/balance`。完全自包含,不依赖任何平台补丁。
- **客户端半**(`lib/client.js`):向 `conversation.composer.dock` 插槽注册 `order: -1` 的条目,排在自带的 `stats`(order 0)前面。

## 安装(任意电脑)

方式 A —— 用 dsh 插件命令(需要 pnpm):

```bash
dsh plugin --profile web add <本插件文件夹的绝对路径>
# 重启 dsh web,浏览器刷新页面
```

方式 B —— 手动(无需 pnpm):

1. 把整个 `dsh-plugin-deepseek-balance` 文件夹复制到 `%USERPROFILE%\.dsh\profiles\node_modules\` 下
2. 编辑 `%USERPROFILE%\.dsh\profiles\web\package.json`:
   - `dependencies` 加入 `"dsh-plugin-deepseek-balance": "1.0.0"`
   - `dsh.profile.bundles` 数组追加 `"dsh-plugin-deepseek-balance"`
3. 重启 `dsh web`,浏览器刷新页面

## 卸载

方式 A:`dsh plugin --profile web remove dsh-plugin-deepseek-balance`
方式 B:手动删除上面登记的依赖、bundles 条目和 `node_modules` 里的文件夹,然后重启。

## 要求

- DSH web 0.1.0-rc.6(其他版本理论兼容,插槽名 `conversation.composer.dock` 需存在)
- 已配置 DeepSeek 官方 API key(设置 → 模型,或环境变量 `DEEPSEEK_API_KEY`)
