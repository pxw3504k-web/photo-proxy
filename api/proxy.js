/**
 * Vercel Serverless Function - 微信云开发 API 代理
 *
 * 功能：
 * 1. 代理所有请求到微信云开发云接入地址
 * 2. 处理 CORS 跨域问题
 * 3. 支持大文件上传（无 CORS 代理的大小限制）
 * 4. 统一错误处理和日志
 *
 * 访问方式：
 * - POST /api/proxy   - 代理所有云函数
 * - GET  /api/status  - 健康检查
 */

module.exports = async (req, res) => {
  // CORS 头
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'content-type, authorization',
  };

  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    return res.status(204).send('');
  }

  // GET 请求 - 健康检查
  if (req.method === 'GET' && req.url === '/api/status') {
    const cloudUrl = process.env.WECHAT_CLOUD_URL;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
      code: 0,
      msg: '服务正常',
      cloudUrl: cloudUrl ? '已配置' : '未配置',
      timestamp: new Date().toISOString(),
    });
  }

  // POST 请求 - 代理云函数
  if (req.method === 'POST') {
    try {
      const { functionName, params } = req.body || {};
      const cloudUrl = process.env.WECHAT_CLOUD_URL;

      if (!cloudUrl) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(500).json({
          code: 500,
          msg: '未配置 WECHAT_CLOUD_URL 环境变量，请到 Vercel 控制台设置',
        });
      }

      if (!functionName) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(400).json({ code: 1, msg: '缺少 functionName 参数' });
      }

      // 构建目标 URL
      const baseUrl = cloudUrl.replace(/\/$/, '');
      const targetUrl = `${baseUrl}/${functionName}`;

      console.log(`[代理请求] ${functionName} -> ${targetUrl}`);

      // 使用 Node.js 原生 https 模块转发请求
      const https = require('https');
      const { URL } = require('url');

      const urlObj = new URL(targetUrl);
      const postData = JSON.stringify(params || {});

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      // 使用 Promise 封装 https 请求
      const responseData = await new Promise((resolve, reject) => {
        const request = https.request(options, (response) => {
          let data = '';
          response.on('data', chunk => { data += chunk; });
          response.on('end', () => resolve(data));
        });

        request.on('error', reject);
        request.write(postData);
        request.end();
      });

      console.log(`[代理响应] ${functionName} <- 200`);

      // 返回响应
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');

      try {
        const jsonData = JSON.parse(responseData);
        return res.status(200).json(jsonData);
      } catch {
        return res.status(200).send(responseData);
      }

    } catch (error) {
      console.error('[代理错误]', error.message);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(500).json({
        code: 500,
        msg: error.message || '服务器错误',
      });
    }
  }

  // 404
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(404).json({ code: 404, msg: '未找到' });
};
