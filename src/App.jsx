import React, { useState, useRef, useEffect } from 'react';

function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'হ্যালো! আমি MT Studio AI Agent। মোঃ মহসিন সাহেবের অনলাইন ওয়ার্কফ্লো এবং ডেভেলপমেন্ট অ্যাসিস্ট্যান্ট হিসেবে আপনাকে সাহায্য করতে প্রস্তুত। বলুন, আজ কীভাবে সাহায্য করতে পারি?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // স্মুথ স্ক্রলিং লজিক
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    
    // ইউজারের মেসেজ স্ক্রিনে দেখানো
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    // স্ট্রিমিং মেসেজের জন্য একটা খালি অ্যাসিস্ট্যান্ট বাবল তৈরি করা
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/.netlify/functions/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          // মেমরির জন্য শেষ ১০টি চ্যাট পাঠানো হচ্ছে
          chatHistory: messages.slice(-10)
        })
      });

      if (!response.ok) throw new Error("Network response was not ok");

      // SSE রিয়েল-টাইম স্ট্রিম রিডার (Advanced ReadableStream Reader)
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        
        // শেষ ইনকমপ্লিট লাইনটি বাফারে রেখে বাকিগুলো প্রসেস করা
        buffer = lines.pop(); 

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            
            if (dataStr === '[DONE]') break;
            
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                // স্ট্রিমিং শব্দগুলো আগের টেক্সটের সাথে রিয়েল-টাইমে জোড়া লাগানো
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  lastMsg.content += parsed.text;
                  return updated;
                });
              }
            } catch (e) {
              console.error("Error parsing SSE chunk", e);
            }
          }
        }
      }
    } catch (error) {
      // নেটওয়ার্ক ফেইলুর হলে প্রফেশনাল ফলব্যাক মেসেজ
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].content = 'দুঃখিত বস, কানেকশনে কিছুটা সমস্যা হচ্ছে। অনুগ্রহ করে আপনার নেটওয়ার্ক চেক করে আবার চেষ্টা করুন।';
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans antialiased selection:bg-violet-500/30">
      {/* প্রিমিয়াম গ্লাসমরফিক হেডার */}
      <header className="p-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/60 sticky top-0 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-blue-600 flex items-center justify-center font-bold shadow-lg shadow-violet-600/20">MT</div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">MT Studio AI Agent</h1>
            <p className="text-[10px] text-emerald-400 flex items-center mt-0.5 font-medium">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block mr-1.5 animate-pulse"></span>Claude 3.5 Sonnet Active
            </p>
          </div>
        </div>
      </header>

      {/* চ্যাট এরিয়া */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 overflow-y-auto space-y-6 scrollbar-thin">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`p-3.5 rounded-2xl text-sm leading-relaxed max-w-[88%] shadow-sm ${
              msg.role === 'user' 
                ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-tr-none' 
                : 'bg-slate-900 border border-slate-800/80 text-slate-200 rounded-tl-none'
            }`}>
              {/* টেক্সট যদি খালি থাকে (স্ট্রিমিং শুরুর আগে) তবে ডট অ্যানিমেশন দেখাবে */}
              {msg.content === '' ? (
                <div className="flex space-x-1 py-1 items-center">
                  <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </main>

      {/* প্রিমিয়াম ইনপুট ফুটার */}
      <footer className="p-4 bg-slate-950/80 backdrop-blur-md border-t border-slate-900 sticky bottom-0">
        <form onSubmit={handleSend} className="max-w-2xl mx-auto flex space-x-2.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="আপনার কাজের নির্দেশটি এখানে লিখুন..."
            className="flex-1 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all disabled:opacity-60"
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 px-5 py-3 rounded-xl text-sm font-medium transition-all shadow-md shadow-violet-600/10 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            disabled={loading || !input.trim()}
          >
            পাঠান
          </button>
        </form>
      </footer>
    </div>
  );
}

export default App;