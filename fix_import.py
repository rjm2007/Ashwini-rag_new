import os

path = r'c:\Users\rudra\Desktop\Waranty_POC\warranty-platform\frontend\src\app\(dashboard)\documents\[id]\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove AiAnalystPanel lazy import
content = content.replace(
    'let AiAnalystPanel: React.ComponentType<{ docId: string; filename: string; document?: any }> | null = null;',
    ''
)
content = content.replace(
    'try { AiAnalystPanel = require("../../../../components/chat/AiAnalystPanel").default; } catch {}',
    ''
)

# Add DocumentFloatingChat import at the top
import_statement = 'import DocumentFloatingChat from "../../../../components/DocumentFloatingChat";\n'
idx = content.find('import ChatSidebar from')
if idx != -1:
    content = content[:idx] + import_statement + content[idx:]
else:
    # fallback
    idx = content.find('import type')
    content = content[:idx] + import_statement + content[idx:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added import to documents/[id]/page.tsx")
