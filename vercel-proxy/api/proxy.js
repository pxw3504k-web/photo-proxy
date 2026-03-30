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

// 云接入基础地址（从环境变量读取）
const CLOUD_BASE_URL = process.env.WECHAT_CLOUD_URL || '';

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Max-Age': '86400',
};

// OPTIONS 预检请求
function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// 构建云函数请求 URL
function getCloudFunctionUrl(functionName) {
  if (!CLOUD_BASE_URL) {
    throw new Error('未配置 WECHAT_CLOUD_URL 环境变量');
  }
  // 确保 URL 格式正确
  const baseUrl = CLOUD_BASE_URL.replace(/\/$/, '');
  return `${baseUrl}/${functionName}`;
}

// 统一响应格式
function makeResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

// 主入口 - POST 代理请求
export async function POST(request) {
  try {
    const body = await request.json();
    const { functionName, params } = body;

    if (!functionName) {
      return makeResponse({ code: 1, msg: '缺少 functionName 参数' }, 400);
    }

    const targetUrl = getCloudFunctionUrl(functionName);
    console.log(`[代理请求] ${functionName} -> ${targetUrl}`);

    // 转发请求到微信云开发
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(params || {}),
    });

    // 获取响应内容
    const responseText = await response.text();
    console.log(`[代理响应] ${functionName} <- ${response.status}`);

    // 尝试解析 JSON
    try {
      const data = JSON.parse(responseText);
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    } catch {
      // 如果不是 JSON，直接返回文本
      return new Response(responseText, {
        status: response.status,
        headers: {
          'Content-Type': 'text/plain',
          ...corsHeaders,
        },
      });
    }

  } catch (error) {
    console.error('[代理错误]', error);
    return makeResponse({
      code: 500,
      msg: error.message || '服务器错误'
    }, 500);
  }
}

// GET 健康检查
export async function GET(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/status') {
    return makeResponse({
      code: 0,
      msg: '服务正常',
      cloudUrl: CLOUD_BASE_URL ? '已配置' : '未配置',
      timestamp: new Date().toISOString(),
    });
  }

  return makeResponse({ code: 404, msg: '未找到' }, 404);
}

// OPTIONS 预检请求
export async function OPTIONS() {
  return handleOptions();
}
