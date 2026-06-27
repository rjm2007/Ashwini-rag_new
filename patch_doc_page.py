import os

path = r'c:\Users\rudra\Desktop\Waranty_POC\warranty-platform\frontend\src\app\(dashboard)\documents\[id]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace import
content = content.replace(
    'import AiAnalystPanel from "../../../../components/chat/AiAnalystPanel";',
    'import DocumentFloatingChat from "../../../../components/DocumentFloatingChat";'
)

# Replace width: "60%" with width: "100%"
old_left_col = """        <div
          style={{
            width: "60%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >"""
new_left_col = """        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >"""
content = content.replace(old_left_col, new_left_col)

# Now delete the right column and add DocumentFloatingChat
# We find the end of the left column which is `        </div>\n\n        {/* ─── Right column: AI Analyst or Locked Placeholder ─── */}`
split_point = '        {/* ─── Right column: AI Analyst or Locked Placeholder ─── */}'
idx = content.find(split_point)
if idx != -1:
    # Delete everything from split_point to the end of the return statement
    end_idx = content.find('      </div>\n    </div>\n  );\n}')
    if end_idx != -1:
        prefix = content[:idx]
        suffix = content[end_idx:]
        
        insert = '        {chatReady && <DocumentFloatingChat docId={params.id} filename={doc.originalFilename} document={doc} />}\n'
        content = prefix + insert + suffix

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched documents/[id]/page.tsx")
