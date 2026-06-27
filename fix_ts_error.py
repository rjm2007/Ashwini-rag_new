import os

path = r'c:\Users\rudra\Desktop\Waranty_POC\warranty-platform\frontend\src\components\ui\glowing-ai-chat-assistant.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'e.target.style.animation = \'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite\';',
    '(e.target as HTMLButtonElement).style.animation = \'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite\';'
)
content = content.replace(
    'e.target.style.animation = \'none\';',
    '(e.target as HTMLButtonElement).style.animation = \'none\';'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed TypeScript error in glowing-ai-chat-assistant.tsx")
