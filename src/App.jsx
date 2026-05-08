import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

const MEMBERS = [
  { name: "জাকির", img: "/jakir.jpeg", phone: "০১৭০০-০০০০০১" },
  { name: "ফখরুল", img: "/fokrul.jpeg", phone: "০১৮০০-০০০০০২" },
  { name: "রকিব", img: "/rokib.jpeg", phone: "০১৯০০-০০০০০৩" },
  { name: "মহসিন", img: "/mahsin.jpeg", phone: "০১৬০০-০০০০০৪" },
  { name: "জিসান", img: "/jisan.jpeg", phone: "০১৫০০-০০০০০৫" },
  { name: "নোকিব", img: "/noqib.jpeg", phone: "০১৩০০-০০০০০৬" },
];

const RENT = 1850;
const LOGIN_PIN = "7307";
const EDIT_PIN = "8019";

const rules = [
  "কিচেন রুম ও গলি ঝাড়ু ও মোব দিতে হবে",
  "চুলার উপরে-নিচে পরিষ্কার করতে হবে",
  "ফ্রিজ ভিতরে-বাহিরে পরিষ্কার করতে হবে",
  "ডাইনিং টেবিল পরিষ্কার করতে হবে",
  "সিঙ্ক পরিষ্কার করতে হবে",
  "কিচেন ওয়াল মুছতে হবে",
  "বাথরুম, বাথরুমের ওয়াল, বাথটাব ও বেসিন পরিষ্কার করতে হবে",
  "রাত ১০টার আগে ময়লার ব্যাগ পরিবর্তন",
];

const getSchedule = () => {
  return MEMBERS.map((m, i) => ({
    name: m.name,
    date: `${i * 5 + 1} - ${i * 5 + 5}`,
  }));
};

const BANGLA_MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];

const toBanglaDigit = (num) => {
  const digits = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
  return num.toString().replace(/[0-9]/g, x => digits[x]);
};

export default function App() {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [activeView, setActiveView] = useState("home");
  const [isEditing, setIsEditing] = useState(false);

  const currentDate = new Date();
  const [monthIndex, setMonthIndex] = useState(currentDate.getMonth());
  const [year, setYear] = useState(currentDate.getFullYear());

  const [electric, setElectric] = useState(0);
  const [gas, setGas] = useState(0);
  const [extra, setExtra] = useState(0);

  useEffect(() => {
    const docId = `house_${year}_${monthIndex}`;
    const ref = doc(db, "house", docId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setElectric(d.electric || 0);
        setGas(d.gas || 0);
        setExtra(d.extra || 0);
      } else {
        setElectric(0);
        setGas(0);
        setExtra(0);
      }
    });
    return () => unsub();
  }, [monthIndex, year]);

  const saveData = async () => {
    const docId = `house_${year}_${monthIndex}`;
    await setDoc(doc(db, "house", docId), { electric, gas, extra });
    setIsEditing(false);
  };

  const handleLogin = () => {
    if (pin === LOGIN_PIN) {
      setShowSplash(true);
      setTimeout(() => {
        setShowSplash(false);
        setUnlocked(true);
      }, 9000);
    } else if (pin === EDIT_PIN) {
      setUnlocked(true);
      setIsEditing(true);
    }
  };

  const changeMonth = (offset) => {
    let newMonth = monthIndex + offset;
    let newYear = year;
    if (newMonth > 11) { newMonth = 0; newYear++; }
    else if (newMonth < 0) { newMonth = 11; newYear--; }
    setMonthIndex(newMonth);
    setYear(newYear);
  };

  const checkEditAccess = () => {
    const pass = prompt("এডিট পিন দিন:");
    if (pass === EDIT_PIN) setIsEditing(true);
    else alert("ভুল পিন!");
  };

  if (showSplash) {
    return <video src="/splash_video.mp4" autoPlay playsInline className="w-full h-screen object-cover bg-[#050B14]" />;
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050B14] px-5 relative overflow-hidden">
        {/* Background glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-teal-500/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px]"></div>
        
        <div className="bg-slate-900/60 p-8 rounded-[2rem] border border-slate-700/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-sm backdrop-blur-2xl text-center relative z-10">
          <h1 className="text-4xl mb-3 drop-shadow-lg">🏠</h1>
          <h2 className="text-2xl font-bold text-white mb-8 tracking-wide drop-shadow-md">৬১২ বাসা ম্যানেজমেন্ট</h2>
          <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full p-4 bg-black/40 border border-slate-600 rounded-2xl text-center text-2xl text-white tracking-[0.5em] mb-6 outline-none focus:border-teal-400/50 transition-colors shadow-inner" placeholder="PIN" />
          <button onClick={handleLogin} className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-bold py-4 rounded-2xl shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all text-lg">লগইন</button>
        </div>
      </div>
    );
  }

  const total = RENT + electric + gas + extra;
  const perPerson = total / MEMBERS.length;

  const renderHome = () => (
    <div className="space-y-6 animate-fade-in relative z-10">
      
      {/* Month Card */}
      <div className="bg-slate-800/40 backdrop-blur-xl rounded-[2rem] p-6 border border-slate-700/50 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
        <div className="flex justify-between items-center bg-black/30 rounded-2xl p-4 border border-slate-700/50 mb-6 shadow-inner">
          <button onClick={() => changeMonth(-1)} className="text-slate-400 hover:text-white text-2xl px-3 transition-colors">&lt;</button>
          <h2 className="text-2xl font-bold text-white tracking-wide drop-shadow-md">{BANGLA_MONTHS[monthIndex]} - {toBanglaDigit(year)}</h2>
          <button onClick={() => changeMonth(1)} className="text-slate-400 hover:text-white text-2xl px-3 transition-colors">&gt;</button>
        </div>
        <div className="flex justify-between px-2 items-end">
          <div>
            <p className="text-sm text-slate-400 mb-1 font-medium">জনপ্রতি বিল</p>
            <p className="text-3xl font-bold text-teal-400 drop-shadow-[0_0_10px_rgba(45,212,191,0.3)]">৳ {toBanglaDigit(perPerson.toFixed(0))}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400 mb-1 font-medium">সর্বমোট বিল</p>
            <p className="text-xl font-bold text-white drop-shadow-md">৳ {toBanglaDigit(total)}</p>
          </div>
        </div>
      </div>
      
      {/* 4 Colorful Glass Buttons */}
      <div className="grid grid-cols-2 gap-5">
        
        {/* Members - Pink */}
        <button onClick={() => setActiveView("members")} className="relative overflow-hidden bg-pink-500/20 backdrop-blur-xl border border-pink-500/40 rounded-[2rem] p-6 h-40 flex items-center justify-center shadow-[0_8px_32px_rgba(236,72,153,0.2)] active:scale-95 transition-all group">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-400/10 to-transparent"></div>
          <span className="relative text-2xl font-bold text-pink-100 text-center leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">সদস্যদের<br/>তালিকা</span>
        </button>
        
        {/* Expenses - Purple */}
        <button onClick={() => setActiveView("expenses")} className="relative overflow-hidden bg-purple-600/20 backdrop-blur-xl border border-purple-500/40 rounded-[2rem] p-6 h-40 flex items-center justify-center shadow-[0_8px_32px_rgba(147,51,234,0.2)] active:scale-95 transition-all group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-transparent"></div>
          <span className="relative text-2xl font-bold text-purple-100 text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">খরচ সমূহ</span>
        </button>
        
        {/* Rules - Red */}
        <button onClick={() => setActiveView("rules")} className="relative overflow-hidden bg-red-600/20 backdrop-blur-xl border border-red-500/40 rounded-[2rem] p-6 h-40 flex items-center justify-center shadow-[0_8px_32px_rgba(220,38,38,0.2)] active:scale-95 transition-all group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-400/10 to-transparent"></div>
          <span className="relative text-2xl font-bold text-red-100 text-center leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">পরিষ্কারের<br/>নিয়ম</span>
        </button>
        
        {/* Schedule - Teal */}
        <button onClick={() => setActiveView("schedule")} className="relative overflow-hidden bg-teal-500/20 backdrop-blur-xl border border-teal-500/40 rounded-[2rem] p-6 h-40 flex items-center justify-center shadow-[0_8px_32px_rgba(20,184,166,0.2)] active:scale-95 transition-all group">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-400/10 to-transparent"></div>
          <span className="relative text-2xl font-bold text-teal-100 text-center leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">পরিষ্কারের<br/>সিডিউল</span>
        </button>

      </div>
    </div>
  );

  const renderExpenses = () => (
    <div className="animate-fade-in relative z-10">
      <button onClick={() => {setActiveView("home"); setIsEditing(false);}} className="mb-6 text-slate-300 hover:text-white flex items-center gap-2 transition-colors font-medium"><span className="text-2xl">&larr;</span> ফিরে যান</button>
      
      <div className="bg-purple-900/20 backdrop-blur-xl border border-purple-500/30 p-7 rounded-[2rem] space-y-5 mb-6 shadow-[0_8px_32px_rgba(147,51,234,0.15)]">
        <h2 className="text-xl font-bold text-purple-200 text-center mb-4 border-b border-purple-500/20 pb-3">মাসের হিসাব</h2>
        <div className="flex justify-between items-center"><span className="text-slate-300 text-lg">বাসা ভাড়া</span><span className="text-white font-bold text-xl">৳ {toBanglaDigit(RENT)}</span></div>
        <div className="flex justify-between items-center"><span className="text-slate-300 text-lg">বিদ্যুৎ বিল</span><span className="text-white font-bold text-xl">৳ {toBanglaDigit(electric)}</span></div>
        <div className="flex justify-between items-center"><span className="text-slate-300 text-lg">গ্যাস বিল</span><span className="text-white font-bold text-xl">৳ {toBanglaDigit(gas)}</span></div>
        <div className="flex justify-between items-center pt-2 border-t border-purple-500/20"><span className="text-slate-300 text-lg">অন্যান্য খরচ</span><span className="text-white font-bold text-xl">৳ {toBanglaDigit(extra)}</span></div>
      </div>

      {!isEditing ? (
        <button onClick={checkEditAccess} className="w-full bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/50 text-white py-4 rounded-2xl font-bold text-lg backdrop-blur-md transition-all shadow-lg">হিসাব সংশোধন করুন</button>
      ) : (
        <div className="bg-black/40 p-6 rounded-[2rem] border border-teal-500/40 space-y-4 backdrop-blur-xl shadow-[0_8px_32px_rgba(20,184,166,0.15)] mt-6">
          <h3 className="text-teal-300 font-bold text-center mb-2">নতুন হিসাব দিন</h3>
          <input type="number" placeholder="বিদ্যুৎ" value={electric || ""} onChange={e=>setElectric(Number(e.target.value))} className="w-full bg-white/5 border border-slate-600 p-4 rounded-2xl text-white text-center text-xl focus:outline-none focus:border-teal-400/70 transition-colors shadow-inner" />
          <input type="number" placeholder="গ্যাস" value={gas || ""} onChange={e=>setGas(Number(e.target.value))} className="w-full bg-white/5 border border-slate-600 p-4 rounded-2xl text-white text-center text-xl focus:outline-none focus:border-teal-400/70 transition-colors shadow-inner" />
          <input type="number" placeholder="অন্যান্য" value={extra || ""} onChange={e=>setExtra(Number(e.target.value))} className="w-full bg-white/5 border border-slate-600 p-4 rounded-2xl text-white text-center text-xl focus:outline-none focus:border-teal-400/70 transition-colors shadow-inner" />
          <button onClick={saveData} className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold py-4 rounded-2xl text-lg transition-colors mt-2 shadow-lg">আপডেট সেভ করুন</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050B14] font-sans pb-10 text-slate-200 relative">
      {/* Global Background Glow */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-teal-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-1/2 -right-32 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="pt-12 pb-8 text-center relative z-10">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400 tracking-wide drop-shadow-sm">৬১২ বাসা ম্যানেজমেন্ট</h1>
        <p className="text-slate-400 text-sm mt-2 font-medium">হিসাব-নিকাশ</p>
      </div>

      <div className="px-5 max-w-md mx-auto relative z-10">
        {activeView === "home" && renderHome()}
        {activeView === "expenses" && renderExpenses()}
        
        {activeView === "members" && (
          <div className="animate-fade-in">
            <button onClick={() => setActiveView("home")} className="mb-6 text-slate-300 hover:text-white flex items-center gap-2 transition-colors font-medium"><span className="text-2xl">&larr;</span> ফিরে যান</button>
            <div className="grid grid-cols-2 gap-4">
              {MEMBERS.map((m, i) => (
                <div key={i} className="bg-pink-900/10 backdrop-blur-xl border border-pink-500/20 p-5 rounded-[2rem] flex flex-col items-center text-center shadow-[0_8px_24px_rgba(236,72,153,0.1)] hover:bg-pink-900/20 transition-colors">
                  <div className="p-1 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 mb-3 shadow-lg">
                    <img src={m.img} className="w-20 h-20 rounded-full object-cover border-4 border-[#050B14]" onError={(e)=>e.target.src=`https://ui-avatars.com/api/?name=${m.name}&background=0f172a&color=f472b6`} />
                  </div>
                  <p className="text-lg font-bold text-white mb-1">{m.name}</p>
                  <p className="text-xs font-semibold text-pink-300 tracking-wider bg-pink-500/20 px-3 py-1 rounded-full">{toBanglaDigit(m.phone)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === "schedule" && (
          <div className="animate-fade-in">
            <button onClick={() => setActiveView("home")} className="mb-6 text-slate-300 hover:text-white flex items-center gap-2 transition-colors font-medium"><span className="text-2xl">&larr;</span> ফিরে যান</button>
            <div className="bg-teal-900/20 backdrop-blur-xl border border-teal-500/30 p-6 rounded-[2rem] shadow-[0_8px_32px_rgba(20,184,166,0.15)]">
              <h2 className="text-2xl font-bold mb-8 text-center text-teal-200">পরিষ্কারের সিডিউল</h2>
              <div className="space-y-3">
                {getSchedule().map((s, i) => (
                  <div key={i} className="flex justify-between items-center bg-black/30 p-4 rounded-2xl border border-teal-500/20 shadow-sm">
                    <span className="text-white text-lg font-medium">{s.name}</span>
                    <span className="bg-teal-500/20 text-teal-300 font-bold px-4 py-1.5 rounded-xl text-sm border border-teal-500/30">{toBanglaDigit(s.date)} তারিখ</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === "rules" && (
          <div className="animate-fade-in">
            <button onClick={() => setActiveView("home")} className="mb-6 text-slate-300 hover:text-white flex items-center gap-2 transition-colors font-medium"><span className="text-2xl">&larr;</span> ফিরে যান</button>
            <div className="bg-red-900/20 backdrop-blur-xl border border-red-500/30 p-7 rounded-[2rem] shadow-[0_8px_32px_rgba(220,38,38,0.15)]">
              <h2 className="text-2xl font-bold mb-8 text-center text-red-200">পরিষ্কারের নিয়মাবলি</h2>
              <div className="space-y-4">
                {rules.map((r, i) => (
                  <div key={i} className="flex gap-4 bg-black/30 p-4 rounded-2xl border border-red-500/20 shadow-sm items-start">
                    <div className="bg-red-500/20 p-1.5 rounded-full mt-0.5">
                      <span className="text-red-400 font-bold text-sm block">✓</span>
                    </div>
                    <p className="text-white/90 text-sm leading-relaxed font-medium">{r}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
