import React, { useState, useRef, useEffect } from 'react';

const parseMarkdown = (text) => {
  if (!text) return '';
  let html = text;
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/```([\s\S]+?)```/g, '<pre class="bg-slate-900 p-3 my-2 rounded-xl border border-slate-800 text-xs font-mono overflow-x-auto select-text">$1</pre>');
  html = html.replace(/`([^`\n]+)`/g, '<code class="bg-slate-900 px-1.5 py-0.5 rounded text-violet-400 font-mono text-xs select-text">$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

function App() {
  const [messages, setMessages] = useState([]); // শুরুতে সম্পূর্ণ ব্ল্যাঙ্ক থাকবে
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
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
        body: JSON.stringify({ 
  message: userMessage, 
  chatHistory: ..., 
  model: "Nexos GPT 5 2"     // অথবা অন্য মডেল
})

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans">
      
      {/* 👤 ক্লিন ফেসবুক প্রোফাইল হেডার */}
      <header className="h-16 bg-slate-900/80 backdrop-blur border-b border-slate-800/60 flex items-center justify-between px-5 z-10 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-sm border border-violet-500/40 text-white shadow-sm">
            MM
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Md Mahsin</h2>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[11px] text-slate-400 font-medium">Active Now</span>
            </div>
          </div>
        </div>
        <div className="text-[10px] font-mono text-slate-500 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
          MT Studio
        </div>
      </header>

      {/* 💬 ফুল স্ক্রিন মেসেঞ্জার উইন্ডো */}
      <div className="flex-1 overflow-hidden relative flex flex-col justify-between max-w-2xl mx-auto w-full px-4 pt-4 pb-6">
        
        {/* চ্যাট বক্স */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-none">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-20 select-none">
              <div className="text-5xl mb-3">💬</div>
              <p className="text-xs font-medium tracking-wide">Md Mahsin-এর সাথে চ্যাট শুরু করতে নিচে মেসেজ লিখুন।</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3.5 rounded-2xl text-[14px] leading-relaxed max-w-[88%] shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-violet-600 text-white rounded-tr-none font-medium' 
                    : 'bg-slate-900 border border-slate-800/60 text-slate-200 rounded-tl-none'
                }`}>
                  {msg.content === '' ? (
                    <div className="flex space-x-1.5 py-1.5 px-1 items-center">
                      <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap select-text">{parseMarkdown(msg.content)}</span>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* ⌨ ইনপুট এরিয়া */}
        <form onSubmit={handleSend} className="flex space-x-2.5 mt-4 shrink-0">
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="মেসেজ লিখুন..." 
            className="flex-1 bg-slate-900 border border-slate-800/80 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 text-slate-100 placeholder-slate-500 select-text transition-colors" 
            disabled={loading} 
            autoFocus 
          />
          <button 
            type="submit" 
            className="bg-violet-600 hover:bg-violet-500 active:scale-95 px-5 py-3 rounded-2xl text-white text-xs font-bold tracking-wider uppercase transition-all disabled:opacity-40 disabled:scale-100 shrink-0" 
            disabled={loading || !input.trim()}
          >
            Send
          </button>
        </form>

      </div>
    </div>
  );
}

export default App;