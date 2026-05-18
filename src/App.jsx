import React, { useState, useRef, useEffect } from 'react';

function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'কী অবস্থা ভাই? আমি মোঃ মহসিন সাহেবের ডিজিটাল ক্লোন — MT Studio AI। কাজের কথা বলো, আজ কোন প্রজেক্ট ওড়াতে হবে?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ব্রাউজার স্পীচ লজিক (ভয়েস আউটপুট)
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'bn-BD';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } else {
      console.error("ভয়েস সিন্থেসিস এই ব্রাউজারে সাপোর্ট করছে না।");
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    loading(true);
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch(`${window.location.origin}/.netlify/functions/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          chatHistory: messages.slice(-10)
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); 

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') break;
            
            try {
              const parsed = JSON.parse(dataStr);
              // নেটলিফাই গেটওয়ের স্ট্যান্ডার্ড রেসপন্স ফরম্যাট (choices[0].delta.content) হ্যান্ডেল করা
              const textChunk = parsed.text || (parsed.choices?.[0]?.delta?.content) || '';
              
              if (textChunk) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  lastMsg.content += textChunk;
                  return updated;
                });
              }
            } catch (e) {
              // যদি ডিরেক্ট র স্ট্রিং আসে, সেটার ব্যাকআপ হ্যান্ডলিং
              if (dataStr && !dataStr.startsWith('{')) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  lastMsg.content += dataStr;
                  return updated;
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].content = `ঝামেলা হইছে বস। এরর ডিটেইল: ${error.message}। নেটলিফাই ড্যাশবোর্ডে ফাংশনটা প্রপারলি একটিভ আছে কি না চেক করুন।`;
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans antialiased selection:bg-violet-500/30">
      {/* হেডার */}
      <header className="p-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/60 sticky top-0 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-blue-600 flex items-center justify-center font-bold shadow-lg shadow-violet-600/20">MT</div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">MT Studio AI Agent</h1>
            <p className="text-[10px] text-emerald-400 flex items-center mt-0.5 font-medium">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block mr-1.5 animate-pulse"></span>MT Engine Active
            </p>
          </div>
        </div>
      </header>

      {/* চ্যাট এরিয়া */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 overflow-y-auto space-y-6 scrollbar-thin">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`p-3.5 rounded-2xl text-sm leading-relaxed max-w-[88%] shadow-sm relative group ${
              msg.role === 'user' 
                ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-tr-none' 
                : 'bg-slate-900 border border-slate-800/80 text-slate-200 rounded-tl-none'
            }`}>
              {msg.content === '' ? (
                <div className="flex space-x-1 py-1 items-center">
                  <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              ) : (
                <>
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                  {msg.role === 'assistant' && (
                    <button 
                      onClick={() => speakText(msg.content)}
                      className="absolute -bottom-5 right-2 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1 rounded-md text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 border border-slate-700"
                    >
                      <span>🔊 শুনুন</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </main>

      {/* ইনপুট */}
      <footer className="p-4 bg-slate-950/80 backdrop-blur-md border-t border-slate-900 sticky bottom-0">
        <form onSubmit={handleSend} className="max-w-2xl mx-auto flex space-x-2.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="আপনার কাজের নির্দেশটি এখানে লিখুন..."
            className="flex-1 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 px-5 py-3 rounded-xl text-sm font-medium transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            disabled={loading || !input.trim()}
          >
            ▲
          </button>
        </form>
      </footer>
    </div>
  );
}

export default App;