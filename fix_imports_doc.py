import os
import re

path = r'c:\Users\rudra\Desktop\Waranty_POC\warranty-platform\frontend\src\components\DocumentFloatingChat.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace ../../ with @/
content = content.replace('from "../../', 'from "@/')
# Replace ./ with @/components/chat/ for those chat components
content = content.replace('from "./CoverageDecision"', 'from "@/components/chat/CoverageDecision"')
content = content.replace('from "./ConfidenceBand"', 'from "@/components/chat/ConfidenceBand"')
content = content.replace('from "./SourcesPanel"', 'from "@/components/chat/SourcesPanel"')
content = content.replace('from "./AnswerMarkdown"', 'from "@/components/chat/AnswerMarkdown"')
content = content.replace('from "./ClauseResultsCard"', 'from "@/components/chat/ClauseResultsCard"')
content = content.replace('from "./DisambiguationCard"', 'from "@/components/chat/DisambiguationCard"')
content = content.replace('from "./DecisionCard"', 'from "@/components/chat/DecisionCard"')
content = content.replace('from "./CoverageListCard"', 'from "@/components/chat/CoverageListCard"')
content = content.replace('from "./ui/glowing-ai-chat-assistant"', 'from "@/components/ui/glowing-ai-chat-assistant"')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed imports in DocumentFloatingChat")
