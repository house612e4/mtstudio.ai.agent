import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'হ্যালো বস। MT Studio AI চালু। বলো, আজ কী করবো?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('auto');
  const [isRecording, setIsRecording] = useState(false);
  const chatEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text = input, imageBase64 = null) => {
    if (!text.trim() || loading) return;

    const userMessage = text.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    setLoading(true);

    try {
      const response = await fetch('/.netlify/functions/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          chatHistory: messages,
          model: selectedModel,
          image: imageBase64
        })
      });

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
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].content = 'দুঃখিত বস, কানেকশন সমস্যা। আবার চেষ্টা করো।';
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  // Voice Input
  const toggleVoice = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = e => audioChunksRef.current.push(e.data);
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          // এখানে Speech-to-Text API (Web Speech API) ব্যবহার করা যায়
          const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
          recognition.lang = 'bn-BD';
          recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            handleSend(transcript);
          };
          recognition.start();
        };
        mediaRecorder.start();
        setIsRecording(true);
      });
    }
  };

  // Image Upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      const text = "এই ইমেজটা অ্যানালাইজ করো / এর উপর কাজ করো";
      handleSend(text, base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* Header */}
      <header className="p-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-700 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center font-bold text-xl shadow-lg">MT</div>
          <div>
            <h1 className="font-semibold tracking-tight">MT Studio AI</h1>
            <p className="text-xs text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Mahsin's Clone • Live
            </p>
          </div>
        </div>

        <select 
          value={selectedModel} 
          onChange={e => setSelectedModel(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-violet-500"
        >
          <option value="auto">Auto (Smart Routing)</option>
          <option value="claude">Claude Opus 4.7</option>
          <option value="grok">Grok 4.3</option>
          <option value="gemini">Gemini 3.1 Pro</option>
        </select>
      </header>

      {/* Chat Area */}
      <main className="flex-1 max-w-3xl mx-auto w-full p-4 overflow-y-auto space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-3xl ${msg.role === 'user' 
              ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white' 
              : 'bg-slate-900 border border-slate-700'}`}>
              {msg.content === '' ? (
                <div className="flex gap-1.5 py-2">
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-invert prose-sm max-w-none">
                  {msg.content}
                </ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </main>

      {/* Input Area */}
      <footer className="p-4 bg-slate-950 border-t border-slate-800 sticky bottom-0">
        <div className="max-w-3xl mx-auto flex gap-3">
          <label className="cursor-pointer bg-slate-900 hover:bg-slate-800 p-3 rounded-2xl transition-all">
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            📸
          </label>

          <button 
            onClick={toggleVoice}
            className={`p-3 rounded-2xl transition-all ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-900 hover:bg-slate-800'}`}
          >
            🎤
          </button>

          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="বস, কী করতে হবে বলো..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-3xl px-6 py-4 focus:outline-none focus:border-violet-500"
            disabled={loading}
          />

          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 rounded-3xl font-medium disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;