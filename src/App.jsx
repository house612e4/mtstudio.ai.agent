import React, { useState, useRef, useEffect } from 'react';

function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'হ্যালো! আমি মোঃ মহসিন সাহেবের এআই অ্যাসিস্ট্যান্ট। কীভাবে আপনাকে সাহায্য করতে পারি?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // চ্যাট বক্সে নতুন মেসেজ আসলে অটো স্ক্রল ডাউন হবে
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // নেটলিফাই ফাংশন কল করার অফিশিয়াল রিঅ্যাক্ট মেথড
      const response = await fetch('/.netlify/functions/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          // এআই মেমরির জন্য শুধুমাত্র শেষ ১০টি মেসেজ পাঠানো হচ্ছে
          chatHistory: messages.slice(-10).map(msg => ({ role: msg.role, content: msg.content }))
        })
      });

      const data = await response.json();

      if (response.ok && data.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'দুঃখিত, এই মুহূর্তে সার্ভারে সমস্যা হচ্ছে।' }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'নেটওয়ার্ক ত্রুটি! অনুগ্রহ করে আবার চেষ্টা করুন।' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between font-sans">
      <header className="p-4 bg-slate-800 border-b border-slate-700 sticky top-0 flex items-center space-x-3">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold">MT</div>
        <div>
          <h1 className="text-sm font-semibold">MT Studio AI Agent</h1>
          <p className="text-xs text-green-400 flex items-center">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block mr-1 animate-pulse"></span>অনলাইন
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-lg text-sm max-w-[85%] ${
              msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-400 p-3 rounded-lg text-xs animate-pulse">
              এজেন্ট টাইপ করছে...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      <footer className="p-4 bg-slate-800 border-t border-slate-700 sticky bottom-0">
        <form onSubmit={handleSend} className="max-w-2xl mx-auto flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="আপনার প্রশ্নটি লিখুন..."
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:bg-slate-600"
            disabled={loading}
          >
            পাঠান
          </button>
        </form>
      </footer>
    </div>
  );
}

export default App;
