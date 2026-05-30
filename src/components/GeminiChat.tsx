import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, User, Bot, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

interface Message {
  role: 'user' | 'model';
  content: string;
  image?: string;
}

export default function GeminiChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      image: selectedImage || undefined
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setSelectedImage(null);
    setLoading(true);

    try {
      // Communicate securely with premium server proxy endpoint
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: nextMessages,
          imageBase64: userMessage.image || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error occurred during execution');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'model', content: data.content }]);
    } catch (error: any) {
      console.error('Gemini Proxy Error:', error);
      setMessages(prev => [...prev, { 
        role: 'model', 
        content: `**System Alert**: I suffered an issue communicating with the agronomist mainframe: ${error.message || 'Please verify that GEMINI_API_KEY is defined in the Secrets panel.'}` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
      {/* Chat Header */}
      <div className="bg-emerald-600 p-4 flex items-center gap-3 text-white">
        <Bot className="w-6 h-6 animate-bounce" />
        <div>
          <h3 className="font-bold text-sm">AgriExpert Server-Side Assistant</h3>
          <p className="text-[10px] opacity-80">Telemetry secure proxy channel is online</p>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-emerald-50/20"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="bg-emerald-100 p-4 rounded-full mb-4">
              <MessageSquare className="w-8 h-8 text-emerald-500 animate-pulse" />
            </div>
            <h4 className="text-emerald-900 font-bold mb-2">Ask anything about your farm</h4>
            <p className="text-emerald-600 text-sm max-w-xs">
              "How do I treat yellow spots on my wheat?" or "What's the best time to plant corn?"
            </p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex gap-3 max-w-[85%]",
              msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              msg.role === 'user' ? "bg-emerald-600 text-white" : "bg-white border border-emerald-100 text-emerald-600"
            )}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={cn(
              "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
              msg.role === 'user' ? "bg-emerald-600 text-white rounded-tr-none" : "bg-white text-emerald-900 border border-emerald-100 rounded-tl-none"
            )}>
              {msg.image && (
                <img 
                  src={msg.image} 
                  alt="User upload" 
                  className="max-w-full h-48 object-cover rounded-lg mb-3 border border-emerald-400/20" 
                />
              )}
              <div className="markdown-body prose prose-sm max-w-none prose-emerald">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex gap-3 mr-auto">
            <div className="w-8 h-8 rounded-full bg-white border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-emerald-100 shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              <span className="text-xs text-emerald-600 font-medium">Analyzing agronomy matrix...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-emerald-100 bg-white">
        <AnimatePresence>
          {selectedImage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="relative inline-block mb-4"
            >
              <img src={selectedImage} alt="Selected" className="w-20 h-20 object-cover rounded-xl border-2 border-emerald-500" />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-colors shrink-0"
            title="Upload photo"
          >
            <ImageIcon className="w-6 h-6" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageSelect} 
            accept="image/*" 
            className="hidden" 
          />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your crops, yield practices..."
            className="flex-1 px-4 py-3 rounded-xl border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={loading || (!input.trim() && !selectedImage)}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white p-3 rounded-xl transition-all shadow-lg shadow-emerald-100 shrink-0"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
