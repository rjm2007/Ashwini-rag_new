import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Link, Code, Mic, Send, Info, Bot, X } from 'lucide-react';

interface FloatingAiAssistantProps {
  messages?: React.ReactNode;
  onSendMessage?: (message: string) => void;
  headerLabel?: string;
  modelBadge?: string;
  disabled?: boolean;
}

const FloatingAiAssistant = ({
  messages,
  onSendMessage,
  headerLabel = 'AI Assistant',
  modelBadge = 'GPT-4',
  disabled = false,
}: FloatingAiAssistantProps = {}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [charCount, setCharCount] = useState(0);
  const maxChars = 2000;
  const chatRef = useRef(null);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);
    setCharCount(value.length);
  };

  const handleSend = () => {
    if (message.trim() && !disabled) {
      if (onSendMessage) {
        onSendMessage(message);
      } else {
        console.log('Sending message:', message);
      }
      setMessage('');
      setCharCount(0);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Close chat when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatRef.current && !chatRef.current.contains(event.target)) {
        // Check if the click is not on the floating button
        if (!event.target.closest('.floating-ai-button')) {
          setIsChatOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating 3D Glowing AI Logo */}
      <button 
        className={`floating-ai-button relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 transform ${
          isChatOpen ? 'rotate-90' : 'rotate-0'
        }`}
        onClick={() => setIsChatOpen(!isChatOpen)}
        style={{
          // Amber, matching the accent. It previously blended into a violet
          // glow that belonged to no palette in the product.
          background: 'radial-gradient(circle at 38% 32%, #FFD79A, var(--accent) 46%, #B96A1E 100%)',
          boxShadow: '0 0 24px -4px rgba(240,166,74,0.65), 0 8px 20px -6px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.18)',
          color: 'var(--accent-fg)',
        }}
      >
        {/* Top highlight, for the 3D read */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent opacity-40"></div>

        {/* AI Icon */}
        <div className="relative z-10">
          {isChatOpen ? <X className="w-7 h-7" /> : <Bot className="w-8 h-8" />}
        </div>
      </button>

      {/* Scrim. Without this the panel was translucent over live page content,
          so table rows and headings showed straight through the conversation.
          It also gives the panel a click-away target. */}
      {isChatOpen && (
        <div
          onClick={() => setIsChatOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(6,8,12,0.62)',
            backdropFilter: 'blur(2px)',
            zIndex: 40,
          }}
        />
      )}

      {/* Chat Interface */}
      {isChatOpen && (
        <div
          ref={chatRef}
          className="absolute bottom-20 right-0 w-max max-w-[500px] transition-all duration-300 origin-bottom-right"
          style={{
            animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
            maxHeight: 'min(640px, calc(100dvh - 112px))',
            zIndex: 50,
          }}
        >
          <div
            className="relative flex flex-col rounded-3xl shadow-2xl overflow-hidden"
            style={{
              maxHeight: 'inherit',
              // Opaque, and on the token surface — the panel is a reading
              // surface, not a glass effect over the page behind it.
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)',
              boxShadow: '0 24px 60px -20px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-4 pb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs font-medium text-zinc-400">{headerLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 text-xs font-medium bg-zinc-800/60 text-zinc-300 rounded-2xl">
                  {modelBadge}
                </span>
                <span className="px-2 py-1 text-xs font-medium rounded-2xl" style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--border-accent)" }}>
                  Pro
                </span>
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="p-1.5 rounded-full hover:bg-zinc-700/50 transition-colors"
                >
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
            </div>

            {/* Messages slot — flex-1 + min-h-0 makes this the ONLY scrolling
                region inside the now height-capped panel above. */}
            {messages && (
              <div className="px-6 py-2 flex-1 min-h-0 overflow-y-auto scrollbar-none flex flex-col gap-4">
                {messages}
              </div>
            )}

            {/* Input Section */}
            <div className="relative overflow-hidden">
              <textarea
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={4}
                disabled={disabled}
                className="w-full px-6 py-4 bg-transparent border-none outline-none resize-none text-base font-normal leading-relaxed min-h-[120px] text-zinc-100 placeholder-zinc-500 scrollbar-none disabled:opacity-50"
                placeholder="What would you like to explore today? Ask anything, share ideas, or request assistance..."
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              />
              <div 
                className="absolute inset-0 bg-gradient-to-t from-zinc-800/5 to-transparent pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(13,16,23, 0.05), transparent)' }}
              ></div>
            </div>

            {/* Controls Section */}
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Attachment Group */}
                  <div className="flex items-center gap-1.5 p-1 bg-zinc-800/40 rounded-xl border border-zinc-700/50">
                    {/* File Upload */}
                    <button className="group relative p-2.5 bg-transparent border-none rounded-lg cursor-pointer transition-all duration-300 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 hover:scale-105 hover:-rotate-3 transform">
                      <Paperclip className="w-4 h-4 transition-all duration-300 group-hover:scale-125 group-hover:-rotate-12" />
                      <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-3 py-2 bg-zinc-900/95 text-zinc-200 text-xs rounded-lg whitespace-nowrap opacity-0 transition-all duration-300 pointer-events-none group-hover:opacity-100 group-hover:-translate-y-1 shadow-lg border border-zinc-700/50 backdrop-blur-sm">
                        Upload files
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-900/95"></div>
                      </div>
                    </button>

                    {/* Link */}
                    <button className="group relative p-2.5 bg-transparent border-none rounded-lg cursor-pointer transition-all duration-300 text-zinc-500 hover:text-amber-300 hover:bg-zinc-800/80 hover:scale-105 hover:rotate-6 transform">
                      <Link className="w-4 h-4 transition-all duration-300 group-hover:scale-125 group-hover:rotate-12" />
                      <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-3 py-2 bg-zinc-900/95 text-zinc-200 text-xs rounded-lg whitespace-nowrap opacity-0 transition-all duration-300 pointer-events-none group-hover:opacity-100 group-hover:-translate-y-1 shadow-lg border border-zinc-700/50 backdrop-blur-sm">
                        Web link
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-900/95"></div>
                      </div>
                    </button>

                    {/* Code */}
                    <button className="group relative p-2.5 bg-transparent border-none rounded-lg cursor-pointer transition-all duration-300 text-zinc-500 hover:text-green-400 hover:bg-zinc-800/80 hover:scale-105 hover:rotate-3 transform">
                      <Code className="w-4 h-4 transition-all duration-300 group-hover:scale-125 group-hover:-rotate-6" />
                      <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-3 py-2 bg-zinc-900/95 text-zinc-200 text-xs rounded-lg whitespace-nowrap opacity-0 transition-all duration-300 pointer-events-none group-hover:opacity-100 group-hover:-translate-y-1 shadow-lg border border-zinc-700/50 backdrop-blur-sm">
                        Code repo
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-900/95"></div>
                      </div>
                    </button>

                    {/* Design (Figma icon) */}
                    <button className="group relative p-2.5 bg-transparent border-none rounded-lg cursor-pointer transition-all duration-300 text-zinc-500 hover:text-purple-400 hover:bg-zinc-800/80 hover:scale-105 hover:-rotate-6 transform">
                      <svg className="w-4 h-4 transition-all duration-300 group-hover:scale-125 group-hover:rotate-12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.852 8.981h-4.588V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491zM12.735 7.51h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.354-3.019-3.019-3.019h-3.117V7.51zm0 1.471H8.148c-2.476 0-4.49-2.015-4.49-4.49S5.672 0 8.148 0h4.588v8.981zm-4.587-7.51c-1.665 0-3.019 1.355-3.019 3.019s1.354 3.02 3.019 3.02h3.117V1.471H8.148zm4.587 15.019H8.148c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v8.98zM8.148 8.981c-1.665 0-3.019 1.355-3.019 3.019s1.355 3.019 3.019 3.019h3.117v-6.038H8.148zm7.704 0c-2.476 0-4.49 2.015-4.49 4.49s2.014 4.49 4.49 4.49 4.49-2.015 4.49-4.49-2.014-4.49-4.49-4.49zm0 7.509c-1.665 0-3.019-1.355-3.019-3.019s1.355-3.019 3.019-3.019 3.019 1.354 3.019 3.019-1.354 3.019-3.019 3.019zM8.148 24c-2.476 0-4.49-2.015-4.49-4.49s2.014-4.49 4.49-4.49h4.588V24H8.148zm3.117-1.471V16.49H8.148c-1.665 0-3.019 1.355-3.019 3.019s1.355 3.02 3.019 3.02h3.117z"></path>
                      </svg>
                      <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-3 py-2 bg-zinc-900/95 text-zinc-200 text-xs rounded-lg whitespace-nowrap opacity-0 transition-all duration-300 pointer-events-none group-hover:opacity-100 group-hover:-translate-y-1 shadow-lg border border-zinc-700/50 backdrop-blur-sm">
                        Design file
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-900/95"></div>
                      </div>
                    </button>
                  </div>

                  {/* Voice Button */}
                  <button className="group relative p-2.5 bg-transparent border border-zinc-700/30 rounded-lg cursor-pointer transition-all duration-300 text-zinc-500 hover:text-amber-300 hover:bg-zinc-800/80 hover:scale-110 hover:rotate-2 transform hover:border-amber-500/30">
                    <Mic className="w-4 h-4 transition-all duration-300 group-hover:scale-125 group-hover:-rotate-3" />
                    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-3 py-2 bg-zinc-900/95 text-zinc-200 text-xs rounded-lg whitespace-nowrap opacity-0 transition-all duration-300 pointer-events-none group-hover:opacity-100 group-hover:-translate-y-1 shadow-lg border border-zinc-700/50 backdrop-blur-sm">
                      Voice input
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-900/95"></div>
                    </div>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {/* Character Counter */}
                  <div className="text-xs font-medium text-zinc-500">
                    <span>{charCount}</span>/<span className="text-zinc-400">{maxChars}</span>
                  </div>

                  {/* Send Button */}
                  <button 
                    onClick={handleSend}
                    disabled={disabled}
                    className={`group relative p-3 bg-gradient-to-r border-none rounded-xl transition-all duration-300 text-white shadow-lg ${
                      disabled
                        ? 'from-zinc-600 to-zinc-500 opacity-40 cursor-not-allowed'
                        : 'cursor-pointer hover:scale-110 hover:shadow-xl active:scale-95 transform'
                    }`}
                    style={{
                      background: disabled ? undefined : 'var(--accent)',
                      color: disabled ? undefined : 'var(--accent-fg)',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.35)',
                      animation: 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!disabled) {
                        (e.target as HTMLButtonElement).style.animation = 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite';
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.animation = 'none';
                    }}
                  >
                    <Send className="w-5 h-5 transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:rotate-12 group-hover:scale-110" />
                    
                    {/* Animated background glow */}
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300 blur-lg transform scale-110" style={{ background: "var(--accent)" }}></div>
                    
                    {/* Ripple effect on click */}
                    <div className="absolute inset-0 rounded-xl overflow-hidden">
                      <div className="absolute inset-0 bg-white/20 transform scale-0 group-active:scale-100 transition-transform duration-200 rounded-xl"></div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Footer Info */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800/50 text-xs text-zinc-500 gap-6">
                <div className="flex items-center gap-2">
                  <Info className="w-3 h-3" />
                  <span>
                    Press <kbd className="px-1.5 py-1 bg-zinc-800 border border-zinc-600 rounded text-zinc-400 font-mono text-xs shadow-sm">Shift + Enter</kbd> for new line
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>All systems operational</span>
                </div>
              </div>
            </div>

            {/* Floating Overlay */}
            <div 
              className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{ 
                background: 'linear-gradient(135deg, rgba(240,113,111, 0.05), transparent, rgba(169,139,240, 0.05))' 
              }}
            ></div>
          </div>
        </div>
      )}
      
      {/* CSS for animations */}
      <style jsx>{`
        @keyframes popIn {
          0% {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        @keyframes ping {
          75%, 100% {
            transform: scale(1.1);
            opacity: 0;
          }
        }
        
        .floating-ai-button:hover {
          transform: scale(1.1) rotate(5deg);
          box-shadow: 0 0 30px rgba(169,139,240, 0.9), 0 0 50px rgba(169,139,240, 0.7), 0 0 70px rgba(169,139,240, 0.5);
        }
      `}</style>
    </div>
  );
};

export { FloatingAiAssistant };