"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import {
  Activity,
  Bot,
  BrainCircuit,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Cloud,
  Code2,
  Command,
  Database,
  GitBranch,
  Github,
  Globe2,
  History,
  Home,
  KeyRound,
  LayoutTemplate,
  Menu,
  MessageCircle,
  Moon,
  MoreHorizontal,
  MousePointer2,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Plus,
  Save,
  Search,
  Share2,
  Slack,
  Sparkles,
  Sun,
  Trash2,
  Variable,
  WandSparkles,
  Webhook,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type NodeKind = "trigger" | "agent" | "logic" | "app" | "model" | "memory" | "tool" | "code";
type RunState = "idle" | "running" | "success" | "error";
type WorkflowData = {
  label: string;
  subtitle: string;
  kind: NodeKind;
  icon: string;
  status?: RunState;
  description?: string;
  parameter?: string;
  runtime?: string;
  input?: string;
  output?: string;
  attachments?: string[];
};
type WorkflowNode = Node<WorkflowData>;
type ViewMode = "editor" | "executions";
type InspectorTab = "parameters" | "settings" | "output";

const iconMap: Record<string, LucideIcon> = {
  message: MessageCircle,
  bot: Bot,
  branch: GitBranch,
  slack: Slack,
  brain: BrainCircuit,
  database: Database,
  globe: Globe2,
  code: Code2,
  webhook: Webhook,
  github: Github,
};

const catalog: Array<{ label: string; subtitle: string; kind: NodeKind; icon: string; category: string }> = [
  { label: "Webhook", subtitle: "Starts the workflow", kind: "trigger", icon: "webhook", category: "Triggers" },
  { label: "Chat message", subtitle: "Receive a conversation", kind: "trigger", icon: "message", category: "Triggers" },
  { label: "AI Agent", subtitle: "Tools agent", kind: "agent", icon: "bot", category: "AI" },
  { label: "OpenAI Model", subtitle: "Chat model", kind: "model", icon: "brain", category: "AI" },
  { label: "Window Memory", subtitle: "Remember context", kind: "memory", icon: "database", category: "AI" },
  { label: "If", subtitle: "Route by condition", kind: "logic", icon: "branch", category: "Flow" },
  { label: "Slack", subtitle: "Send a message", kind: "app", icon: "slack", category: "Apps" },
  { label: "HTTP Request", subtitle: "Call any API", kind: "tool", icon: "globe", category: "Core" },
  { label: "Code", subtitle: "Run JavaScript", kind: "code", icon: "code", category: "Core" },
  { label: "GitHub", subtitle: "Work with repositories", kind: "app", icon: "github", category: "Apps" },
];

const initialNodes: WorkflowNode[] = [
  { id: "trigger", type: "workflow", position: { x: 35, y: 220 }, data: { label: "New support message", subtitle: "Slack · #support-triage", kind: "trigger", icon: "message", description: "Starts the workflow when a new support message arrives.", runtime: "200 OK", output: "{ user, query, accountId }" } },
  { id: "agent", type: "workflow", position: { x: 360, y: 165 }, data: { label: "Support Triage Agent", subtitle: "gpt-4.1-mini · Temperature 0.2", kind: "agent", icon: "bot", description: "Plans a response and selects the right tool.", parameter: "You are a helpful operations assistant.", runtime: "840ms", input: "{ query: string }", output: "{ intent, score }", attachments: ["HTTP Request · Company search", "Window Memory · Last 10 turns"] } },
  { id: "condition", type: "workflow", position: { x: 745, y: 220 }, data: { label: "Resolution check", subtitle: "score ≥ 0.85", kind: "logic", icon: "branch", description: "Routes messages based on the agent result.", parameter: "{{ $json.success }} is true", runtime: "12ms", input: "{ score: number }" } },
  { id: "success", type: "workflow", position: { x: 1045, y: 95 }, data: { label: "Reply to customer", subtitle: "Slack · Send message", kind: "app", icon: "slack", description: "Sends the completed response to the team.", parameter: "#automation-alerts", runtime: "Resolved", input: "{ response: string }" } },
  { id: "failure", type: "workflow", position: { x: 1045, y: 340 }, data: { label: "Escalate for review", subtitle: "Slack · Send message", kind: "app", icon: "slack", description: "Notifies the team when the response needs review.", parameter: "#automation-alerts", runtime: "Fallback", input: "{ context, reason }" } },
];

const initialEdges: Edge[] = [
  { id: "e1", source: "trigger", target: "agent", type: "smoothstep" },
  { id: "e2", source: "agent", target: "condition", type: "smoothstep" },
  { id: "e3", source: "condition", target: "success", type: "smoothstep", label: "✓ Resolved", className: "edge-success" },
  { id: "e4", source: "condition", target: "failure", type: "smoothstep", label: "× Fallback", className: "edge-failure" },
];

function WorkflowNodeCard({ data, selected }: NodeProps<WorkflowNode>) {
  const Icon = iconMap[data.icon] ?? Sparkles;
  return (
    <div className={cn("workflow-node", `workflow-node-${data.kind}`, selected && "is-selected", data.status === "running" && "is-running", data.status === "success" && "is-success")}>
      <Handle type="target" position={Position.Left} />
      <div className="node-main-row">
        <div className="node-icon-wrap"><Icon aria-hidden="true" /></div>
        <div className="min-w-0 flex-1">
          <div className="node-title text-[13px] font-semibold text-foreground">{data.label}</div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">{data.subtitle}</div>
        </div>
        {data.runtime ? <span className="node-runtime">{data.status === "success" ? "✓ " : ""}{data.runtime}</span> : null}
        {data.status === "success" ? <Check className="size-3.5 text-success" /> : null}
      </div>
      {data.attachments?.length ? <div className="node-attachments"><span>Tools & memory</span>{data.attachments.map((item) => <div key={item}><span />{item}</div>)}</div> : null}
      {(data.input || data.output) ? <div className="node-contract">{data.input && <span>IN · {data.input}</span>}{data.output && <span>OUT · {data.output}</span>}</div> : null}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { workflow: WorkflowNodeCard };

function IconButton({ label, children, ...props }: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" aria-label={label} {...props}>{children}</Button></TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const items = [
    [Home, "Overview"], [Activity, "Workflows"], [History, "Executions"], [LayoutTemplate, "Templates"], [Variable, "Variables"], [KeyRound, "Credentials"],
  ] as const;
  return (
    <aside className={cn("workspace-sidebar", collapsed && "is-collapsed")}>
      <div className="flex h-16 items-center gap-2 border-b px-3">
        <div className="brand-mark"><span /><span /><span /></div>
        {!collapsed && <span className="text-sm font-bold">Flowcraft</span>}
        <IconButton label={collapsed ? "Expand navigation" : "Collapse navigation"} onClick={onToggle} className="ml-auto">
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </IconButton>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {items.map(([Icon, label], index) => (
          <Button key={label} variant={index === 1 ? "secondary" : "ghost"} className={cn("justify-start", collapsed && "justify-center px-0")} title={label}>
            <Icon />{!collapsed && <span>{label}</span>}
          </Button>
        ))}
        <div className="mt-auto space-y-1">
          <Button variant="ghost" className={cn("w-full justify-start", collapsed && "justify-center px-0")}><CircleHelp />{!collapsed && "Help & docs"}</Button>
          <div className={cn("user-card", collapsed && "justify-center p-1.5")}>
            <div className="avatar">AK</div>{!collapsed && <div className="min-w-0"><p className="truncate text-xs font-medium">Alex Kim</p><p className="truncate text-[10px] text-muted-foreground">Workspace owner</p></div>}
          </div>
        </div>
      </nav>
    </aside>
  );
}

function NodeLibrary({ open, query, setQuery, onClose, onAdd }: { open: boolean; query: string; setQuery: (value: string) => void; onClose: () => void; onAdd: (item: (typeof catalog)[number]) => void }) {
  const results = catalog.filter((item) => `${item.label} ${item.subtitle} ${item.category}`.toLowerCase().includes(query.toLowerCase()));
  const grouped = results.reduce<Record<string, typeof results>>((acc, item) => { (acc[item.category] ??= []).push(item); return acc; }, {});
  return (
    <section className={cn("node-library", open && "is-open")} aria-label="Node library">
      <div className="flex items-center justify-between border-b p-4"><div><h2 className="font-semibold">Add a step</h2><p className="text-xs text-muted-foreground">Choose what happens next</p></div><IconButton label="Close node library" onClick={onClose}><X /></IconButton></div>
      <div className="p-3"><div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input autoFocus={open} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search 400+ integrations" className="pl-9" /></div></div>
      <div className="library-scroll">
        {Object.entries(grouped).map(([category, items]) => <div key={category} className="mb-4"><p className="mb-1 px-3 text-[10px] font-semibold uppercase text-muted-foreground">{category}</p>{items.map((item) => { const Icon = iconMap[item.icon] ?? Sparkles; return <Button key={`${item.category}-${item.label}`} variant="ghost" className="library-item" onClick={() => onAdd(item)}><span className={cn("library-icon", `tone-${item.kind}`)}><Icon /></span><span className="min-w-0 flex-1 text-left"><span className="block truncate text-xs font-medium">{item.label}</span><span className="block truncate text-[10px] text-muted-foreground">{item.subtitle}</span></span><ChevronRight className="size-3.5 text-muted-foreground" /></Button>})}</div>)}
        {!results.length && <div className="p-8 text-center text-sm text-muted-foreground">No nodes found</div>}
      </div>
    </section>
  );
}

function NodeInspector({ node, tab, setTab, onClose, onUpdate, onTest, testing }: { node: WorkflowNode; tab: InspectorTab; setTab: (tab: InspectorTab) => void; onClose: () => void; onUpdate: (data: Partial<WorkflowData>) => void; onTest: () => void; testing: boolean }) {
  const Icon = iconMap[node.data.icon] ?? Sparkles;
  return (
    <div className="inspector-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="node-inspector" role="dialog" aria-modal="true" aria-label={`Configure ${node.data.label}`}>
        <header className="inspector-header">
          <div className={cn("library-icon", `tone-${node.data.kind}`)}><Icon /></div>
          <div className="min-w-0"><Input value={node.data.label} onChange={(e) => onUpdate({ label: e.target.value })} className="h-8 border-0 px-1 text-base font-semibold shadow-none" /><p className="px-1 text-xs text-muted-foreground">{node.data.subtitle}</p></div>
          <Button onClick={onTest} disabled={testing} className="ml-auto"><Play />{testing ? "Running…" : "Test step"}</Button>
          <IconButton label="Close configuration" onClick={onClose}><X /></IconButton>
        </header>
        <div className="inspector-tabs">{(["parameters", "settings", "output"] as InspectorTab[]).map((item) => <Button key={item} variant="ghost" onClick={() => setTab(item)} className={cn("inspector-tab capitalize", tab === item && "is-active")}>{item}</Button>)}</div>
        <div className="inspector-body">
          {tab === "parameters" && <div className="mx-auto max-w-2xl space-y-5"><div><label className="field-label">Description</label><Textarea value={node.data.description ?? ""} onChange={(e) => onUpdate({ description: e.target.value })} rows={3} /></div><div><div className="mb-2 flex items-center justify-between"><label className="field-label">Configuration</label><div className="mode-toggle"><span className="is-active">Fixed</span><span>Expression</span></div></div><Textarea value={node.data.parameter ?? ""} onChange={(e) => onUpdate({ parameter: e.target.value })} rows={6} placeholder="Enter a value or expression…" /></div><div className="info-panel"><WandSparkles /><div><p className="text-xs font-semibold">AI-ready parameters</p><p className="mt-1 text-xs text-muted-foreground">Use expressions to reference data from earlier steps.</p></div></div></div>}
          {tab === "settings" && <div className="mx-auto max-w-2xl space-y-3"><SettingRow title="Always output data" description="Continue even when this step returns nothing." /><SettingRow title="Retry on failure" description="Try this step again before stopping the run." /><SettingRow title="Continue on error" description="Pass error details to the next step." /></div>}
          {tab === "output" && <div className="mx-auto max-w-2xl"><div className="output-toolbar"><span>1 item</span><span>JSON</span></div><pre className="output-code">{`{\n  "success": true,\n  "node": "${node.data.label}",\n  "message": "Step completed successfully",\n  "timestamp": "2026-09-24T17:39:00Z"\n}`}</pre></div>}
        </div>
      </section>
    </div>
  );
}

function SettingRow({ title, description }: { title: string; description: string }) {
  const [checked, setChecked] = useState(false);
  return <div className="setting-row"><div><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground">{description}</p></div><Switch checked={checked} onCheckedChange={setChecked} /></div>;
}

function ExecutionsView({ onBack }: { onBack: () => void }) {
  const runs = [
    ["Production run", "Succeeded", "Today, 5:26 PM", "1.8s"],
    ["Manual run", "Succeeded", "Today, 4:12 PM", "2.1s"],
    ["Production run", "Failed", "Yesterday, 11:42 AM", "0.9s"],
    ["Manual run", "Succeeded", "Sep 22, 3:08 PM", "1.5s"],
  ];
  return <div className="executions-page"><div className="executions-heading"><div><p className="eyebrow">Workflow history</p><h2 className="text-xl font-semibold">Executions</h2><p className="text-sm text-muted-foreground">Inspect every run and quickly return to the canvas.</p></div><Button variant="outline" onClick={onBack}><ChevronLeft />Back to editor</Button></div><div className="stats-grid"><div><span>Success rate</span><strong>98.4%</strong></div><div><span>Average runtime</span><strong>1.7s</strong></div><div><span>Runs this week</span><strong>184</strong></div></div><div className="execution-list"><div className="execution-list-head"><span>Execution</span><span>Status</span><span>Started</span><span>Duration</span></div>{runs.map((run, index) => <button type="button" key={`${run[0]}-${run[2]}`} className="execution-row" onClick={() => toast.info("Execution details loaded") }><span><span className="run-number">#{1284 - index}</span>{run[0]}</span><span className={cn("status-pill", run[1] === "Failed" && "is-failed")}><span />{run[1]}</span><span>{run[2]}</span><span>{run[3]} <ChevronRight /></span></button>)}</div></div>;
}

function CanvasWorkspace({ nodes, edges, setNodes, setEdges, onSelect, onOpenLibrary, theme }: { nodes: WorkflowNode[]; edges: Edge[]; setNodes: React.Dispatch<React.SetStateAction<WorkflowNode[]>>; setEdges: React.Dispatch<React.SetStateAction<Edge[]>>; onSelect: (node: WorkflowNode) => void; onOpenLibrary: () => void; theme: "light" | "dark" }) {
  const onNodesChange = useCallback((changes: NodeChange<WorkflowNode>[]) => setNodes((current) => applyNodeChanges(changes, current)), [setNodes]);
  const onEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => setEdges((current) => applyEdgeChanges(changes, current)), [setEdges]);
  const onConnect = useCallback((connection: Connection) => setEdges((current) => addEdge({ ...connection, type: "smoothstep", animated: true }, current)), [setEdges]);
  return <div className="canvas-wrap"><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeDoubleClick={(_, node) => onSelect(node)} onNodeClick={(_, node) => onSelect(node)} fitView fitViewOptions={{ padding: 0.14 }} minZoom={0.45} snapToGrid snapGrid={[16, 16]} deleteKeyCode={["Backspace", "Delete"]} selectionOnDrag multiSelectionKeyCode={["Meta", "Control"]} colorMode={theme} defaultEdgeOptions={{ style: { strokeWidth: 2 } }}>
    <Background variant={BackgroundVariant.Dots} gap={16} size={1.2} />
    <Controls showInteractive={false} position="bottom-left" />
    <MiniMap position="bottom-right" pannable zoomable nodeStrokeWidth={3} />
    <Panel position="top-right"><IconButton label="Add node" onClick={onOpenLibrary} className="canvas-add"><Plus /></IconButton></Panel>
    <Panel position="top-left"><div className="canvas-hint"><MousePointer2 />Double-click a node to configure it</div></Panel>
  </ReactFlow></div>;
}

export function WorkflowStudio() {
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("parameters");
  const [mode, setMode] = useState<ViewMode>("editor");
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [name, setName] = useState("AI support triage");
  const [saved, setSaved] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);
  const runTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedId), [nodes, selectedId]);

  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); }, [theme]);
  useEffect(() => { const handler = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen((open) => !open); } if (event.key.toLowerCase() === "n" && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) setLibraryOpen(true); if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); void runWorkflow(); } }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); });
  useEffect(() => () => { if (runTimer.current) clearTimeout(runTimer.current); }, []);

  const runWorkflow = async () => {
    if (running) return;
    setRunning(true); setNodes((current) => current.map((node) => ({ ...node, data: { ...node.data, status: "running" } })));
    await new Promise<void>((resolve) => { runTimer.current = setTimeout(resolve, 1100); });
    setNodes((current) => current.map((node) => ({ ...node, data: { ...node.data, status: "success" } })));
    setRunning(false); toast.success("Workflow completed", { description: "8 steps ran successfully in 1.1 seconds." });
  };
  const addCatalogNode = (item: (typeof catalog)[number]) => { const id = `${item.kind}-${Date.now()}`; setNodes((current) => [...current, { id, type: "workflow", position: { x: 500 + Math.random() * 160, y: 260 + Math.random() * 120 }, data: { ...item, description: item.subtitle, parameter: "" } }]); setLibraryOpen(false); setQuery(""); setSaved(false); toast.success(`${item.label} added`); };
  const updateSelected = (data: Partial<WorkflowData>) => { if (!selectedId) return; setNodes((current) => current.map((node) => node.id === selectedId ? { ...node, data: { ...node.data, ...data } } : node)); setSaved(false); };
  const deleteSelected = () => { if (!selectedId) return; setNodes((current) => current.filter((node) => node.id !== selectedId)); setEdges((current) => current.filter((edge) => edge.source !== selectedId && edge.target !== selectedId)); setSelectedId(null); setSaved(false); toast.success("Node removed"); };

  return <TooltipProvider delayDuration={250}><main className="workspace-shell">
    <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((value) => !value)} />
    <section className="workspace-main">
      <header className="workspace-header">
        <IconButton label="Open menu" className="mobile-menu" onClick={() => setSidebarCollapsed((value) => !value)}><Menu /></IconButton>
        <div className="title-stack"><div className="flex items-center gap-2"><Input value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} className="workflow-title" aria-label="Workflow name" /><span className="tag-chip">Production</span></div><div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Cloud className="size-3" />{saved ? "All changes saved" : "Unsaved changes"}</div></div>
        <div className="view-tabs"><Button variant="ghost" className={cn(mode === "editor" && "is-active")} onClick={() => setMode("editor")}>Editor</Button><Button variant="ghost" className={cn(mode === "executions" && "is-active")} onClick={() => setMode("executions")}>Executions</Button></div>
        <div className="header-actions"><div className="activation"><span className={cn("status-dot", active && "is-active")} /> <span>{active ? "Active" : "Inactive"}</span><Switch checked={active} onCheckedChange={setActive} /></div><IconButton label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? <Moon /> : <Sun />}</IconButton><IconButton label="Share workflow" onClick={() => toast.success("Share link copied")}><Share2 /></IconButton><Button variant="outline" onClick={() => { setSaved(true); toast.success("Workflow published"); }}><Save />Publish</Button><Button onClick={() => void runWorkflow()} disabled={running}><Play />{running ? "Running…" : "Test run"}</Button><IconButton label="More options"><MoreHorizontal /></IconButton></div>
      </header>
      <div className="workspace-stage">
        {mode === "editor" ? <ReactFlowProvider><CanvasWorkspace nodes={nodes} edges={edges} setNodes={setNodes} setEdges={setEdges} onSelect={(node) => { setSelectedId(node.id); setInspectorTab("parameters"); }} onOpenLibrary={() => setLibraryOpen(true)} theme={theme} /></ReactFlowProvider> : <ExecutionsView onBack={() => setMode("editor")} />}
        <NodeLibrary open={libraryOpen} query={query} setQuery={setQuery} onClose={() => setLibraryOpen(false)} onAdd={addCatalogNode} />
      </div>
      <footer className="status-bar"><div><span className="status-dot is-active" /> Ready</div><button type="button" onClick={() => setCommandOpen(true)}><Command /> Command menu <kbd>⌘K</kbd></button><div>{nodes.length} nodes · {edges.length} connections</div></footer>
    </section>
    {selectedNode && <NodeInspector node={selectedNode} tab={inspectorTab} setTab={setInspectorTab} onClose={() => setSelectedId(null)} onUpdate={updateSelected} onTest={async () => { updateSelected({ status: "running" }); await new Promise((resolve) => setTimeout(resolve, 700)); updateSelected({ status: "success" }); setInspectorTab("output"); toast.success("Step completed"); }} testing={selectedNode.data.status === "running"} />}
    {commandOpen && <div className="command-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setCommandOpen(false); }}><div className="command-menu"><div className="flex items-center gap-2 border-b px-4"><Search className="size-4 text-muted-foreground" /><input autoFocus placeholder="Type a command…" /></div><div className="p-2"><p className="command-label">Quick actions</p><button type="button" onClick={() => { setCommandOpen(false); setLibraryOpen(true); }}><Plus />Add a node <kbd>N</kbd></button><button type="button" onClick={() => { setCommandOpen(false); void runWorkflow(); }}><Play />Run workflow <kbd>⌘↵</kbd></button><button type="button" onClick={() => { setTheme(theme === "light" ? "dark" : "light"); setCommandOpen(false); }}>{theme === "light" ? <Moon /> : <Sun />}Switch theme</button>{selectedId && <button type="button" onClick={() => { deleteSelected(); setCommandOpen(false); }}><Trash2 />Delete selected</button>}</div></div></div>}
  </main></TooltipProvider>;
}
