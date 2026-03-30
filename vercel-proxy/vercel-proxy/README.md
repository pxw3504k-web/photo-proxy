# 证件照管理后台 - Vercel 部署指南

## 概述

本项目将 `admin-panel.html`（证件照管理后台）部署到 Vercel，实现：
- 直接通过 Vercel 域名访问管理后台
- 支持上传处理后的证件照和 ZIP 文件
- 点击发货后，前端和小程序端订单状态同步更新
- 自动发送邮件通知用户
- 自动发送飞书通知给管理员

## 目录结构

```
vercel-proxy/
├── vercel.json          # Vercel 配置文件
├── admin-panel.html     # 管理后台网页
└── api/
    └── proxy.js         # API 代理函数（处理跨域和大文件上传）
```

## 部署步骤

### 1. 配置微信云开发

确保以下云函数已部署并开启云接入：

1. **adminGetOrders** - 获取订单列表
2. **adminShip** - 发货（更新状态 + 发邮件）
3. **uploadProcessedPhoto** - 上传处理后照片
4. **sendProcessedPhoto** - 重发邮件（可选）

在微信开发者工具中：
- 右键云函数 → 上传并部署
- 进入云开发控制台 → 更多 → 云接入
- 添加 HTTP 访问路径（如 `/admin`）
- 记录完整的云接入 URL

### 2. 部署到 Vercel

#### 方式一：使用 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 进入目录
cd vercel-proxy

# 登录（如果需要）
vercel login

# 部署
vercel

# 设置环境变量
vercel env add WECHAT_CLOUD_URL
# 输入你的微信云接入 URL，如：
# https://cloud1-xxxx.tcloudbaseapp.com/admin

# 再次部署使环境变量生效
vercel --prod
```

#### 方式二：使用 GitHub 集成

1. 将 `vercel-proxy` 目录推送到 GitHub
2. 登录 [Vercel](https://vercel.com)
3. 点击 "New Project"
4. 导入 GitHub 仓库
5. 配置环境变量：
   - 变量名：`WECHAT_CLOUD_URL`
   - 变量值：`https://cloud1-xxxx.tcloudbaseapp.com/admin`（你的云接入 URL）
6. 点击 "Deploy"

### 3. 配置环境变量

在 Vercel 项目设置中添加：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `WECHAT_CLOUD_URL` | 微信云接入基础 URL | `https://cloud1-xxxx.tcloudbaseapp.com/admin` |

### 4. 验证部署

部署成功后，访问 `https://your-project.vercel.app`

- 如果环境变量已配置，后台会自动加载订单数据
- 如果未配置，会显示设置向导提示配置

## 功能说明

### 发货流程

1. 点击订单卡片上的「处理并发货」或「发货」按钮
2. 上传处理后的证件照（JPG/PNG）
3. （可选）上传包含高清照片的 ZIP 压缩包
4. 点击「确认发货」

系统会自动：
- 将照片上传到微信云存储
- 更新订单状态为「已完成」
- 发送邮件给用户（含照片附件）
- 发送飞书通知给管理员

### 订单状态同步

- 前端：点击发货后，页面自动刷新，状态变为「已完成」
- 小程序端：用户可在「我的订单」中查看更新后的状态

## API 代理说明

`api/proxy.js` 提供统一的 API 代理：

- **POST /api/proxy** - 代理微信云函数调用
  ```json
  {
    "functionName": "adminGetOrders",
    "params": {}
  }
  ```
- **GET /api/status** - 健康检查

### 支持的云函数

| 函数名 | 功能 |
|--------|------|
| `adminGetOrders` | 获取订单列表 |
| `adminShip` | 发货 |
| `uploadProcessedPhoto` | 上传照片 |
| `sendProcessedPhoto` | 重发邮件 |

## 常见问题

### 1. 部署后无法加载订单

检查：
- 环境变量 `WECHAT_CLOUD_URL` 是否正确配置
- 微信云函数的云接入是否已开启
- 云函数是否已正确部署

### 2. 上传照片失败

检查：
- 照片格式是否为 JPG/PNG
- 照片大小是否超过限制（Vercel 模式：4.5MB）

### 3. 发货后状态没更新

检查：
- 微信云函数日志是否有错误
- 云数据库是否有写入权限

## 技术细节

### 跨域处理

- Vercel 函数天然支持 CORS
- 所有请求通过 `/api/proxy` 代理到微信云开发

### 文件上传

- 前端将文件转为 base64
- 通过 Vercel 函数代理转发到微信云存储
- Vercel 函数支持最大 4.5MB 请求体

### 安全说明

- 所有敏感配置通过环境变量管理
- 不在代码中硬编码云接入 URL
- 使用 Vercel 原生 CORS 头

## 本地开发

```bash
# 进入目录
cd vercel-proxy

# 本地预览
vercel dev

# 手动设置环境变量测试
WECHAT_CLOUD_URL=https://your-url.vercel.app/admin vercel dev
```

## 更新日志

### v1.1.0
- 支持 Vercel Serverless Function 代理
- 无需第三方 CORS 代理
- 支持更大文件上传（4.5MB）

### v1.0.0
- 初始版本，支持基础发货功能
