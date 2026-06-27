import re

path = r'c:\Users\rudra\Desktop\Waranty_POC\warranty-platform\frontend\src\components\ui\glowing-ai-chat-assistant.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Revert back to original first since the last replace messed it up
import json
transcript_path = r'C:\Users\rudra\.gemini\antigravity\brain\f1586929-e83b-4530-b567-521d7b203595\.system_generated\logs\transcript_full.jsonl'
with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        if 'content' in data:
            c = data['content']
            if 'import { Paperclip, Link, Code, Mic, Send, Info, Bot, X } from' in c:
                match = re.search(r'```tsx\s*(.*?)\s*```', c, re.DOTALL)
                if match:
                    content = match.group(1)
                    break

# Patch 1: signature
content = content.replace("const FloatingAiAssistant = () => {", "const FloatingAiAssistant = ({ messages, onSendMessage, headerLabel = 'AI Assistant', modelBadge = 'GPT-4', disabled = false }: any) => {")

# Patch 2: handleSend
old_send = """  const handleSend = () => {
    if (message.trim()) {
      console.log('Sending message:', message);
      setMessage('');
      setCharCount(0);
    }
  };"""
new_send = """  const handleSend = () => {
    if (message.trim() && !disabled) {
      if (onSendMessage) {
        onSendMessage(message);
      } else {
        console.log('Sending message:', message);
      }
      setMessage('');
      setCharCount(0);
    }
  };"""
content = content.replace(old_send, new_send)

# Patch 3: header
old_header = """            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-4 pb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs font-medium text-zinc-400">AI Assistant</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 text-xs font-medium bg-zinc-800/60 text-zinc-300 rounded-2xl">
                  GPT-4
                </span>"""
new_header = """            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-4 pb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs font-medium text-zinc-400">{headerLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 text-xs font-medium bg-zinc-800/60 text-zinc-300 rounded-2xl">
                  {modelBadge}
                </span>"""
content = content.replace(old_header, new_header)

# Patch 4: messages slot
old_input = "            {/* Input Section */}"
new_input = """            {/* Messages slot */}
            {messages && (
              <div className="px-6 py-2 max-h-[400px] overflow-y-auto scrollbar-none flex flex-col gap-4">
                {messages}
              </div>
            )}

            {/* Input Section */}"""
content = content.replace(old_input, new_input)

# Patch 5: Button disabled
old_button = """                  {/* Send Button */}
                  <button 
                    onClick={handleSend}
                    className="group relative p-3 bg-gradient-to-r from-red-600 to-red-500 border-none rounded-xl cursor-pointer transition-all duration-300 text-white shadow-lg hover:from-red-500 hover:to-red-400 hover:scale-110 hover:shadow-red-500/30 hover:shadow-xl active:scale-95 transform hover:-rotate-2 hover:animate-pulse\""""
new_button = """                  {/* Send Button */}
                  <button 
                    onClick={handleSend}
                    disabled={disabled}
                    className={`group relative p-3 bg-gradient-to-r border-none rounded-xl transition-all duration-300 text-white shadow-lg ${
                      disabled 
                        ? 'from-zinc-600 to-zinc-500 opacity-40 cursor-not-allowed'
                        : 'from-red-600 to-red-500 cursor-pointer hover:from-red-500 hover:to-red-400 hover:scale-110 hover:shadow-red-500/30 hover:shadow-xl active:scale-95 transform hover:-rotate-2 hover:animate-pulse'
                    }`}"""
content = content.replace(old_button, new_button)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched.")
