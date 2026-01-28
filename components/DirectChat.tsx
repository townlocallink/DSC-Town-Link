
import React, { useState, useRef, useEffect } from 'react';
import { DirectMessage, UserProfile, ShopProfile } from '../types';

interface DirectChatProps {
  currentUser: UserProfile | ShopProfile;
  otherPartyName: string;
  history: DirectMessage[];
  onSendMessage: (text: string, image?: string) => void;
  onClose: () => void;
}

const DirectChat: React.FC<DirectChatProps> = ({ currentUser, otherPartyName, history, onSendMessage, onClose }) => {
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [history]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setAttachedImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSend = () => {
    if (!input.trim() && !attachedImage) return;
    onSendMessage(input.trim(), attachedImage || undefined);
    setInput('');
    setAttachedImage(null);
  };

  return (
    <div className="flex flex-col h-[550px] w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden border border-gray-100 animate-fade-in">
      <div className="bg-indigo-600 p-5 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">💬</div>
          <div>
            <h3 className="font-black tracking-tight text-lg leading-tight">{otherPartyName}</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-75">Direct Town Connection</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">✕</button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 no-scrollbar">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 text-center p-8">
            <span className="text-5xl mb-4">🏠</span>
            <p className="text-[10px] font-black uppercase tracking-widest">Connected with {otherPartyName}. Say Namaste!</p>
          </div>
        ) : (
          history.map((msg, idx) => {
            const isMe = msg.senderId === currentUser.id;
            return (
              <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-[24px] text-sm font-medium shadow-sm border ${
                  isMe 
                    ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none' 
                    : 'bg-white text-gray-800 border-gray-100 rounded-tl-none'
                }`}>
                  {msg.image && (
                    <div className="mb-2 rounded-xl overflow-hidden border border-white/10 shadow-sm">
                      <img src={msg.image} className="w-full h-auto max-h-60 object-contain bg-black/5" alt="Shared in chat" />
                    </div>
                  )}
                  {msg.text && <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                  <div className={`text-[8px] mt-2 font-black uppercase tracking-tighter flex items-center gap-1 ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isMe && <span>• Sent</span>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {attachedImage && (
        <div className="p-3 bg-indigo-50 border-t border-indigo-100 flex gap-2 items-center shrink-0">
          <div className="relative w-16 h-16 shrink-0">
            <img src={attachedImage} className="w-full h-full object-cover rounded-xl border-2 border-white shadow-sm" alt="Preview" />
            <button onClick={() => setAttachedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center shadow-lg">✕</button>
          </div>
          <p className="text-[9px] font-black uppercase text-indigo-400">Image attached</p>
        </div>
      )}

      <div className="p-4 border-t bg-white shrink-0">
        <div className="flex gap-2 items-center">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center hover:bg-gray-100 transition border border-gray-100 shrink-0"
            title="Send Image or Photo"
          >
            📸
          </button>
          <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleImageSelect} />
          
          <div className="flex-1 relative">
            <input 
              className="w-full h-12 bg-gray-50 border-transparent border-2 focus:border-indigo-600 rounded-2xl px-5 outline-none text-sm font-medium transition-all"
              placeholder="Type your message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
          </div>

          <button 
            onClick={handleSend} 
            disabled={!input.trim() && !attachedImage}
            className="h-12 w-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 transition disabled:opacity-20 shadow-lg shadow-indigo-100 shrink-0"
          >
             ➤
          </button>
        </div>
      </div>
    </div>
  );
};

export default DirectChat;
