const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const { OpenAI } = require('openai');
const path = require('path'); // 引入 path 模块
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// 【新增】托管前端静态文件
// 生产环境下，client/dist 目录下的文件将被作为静态资源服务
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/dist')));
}

// 检查 API Key
if (!process.env.DASHSCOPE_API_KEY) {
  console.error('❌ 错误: 请在 .env 文件中设置 DASHSCOPE_API_KEY');
  process.exit(1);
}

// 配置 OpenAI SDK 使用阿里云 DashScope (通义千问)
const openai = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1" 
});

// 浏览器路径配置：本地开发用 Chrome，云端部署用 Puppeteer 自带的
const CHROME_PATH = process.env.NODE_ENV === 'production' 
  ? undefined 
  : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const NAVIGATION_TIMEOUT_MS = Number(process.env.NAVIGATION_TIMEOUT_MS || 90000);

function withUrlProtocol(rawUrl) {
  if (!rawUrl) return rawUrl;
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  return `https://${rawUrl}`;
}

async function analyzeStore(url) {
  const normalizedUrl = withUrlProtocol(url);
  console.log(`\n🔍 开始分析店铺: ${normalizedUrl}`);
  let browser;

  try {
    // 启动浏览器
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'], // 部署到服务器必须加这个
      defaultViewport: { width: 1280, height: 1080 },
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
    page.setDefaultTimeout(NAVIGATION_TIMEOUT_MS);
    
    // 设置 User Agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 拦截不必要的资源
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (type === 'media' || type === 'font') return req.abort();
      return req.continue();
    });

    console.log('📸 正在打开页面...');
    try {
      await page.goto(normalizedUrl, { waitUntil: 'domcontentloaded' });
    } catch (e) {
      throw new Error(`页面加载超时或失败: ${e.message}`);
    }

    try {
      await page.waitForNetworkIdle({ idleTime: 800, timeout: NAVIGATION_TIMEOUT_MS });
    } catch {
      await new Promise(r => setTimeout(r, 1500)); // 兜底等待
    }
    
    // 截取首屏
    const screenshotBuffer = await page.screenshot({ 
      encoding: 'base64',
      fullPage: false 
    });

    console.log('🤖 正在调用 Qwen-VL-Max...');
    
    // 增加一个 120秒 的超时控制，防止无限等待
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120秒

    try {
      const response = await openai.chat.completions.create({
        model: "qwen-vl-max",
        messages: [
          {
            role: "system",
            content: `你是一个专业的 Shopify UI/UX 视觉测试专家。你的任务是像人类用户一样检查网页截图。
请检查以下问题：
1. 布局错乱：是否有文字重叠、图片覆盖、按钮被遮挡？
2. 资源加载：是否有明显的图片破损图标？
3. 关键元素：由于这是电商网站，"Add to Cart" 或 "Buy Now" 按钮是否清晰可见且未被遮挡？
4. 弹窗干扰：是否有无法关闭的弹窗遮挡了主要内容？

请简明扼要地输出检测报告。如果一切正常，请回复 "✅ 视觉检测通过：未发现明显布局问题"。如果有问题，请用列表形式列出。`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "这是该 Shopify 店铺的首页截图，请进行视觉检查：" },
              {
                type: "image_url",
                image_url: {
                  "url": `data:image/png;base64,${screenshotBuffer}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }, { signal: controller.signal }); // 传入 signal

      clearTimeout(timeoutId); // 成功则清除定时器

      return {
        success: true,
        report: response.choices[0].message.content,
        screenshot: `data:image/png;base64,${screenshotBuffer}`
      };
    } catch (apiError) {
      clearTimeout(timeoutId);
      if (apiError.name === 'AbortError') {
        throw new Error('调用 Qwen API 超时 (120s)，请检查网络或稍后重试。');
      }
      throw apiError;
    }

  } catch (error) {
    console.error('❌ 分析失败:', error.message);
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// API 路由
app.post('/api/analyze', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ success: false, error: '缺少 URL 参数' });
  }

  const result = await analyzeStore(url);
  res.json(result);
});

// 【新增】处理所有未匹配的路由，返回前端的 index.html
// 这样可以支持 React Router (如果有的话)，并且让访问根路径时显示页面
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist', 'index.html'));
  });
} else {
  // 本地开发时的提示
  app.get('/', (req, res) => {
    res.send('Shopify Visual QA API is running 🚀 (Frontend runs separately in dev)');
  });
}

// 启动服务
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
