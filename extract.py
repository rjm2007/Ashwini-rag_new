import json
import re

transcript_path = r'C:\Users\rudra\.gemini\antigravity\brain\f1586929-e83b-4530-b567-521d7b203595\.system_generated\logs\transcript_full.jsonl'
out_path = r'c:\Users\rudra\Desktop\Waranty_POC\warranty-platform\frontend\src\components\ui\glowing-ai-chat-assistant.tsx'

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        if 'content' in data:
            content = data['content']
            if 'import { Paperclip, Link, Code, Mic, Send, Info, Bot, X } from' in content:
                match = re.search(r'```tsx\s*(.*?)\s*```', content, re.DOTALL)
                if match:
                    with open(out_path, 'w', encoding='utf-8') as out_f:
                        out_f.write(match.group(1))
                    print("Successfully extracted code.")
                    break
