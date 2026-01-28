import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, ChatMessage, ProductRequest } from '../types';
import { getAgentResponseStream, parseAgentSummary } from '../geminiService';

interface ChatAgentProps {
  user: UserProfile;
  onClose: () => void;
  onFinalized: (request: ProductRequest) => void;
}

const ChatAgent: React.FC<ChatAgentProps> = ({ user, onClose, onFinalized }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', parts: [{ text: `Namaste ${user.name}! I'm LocalLink Sahayak. Aapko market se kya chahiye?` }] }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedImages, setAttachedImages] = useState<{id: string, data: string, mime: string}[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages, isLoading, transcribing]);

  const resetChat = () => {
    setMessages([{ role: 'model', parts: [{ text: `Namaste ${user.name}! I'm LocalLink Sahayak. Aapko market se kya chahiye?` }] }]);
    setErrorState(null);
  };

  // Voice Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setTranscribing(true);
          try {
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: base64Audio })
            });
            const data = await res.json();
            if (data.text) setInput(prev => (prev ? `${prev} ${data.text}` : data.text));
          } catch (err) {
            console.error("Transcription error:", err);
          } finally {
            setTranscribing(false);
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Please allow microphone access to use voice-to-text.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Image Handling Logic
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    files.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setAttachedImages(prev => [...prev, {
          id: `REF_IMG_${prev.length}`,
          data: dataUrl.split(',')[1],
          mime: file.type
        }]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (id: string) => {
    setAttachedImages(prev => prev.filter(img => img.id !== id));
  };

  const handleSend = async () => {
    if (isLoading || (!input.trim() && attachedImages.length === 0)) return;
    setErrorState(null);

    const parts: any[] = [];
    if (input.trim()) parts.push({ text: input.trim() });
    
    attachedImages.forEach((img, idx) => {
      parts.push({ 
        text: `[REF_IMG_${idx}]` 
      });
      parts.push({
        inlineData: { mimeType: img.mime, data: img.data }
      });
    });

    const newUserMessage: ChatMessage = { role: 'user', parts };
    setMessages(prev => [...prev, newUserMessage]);
    
    const currentInput = input;
    const currentImages = [...attachedImages];
    
    setInput('');
    setAttachedImages([]);
    setIsLoading(true);

    let fullResponse = "";
    try {
      await getAgentResponseStream([...messages, newUserMessage].slice(1), (chunk) => {
        fullResponse += chunk;
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last.role === 'model') {
            last.parts = [{ text: fullResponse }];
          } else {
            next.push({ role: 'model', parts: [{ text: fullResponse }] });
          }
          return next;
        });
      });

      const finalizedData = parseAgentSummary(fullResponse);
      if (finalizedData?.finalized) {
        let selectedImageData = null;
        if (finalizedData.selectedImageId) {
          const matched = currentImages.find(img => img.id === finalizedData.selectedImageId);
          if (matched) selectedImageData = `data:${matched.mime};base64,${matched.data}`;
        } else if (currentImages.length > 0) {
          selectedImageData = `data:${currentImages[0].mime};base64,${currentImages[0].data}`;
        }

        onFinalized({
          id: Math.random().toString(36).substr(2, 9),
          customerId: user.id,
          customerName: user.name,
          pinCode: user.pinCode,
          city: user.city,
          locality: user.locality,
          category: finalizedData.category || 'Other',
          description: finalizedData.summary || currentInput,
          status: 'broadcasted',
          createdAt: Date.now(),
          image: selectedImageData || undefined
        });
      }
    } catch (err) {
      console.error(err);
      setErrorState("Sahayak thoda busy hai. Reset karke try karein ya message firse bhejein.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="bg-indigo-600 p-5 text-white flex justify-between items-center shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white text-indigo-600 shadow-lg text-2xl">🤖</div>
          <div>
            <h3 className="font-bold text-lg leading-tight tracking-tight">Sahayak AI</h3>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 italic">Smooth Town Assistance</p>
          </div>
        </div>
        <div className="flex gap-2">
           <button onClick={resetChat} title="Reset Chat" className="hover:bg-black/10 p-2 rounded-full transition-colors text-xs font-black uppercase tracking-widest opacity-70">Reset</button>
           <button onClick={onClose} className="hover:bg-black/10 p-2 rounded-full transition-colors font-bold">✕</button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-5 bg-gray-50/30 no-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-[24px] p-4 shadow-sm border ${m.role === 'user' ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none' : 'bg-white text-gray-800 border-gray-100 rounded-tl-none'}`}>
              <div className="space-y-3">
                {m.parts.map((p, pIdx) => (
                  <React.Fragment key={pIdx}>
                    {p.text && !p.text.startsWith('[REF_IMG_') && (
                      <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{p.text}</p>
                    )}
                    {p.inlineData && (
                      <img 
                        src={`data:${p.inlineData.mimeType};base64,${p.inlineData.data}`} 
                        className="max-w-full rounded-xl border border-white/20 shadow-sm"
                        alt="Shared detail"
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        ))}
        {errorState && (
           <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-red-600 text-[10px] font-bold uppercase tracking-widest text-center mx-10 animate-fade-in">
              {errorState}
           </div>
        )}
        {transcribing && (
           <div className="flex items-center gap-2 p-3 bg-white/80 rounded-2xl border border-indigo-100 self-start animate-pulse">
              <span className="text-xs">👂</span>
              <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Listening carefully...</p>
           </div>
        )}
        {isLoading && (
          <div className="p-4 bg-white/50 border border-gray-50 rounded-2xl w-24 animate-pulse flex items-center justify-center gap-2">
             <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
             <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
             <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
          </div>
        )}
      </div>

      {attachedImages.length > 0 && (
        <div className="px-4 py-3 bg-white border-t border-gray-50 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
          {attachedImages.map(img => (
            <div key={img.id} className="relative w-16 h-16 shrink-0 group">
              <img src={`data:${img.mime};base64,${img.data}`} className="w-full h-full object-cover rounded-xl border-2 border-indigo-50" alt="Thumbnail" />
              <button 
                onClick={() => removeImage(img.id)}
                className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[8px] shadow-lg"
              >✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 bg-white border-t border-gray-100 shrink-0">
        <div className="flex gap-2 items-center">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center hover:bg-gray-100 transition border border-gray-100"
          >
            📸
          </button>
          <input type="file" hidden ref={fileInputRef} accept="image/*" multiple onChange={handleImageSelect} />
          
          <div className="flex-1 relative">
            <input 
              className="w-full h-12 bg-gray-50 border border-gray-100 focus:border-indigo-600 rounded-xl px-5 pr-12 outline-none text-sm font-medium" 
              placeholder={isRecording ? "Listening..." : "Type your need..."}
              value={input} 
              onChange={e => setInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleSend()} 
            />
            <button 
              onClick={isRecording ? stopRecording : startRecording}
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-transparent text-gray-400 hover:text-indigo-600'}`}
            >
              🎤
            </button>
          </div>

          <button 
            onClick={handleSend} 
            disabled={isLoading || (!input.trim() && attachedImages.length === 0)} 
            className="h-12 w-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition disabled:opacity-20 shadow-lg shadow-indigo-100"
          >
            ➤
          </button>
        </div>
        {isRecording && (
          <p className="text-center text-[8px] font-black uppercase text-red-500 tracking-[0.3em] mt-2 italic">Recording Town Audio...</p>
        )}
      </div>
    </div>
  );
};

export default ChatAgent;