import os

path = r'c:\Users\rudra\Desktop\Waranty_POC\warranty-platform\frontend\src\components\DefectFloatingChat.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('from "./ui/glowing-ai-chat-assistant"', 'from "@/components/ui/glowing-ai-chat-assistant"')
content = content.replace('from "./chat/AnswerMarkdown"', 'from "@/components/chat/AnswerMarkdown"')
content = content.replace('from "./chat/ClauseResultsCard"', 'from "@/components/chat/ClauseResultsCard"')
content = content.replace('from "../lib/api"', 'from "@/lib/api"')
content = content.replace('from "../lib/types"', 'from "@/lib/types"')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed imports in DefectFloatingChat")
