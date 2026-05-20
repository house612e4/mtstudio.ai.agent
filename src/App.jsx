import React, { useState, useRef, useEffect } from 'react';

const parseMarkdown = (text) => {
  if (!text) return '';
  let html = text;
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/```([\s\S]+?)```/g, '<pre class="bg-slate-950 p-2.5 my-2 rounded-lg border border-slate-800 text-xs font-mono overflow-x-auto select-text">$1</pre>');
  html = html.replace(/`([^`\n]+)`/g, '<code class="bg-slate-950 px-1.5 py-0.5 rounded text-violet-400 font-mono text-xs select-text">$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

function App() {
  const [activeApp, setActiveApp] = useState('chat'); // chat, core_data, system
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'MT Studio AI OS বুট সম্পন্ন হয়েছে। আপনার সমস্ত রিয়েল লাইফ কনটেক্সট মেমোরিতে লোড করা আছে, বলুন মহসিন ভাই কীভাবে সাহায্য করতে পারি?' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    const currentHistory = [...messages];
    setMessages(prev => [...prev, { role: 'user', content: userMessage }, { role: 'assistant', content: '' }]);
    setLoading(true);

    try {
      const response = await fetch(`${window.location.origin}/.netlify/functions/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, chatHistory: currentHistory.slice(-10) })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let unparsedBuffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        unparsedBuffer += decoder.decode(value, { stream: true });
        const lines = unparsedBuffer.split('\n\n');
        unparsedBuffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1].content += parsed.text;
                  return updated;
                });
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finaly {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-100 flex overflow-hidden font-sans">
      
      {/* 🖥️ ওএস ডক সাইডবার */}
      <nav className="w-16 bg-slate-900 border-r border-slate-800/80 flex flex-col items-center py-6 justify-between shrink-0 z-20">
        <div className="flex flex-col space-y-5 items-center w-full">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-blue-600 flex items-center justify-center font-bold text-xs shadow-md shadow-violet-600/10">MT</div>
          <hr className="w-8 border-slate-800" />
          <button onClick={() => setActiveApp('chat')} className={`p-2.5 rounded-xl transition-all ${activeApp === 'chat' ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30' : 'text-slate-400 hover:bg-slate-800'}`} title="AI Console">💬</button>
          <button onClick={() => setActiveApp('core_data')} className={`p-2.5 rounded-xl transition-all ${activeApp === 'core_data' ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30' : 'text-slate-400 hover:bg-slate-800'}`} title="OS Live Memory Matrix">📁</button>
          <button onClick={() => setActiveApp('system')} className={`p-2.5 rounded-xl transition-all ${activeApp === 'system' ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30' : 'text-slate-400 hover:bg-slate-800'}`} title="OS Health Monitor">📊</button>
        </div>
        <div className="text-[10px] font-mono text-slate-600">v1.0.0</div>
      </nav>

      {/* 💻 ওএস মেইন কনসোল */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-slate-900/40 backdrop-blur border-b border-slate-800/60 flex items-center justify-between px-6 z-10">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <h2 className="text-xs font-mono tracking-wider text-slate-300 uppercase">MT_STUDIO_AI_OS // STABLE_PRODUCTION</h2>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">USER: MD MAHSIN</div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          
          {/* অ্যাপ ১: চ্যাট ইন্টারফেস */}
          {activeApp === 'chat' && (
            <div className="h-full flex flex-col justify-between max-w-3xl mx-auto w-full p-4">
              <div className="flex-1 overflow-y-auto space-y-6 pr-1 scrollbar-none">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-3.5 rounded-2xl text-sm leading-relaxed max-w-[85%] shadow-sm relative group ${msg.role === 'user' ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-tr-none' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'}`}>
                      {msg.content === '' ? (
                        <div className="flex space-x-1.5 py-1 items-center">
                          <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      ) : (
                        <>
                          <span className="whitespace-pre-wrap select-text">{parseMarkdown(msg.content)}</span>
                          {msg.role === 'assistant' && (
                            <div className="flex space-x-2 mt-3 pt-2 border-t border-slate-800/60 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { navigator.clipboard.writeText(msg.content); setCopiedIndex(index); setTimeout(() => setCopiedIndex(null), 2000); }} className="bg-slate-800 px-2 py-0.5 rounded text-[11px] border border-slate-700 text-slate-300">
                                {copiedIndex === index ? '✓ কপিকৃত' : '📋 কপি'}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSend} className="flex space-x-2.5 mt-4">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="ওএস কার্নেলে কমান্ড দিন (যেমন: তানিয়া সেজে কথা বলো)..." className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 select-text" disabled={loading} autoFocus />
                <button type="submit" className="bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 rounded-xl text-sm font-medium" disabled={loading || !input.trim()}>▲</button>
              </form>
            </div>
          )}

          {/* অ্যাপ ২: ওএস মেমোরি ম্যাট্রিক্স ভিউয়ার (RAG Data Hub) */}
          {activeApp === 'core_data' && (
            <div className="h-full p-6 max-w-4xl mx-auto overflow-y-auto space-y-5">
              <h3 className="text-sm font-medium text-slate-300 font-mono">📁 OS_EMBEDDED_MEMORY_MATRIX (LIVE CONTEXT)</h3>
              <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4 text-xs font-mono">
                <div><span className="text-violet-400 font-bold">[PROFILE]:</span> Md Mahsin, 34 Years, DOB: 01/01/1992, Born: Noakhali, Lives: Brooklyn, NY.</div>
                <div><span className="text-violet-400 font-bold">[JOBS]:</span> Domino's Pizza & Uber Eats Delivery Expert || Founder of MT Studio.</div>
                <div><span className="text-violet-400 font-bold">[SPOUSE]:</span> Nahida Yeasmin Taniya (Intimate & Free Minded Relationship Enabled).</div>
                <div><span className="text-violet-400 font-bold">[CHILDREN]:</span> Juena (Class 8), Mahir (Class 3), Aliza (Nursery).</div>
                <div><span className="text-violet-400 font-bold">[SIBLINGS]:</span> Alamgir (Bhaicha), Jannatul (Boro Apa), Rabea (Mejo Apa), Fatema (Choto Apa/Mother-figure), Nurul, Late Jahir, Abdur Rahman.</div>
                <div><span className="text-violet-400 font-bold">[NY NETWORK]:</span> Anwar (DC), Bappy (Badsha), Manna (Domino's Mgr), Shohid (Bara), Jisan & Nokiv (Roommates).</div>
                <div className="text-[11px] text-emerald-400 border-t border-slate-800 pt-3">✔ All context nodes are safely baked into the AI OS core kernel. No simulation.</div>
              </div>
            </div>
          )}

          {/* অ্যাপ ৩: সিস্টেম মনিটর */}
          {activeApp === 'system' && (
            <div className="h-full p-6 max-w-2xl mx-auto flex flex-col justify-center items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-emerald-500 flex items-center justify-center text-xl animate-spin" style={{ animationDuration: '8s' }}>⚙</div>
              <div>
                <h4 className="text-sm font-semibold font-mono">MT Studio AI OS Kernel Status</h4>
                <p className="text-xs text-slate-500 font-mono mt-1">Memory Pipeline Connection: Excellent</p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full max-w-sm pt-2 text-left text-xs">
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800"><span className="block text-[10px] text-slate-500">CONTEXT SYNC</span><span className="text-emerald-400">● 100% EMBEDDED</span></div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800"><span className="block text-[10px] text-slate-500">WHATSAPP WEBHOOK</span><span className="text-slate-400">● READY FOR PLUGIN</span></div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800"><span className="block text-[10px] text-slate-500">AI CORE ENGINE</span><span className="text-violet-400">Groq Llama-3.3-70b</span></div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800"><span className="block text-[10px] text-slate-500">SYSTEM RESPONSE</span><span className="text-sky-400">Real-Time Stream</span></div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;