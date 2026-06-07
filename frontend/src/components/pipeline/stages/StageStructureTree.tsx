"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, FolderOpen, ChevronDown } from "lucide-react";
import type { MasterSchema } from "../../../lib/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  filename?: string;
  pageCount?: number;
  masterSchema?: any; // MasterSchema from ../../lib/types
  isRunning?: boolean;
}

interface TreeNode {
  id: string;
  title: string;
  pages?: string;
  depth: number;
  children?: TreeNode[];
}

interface LayoutNode {
  id: string;
  title: string;
  pages?: string;
  depth: number;
  x: number;
  y: number;
  width: number;
  height: number;
  parentId: string | null;
  hasChildren: boolean;
  isLeaf: boolean;
  childIds: string[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const NODE_W = 200;
const NODE_H = 56;
const H_GAP = 24;
const V_GAP = 72;
const MAX_DEPTH = 4;

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* ------------------------------------------------------------------ */
/*  Static tree data                                                   */
/* ------------------------------------------------------------------ */

function buildStaticTree(pageCount?: number): TreeNode {
  return {
    id: "root",
    title: `Document · ${pageCount ?? 147} pages`,
    pages: `${pageCount ?? 147} pages`,
    depth: 0,
    children: [
      {
        id: "1",
        title: "General Information",
        pages: "12 pages",
        depth: 1,
        children: [
          { id: "1.1", title: "Document Details", pages: "3 pages", depth: 2 },
          { id: "1.2", title: "Vehicle Identification", pages: "4 pages", depth: 2 },
          { id: "1.3", title: "Warranty Overview", pages: "5 pages", depth: 2 },
        ],
      },
      {
        id: "2",
        title: "Coverage Information",
        pages: "85 pages",
        depth: 1,
        children: [
          {
            id: "2.1",
            title: "Coverage Codes",
            pages: "16 pages",
            depth: 2,
            children: [
              { id: "2.1.1", title: "U030 — Engine", pages: "5 pages", depth: 3 },
              { id: "2.1.2", title: "U031 — Transmission", pages: "4 pages", depth: 3 },
              { id: "2.1.3", title: "U032 — Electrical", pages: "3 pages", depth: 3 },
              { id: "2.1.4", title: "U040 — Frame", pages: "4 pages", depth: 3 },
            ],
          },
          {
            id: "2.2",
            title: "Coverage Period",
            pages: "8 pages",
            depth: 2,
            children: [
              { id: "2.2.1", title: "Standard Period", pages: "3 pages", depth: 3 },
              { id: "2.2.2", title: "Extended Period", pages: "5 pages", depth: 3 },
            ],
          },
          {
            id: "2.3",
            title: "Coverage Details",
            pages: "41 pages",
            depth: 2,
            children: [
              { id: "2.3.1", title: "Covered Components", pages: "18 pages", depth: 3 },
              { id: "2.3.2", title: "Exclusions", pages: "12 pages", depth: 3 },
              { id: "2.3.3", title: "Limitations", pages: "11 pages", depth: 3 },
            ],
          },
        ],
      },
      {
        id: "3",
        title: "Terms & Conditions",
        pages: "50 pages",
        depth: 1,
        children: [
          { id: "3.1", title: "Definitions", pages: "8 pages", depth: 2 },
          { id: "3.2", title: "Claim Procedures", pages: "15 pages", depth: 2 },
          { id: "3.3", title: "Responsibilities", pages: "12 pages", depth: 2 },
          { id: "3.4", title: "Dispute Resolution", pages: "15 pages", depth: 2 },
        ],
      },
    ],
  };
}

/** Attempt to seed Level 3 nodes from masterSchema coverage codes */
function seedFromSchema(tree: TreeNode, masterSchema?: any): TreeNode {
  if (!masterSchema?.profiles?.coverage_code_table?.coverage_codes) return tree;
  const codes: Array<Record<string, any>> = masterSchema.profiles.coverage_code_table.coverage_codes;
  if (!codes.length) return tree;

  // Build coverage code children (Level 3 under "Coverage Codes")
  const codeChildren: TreeNode[] = codes.slice(0, 8).map((c, i) => {
    const label =
      c.coverage_code?.value ?? c.code?.value ?? c.label?.value ?? `Code ${i + 1}`;
    return {
      id: `2.1.${i + 1}`,
      title: String(label),
      pages: c.page?.value ? `p.${c.page.value}` : undefined,
      depth: 3,
    };
  });

  // Deep clone tree, replace coverage codes children
  const cloned = JSON.parse(JSON.stringify(tree)) as TreeNode;
  const coverage = cloned.children?.find((c) => c.id === "2");
  if (coverage?.children) {
    const codesNode = coverage.children.find((c) => c.id === "2.1");
    if (codesNode) {
      codesNode.children = codeChildren;
      codesNode.pages = `${codeChildren.length} codes`;
    }
  }
  return cloned;
}

/* ------------------------------------------------------------------ */
/*  Layout computation                                                 */
/* ------------------------------------------------------------------ */

function computeLayout(
  tree: TreeNode,
  expandedIds: Set<string>,
  expandedLevel: number
): { nodes: LayoutNode[]; edges: Array<{ from: string; to: string }> } {
  const nodes: LayoutNode[] = [];
  const edges: Array<{ from: string; to: string }> = [];

  // BFS/DFS to collect visible nodes with tier info
  type QueueItem = { node: TreeNode; parentId: string | null; siblingIndex: number; siblingCount: number };
  const tiers: Map<number, QueueItem[]> = new Map();

  function collect(node: TreeNode, parentId: string | null, sibIndex: number, sibCount: number) {
    const depth = node.depth;
    if (depth > MAX_DEPTH) return;
    if (!tiers.has(depth)) tiers.set(depth, []);
    tiers.get(depth)!.push({ node, parentId, siblingIndex: sibIndex, siblingCount: sibCount });

    if (parentId !== null) {
      edges.push({ from: parentId, to: node.id });
    }

    const isExpanded =
      expandedIds.has(node.id) || node.depth < expandedLevel;
    if (isExpanded && node.children && node.depth < MAX_DEPTH) {
      node.children.forEach((child, i) => {
        collect(child, node.id, i, node.children!.length);
      });
    }
  }

  collect(tree, null, 0, 1);

  // Assign positions tier by tier
  tiers.forEach((items, depth) => {
    const tierWidth = items.length * NODE_W + (items.length - 1) * H_GAP;
    const startX = -tierWidth / 2;
    const y = depth * (NODE_H + V_GAP);

    items.forEach((item, i) => {
      const x = startX + i * (NODE_W + H_GAP);
      const hasChildren = !!(item.node.children && item.node.children.length > 0);
      nodes.push({
        id: item.node.id,
        title: item.node.title,
        pages: item.node.pages,
        depth: item.node.depth,
        x,
        y,
        width: NODE_W,
        height: NODE_H,
        parentId: item.parentId,
        hasChildren,
        isLeaf: !hasChildren,
        childIds: (item.node.children || []).map((c) => c.id),
      });
    });
  });

  // Center children under their parent
  // Multiple passes to converge
  for (let pass = 0; pass < 3; pass++) {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // For each parent, center its children
    for (const n of nodes) {
      if (n.childIds.length === 0) continue;
      const visibleChildren = n.childIds
        .map((id) => nodeMap.get(id))
        .filter(Boolean) as LayoutNode[];
      if (visibleChildren.length === 0) continue;

      const childCenter =
        visibleChildren.reduce((s, c) => s + c.x + c.width / 2, 0) /
        visibleChildren.length;
      const parentCenter = n.x + n.width / 2;
      const offset = parentCenter - childCenter;

      visibleChildren.forEach((c) => {
        c.x += offset;
      });
    }

    // Resolve overlaps within each tier
    tiers.forEach((items, depth) => {
      const tierNodes = items
        .map((item) => nodeMap.get(item.node.id)!)
        .filter(Boolean)
        .sort((a, b) => a.x - b.x);

      for (let i = 1; i < tierNodes.length; i++) {
        const prev = tierNodes[i - 1];
        const curr = tierNodes[i];
        const minX = prev.x + prev.width + H_GAP;
        if (curr.x < minX) {
          curr.x = minX;
        }
      }
    });
  }

  // Normalize: shift so minimum x is 0
  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  nodes.forEach((n) => {
    n.x -= minX;
    n.y -= minY;
  });

  return { nodes, edges };
}

/* ------------------------------------------------------------------ */
/*  SVG Edge                                                           */
/* ------------------------------------------------------------------ */

function EdgePath({
  fromNode,
  toNode,
  isActive,
}: {
  fromNode: LayoutNode;
  toNode: LayoutNode;
  isActive: boolean;
}) {
  const x1 = fromNode.x + fromNode.width / 2;
  const y1 = fromNode.y + fromNode.height;
  const x2 = toNode.x + toNode.width / 2;
  const y2 = toNode.y;

  // Smooth step curve
  const midY = (y1 + y2) / 2;
  const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

  return (
    <motion.path
      d={d}
      fill="none"
      stroke={isActive ? "var(--accent)" : "var(--border-strong, #D1D5DB)"}
      strokeWidth={isActive ? 1.5 : 1}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Node Card                                                          */
/* ------------------------------------------------------------------ */

const nodeVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease },
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    transition: { duration: 0.2, ease },
  },
};

function NodeCard({
  node,
  isSelected,
  isSiblingOfSelected,
  onClick,
  staggerDelay,
}: {
  node: LayoutNode;
  isSelected: boolean;
  isSiblingOfSelected: boolean;
  onClick: () => void;
  staggerDelay: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      layout
      variants={nodeVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ delay: staggerDelay }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        position: "absolute",
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        background: "var(--bg-surface)",
        borderRadius: "var(--r-sm)",
        border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
        boxShadow: hovered ? "var(--shadow-sm)" : "var(--shadow-xs)",
        padding: "8px 12px",
        cursor: node.hasChildren ? "pointer" : "default",
        display: "flex",
        alignItems: "center",
        gap: 8,
        opacity: isSiblingOfSelected ? 0.55 : 1,
        transition: "box-shadow 150ms ease, border-color 150ms ease, opacity 150ms ease",
        zIndex: isSelected ? 2 : 1,
        userSelect: "none",
      }}
    >
      {/* Icon */}
      {node.isLeaf ? (
        <FileText
          size={15}
          style={{
            color: isSelected ? "var(--accent)" : "var(--text-muted)",
            flexShrink: 0,
          }}
        />
      ) : (
        <FolderOpen
          size={15}
          style={{
            color: isSelected ? "var(--accent)" : "var(--text-muted)",
            flexShrink: 0,
          }}
        />
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: isSelected ? 600 : 500,
            color: isSelected ? "var(--accent)" : "var(--text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.3,
          }}
        >
          {node.title}
        </div>
        {node.pages && (
          <div
            className="mono"
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              marginTop: 2,
            }}
          >
            {node.pages}
          </div>
        )}
      </div>

      {/* Expand indicator */}
      {node.hasChildren && (
        <ChevronDown
          size={12}
          style={{
            color: "var(--text-muted)",
            flexShrink: 0,
          }}
        />
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Running indicator dots                                              */
/* ------------------------------------------------------------------ */

function RunningDots() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        marginLeft: 8,
      }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
          style={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: "var(--accent)",
          }}
        />
      ))}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function StageStructureTree({
  filename,
  pageCount,
  masterSchema,
  isRunning,
}: Props) {
  const [expandedLevel, setExpandedLevel] = useState(2);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [manualExpanded, setManualExpanded] = useState<Set<string>>(new Set());
  const [manualCollapsed, setManualCollapsed] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Build tree
  const tree = useMemo(() => {
    const base = buildStaticTree(pageCount);
    const withSchema = seedFromSchema(base, masterSchema);
    if (filename) {
      withSchema.title = `Document · ${pageCount ?? 147} pages`;
    }
    return withSchema;
  }, [filename, pageCount, masterSchema]);

  // Compute effective expanded set
  const effectiveExpandedIds = useMemo(() => {
    const ids = new Set<string>();

    function traverse(node: TreeNode) {
      // Auto-expand based on level
      if (node.depth < expandedLevel) {
        ids.add(node.id);
      }
      // Manual overrides
      if (manualExpanded.has(node.id)) {
        ids.add(node.id);
      }
      if (manualCollapsed.has(node.id)) {
        ids.delete(node.id);
      }
      node.children?.forEach(traverse);
    }
    traverse(tree);
    return ids;
  }, [tree, expandedLevel, manualExpanded, manualCollapsed]);

  // Compute layout
  const { nodes, edges } = useMemo(
    () => computeLayout(tree, effectiveExpandedIds, expandedLevel),
    [tree, effectiveExpandedIds, expandedLevel]
  );

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // Canvas size
  const canvasWidth = useMemo(
    () => Math.max(...nodes.map((n) => n.x + n.width)) + 32,
    [nodes]
  );
  const canvasHeight = useMemo(
    () => Math.max(...nodes.map((n) => n.y + n.height)) + 32,
    [nodes]
  );

  // Selected node's parent id for sibling dimming
  const selectedParentId = selectedId ? nodeMap.get(selectedId)?.parentId : null;
  const selectedSiblingIds = useMemo(() => {
    if (!selectedId || !selectedParentId) return new Set<string>();
    const parent = nodeMap.get(selectedParentId);
    if (!parent) return new Set<string>();
    return new Set(parent.childIds.filter((id) => id !== selectedId));
  }, [selectedId, selectedParentId, nodeMap]);

  // Active path: from selected node to root
  const activePath = useMemo(() => {
    if (!selectedId) return new Set<string>();
    const path = new Set<string>();
    let current: string | null = selectedId;
    while (current) {
      path.add(current);
      current = nodeMap.get(current)?.parentId ?? null;
    }
    return path;
  }, [selectedId, nodeMap]);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      const node = nodeMap.get(nodeId);
      if (!node) return;

      setSelectedId((prev) => (prev === nodeId ? null : nodeId));

      if (node.hasChildren) {
        const isCurrentlyExpanded = effectiveExpandedIds.has(nodeId);
        if (isCurrentlyExpanded) {
          setManualCollapsed((prev) => new Set(prev).add(nodeId));
          setManualExpanded((prev) => {
            const next = new Set(prev);
            next.delete(nodeId);
            return next;
          });
        } else {
          setManualExpanded((prev) => new Set(prev).add(nodeId));
          setManualCollapsed((prev) => {
            const next = new Set(prev);
            next.delete(nodeId);
            return next;
          });
        }
      }
    },
    [nodeMap, effectiveExpandedIds]
  );

  // Reset manual overrides when expandedLevel changes
  useEffect(() => {
    setManualExpanded(new Set());
    setManualCollapsed(new Set());
  }, [expandedLevel]);

  // Count sections
  const sectionCount = useMemo(() => {
    let count = 0;
    function traverse(node: TreeNode) {
      count++;
      node.children?.forEach(traverse);
    }
    traverse(tree);
    return count;
  }, [tree]);

  return (
    <motion.div initial="hidden" animate="visible" style={{ width: "100%" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
          {isRunning && <RunningDots />}
        </div>

        {/* Expand Level dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Expand Level
          </span>
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
              outline: "none",
            }}
          >
            {[1, 2, 3, 4].map((l) => (
              <option key={l} value={l}>
                Level {l} ▾
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tree canvas */}
      <div
        ref={containerRef}
        style={{
          maxHeight: 480,
          overflowY: "auto",
          overflowX: "auto",
          borderRadius: "var(--r-md)",
          border: "1px solid var(--border)",
          background: "var(--bg-raised)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "relative",
            width: canvasWidth,
            height: canvasHeight,
            minWidth: "100%",
            padding: 16,
          }}
        >
          {/* SVG edges layer */}
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: canvasWidth,
              height: canvasHeight,
              pointerEvents: "none",
              overflow: "visible",
            }}
          >
            {edges.map((edge) => {
              const fromNode = nodeMap.get(edge.from);
              const toNode = nodeMap.get(edge.to);
              if (!fromNode || !toNode) return null;
              const isActive =
                activePath.has(edge.from) && activePath.has(edge.to);
              return (
                <EdgePath
                  key={`${edge.from}-${edge.to}`}
                  fromNode={fromNode}
                  toNode={toNode}
                  isActive={isActive}
                />
              );
            })}
          </svg>

          {/* Node cards */}
          <AnimatePresence>
            {nodes.map((node, idx) => (
              <NodeCard
                key={node.id}
                node={node}
                isSelected={selectedId === node.id}
                isSiblingOfSelected={selectedSiblingIds.has(node.id)}
                onClick={() => handleNodeClick(node.id)}
                staggerDelay={isRunning ? idx * 0.08 : 0}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Inline stats */}
      <div
        style={{
          display: "flex",
          gap: 24,
          marginTop: 12,
          padding: "8px 0",
        }}
      >
        {[
          {
            label: "Parsing progress",
            value: isRunning ? "In progress" : "Complete",
          },
          {
            label: "Pages parsed",
            value: `${pageCount ?? 147}`,
          },
          {
            label: "Sections",
            value: `${sectionCount}`,
          },
        ].map((stat, i) => (
          <span key={i} style={{ fontSize: 12, color: "var(--text-muted)" }}>
            <span
              style={{
                color: "var(--text-secondary)",
                fontWeight: 500,
              }}
            >
              {stat.label}
            </span>{" "}
            <span className="mono">{stat.value}</span>
          </span>
        ))}
      </div>
    </motion.div>
  );
}
