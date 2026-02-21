/**
 * Programmatic Mermaid code generator.
 * Converts structured JSON diagram descriptions into syntactically valid Mermaid code.
 * Handles special character escaping, node ID sanitization, and proper arrow syntax.
 */

// ── Shared helpers ───────────────────────────────────────────────────

/** Sanitize a node/participant ID to only allow [A-Za-z0-9_] */
function sanitizeId(id: string): string {
  return id.replace(/[^A-Za-z0-9_]/g, "_");
}

/** Wrap label in double quotes to safely handle special characters */
function quoteLabel(label: string): string {
  // Collapse newlines → space, then escape inner double quotes
  const escaped = label.replace(/\r?\n/g, " ").replace(/"/g, "#quot;");
  return `"${escaped}"`;
}

// ── Flowchart ────────────────────────────────────────────────────────

interface FlowchartNode {
  id: string;
  label: string;
  shape?: "rect" | "round" | "diamond" | "stadium" | "cylinder" | "circle";
}

interface FlowchartEdge {
  from: string;
  to: string;
  label?: string;
  style?: "solid" | "dotted" | "thick";
}

interface FlowchartSubgraph {
  id: string;
  label: string;
  nodeIds: string[];
}

interface FlowchartDiagram {
  type: "flowchart";
  direction?: "TD" | "LR" | "RL" | "BT";
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  subgraphs?: FlowchartSubgraph[];
}

function renderNodeShape(id: string, label: string, shape?: string): string {
  const sid = sanitizeId(id);
  const ql = quoteLabel(label);
  switch (shape) {
    case "round":
      return `${sid}(${ql})`;
    case "diamond":
      return `${sid}{${ql}}`;
    case "stadium":
      return `${sid}([${ql}])`;
    case "cylinder":
      return `${sid}[(${ql})]`;
    case "circle":
      return `${sid}((${ql}))`;
    case "rect":
    default:
      return `${sid}[${ql}]`;
  }
}

function renderEdgeArrow(style?: string): string {
  switch (style) {
    case "dotted":
      return "-.->";
    case "thick":
      return "==>";
    case "solid":
    default:
      return "-->";
  }
}

function renderFlowchart(diagram: FlowchartDiagram): string {
  const dir = diagram.direction ?? "TD";
  const lines: string[] = [`flowchart ${dir}`];

  // Collect nodes that belong to subgraphs
  const subgraphNodeIds = new Set<string>();
  if (diagram.subgraphs) {
    for (const sg of diagram.subgraphs) {
      for (const nid of sg.nodeIds) {
        subgraphNodeIds.add(nid);
      }
    }
  }

  // Render subgraphs with their nodes
  if (diagram.subgraphs) {
    for (const sg of diagram.subgraphs) {
      lines.push(`    subgraph ${sanitizeId(sg.id)}[${quoteLabel(sg.label)}]`);
      for (const nid of sg.nodeIds) {
        const node = diagram.nodes.find((n) => n.id === nid);
        if (node) {
          lines.push(`        ${renderNodeShape(node.id, node.label, node.shape)}`);
        }
      }
      lines.push("    end");
    }
  }

  // Render nodes not in any subgraph
  for (const node of diagram.nodes) {
    if (!subgraphNodeIds.has(node.id)) {
      lines.push(`    ${renderNodeShape(node.id, node.label, node.shape)}`);
    }
  }

  // Render edges
  for (const edge of diagram.edges) {
    const from = sanitizeId(edge.from);
    const to = sanitizeId(edge.to);
    const arrow = renderEdgeArrow(edge.style);
    if (edge.label) {
      lines.push(`    ${from} ${arrow}|${quoteLabel(edge.label)}| ${to}`);
    } else {
      lines.push(`    ${from} ${arrow} ${to}`);
    }
  }

  return lines.join("\n");
}

// ── Sequence Diagram ─────────────────────────────────────────────────

interface SequenceParticipant {
  id: string;
  label?: string;
}

interface SequenceMessage {
  from: string;
  to: string;
  label: string;
  type?: "solid" | "dotted" | "solid_arrow" | "dotted_arrow";
  activate?: boolean;
  deactivate?: boolean;
}

interface SequenceNote {
  over: string[];
  text: string;
}

interface SequenceDiagram {
  type: "sequence";
  participants: SequenceParticipant[];
  messages: SequenceMessage[];
  notes?: SequenceNote[];
}

function renderMessageArrow(type?: string): string {
  switch (type) {
    case "dotted":
      return "-->>";
    case "solid_arrow":
      return "->>";
    case "dotted_arrow":
      return "-->";
    case "solid":
    default:
      return "->>";
  }
}

function renderSequence(diagram: SequenceDiagram): string {
  const lines: string[] = ["sequenceDiagram"];

  // Participants
  for (const p of diagram.participants) {
    if (p.label && p.label !== p.id) {
      lines.push(`    participant ${sanitizeId(p.id)} as ${quoteLabel(p.label)}`);
    } else {
      lines.push(`    participant ${sanitizeId(p.id)}`);
    }
  }

  // Messages
  for (const msg of diagram.messages) {
    const from = sanitizeId(msg.from);
    const to = sanitizeId(msg.to);
    const arrow = renderMessageArrow(msg.type);
    const label = msg.label.replace(/\r?\n/g, " ").replace(/"/g, "'");

    if (msg.activate) {
      lines.push(`    ${from} ${arrow} +${to}: ${label}`);
    } else if (msg.deactivate) {
      lines.push(`    ${from} ${arrow} -${to}: ${label}`);
    } else {
      lines.push(`    ${from} ${arrow} ${to}: ${label}`);
    }
  }

  // Notes
  if (diagram.notes) {
    for (const note of diagram.notes) {
      const over = note.over.map(sanitizeId).join(", ");
      const noteText = note.text.replace(/\r?\n/g, " ");
      lines.push(`    note over ${over}: ${noteText}`);
    }
  }

  return lines.join("\n");
}

// ── Class Diagram ────────────────────────────────────────────────────

interface ClassDef {
  name: string;
  members?: string[];
  methods?: string[];
}

interface ClassRelation {
  from: string;
  to: string;
  type?: "inheritance" | "composition" | "aggregation" | "dependency" | "association";
  label?: string;
}

interface ClassDiagram {
  type: "class";
  classes: ClassDef[];
  relations?: ClassRelation[];
}

function renderRelationArrow(type?: string): string {
  switch (type) {
    case "inheritance":
      return "--|>";
    case "composition":
      return "--*";
    case "aggregation":
      return "--o";
    case "dependency":
      return "..>";
    case "association":
    default:
      return "-->";
  }
}

function renderClass(diagram: ClassDiagram): string {
  const lines: string[] = ["classDiagram"];

  // Classes
  for (const cls of diagram.classes) {
    lines.push(`    class ${sanitizeId(cls.name)} {`);
    if (cls.members) {
      for (const m of cls.members) {
        lines.push(`        ${m}`);
      }
    }
    if (cls.methods) {
      for (const m of cls.methods) {
        lines.push(`        ${m}`);
      }
    }
    lines.push("    }");
  }

  // Relations
  if (diagram.relations) {
    for (const rel of diagram.relations) {
      const from = sanitizeId(rel.from);
      const to = sanitizeId(rel.to);
      const arrow = renderRelationArrow(rel.type);
      if (rel.label) {
        lines.push(`    ${from} ${arrow} ${to} : ${rel.label}`);
      } else {
        lines.push(`    ${from} ${arrow} ${to}`);
      }
    }
  }

  return lines.join("\n");
}

// ── Public API ───────────────────────────────────────────────────────

export type DiagramInput = FlowchartDiagram | SequenceDiagram | ClassDiagram;

/**
 * Render a structured diagram description into valid Mermaid code.
 * Returns the Mermaid code string (without code fences).
 */
export function renderMermaid(input: DiagramInput): string {
  switch (input.type) {
    case "flowchart":
      return renderFlowchart(input);
    case "sequence":
      return renderSequence(input);
    case "class":
      return renderClass(input);
    default:
      return `Error: Unsupported diagram type "${(input as { type: string }).type}". Supported types: flowchart, sequence, class.`;
  }
}
