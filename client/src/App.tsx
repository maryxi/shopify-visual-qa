import { useState } from 'react'
import { Search, Loader2, AlertCircle, CheckCircle, Store, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import './App.css' // We will put styles here

interface AnalysisResult {
  success: boolean;
  report?: string;
  screenshot?: string;
  error?: string;
}

function App() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [step, setStep] = useState<string>('') // loading steps

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return

    setLoading(true)
    setResult(null)
    
    // Simulate steps for UX
    setStep('正在启动隐形浏览器...')
    setTimeout(() => setStep('正在访问店铺页面...'), 2000)
    setTimeout(() => setStep('AI 视觉引擎正在截屏...'), 5000)
    setTimeout(() => setStep('Qwen-VL-Max 正在进行全站体检...'), 10000)

    try {
      const response = await axios.post('/api/analyze', { url })
      setResult(response.data)
    } catch (err: any) {
      setResult({
        success: false,
        error: err.response?.data?.error || err.message || '未知错误'
      })
    } finally {
      setLoading(false)
      setStep('')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-800 font-sans selection:bg-blue-100">
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-blue-600">
            <Store className="w-6 h-6" />
            <span>VisualGuard</span>
          </div>
          <button 
            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
          >
            Pricing
          </button>
        </div>
      </header>

      <main className="pt-32 pb-20 px-4">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
              AI 驱动的 Shopify <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">视觉质检员</span>
            </h1>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              别让布局错误赶走你的客户。输入店铺网址，让 AI 模拟真实用户，自动检测并报告视觉 Bug。
            </p>
          </motion.div>

          <motion.form 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleAnalyze} 
            className="relative max-w-xl mx-auto"
          >
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                type="url"
                className="block w-full pl-11 pr-32 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-lg"
                placeholder="输入店铺网址 (例如 https://allbirds.com)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '开始检测'}
              </button>
            </div>
          </motion.form>
        </div>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto text-center py-12"
            >
              <div className="inline-block p-4 bg-white rounded-full shadow-lg mb-6 relative">
                <div className="absolute inset-0 rounded-full border-4 border-blue-100 animate-pulse"></div>
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin relative z-10" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">正在分析中...</h3>
              <p className="text-slate-500">{step}</p>
            </motion.div>
          )}

          {!loading && result && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto"
            >
              {result.success ? (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-green-50/50">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <h2 className="text-xl font-bold text-green-800">检测完成</h2>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-0">
                    {/* 截图区域 */}
                    <div className="p-6 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50 flex flex-col justify-center">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Screen Capture</div>
                      {result.screenshot && (
                        <div className="rounded-lg overflow-hidden shadow-md border border-slate-200 relative group">
                          <img src={result.screenshot} alt="Site Screenshot" className="w-full h-auto" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white font-medium text-sm">View Full Size</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 报告区域 */}
                    <div className="p-6 bg-white">
                       <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">AI Analysis Report</div>
                       <div className="prose prose-blue prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
                         {result.report}
                       </div>

                       <div className="mt-8 pt-6 border-t border-slate-100">
                         <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                           <h4 className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
                             <AlertCircle className="w-4 h-4" />
                             想解锁详情页和购物车页面的检测？
                           </h4>
                           <p className="text-sm text-blue-700 mb-3">升级到 Pro 版，每天自动巡检，发现问题立即短信通知。</p>
                           <button className="text-xs font-bold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 w-full sm:w-auto justify-center whitespace-nowrap shadow-sm">
                             立即升级 $19/mo <ChevronRight className="w-3 h-3 flex-shrink-0" />
                           </button>
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 rounded-2xl p-6 border border-red-100 flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-bold text-red-800 mb-1">分析失败</h3>
                    <p className="text-red-700">{result.error}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Pricing Section */}
        <div id="pricing" className="mt-24 pt-16 border-t border-slate-200 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-slate-600">Start for free, upgrade for peace of mind.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Free Plan */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Hobby</h3>
              <div className="text-3xl font-extrabold text-slate-900 mb-4">$0<span className="text-sm font-normal text-slate-500">/mo</span></div>
              <ul className="space-y-3 mb-8 text-sm text-slate-600">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Daily Homepage Check</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Basic Email Reports</li>
              </ul>
              <button disabled className="w-full py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-400 bg-slate-50 cursor-not-allowed">Current Plan</button>
            </div>

            {/* Pro Plan */}
            <div className="bg-slate-900 p-8 rounded-2xl shadow-xl transform md:-translate-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">POPULAR</div>
              <h3 className="text-lg font-bold text-white mb-2">Pro Guard</h3>
              <div className="text-3xl font-extrabold text-white mb-4">$19<span className="text-sm font-normal text-slate-400">/mo</span></div>
              <ul className="space-y-3 mb-8 text-sm text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-400" /> Full Site Scan (Home, Product, Cart)</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-400" /> Real-time SMS Alerts</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-400" /> Competitor Monitoring</li>
              </ul>
              <button onClick={() => alert('正在跳转到 Shopify 账单页面...')} className="w-full py-2.5 rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/50">Start Free Trial</button>
            </div>

            {/* Business Plan */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Business</h3>
              <div className="text-3xl font-extrabold text-slate-900 mb-4">$49<span className="text-sm font-normal text-slate-500">/mo</span></div>
              <ul className="space-y-3 mb-8 text-sm text-slate-600">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Unlimited Sites</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Priority Support</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Hourly Checks</li>
              </ul>
              <button onClick={() => window.location.href = 'mailto:sales@visualguard.com'} className="w-full py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 transition-colors">Contact Sales</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
