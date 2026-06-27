import re
import os

source_file = r'c:\Users\rudra\Desktop\Waranty_POC\warranty-platform\frontend\src\components\chat\AiAnalystPanel.tsx'
dest_file = r'c:\Users\rudra\Desktop\Waranty_POC\warranty-platform\frontend\src\components\DocumentFloatingChat.tsx'

with open(source_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace export default function AiAnalystPanel
content = content.replace('export default function AiAnalystPanel', 'import { FloatingAiAssistant } from "./ui/glowing-ai-chat-assistant";\n\nexport default function DocumentFloatingChat')

# Find the return statement and replace it.
# We'll use regex to find where `return (` starts and replace the rest of the file.
return_index = content.find('  return (\n    <div\n      style={{')
if return_index == -1:
    return_index = content.find('  return (\n    <div')

# The top of the return includes the eligibility form and reset button. Let's just create a new return block.
new_return = """
  return (
    <FloatingAiAssistant
      headerLabel="AI Warranty Analyst"
      modelBadge={filename || "Document"}
      onSendMessage={onSend}
      disabled={!sessionId || sending}
      messages={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Eligibility & Settings */}
          <div style={{ background: 'var(--bg-panel)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Analysis Context</span>
              <button
                onClick={handleResetChat}
                style={{
                  fontSize: 11,
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  padding: '2px 8px',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                Reset Chat
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Purchase Date</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    padding: '4px 8px',
                    fontSize: 12,
                    color: '#FFF'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Current Mileage</label>
                <input
                  type="number"
                  value={currentMileage}
                  onChange={(e) => setCurrentMileage(e.target.value)}
                  placeholder="e.g. 15000"
                  style={{
                    width: '100%',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    padding: '4px 8px',
                    fontSize: 12,
                    color: '#FFF'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Messages */}
          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            const structured = (msg.evidenceJson || {}) as Record<string, unknown>;
            const responseType = structured.responseType || "answer";
            const evidence = msg.evidenceJson || [];
            
            return (
              <div key={msg.id || i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "90%",
                  background: isUser ? "var(--accent)" : "var(--bg-panel)",
                  border: isUser ? "none" : "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 16,
                  color: "#FFF"
                }}>
                  {isUser ? (
                    <div>{msg.content}</div>
                  ) : responseType === "multi_decision" ? (
                    <ClauseResultsCard data={structured as never} />
                  ) : (
                    <div>
                      <AnswerMarkdown text={msg.content} evidence={evidence as any[]} />
                      {responseType === "decision" && (
                        <DecisionCard
                          coverageDecision={(structured.coverageDecision || structured.decision) as any}
                          explanation={structured.explanation as string}
                        />
                      )}
                      <SourcesPanel sources={evidence as any[]} answerText={msg.content} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {sending && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}>
              <Bot size={16} color="var(--accent)" />
              <div style={{ background: 'var(--bg-panel)', padding: '8px 12px', borderRadius: 12 }}><TypingDots /></div>
            </div>
          )}
        </div>
      }
    />
  );
}
"""

content = content[:return_index] + new_return
with open(dest_file, 'w', encoding='utf-8') as f:
    f.write(content)
print("Created DocumentFloatingChat.tsx")
