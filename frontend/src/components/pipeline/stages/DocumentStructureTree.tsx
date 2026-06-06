"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen } from "lucide-react";

interface TreeNode {
  id: string;
  title: string;
  pages?: string;
  children?: TreeNode[];
}

const MOCK_TREE: TreeNode = {
  id: "root",
  title: "Document Root",
  pages: "147 pages",
  children: [
    {
      id: "1",
      title: "1. General Information",
      pages: "12 pages",
      children: [
        { id: "1.1", title: "1.1 Document Details", pages: "3 pages" },
        { id: "1.2", title: "1.2 Vehicle Identification", pages: "4 pages" },
        { id: "1.3", title: "1.3 Warranty Overview", pages: "5 pages" },
      ],
    },
    {
      id: "2",
      title: "2. Coverage Information",
      pages: "85 pages",
      children: [
        {
          id: "2.1",
          title: "2.1 Coverage Codes",
          pages: "16 pages",
          children: [
            { id: "2.1.1", title: "U030 — Engine Coverage", pages: "5 pages" },
            { id: "2.1.2", title: "U031 — Transmission", pages: "4 pages" },
            { id: "2.1.3", title: "U032 — Electrical", pages: "3 pages" },
            { id: "2.1.4", title: "U040 — Frame Coverage", pages: "4 pages" },
          ],
        },
        {
          id: "2.2",
          title: "2.2 Coverage Period",
          pages: "8 pages",
          children: [
            { id: "2.2.1", title: "Standard Period", pages: "3 pages" },
            { id: "2.2.2", title: "Extended Period", pages: "5 pages" },
          ],
        },
        {
          id: "2.3",
          title: "2.3 Coverage Details",
          pages: "41 pages",
          children: [
            { id: "2.3.1", title: "Covered Components", pages: "18 pages" },
            { id: "2.3.2", title: "Exclusions", pages: "12 pages" },
            { id: "2.3.3", title: "Limitations", pages: "11 pages" },
          ],
        },
      ],
    },
    {
      id: "3",
      title: "3. Terms & Conditions",
      pages: "50 pages",
      children: [
        { id: "3.1", title: "3.1 Definitions", pages: "8 pages" },
        { id: "3.2", title: "3.2 Claim Procedures", pages: "15 pages" },
        { id: "3.3", title: "3.3 Responsibilities", pages: "12 pages" },
        { id: "3.4", title: "3.4 Dispute Resolution", pages: "15 pages" },
      ],
    },
  ],
};

function TreeNodeComponent({
  node,
  depth,
  expandedLevel,
  selectedId,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  expandedLevel: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const hasChildren = node.children && node.children.length > 0;
  const autoExpanded = depth < expandedLevel;
  const isOpen = manualOpen !== null ? manualOpen : autoExpanded;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: depth * 0.05 }}
        onClick={() => {
          onSelect(node.id);
          if (hasChildren) setManualOpen(manualOpen === null ? !autoExpanded : !manualOpen);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          marginLeft: depth * 24,
          borderRadius: "var(--r-sm)",
          background: isSelected ? "var(--accent-soft)" : "var(--bg-surface)",
          border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
          cursor: "pointer",
          transition: "all 150ms ease",
          marginBottom: 4,
        }}
      >
        {hasChildren ? (
          isOpen ? (
            <ChevronDown size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
          ) : (
            <ChevronRight size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          )
        ) : (
          <div style={{ width: 14, flexShrink: 0 }} />
        )}

        {hasChildren ? (
          isOpen ? (
            <FolderOpen size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
          ) : (
            <Folder size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          )
        ) : (
          <FileText size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        )}

        <span
          style={{
            fontSize: 13,
            fontWeight: isSelected ? 600 : 400,
            color: isSelected ? "var(--accent)" : "var(--text-primary)",
            flex: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {node.title}
        </span>

        {node.pages && (
          <span
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              flexShrink: 0,
            }}
          >
            {node.pages}
          </span>
        )}
      </motion.div>

      <AnimatePresence>
        {isOpen && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            {/* Connector line */}
            <div
              style={{
                marginLeft: depth * 24 + 19,
                borderLeft: `1px solid ${isSelected ? "var(--accent)" : "var(--border-strong)"}`,
                paddingLeft: 0,
              }}
            >
              {node.children!.map((child) => (
                <TreeNodeComponent
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  expandedLevel={expandedLevel}
                  selectedId={selectedId}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DocumentStructureTree({
  filename,
  pageCount,
}: {
  filename?: string;
  pageCount?: number;
}) {
  const [expandedLevel, setExpandedLevel] = useState(2);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const tree = {
    ...MOCK_TREE,
    title: filename || MOCK_TREE.title,
    pages: pageCount ? `${pageCount} pages` : MOCK_TREE.pages,
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <h3
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          Document Structure Tree
        </h3>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Expand Level</span>
          <select
            value={expandedLevel}
            onChange={(e) => setExpandedLevel(Number(e.target.value))}
            style={{
              fontSize: 12,
              padding: "4px 8px",
              borderRadius: "var(--r-sm)",
              border: "1px solid var(--border)",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            {[1, 2, 3, 4].map((l) => (
              <option key={l} value={l}>
                Level {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tree */}
      <div
        className="card"
        style={{
          padding: 16,
          maxHeight: 480,
          overflowY: "auto",
        }}
      >
        <TreeNodeComponent
          node={tree}
          depth={0}
          expandedLevel={expandedLevel}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      {/* Progress stats */}
      <div
        style={{
          display: "flex",
          gap: 24,
          marginTop: 12,
          padding: "8px 0",
        }}
      >
        {[
          { label: "Parsing progress", value: "100%" },
          { label: "Pages parsed", value: `${pageCount || 147} / ${pageCount || 147}` },
          { label: "Sections", value: "3 main sections" },
        ].map((stat, i) => (
          <span key={i} style={{ fontSize: 12, color: "var(--text-muted)" }}>
            <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{stat.label}</span>{" "}
            <span className="mono">{stat.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
