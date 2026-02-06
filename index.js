const puppeteer = require('puppeteer');
const { OpenAI } = require('openai');
require('dotenv').config();

// 检查 API Key
if (!process.env.DASHSCOPE_API_KEY || process.env.DASHSCOPE_API_KEY === 'your_dashscope_api_key_here') {
  console.error('❌ 错误: 请在 .env 文件中设置 DASHSCOPE_API_KEY');
  process.exit(1);
}

// 配置 OpenAI SDK 使用阿里云 DashScope (通义千问)
const openai = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1" // 阿里云兼容 OpenAI 接口
});

// macOS 默认 Chrome 路径
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const NAVIGATION_TIMEOUT_MS = Number(process.env.NAVIGATION_TIMEOUT_MS || 90000);

function withUrlProtocol(rawUrl) {
  if (!rawUrl) return rawUrl;
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  return `https://${rawUrl}`;
}

async function analyzeShopifyStore(url) {
  const normalizedUrl = withUrlProtocol(url);
  console.log(`\n🔍 开始分析店铺: ${normalizedUrl}`);
  let browser;

  try {
    // 启动浏览器
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH, 
      headless: 'new',
      defaultViewport: { width: 1280, height: 1080 },
    });

    const page = await browser.newPage();

    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
    page.setDefaultTimeout(NAVIGATION_TIMEOUT_MS);
    
    // 设置 User Agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('📸 正在打开页面并截图...');

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (type === 'media' || type === 'font') return req.abort();
      return req.continue();
    });

    try {
      await page.goto(normalizedUrl, { waitUntil: 'domcontentloaded' });
    } catch (e) {
      throw e;
    }

    try {
      await page.waitForNetworkIdle({ idleTime: 800, timeout: NAVIGATION_TIMEOUT_MS });
    } catch {
      await new Promise(r => setTimeout(r, 1500));
    }
    
    // 截取首屏 (Visual Viewport)
    const screenshotBuffer = await page.screenshot({ 
      encoding: 'base64',
      fullPage: false // 仅截取首屏，模拟用户第一眼看到的
    });

    console.log('🤖 正在调用 Qwen-VL-Max (通义千问) 进行视觉检测...');
    
    const response = await openai.chat.completions.create({
      model: "qwen-vl-max", // 使用通义千问视觉模型
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
    });

    console.log('\n====== 📊 AI 检测报告 (Qwen-VL-Max) ======');
    console.log(response.choices[0].message.content);
    console.log('==========================================\n');

  } catch (error) {
    if (String(error.message).includes('Navigation timeout')) {
      console.error(`❌ 发生错误: 页面打开超时（${NAVIGATION_TIMEOUT_MS}ms）。这通常是网络原因（国外站点在国内可能被阻断/很慢）。`);
      console.error('✅ 建议先用可访问的网站验证：node index.js https://example.com');
      console.error('✅ 如果你有自己的 Shopify 店铺域名/国内可访问的站点，换成它测试。');
      console.error('✅ 也可以把超时调大：在 .env 加一行 NAVIGATION_TIMEOUT_MS=180000');
    } else if (String(error.message).includes('Could not find browser')) {
      console.error('❌ 错误: 未找到 Google Chrome。请确保您已安装 Chrome，或者修改代码中的 CHROME_PATH 路径。');
    } else {
      console.error('❌ 发生错误:', error.message);
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 获取命令行参数中的 URL
const targetUrl = process.argv[2];

if (!targetUrl) {
  console.log('用法: node index.js <url>');
  console.log('示例: node index.js https://allbirds.com');
} else {
  analyzeShopifyStore(targetUrl);
}
