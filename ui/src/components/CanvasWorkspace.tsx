import {
  Background, BackgroundVariant, BaseEdge, ConnectionMode, EdgeLabelRenderer, Handle, MarkerType,
  MiniMap, ReactFlow, ReactFlowProvider, Position, addEdge, applyEdgeChanges,
  getBezierPath, getSmoothStepPath, getStraightPath, reconnectEdge, useReactFlow,
  type Connection, type Edge, type EdgeChange, type EdgeProps, type Node, type NodeChange, type NodeProps, type Viewport,
} from '@xyflow/react'
import {
  AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical,
  AlignHorizontalDistributeCenter, AlignStartHorizontal, AlignStartVertical, AlignVerticalDistributeCenter, AppWindow, Box, Boxes,
  Activity, ArrowLeft, ArrowRight, Bell, BellRing, Bot, BrainCircuit, Braces, ChevronDown, CircuitBoard, Code2,
  Cloud, Cog, Container, Copy, Cpu, Database, DatabaseZap, Expand, ExternalLink, FileCode2, FileText, Fingerprint,
  Focus, Gauge, GitBranch, Globe2, Grid3X3, Hand, Group, Library, ListTree, LocateFixed, Lock, Magnet, MessageSquareText,
  Mail, Minus, MousePointer2, Network, Plus, Redo2, ScrollText, Search, Server, ShieldCheck, Shuffle,
  ScanSearch, Shapes, Smartphone, Sparkles, Spline, Trash2, Undo2, Unlock, UserCheck, UserRound, Warehouse,
  Waves, Waypoints, Webhook, Workflow, X, Zap, ZoomIn, ZoomOut, Clock3, BringToFront, SendToBack,
  Ungroup,
} from 'lucide-react'
import {
  SiAnsible, SiApachekafka, SiArgo, SiCrewai, SiDiscord, SiDocker, SiGit, SiGithubactions, SiGitlab, SiGmail,
  SiGooglegemini, SiGrafana, SiHelm, SiHuggingface, SiJenkins, SiKubernetes, SiLangchain, SiLanggraph,
  SiMetaai, SiMilvus, SiMistralai, SiMlflow, SiNvidia, SiOllama, SiOpentelemetry, SiPagerduty,
  SiPostgresql, SiPrometheus, SiQdrant, SiRedis, SiTerraform, SiWeightsandbiases,
} from 'react-icons/si'
import { BsMicrosoftTeams, BsSlack } from 'react-icons/bs'
import { PiMicrosoftOutlookLogo } from 'react-icons/pi'
import SendGridIcon from '@likec4/icons/tech/sendgrid-icon'
import TwilioIcon from '@likec4/icons/tech/twilio-icon'
import OpenAIIcon from '@likec4/icons/tech/openai-icon'
import AnthropicIcon from '@likec4/icons/tech/anthropic-icon'
import PineconeIcon from '@likec4/icons/tech/pinecone-icon'
import ChromaIcon from '@likec4/icons/tech/chroma'
import ArchitectureServiceAmazonBedrock from 'aws-react-icons/icons/ArchitectureServiceAmazonBedrock'
import ArchitectureServiceAmazonSageMakerAI from 'aws-react-icons/icons/ArchitectureServiceAmazonSageMakerAI'
import AzureCognitiveServices from '@likec4/icons/azure/cognitive-services'
import AzureMachineLearning from '@likec4/icons/azure/machine-learning'
import GcpVertexAi from '@likec4/icons/gcp/vertex-ai'
import ArchitectureServiceAmazonDynamoDB from 'aws-react-icons/icons/ArchitectureServiceAmazonDynamoDB'
import ArchitectureServiceAmazonElasticContainerService from 'aws-react-icons/icons/ArchitectureServiceAmazonElasticContainerService'
import ArchitectureServiceAWSFargate from 'aws-react-icons/icons/ArchitectureServiceAWSFargate'
import ArchitectureServiceAWSLambda from 'aws-react-icons/icons/ArchitectureServiceAWSLambda'
import ArchitectureServiceAmazonAPIGateway from 'aws-react-icons/icons/ArchitectureServiceAmazonAPIGateway'
import ArchitectureServiceAmazonCloudFront from 'aws-react-icons/icons/ArchitectureServiceAmazonCloudFront'
import ArchitectureServiceAmazonEC2 from 'aws-react-icons/icons/ArchitectureServiceAmazonEC2'
import ArchitectureServiceAmazonElasticKubernetesService from 'aws-react-icons/icons/ArchitectureServiceAmazonElasticKubernetesService'
import ArchitectureServiceAmazonRDS from 'aws-react-icons/icons/ArchitectureServiceAmazonRDS'
import ArchitectureServiceAmazonSimpleNotificationService from 'aws-react-icons/icons/ArchitectureServiceAmazonSimpleNotificationService'
import ArchitectureServiceAmazonSimpleQueueService from 'aws-react-icons/icons/ArchitectureServiceAmazonSimpleQueueService'
import ArchitectureServiceAmazonSimpleStorageService from 'aws-react-icons/icons/ArchitectureServiceAmazonSimpleStorageService'
import AzureFunctionApps from '@likec4/icons/azure/function-apps'
import AzureAppServices from '@likec4/icons/azure/app-services'
import AzureVirtualMachine from '@likec4/icons/azure/virtual-machine'
import AzureStorageAccounts from '@likec4/icons/azure/storage-accounts'
import AzureCosmosDb from '@likec4/icons/azure/azure-cosmos-db'
import AzureServiceBus from '@likec4/icons/azure/azure-service-bus'
import AzureKubernetesServices from '@likec4/icons/azure/kubernetes-services'
import AzureKeyVaults from '@likec4/icons/azure/key-vaults'
import AzureApplicationGateways from '@likec4/icons/azure/application-gateways'
import GcpBigQuery from '@likec4/icons/gcp/big-query'
import GcpCloudFunctions from '@likec4/icons/gcp/cloud-functions'
import GcpCloudLoadBalancing from '@likec4/icons/gcp/cloud-load-balancing'
import GcpCloudRun from '@likec4/icons/gcp/cloud-run'
import GcpCloudSql from '@likec4/icons/gcp/cloud-sql'
import GcpCloudStorage from '@likec4/icons/gcp/cloud-storage'
import GcpComputeEngine from '@likec4/icons/gcp/compute-engine'
import GcpFirestore from '@likec4/icons/gcp/firestore'
import GcpGoogleKubernetesEngine from '@likec4/icons/gcp/google-kubernetes-engine'
import GcpPubSub from '@likec4/icons/gcp/pub-sub'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties, type Dispatch, type SetStateAction } from 'react'
import {
  COMPONENT_TITLE_LIMIT, getComponentSize, getEdgeLabelWidth, truncateCanvasText,
  type ArchitectureKind,
} from './canvasSizing'
import { clearNodeSelection, selectOnlyEdge } from './canvasSelection'
import {
  alignCanvasNodes, applyGroupAwareNodeChanges, arrangeCanvasNodes, assignNodeToContainingContainer,
  distributeCanvasNodes, groupSelectedNodes, moveSelectedCanvasNodes, reorderSelectedCanvasNodes,
  selectPersistentGroup, ungroupSelectedNodes, type Alignment,
} from './canvasInteractions'
import { aiGroupByLabel, aiGroupOrder, generalGroupByLabel, generalGroupOrder, type AiComponentGroup, type GeneralComponentGroup } from './canvasCatalogGroups'
import { componentDefinitions } from './canvasCatalog'
import { diagramToCode, parseDiagramCode } from '../diagramCode'

type CanvasTool = 'select' | 'pan' | 'connect'

type ArchitectureNodeData = {
  label?: string
  description?: string
  kind?: ArchitectureKind
  fill?: string
  border?: string
  textColor?: string
  locked?: boolean
  groupId?: string
  containerId?: string
  iconId?: string
}

type Snapshot = { nodes: Node[]; edges: Edge[] }
type CanvasHistoryApi = { remember: () => void; openProperties: () => void }
const CanvasHistoryContext = createContext<CanvasHistoryApi | null>(null)

function useCanvasHistory() {
  const history = useContext(CanvasHistoryContext)
  if (!history) throw new Error('Canvas history is unavailable')
  return history
}
type Props = {
  nodes: Node[]
  edges: Edge[]
  setNodes: Dispatch<SetStateAction<Node[]>>
  setEdges: Dispatch<SetStateAction<Edge[]>>
  viewport?: Viewport
  onViewportChange?: (viewport: Viewport) => void
  diagramCode?: string
  onDiagramCodeChange?: (source: string) => void
}


const recentComponentsKey = 'archly-recent-components'
const componentDefinitionKey = (item: { kind: ArchitectureKind; iconId?: string }) => `${item.kind}:${item.iconId || 'default'}`
function loadRecentComponents(): string[] {
  try { return JSON.parse(localStorage.getItem(recentComponentsKey) || '[]') as string[] } catch { return [] }
}

const iconByKind = {
  service: Server, web: AppWindow, mobile: Smartphone, database: Database, cache: Braces,
  queue: Workflow, storage: Cloud, external: ExternalLink, actor: UserRound, container: Boxes,
  note: MessageSquareText, text: FileText, custom: Shapes,
}

type CanvasIcon = ComponentType<{ className?: string; color?: string; size?: string | number; style?: CSSProperties }>
const iconById: Record<string, CanvasIcon> = {
  monolith: Box,
  'serverless-function': Zap, 'background-worker': Cog, 'scheduled-job': Clock3,
  'message-queue': ListTree, container: Container,
  'aws-lambda': ArchitectureServiceAWSLambda, 'aws-dynamodb': ArchitectureServiceAmazonDynamoDB,
  'aws-ecs': ArchitectureServiceAmazonElasticContainerService, 'aws-fargate': ArchitectureServiceAWSFargate,
  'aws-ec2': ArchitectureServiceAmazonEC2, 'aws-s3': ArchitectureServiceAmazonSimpleStorageService,
  'aws-rds': ArchitectureServiceAmazonRDS, 'aws-sqs': ArchitectureServiceAmazonSimpleQueueService,
  'aws-sns': ArchitectureServiceAmazonSimpleNotificationService, 'aws-api-gateway': ArchitectureServiceAmazonAPIGateway,
  'aws-cloudfront': ArchitectureServiceAmazonCloudFront, 'aws-eks': ArchitectureServiceAmazonElasticKubernetesService,
  'azure-function': AzureFunctionApps, 'azure-app-service': AzureAppServices, 'azure-vm': AzureVirtualMachine,
  'azure-storage': AzureStorageAccounts, 'azure-cosmos-db': AzureCosmosDb, 'azure-service-bus': AzureServiceBus,
  'azure-aks': AzureKubernetesServices, 'azure-key-vault': AzureKeyVaults,
  'azure-application-gateway': AzureApplicationGateways,
  'gcp-pubsub': GcpPubSub, 'gcp-compute-engine': GcpComputeEngine, 'gcp-cloud-run': GcpCloudRun,
  'gcp-cloud-functions': GcpCloudFunctions, 'gcp-cloud-storage': GcpCloudStorage, 'gcp-cloud-sql': GcpCloudSql,
  'gcp-firestore': GcpFirestore, 'gcp-gke': GcpGoogleKubernetesEngine, 'gcp-bigquery': GcpBigQuery,
  'gcp-load-balancing': GcpCloudLoadBalancing, kubernetes: SiKubernetes,
  kafka: SiApachekafka, redis: SiRedis, postgresql: SiPostgresql, docker: SiDocker,
  aws: Cloud, azure: Cloud, gcp: Cloud,
  'api-gateway': Waypoints, 'load-balancer': Workflow, 'reverse-proxy': Shuffle, dns: Globe2,
  'network-vpc': Network, 'firewall-waf': ShieldCheck, 'object-storage': Cloud, cdn: Globe2,
  'sql-database': Database, 'nosql-database': Braces, 'search-engine': Search,
  'data-warehouse': Warehouse, 'event-bus': Workflow, 'event-stream': Waves,
  'secrets-manager': Lock, monitoring: Activity, logging: ScrollText, 'ci-cd-pipeline': GitBranch,
  'git-repository': SiGit, jenkins: SiJenkins, 'github-actions': SiGithubactions, 'gitlab-ci': SiGitlab,
  'argo-cd': SiArgo, terraform: SiTerraform, ansible: SiAnsible, helm: SiHelm, prometheus: SiPrometheus,
  grafana: SiGrafana, opentelemetry: SiOpentelemetry, pagerduty: SiPagerduty, 'identity-provider': Fingerprint,
  email: Mail, notification: Bell, slack: BsSlack, 'microsoft-teams': BsMicrosoftTeams,
  sms: MessageSquareText, 'push-notification': BellRing, webhook: Webhook,
  'microsoft-outlook': PiMicrosoftOutlookLogo, gmail: SiGmail, twilio: TwilioIcon, sendgrid: SendGridIcon,
  discord: SiDiscord,
  'ai-agent': Bot, 'foundation-model': BrainCircuit, 'embedding-model': Sparkles,
  'multimodal-model': CircuitBoard, 'prompt-template': FileCode2, 'rag-pipeline': Workflow,
  retriever: ScanSearch, 'vector-database': DatabaseZap, 'ai-tool': Cog, 'mcp-server': Server,
  'model-gateway': Waypoints, 'inference-endpoint': Gauge, 'model-registry': Library,
  'ai-guardrail': ShieldCheck, 'evaluation-service': Activity, 'human-approval': UserCheck, 'gpu-compute': Cpu,
  openai: OpenAIIcon, 'anthropic-claude': AnthropicIcon, 'google-gemini': SiGooglegemini,
  'meta-llama': SiMetaai, 'mistral-ai': SiMistralai, cohere: BrainCircuit, 'hugging-face': SiHuggingface,
  langchain: SiLangchain, langgraph: SiLanggraph, llamaindex: Library, 'semantic-kernel': CircuitBoard,
  crewai: SiCrewai, pinecone: PineconeIcon, weaviate: DatabaseZap, milvus: SiMilvus, qdrant: SiQdrant,
  chroma: ChromaIcon, pgvector: SiPostgresql, vllm: Gauge, ollama: SiOllama, 'hf-inference': SiHuggingface,
  'nvidia-nim': SiNvidia, 'nvidia-triton': SiNvidia, tgi: SiHuggingface, sglang: Cpu,
  langsmith: SiLangchain, mlflow: SiMlflow, 'weights-biases': SiWeightsandbiases,
  'arize-phoenix': Activity, helicone: Gauge, promptfoo: ShieldCheck,
  'aws-bedrock': ArchitectureServiceAmazonBedrock, 'aws-sagemaker': ArchitectureServiceAmazonSageMakerAI,
  'azure-openai': AzureCognitiveServices, 'azure-ai-foundry': AzureMachineLearning,
  'gcp-vertex-ai': GcpVertexAi, 'gcp-gemini-api': SiGooglegemini,
}

const iconColorById: Record<string, string> = {
  'aws-lambda': '#ff9900', 'azure-function': '#0089d6', 'gcp-pubsub': '#4285f4',
  kubernetes: '#326ce5', kafka: '#575c66', redis: '#dc382d', postgresql: '#336791', docker: '#2496ed',
  'sql-database': '#2563eb', 'nosql-database': '#16a34a',
  jenkins: '#d24939', 'github-actions': '#2088ff', 'gitlab-ci': '#fc6d26', 'argo-cd': '#ef7b4d',
  terraform: '#844fba', ansible: '#ee0000', helm: '#0f1689', prometheus: '#e6522c', grafana: '#f46800',
  opentelemetry: '#f5a800', pagerduty: '#06ac38',
  email: '#2563eb', notification: '#d97706', slack: '#4a154b', 'microsoft-teams': '#6264a7',
  sms: '#16a34a', 'push-notification': '#d97706', webhook: '#7c3aed', 'microsoft-outlook': '#0078d4',
  gmail: '#ea4335', twilio: '#f12e45', sendgrid: '#00a9d1', discord: '#5865f2',
  openai: '#10a37f', 'anthropic-claude': '#d97757', 'google-gemini': '#4285f4',
  'meta-llama': '#0668e1', 'mistral-ai': '#f7a000', 'hugging-face': '#ffbd16',
  langchain: '#1c3c3c', langgraph: '#1c3c3c', crewai: '#ff5a50', pinecone: '#00a88f',
  milvus: '#00a1ea', qdrant: '#dc244c', pgvector: '#336791', ollama: '#111827',
  'nvidia-nim': '#76b900', 'nvidia-triton': '#76b900', mlflow: '#0194e2',
  'weights-biases': '#ffbe00', 'gcp-gemini-api': '#4285f4',
}

function BidirectionalHandle({ position, id }: { position: Position; id: string }) {
  return <>
    <Handle type="source" position={position} id={id} />
    <Handle type="target" position={position} id={id} />
  </>
}

function ArchitectureNode({ id, data, selected }: NodeProps<Node<ArchitectureNodeData>>) {
  const { getNode, setNodes, updateNode } = useReactFlow()
  const history = useCanvasHistory()
  const editing = useRef(false)
  const kind = data.kind || 'service'
  const Icon = (data.iconId && iconById[data.iconId]) || iconByKind[kind]
  const label = data.label || ''
  const iconFirst = kind !== 'text' && kind !== 'note' && kind !== 'container'

  useEffect(() => {
    if (kind === 'container') return
    const current = getNode(id)
    const size = getComponentSize(label, kind)
    if (current?.width === size.width && current?.height === size.height) return
    updateNode(id, { ...size, style: { ...current?.style, ...size } })
  }, [getNode, id, kind, label, updateNode])

  function updateContent(nextLabel: string) {
    const current = getNode(id)
    const nextSize = kind === 'container' ? {} : getComponentSize(nextLabel, kind)
    const nextStyle = kind === 'container' ? current?.style : { ...current?.style, ...nextSize }
    updateNode(id, { ...nextSize, data: { ...data, label: nextLabel }, style: nextStyle })
  }

  function toggleLock() {
    history.remember()
    const locked = !data.locked
    updateNode(id, { draggable: !locked, data: { ...data, locked } })
  }

  return (
    <div
      className={`architecture-node architecture-node-${kind}${iconFirst ? ' icon-first' : ''}${selected ? ' selected' : ''}${data.locked ? ' locked' : ''}`}
      style={{ background: data.fill, borderColor: data.border, color: data.textColor }}
      onPointerDown={(event) => {
        if (!event.shiftKey) return
        event.stopPropagation()
        const groupId = data.groupId
        window.setTimeout(() => setNodes((current) => current.map((node) => ({
          ...node,
          selected: Boolean(node.selected || node.id === id || groupId && node.data?.groupId === groupId),
        }))), 0)
      }}
      onDoubleClick={(event) => {
        event.stopPropagation()
        setNodes((current) => current.map((node) => ({ ...node, selected: node.id === id })))
        history.openProperties()
      }}
    >
      {kind !== 'text' && <span className="component-kind-icon" aria-hidden="true" style={{ color: data.iconId ? iconColorById[data.iconId] : undefined }}><Icon /></span>}
      <button
        className="component-lock nodrag nowheel"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => { event.stopPropagation(); toggleLock() }}
        title={data.locked ? 'Unlock component' : 'Lock component'}
        aria-label={data.locked ? 'Unlock component' : 'Lock component'}
      >{data.locked ? <Lock /> : <Unlock />}</button>
      <div className="architecture-node-copy">
        {selected ? <textarea className="nodrag nowheel" aria-label="Component name" value={label}
          onFocus={() => { if (!editing.current) history.remember(); editing.current = true }}
          onChange={(event) => updateContent(iconFirst ? event.target.value.replace(/\s*[\r\n]+\s*/g, ' ') : event.target.value)}
          onBlur={() => { updateContent(label.trim() || 'Untitled component'); editing.current = false }}
          rows={Math.min(2, Math.max(1, Math.round((getComponentSize(label, kind).height - 42) / 12) + 1))} /> : <strong>{truncateCanvasText(data.label || 'Untitled component', COMPONENT_TITLE_LIMIT)}</strong>}
      </div>
      {kind !== 'text' && kind !== 'note' && kind !== 'container' && (
        <>
          <BidirectionalHandle position={Position.Left} id="left" />
          <BidirectionalHandle position={Position.Right} id="right" />
          <BidirectionalHandle position={Position.Top} id="top" />
          <BidirectionalHandle position={Position.Bottom} id="bottom" />
        </>
      )}
    </div>
  )
}

function EditableConnectionEdge(props: EdgeProps<Edge>) {
  const { setEdges, setNodes, updateEdge } = useReactFlow()
  const history = useCanvasHistory()
  const editing = useRef(false)
  const routing = String(props.data?.routing || 'smoothstep')
  const pathArgs = {
    sourceX: props.sourceX, sourceY: props.sourceY, sourcePosition: props.sourcePosition,
    targetX: props.targetX, targetY: props.targetY, targetPosition: props.targetPosition,
  }
  const [path, labelX, labelY] = routing === 'straight'
    ? getStraightPath(pathArgs)
    : routing === 'default'
      ? getBezierPath(pathArgs)
      : getSmoothStepPath(pathArgs)
  const label = String(props.label || '')

  function selectThisEdge() {
    setNodes(clearNodeSelection)
    setEdges((current) => selectOnlyEdge(current, props.id))
  }

  return <>
    <BaseEdge id={props.id} path={path} markerStart={props.markerStart} markerEnd={props.markerEnd} style={props.style} interactionWidth={20} />
    {(label || props.selected) && <EdgeLabelRenderer>
      <input
        className={`edge-inline-label nodrag nopan${props.selected ? ' selected' : ''}`}
        aria-label="Line text"
        value={label}
        onFocus={() => { selectThisEdge(); if (!editing.current) history.remember(); editing.current = true }}
        onPointerDown={(event) => { event.stopPropagation(); selectThisEdge() }}
        onChange={(event) => updateEdge(props.id, { label: event.target.value })}
        onBlur={() => { editing.current = false }}
        placeholder="Add label"
        style={{
          transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          width: `${getEdgeLabelWidth(label)}px`,
        }}
      />
    </EdgeLabelRenderer>}
  </>
}

const NODE_TYPES = { architecture: ArchitectureNode }
const EDGE_TYPES = { editable: EditableConnectionEdge }
const supportedKindNames = new Set(['service', 'web', 'mobile', 'database', 'cache', 'queue', 'storage', 'external', 'actor', 'container', 'note', 'text', 'custom'])

function normalizedNode(node: Node): Node {
  if (node.type === 'architecture') return node
  return {
    ...node,
    type: 'architecture',
    data: { kind: 'service', label: String(node.data?.label || 'Service') },
    style: undefined,
  }
}

function CanvasWorkspaceInner({ nodes, edges, setNodes, setEdges, viewport, onViewportChange, diagramCode: initialDiagramCode = '', onDiagramCodeChange }: Props) {
  const flow = useReactFlow()
  const [tool, setTool] = useState<CanvasTool>('select')
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [propertiesOpen, setPropertiesOpen] = useState(false)
  const [codeOpen, setCodeOpen] = useState(false)
  const [diagramCode, setDiagramCode] = useState(initialDiagramCode)
  const [codeError, setCodeError] = useState('')
  const [livePreview, setLivePreview] = useState(false)
  const [codeReferenceOpen, setCodeReferenceOpen] = useState(false)
  const [codeReferenceSearch, setCodeReferenceSearch] = useState('')
  const [recentComponents, setRecentComponents] = useState(loadRecentComponents)
  const [minimapVisible, setMinimapVisible] = useState(true)
  const [search, setSearch] = useState('')
  const [componentCategory, setComponentCategory] = useState('All')
  const [openGeneralGroups, setOpenGeneralGroups] = useState<Set<GeneralComponentGroup>>(() => new Set(['Applications']))
  const [openAiGroups, setOpenAiGroups] = useState<Set<AiComponentGroup>>(() => new Set(['Architecture']))
  const [zoom, setZoom] = useState(100)
  const [gridVisible, setGridVisible] = useState(true)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [historyVersion, setHistoryVersion] = useState(0)
  const undoStack = useRef<Snapshot[]>([])
  const redoStack = useRef<Snapshot[]>([])
  const clipboard = useRef<Snapshot>({ nodes: [], edges: [] })
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const canvasCodeSignature = useRef(diagramToCode(nodes, edges))
  const dragSnapshot = useRef<Snapshot | null>(null)
  const codeLineNumbers = useRef<HTMLDivElement>(null)

  useEffect(() => { nodesRef.current = nodes }, [nodes])
  useEffect(() => { edgesRef.current = edges }, [edges])
  useEffect(() => { setDiagramCode(initialDiagramCode) }, [initialDiagramCode])
  useEffect(() => {
    const generated = diagramToCode(nodes, edges)
    if (generated === canvasCodeSignature.current) return
    canvasCodeSignature.current = generated
    setDiagramCode(generated)
    onDiagramCodeChange?.(generated)
    setCodeError('')
  }, [edges, nodes, onDiagramCodeChange])
  useEffect(() => {
    if (nodes.some((node) => node.type !== 'architecture')) setNodes((current) => current.map(normalizedNode))
  }, [nodes, setNodes])
  useEffect(() => {
    if (edges.some((edge) => edge.type !== 'editable')) {
      setEdges((current) => current.map((edge) => ({
        ...edge,
        type: 'editable',
        data: { ...edge.data, routing: edge.type === 'straight' || edge.type === 'default' || edge.type === 'smoothstep' ? edge.type : 'smoothstep' },
      })))
    }
  }, [edges, setEdges])

  const selectedNodes = useMemo(() => nodes.filter((node) => node.selected), [nodes])
  const selectedEdges = useMemo(() => edges.filter((edge) => edge.selected), [edges])
  const selectedEdge = selectedEdges.length === 1 ? selectedEdges[0] : undefined
  const selectedGroups = useMemo(() => new Set(selectedNodes.map((node) => node.data?.groupId).filter(Boolean)), [selectedNodes])

  useEffect(() => {
    if (selectedNodes.length + selectedEdges.length !== 1) setPropertiesOpen(false)
  }, [selectedEdges.length, selectedNodes.length])

  function remember(snapshot: Snapshot = { nodes: nodesRef.current, edges: edgesRef.current }) {
    undoStack.current.push(structuredClone(snapshot))
    if (undoStack.current.length > 50) undoStack.current.shift()
    redoStack.current = []
    setHistoryVersion((value) => value + 1)
  }

  const historyApi = useMemo<CanvasHistoryApi>(() => ({ remember: () => remember(), openProperties: () => setPropertiesOpen(true) }), [])

  const restore = useCallback((snapshot: Snapshot) => {
    setNodes(structuredClone(snapshot.nodes))
    setEdges(structuredClone(snapshot.edges))
  }, [setEdges, setNodes])

  const undo = useCallback(() => {
    const previous = undoStack.current.pop()
    if (!previous) return
    redoStack.current.push(structuredClone({ nodes: nodesRef.current, edges: edgesRef.current }))
    restore(previous)
    setHistoryVersion((value) => value + 1)
  }, [restore])

  const redo = useCallback(() => {
    const next = redoStack.current.pop()
    if (!next) return
    undoStack.current.push(structuredClone({ nodes: nodesRef.current, edges: edgesRef.current }))
    restore(next)
    setHistoryVersion((value) => value + 1)
  }, [restore])

  function addComponent(kind: ArchitectureKind, iconId?: string, dropPosition?: { x: number; y: number }) {
    const definition = componentDefinitions.find((item) => item.kind === kind && item.iconId === iconId)!
    const size = getComponentSize(definition.label, kind)
    const viewportCenter = dropPosition || flow.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    const node: Node<ArchitectureNodeData> = {
      id: crypto.randomUUID(),
      type: 'architecture',
      position: { x: viewportCenter.x - size.width / 2, y: viewportCenter.y - size.height / 2 },
      data: {
        kind,
        label: definition.label,
        iconId: definition.iconId,
      },
      style: size,
      zIndex: kind === 'container' ? -1 : 0,
    }
    remember()
    setNodes((current) => [...current.map((item) => ({ ...item, selected: false })), { ...node, selected: true }])
    const recentKey = componentDefinitionKey({ kind, iconId })
    setRecentComponents((current) => {
      const next = [recentKey, ...current.filter((item) => item !== recentKey)].slice(0, 8)
      localStorage.setItem(recentComponentsKey, JSON.stringify(next))
      return next
    })
    setLibraryOpen(false)
  }

  function updateSelectedEdge(patch: Partial<Edge>, record = true) {
    if (!selectedEdge) return
    if (record) remember()
    setEdges((current) => current.map((edge) => edge.id === selectedEdge.id ? { ...edge, ...patch } : edge))
  }

  function deleteSelection() {
    if (!selectedNodes.length && !selectedEdges.length) return
    remember()
    const ids = new Set(selectedNodes.map((node) => node.id))
    setNodes((current) => current.filter((node) => !ids.has(node.id)))
    setEdges((current) => current.filter((edge) => !edge.selected && !ids.has(edge.source) && !ids.has(edge.target)))
  }

  function openCodeEditor() {
    if (!codeOpen && !diagramCode.trim()) {
      const generated = diagramToCode(nodesRef.current, edgesRef.current)
      setDiagramCode(generated)
      onDiagramCodeChange?.(generated)
    }
    setCodeError('')
    setCodeOpen((open) => !open)
  }

  function drawFromCode() {
    try {
      const result = parseDiagramCode(diagramCode)
      remember()
      canvasCodeSignature.current = diagramToCode(result.nodes, result.edges)
      setNodes(result.nodes)
      setEdges(result.edges)
      setCodeError('')
      window.setTimeout(() => flow.fitView({ padding: 0.2 }), 0)
    } catch (error) {
      setCodeError(error instanceof Error ? error.message : 'Could not parse diagram code')
    }
  }

  function insertCodeComponent(shorthand: string, label: string) {
    const base = shorthand.replace(/[^A-Za-z0-9]+(.)/g, (_, letter: string) => letter.toUpperCase()).replace(/^[^A-Za-z]+/, '') || 'component'
    const used = new Set([...diagramCode.matchAll(/^\s*[\w-]+\s+([A-Za-z][\w-]*)/gm)].map((match) => match[1]))
    let id = base
    let suffix = 2
    while (used.has(id)) id = `${base}${suffix++}`
    const next = `${diagramCode.replace(/\s*$/, '')}${diagramCode.trim() ? '\n' : ''}${shorthand} ${id} "${label.replace(/"/g, '\\"')}"`
    setDiagramCode(next)
    onDiagramCodeChange?.(next)
    setCodeError('')
  }

  useEffect(() => {
    if (!codeOpen || !livePreview) return
    const timer = window.setTimeout(() => {
      try {
        const result = parseDiagramCode(diagramCode)
        canvasCodeSignature.current = diagramToCode(result.nodes, result.edges)
        setNodes(result.nodes)
        setEdges(result.edges)
        setCodeError('')
        window.setTimeout(() => flow.fitView({ padding: 0.2 }), 0)
      } catch (error) {
        setCodeError(error instanceof Error ? error.message : 'Could not parse diagram code')
      }
    }, 500)
    return () => window.clearTimeout(timer)
  }, [codeOpen, diagramCode, flow, livePreview, setEdges, setNodes])

  function duplicateSelectedEdge() {
    if (!selectedEdge) return
    remember()
    const duplicate = { ...structuredClone(selectedEdge), id: crypto.randomUUID(), selected: true, label: selectedEdge.label ? `${selectedEdge.label} copy` : '' }
    setEdges((current) => [...current.map((edge) => ({ ...edge, selected: false })), duplicate])
  }

  function setSelectedLock(locked: boolean) {
    if (!selectedNodes.length) return
    remember()
    const ids = new Set(selectedNodes.map((node) => node.id))
    setNodes((current) => current.map((node) => ids.has(node.id)
      ? { ...node, draggable: !locked, data: { ...node.data, locked } }
      : node))
  }

  const groupSelection = useCallback(() => {
    if (nodesRef.current.filter((node) => node.selected).length < 2) return
    remember()
    setNodes((current) => groupSelectedNodes(current, crypto.randomUUID()))
  }, [setNodes])

  const ungroupSelection = useCallback(() => {
    if (!nodesRef.current.some((node) => node.selected && node.data?.groupId)) return
    remember()
    setNodes(ungroupSelectedNodes)
  }, [setNodes])

  const selectGroup = useCallback((node: Node, additive = false) => {
    if (additive) {
      const groupId = node.data?.groupId
      setNodes((current) => current.map((item) => ({
        ...item,
        selected: Boolean(item.selected || item.id === node.id || groupId && item.data?.groupId === groupId),
      })))
    } else if (node.data?.groupId) setNodes((current) => selectPersistentGroup(current, node))
  }, [setNodes])

  const copySelection = useCallback(() => {
    const copiedNodes = nodesRef.current.filter((node) => node.selected)
    const ids = new Set(copiedNodes.map((node) => node.id))
    clipboard.current = {
      nodes: structuredClone(copiedNodes),
      edges: structuredClone(edgesRef.current.filter((edge) => edge.selected || (ids.has(edge.source) && ids.has(edge.target)))),
    }
  }, [])

  const pasteSelection = useCallback(() => {
    if (!clipboard.current.nodes.length) return
    remember()
    const idMap = new Map(clipboard.current.nodes.map((node) => [node.id, crypto.randomUUID()]))
    const groupIdMap = new Map<string, string>()
    const pastedNodes = clipboard.current.nodes.map((node) => {
      const sourceGroupId = node.data?.groupId ? String(node.data.groupId) : undefined
      return {
        ...node, id: idMap.get(node.id)!, selected: true,
        position: { x: node.position.x + 32, y: node.position.y + 32 },
        data: sourceGroupId ? {
          ...node.data,
          groupId: groupIdMap.get(sourceGroupId)
            || (() => { const id = crypto.randomUUID(); groupIdMap.set(sourceGroupId, id); return id })(),
        } : node.data,
      }
    })
    const pastedEdges = clipboard.current.edges
      .filter((edge) => idMap.has(edge.source) && idMap.has(edge.target))
      .map((edge) => ({ ...edge, id: crypto.randomUUID(), source: idMap.get(edge.source)!, target: idMap.get(edge.target)!, selected: false }))
    setNodes((current) => [...current.map((node) => ({ ...node, selected: false })), ...pastedNodes])
    setEdges((current) => [...current.map((edge) => ({ ...edge, selected: false })), ...pastedEdges])
    clipboard.current = { nodes: pastedNodes, edges: pastedEdges }
  }, [setEdges, setNodes])

  const duplicateSelection = useCallback(() => { copySelection(); pasteSelection() }, [copySelection, pasteSelection])

  const onConnect = useCallback((connection: Connection) => {
    remember()
    setEdges((current) => addEdge({
      ...connection,
      type: 'editable',
      data: { routing: 'smoothstep' },
      markerEnd: { type: MarkerType.ArrowClosed },
      label: 'depends on',
    }, current))
  }, [setEdges])

  function onReconnect(oldEdge: Edge, connection: Connection) {
    remember()
    setEdges((current) => reconnectEdge(oldEdge, connection, current))
  }

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((current) => applyGroupAwareNodeChanges(changes, current))
  }, [setNodes])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((current) => applyEdgeChanges(changes, current))
  }, [setEdges])

  const align = (alignment: Alignment) => {
    if (selectedNodes.length < 2) return
    remember()
    setNodes((current) => alignCanvasNodes(current, alignment))
  }

  const arrange = (direction: 'horizontal' | 'vertical') => {
    if (selectedNodes.length < 2) return
    remember()
    setNodes((current) => arrangeCanvasNodes(current, edgesRef.current, direction))
  }

  const distribute = (direction: 'horizontal' | 'vertical') => {
    if (selectedNodes.length < 3) return
    remember()
    setNodes((current) => distributeCanvasNodes(current, direction))
  }

  const reorderSelection = (direction: 'front' | 'back') => {
    if (!selectedNodes.length) return
    remember()
    setNodes((current) => reorderSelectedCanvasNodes(current, direction))
  }

  const changeSelectedIcon = (iconId: string) => {
    if (selectedNodes.length !== 1) return
    remember()
    setNodes((current) => current.map((node) => node.id === selectedNodes[0].id
      ? { ...node, data: { ...node.data, iconId: iconId || undefined } }
      : node))
  }

  const updateSelectedNode = (patch: Partial<ArchitectureNodeData>, record = true) => {
    if (selectedNodes.length !== 1) return
    if (record) remember()
    const selected = selectedNodes[0]
    setNodes((current) => current.map((node) => {
      if (node.id !== selected.id) return node
      const data = { ...node.data, ...patch } as ArchitectureNodeData
      const kind = data.kind || 'service'
      const size = kind === 'container' ? node.style : getComponentSize(data.label || 'Untitled component', kind)
      const wasContainer = node.data?.kind === 'container'
      return { ...node, data, style: { ...node.style, ...size }, zIndex: kind === 'container' ? -1 : wasContainer ? 0 : node.zIndex }
    }))
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof Element && target.closest('input, textarea, [contenteditable="true"]')) return
      const command = event.ctrlKey || event.metaKey
      if (event.key === 'Escape') { setTool('select'); setLibraryOpen(false); return }
      if (command && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (command && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); return }
      if (command && event.key.toLowerCase() === 'g') {
        event.preventDefault()
        if (event.shiftKey) ungroupSelection()
        else groupSelection()
        return
      }
      if (command && event.key.toLowerCase() === 'c') { event.preventDefault(); copySelection(); return }
      if (command && event.key.toLowerCase() === 'x') { event.preventDefault(); copySelection(); deleteSelection(); return }
      if (command && event.key.toLowerCase() === 'v') { event.preventDefault(); pasteSelection(); return }
      if (command && event.key.toLowerCase() === 'd') { event.preventDefault(); copySelection(); pasteSelection(); return }
      if (event.key.startsWith('Arrow') && nodesRef.current.some((node) => node.selected && !node.data?.locked)) {
        event.preventDefault()
        const distance = event.shiftKey ? 10 : 1
        const dx = event.key === 'ArrowLeft' ? -distance : event.key === 'ArrowRight' ? distance : 0
        const dy = event.key === 'ArrowUp' ? -distance : event.key === 'ArrowDown' ? distance : 0
        remember()
        setNodes((current) => moveSelectedCanvasNodes(current, dx, dy))
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); deleteSelection() }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  })

  const componentCategories = ['All', ...(recentComponents.length ? ['Recent'] : []), ...new Set(componentDefinitions.map((item) => item.category || 'General'))]
  const filteredComponents = componentDefinitions.filter((item) =>
    (componentCategory === 'All' || componentCategory === 'Recent' && recentComponents.includes(componentDefinitionKey(item)) || item.category === componentCategory)
    && `${item.label} ${item.description} ${item.category || ''} ${item.keywords || ''}`.toLowerCase().includes(search.toLowerCase()))
  const groupedComponents = filteredComponents.reduce((groups, item) => {
    const category = item.category || 'General'
    groups.set(category, [...(groups.get(category) || []), item])
    return groups
  }, new Map<string, typeof componentDefinitions>())
  const toggleGeneralGroup = (group: GeneralComponentGroup) => setOpenGeneralGroups((current) => {
    const next = new Set(current)
    if (next.has(group)) next.delete(group)
    else next.add(group)
    return next
  })
  const toggleAiGroup = (group: AiComponentGroup) => setOpenAiGroups((current) => {
    const next = new Set(current)
    if (next.has(group)) next.delete(group)
    else next.add(group)
    return next
  })
  const renderComponentGrid = (items: typeof componentDefinitions) => <div className="component-grid">{items.map((item) => {
    const Icon = iconByKind[item.kind]
    const DisplayIcon = (item.iconId && iconById[item.iconId]) || Icon
    return <button
      key={`${item.kind}-${item.iconId || item.label}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'copy'
        event.dataTransfer.setData('application/x-archly-component', JSON.stringify({ kind: item.kind, iconId: item.iconId }))
      }}
      onClick={() => addComponent(item.kind, item.iconId)}
      title={`${item.label} — ${item.description}`}
      aria-label={`${item.label}: ${item.description}`}
    ><DisplayIcon style={{ color: item.iconId ? iconColorById[item.iconId] : undefined }} /><strong>{item.label}</strong></button>
  })}</div>

  return (
    <div className={`canvas-workspace${tool === 'connect' ? ' connect-mode' : ''}`}>
      <CanvasHistoryContext.Provider value={historyApi}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onNodeClick={(event, node) => selectGroup(node, event.shiftKey)}
        onNodeDragStart={(_, node) => {
          selectGroup(node)
          dragSnapshot.current = structuredClone({ nodes: nodesRef.current, edges: edgesRef.current })
        }}
        onNodeDragStop={(_, node) => {
          if (dragSnapshot.current) remember(dragSnapshot.current)
          dragSnapshot.current = null
          setNodes((current) => assignNodeToContainingContainer(current, node.id))
        }}
        onDragOver={(event) => { if (event.dataTransfer.types.includes('application/x-archly-component')) event.preventDefault() }}
        onDrop={(event) => {
          const payload = event.dataTransfer.getData('application/x-archly-component')
          if (!payload) return
          event.preventDefault()
          const item = JSON.parse(payload) as { kind: ArchitectureKind; iconId?: string }
          const position = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY })
          addComponent(item.kind, item.iconId, Number.isFinite(position.x) && Number.isFinite(position.y) ? position : { x: 0, y: 0 })
        }}
        onViewportChange={(nextViewport) => { setZoom(Math.round(nextViewport.zoom * 100)); onViewportChange?.(nextViewport) }}
        panOnDrag={tool === 'pan' ? true : [1]}
        nodesDraggable={tool !== 'pan'}
        nodesConnectable={tool === 'connect' || tool === 'select'}
        edgesReconnectable={tool !== 'pan'}
        reconnectRadius={18}
        elevateEdgesOnSelect
        connectionMode={ConnectionMode.Loose}
        selectionOnDrag={tool === 'select'}
        multiSelectionKeyCode="Shift"
        snapToGrid={snapEnabled}
        snapGrid={[16, 16]}
        deleteKeyCode={null}
        viewport={viewport}
      >
        {gridVisible && <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} />}
        {minimapVisible && <MiniMap pannable zoomable />}
      </ReactFlow>
      </CanvasHistoryContext.Provider>

      <div className="canvas-toolbox" role="toolbar" aria-label="Canvas tools">
        <button className={tool === 'select' ? 'active' : ''} aria-pressed={tool === 'select'} onClick={() => setTool('select')} title="Select (Esc)" aria-label="Select"><MousePointer2 /></button>
        <button className={tool === 'pan' ? 'active' : ''} aria-pressed={tool === 'pan'} onClick={() => setTool('pan')} title="Pan" aria-label="Pan"><Hand /></button>
        <span />
        <button className={libraryOpen ? 'active' : ''} aria-pressed={libraryOpen} onClick={() => setLibraryOpen((open) => !open)} title="Add component" aria-label="Add component"><Plus /></button>
        <button onClick={() => addComponent('text')} title="Add text" aria-label="Add text"><FileText /></button>
        <button onClick={() => addComponent('note')} title="Add note" aria-label="Add note"><MessageSquareText /></button>
        <button className={tool === 'connect' ? 'active' : ''} aria-pressed={tool === 'connect'} onClick={() => setTool('connect')} title="Connect components" aria-label="Connect components"><Network /></button>
        <button onClick={() => addComponent('container')} title="Add container" aria-label="Add container"><Box /></button>
        <button className={codeOpen ? 'active' : ''} aria-pressed={codeOpen} onClick={openCodeEditor} title="Diagram as code" aria-label="Diagram as code"><Code2 /></button>
        <span />
        <button className={propertiesOpen ? 'active' : ''} aria-pressed={propertiesOpen} disabled={selectedNodes.length + selectedEdges.length !== 1} onClick={() => setPropertiesOpen((open) => !open)} title="Properties" aria-label="Properties"><Cog /></button>
        <button onClick={deleteSelection} disabled={!selectedNodes.length && !selectedEdges.length} title="Delete selected" aria-label="Delete selected"><Trash2 /></button>
      </div>

      {libraryOpen && (
        <aside className="component-library" aria-label="Component library">
          <header><div><strong>Components</strong><span>Architecture building blocks</span></div><button onClick={() => setLibraryOpen(false)} aria-label="Close component library"><X /></button></header>
          <label className="canvas-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search components" autoFocus /></label>
          <div className="component-categories" aria-label="Component categories">{componentCategories.map((category) => <button className={category === componentCategory ? 'active' : ''} key={category} onClick={() => setComponentCategory(category)}>{category}</button>)}</div>
          <div className="component-list">
            {[...groupedComponents.entries()].map(([category, items]) => category === 'General'
              ? <section className="component-category general-component-category" key={category}>
                  <h3>{category}</h3>
                  {generalGroupOrder.map((group) => {
                    const groupItems = items.filter((item) => generalGroupByLabel[item.label] === group)
                    if (!groupItems.length) return null
                    const expanded = Boolean(search.trim()) || openGeneralGroups.has(group)
                    return <section className="general-component-group" key={group}>
                      <button className="component-group-toggle" aria-expanded={expanded} onClick={() => toggleGeneralGroup(group)}>
                        <span>{group}</span><small>{groupItems.length}</small><ChevronDown />
                      </button>
                      {expanded && renderComponentGrid(groupItems)}
                    </section>
                  })}
                </section>
              : category === 'AI / ML'
              ? <section className="component-category general-component-category" key={category}>
                  <h3>{category}</h3>
                  {aiGroupOrder.map((group) => {
                    const groupItems = items.filter((item) => aiGroupByLabel[item.label] === group)
                    if (!groupItems.length) return null
                    const expanded = Boolean(search.trim()) || openAiGroups.has(group)
                    return <section className="general-component-group" key={group}>
                      <button className="component-group-toggle" aria-expanded={expanded} onClick={() => toggleAiGroup(group)}>
                        <span>{group}</span><small>{groupItems.length}</small><ChevronDown />
                      </button>
                      {expanded && renderComponentGrid(groupItems)}
                    </section>
                  })}
                </section>
              : <section className="component-category" key={category}><h3>{category}</h3>{renderComponentGrid(items)}</section>)}
            {!filteredComponents.length && <p className="muted">No matching components.</p>}
          </div>
        </aside>
      )}

      {codeOpen && <aside className="diagram-code-panel" aria-label="Diagram as code editor">
        <header><div><strong>Diagram as code</strong><span>Define components and connections</span></div><button onClick={() => setCodeOpen(false)} aria-label="Close diagram code"><X /></button></header>
        <label className="diagram-live-preview"><input type="checkbox" checked={livePreview} onChange={(event) => setLivePreview(event.target.checked)} />Live preview</label>
        <button className="diagram-code-reference-toggle" aria-expanded={codeReferenceOpen} onClick={() => setCodeReferenceOpen((open) => !open)}><Library />Component reference <ChevronDown /></button>
        {codeReferenceOpen && <section className="diagram-code-reference" aria-label="Component shorthand reference">
          <input aria-label="Search component shorthands" placeholder="Search shorthands" value={codeReferenceSearch} onChange={(event) => setCodeReferenceSearch(event.target.value)} />
          <div>{componentDefinitions.filter((item) => item.iconId && `${item.iconId} ${item.label} ${item.category}`.toLowerCase().includes(codeReferenceSearch.toLowerCase())).map((item) => {
            const shorthand = supportedKindNames.has(item.iconId!) ? `icon-${item.iconId}` : item.iconId!
            return <button key={`${item.iconId}-${item.label}`} onClick={() => insertCodeComponent(shorthand, item.label)}><code>{shorthand}</code><span>{item.label}</span></button>
          })}</div>
        </section>}
        <div className="diagram-code-input">
          <div className="diagram-code-lines" ref={codeLineNumbers} aria-hidden="true">{diagramCode.split('\n').map((_, index) => <span className={Number(codeError.match(/^Line (\d+)/)?.[1]) === index + 1 ? 'error' : ''} key={index}>{index + 1}</span>)}</div>
          <textarea aria-label="Diagram code" value={diagramCode} onChange={(event) => { setDiagramCode(event.target.value); onDiagramCodeChange?.(event.target.value); setCodeError('') }} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); drawFromCode() } }} onScroll={(event) => { if (codeLineNumbers.current) codeLineNumbers.current.scrollTop = event.currentTarget.scrollTop }} spellCheck={false} />
        </div>
        {codeError ? <p className="diagram-code-error" role="alert">{codeError}</p> : <p className="diagram-code-help"><code>region east "us-east-1" {'{'}</code><br /><code>&nbsp;&nbsp;aws-lambda api "API"</code><br /><code>{'}'}</code><br /><code>api.right -&gt; db.left : "reads"</code></p>}
        <button className="diagram-code-draw" aria-label="Draw diagram" onClick={drawFromCode}><Sparkles />Draw diagram <kbd aria-hidden="true">Ctrl ↵</kbd></button>
      </aside>}

      {propertiesOpen && selectedNodes.length === 1 && <aside className="canvas-properties" aria-label="Properties inspector">
        <header><div className="property-heading"><strong>Component</strong><small>{String(selectedNodes[0].data.kind || 'service')}</small></div><button className="property-close" onClick={() => setPropertiesOpen(false)} aria-label="Close properties"><X /></button></header>
        <label>Title<input aria-label="Component property title" value={String(selectedNodes[0].data.label || '')} onFocus={() => remember()} onChange={(event) => updateSelectedNode({ label: event.target.value }, false)} /></label>
        <label>Description<textarea aria-label="Component description" value={String(selectedNodes[0].data.description || '')} onFocus={() => remember()} onChange={(event) => updateSelectedNode({ description: event.target.value }, false)} rows={2} /></label>
        <label>Type<select aria-label="Component type" value={String(selectedNodes[0].data.kind || 'service')} onChange={(event) => updateSelectedNode({ kind: event.target.value as ArchitectureKind })}>
          {(['service','web','mobile','database','cache','queue','storage','external','actor','container','note','text','custom'] as ArchitectureKind[]).map((kind) => <option key={kind} value={kind}>{kind}</option>)}
        </select></label>
        <label>Icon<select aria-label="Component icon" value={String(selectedNodes[0].data.iconId || '')} onChange={(event) => changeSelectedIcon(event.target.value)}>
          <option value="">Default icon</option>{componentDefinitions.filter((item) => item.iconId).map((item) => <option key={item.iconId} value={item.iconId}>{item.label}</option>)}
        </select></label>
        <div className="component-color-fields">
          <label>Fill<input type="color" aria-label="Component fill color" value={String(selectedNodes[0].data.fill || '#ffffff')} onFocus={() => remember()} onChange={(event) => updateSelectedNode({ fill: event.target.value }, false)} /></label>
          <label>Border<input type="color" aria-label="Component border color" value={String(selectedNodes[0].data.border || '#e4e4eb')} onFocus={() => remember()} onChange={(event) => updateSelectedNode({ border: event.target.value }, false)} /></label>
          <label>Text<input type="color" aria-label="Component text color" value={String(selectedNodes[0].data.textColor || '#151823')} onFocus={() => remember()} onChange={(event) => updateSelectedNode({ textColor: event.target.value }, false)} /></label>
        </div>
        <div className="property-actions">
          <button onClick={duplicateSelection}><Copy />Duplicate</button>
          <button onClick={() => setSelectedLock(!selectedNodes[0].data?.locked)}>{selectedNodes[0].data?.locked ? <Unlock /> : <Lock />}{selectedNodes[0].data?.locked ? 'Unlock' : 'Lock'}</button>
          <button className="danger" onClick={deleteSelection}><Trash2 />Delete</button>
        </div>
      </aside>}
      {propertiesOpen && selectedEdge && <aside className="canvas-properties" aria-label="Properties inspector">
        <header><div className="property-heading"><strong>Connection</strong><small>Edge</small></div><button className="property-close" onClick={() => setPropertiesOpen(false)} aria-label="Close properties"><X /></button></header>
        <label>Label<input aria-label="Connection property label" value={String(selectedEdge.label || '')} onFocus={() => remember()} onChange={(event) => updateSelectedEdge({ label: event.target.value }, false)} /></label>
        <label>Routing<select aria-label="Connection property routing" value={String(selectedEdge.data?.routing || 'smoothstep')} onChange={(event) => updateSelectedEdge({ data: { ...selectedEdge.data, routing: event.target.value } })}><option value="straight">Straight</option><option value="default">Curved</option><option value="smoothstep">Stepped</option></select></label>
        <label>Direction<select aria-label="Connection direction" value={selectedEdge.markerStart && selectedEdge.markerEnd ? 'both' : selectedEdge.markerStart ? 'start' : selectedEdge.markerEnd ? 'end' : 'none'} onChange={(event) => {
          const direction = event.target.value
          updateSelectedEdge({ markerStart: direction === 'start' || direction === 'both' ? { type: MarkerType.ArrowClosed } : undefined, markerEnd: direction === 'end' || direction === 'both' ? { type: MarkerType.ArrowClosed } : undefined })
        }}><option value="none">No arrows</option><option value="end">End</option><option value="start">Start</option><option value="both">Both</option></select></label>
        <label>Line style<select aria-label="Connection line style" value={selectedEdge.style?.strokeDasharray ? 'dashed' : 'solid'} onChange={(event) => updateSelectedEdge({ style: { ...selectedEdge.style, strokeDasharray: event.target.value === 'dashed' ? '7 5' : undefined } })}><option value="solid">Solid</option><option value="dashed">Dashed</option></select></label>
        <label>Color<input type="color" aria-label="Connection property color" value={String(selectedEdge.style?.stroke || '#68708a')} onFocus={() => remember()} onChange={(event) => updateSelectedEdge({ style: { ...selectedEdge.style, stroke: event.target.value } }, false)} /></label>
        <div className="property-actions"><button onClick={duplicateSelectedEdge}><Copy />Duplicate</button><button className="danger" onClick={deleteSelection}><Trash2 />Delete</button></div>
      </aside>}

      <div className="canvas-history" role="toolbar" aria-label="Canvas history and layout">
        <button onClick={undo} disabled={!undoStack.current.length} title="Undo" aria-label="Undo canvas change"><Undo2 /></button>
        <button onClick={redo} disabled={!redoStack.current.length} title="Redo" aria-label="Redo canvas change"><Redo2 /></button>
        {selectedNodes.length > 1 && <><span />
          <button onClick={() => align('left')} title="Align left" aria-label="Align left"><AlignStartVertical /></button>
          <button onClick={() => align('center')} title="Align centers" aria-label="Align centers"><AlignCenterVertical /></button>
          <button onClick={() => align('right')} title="Align right" aria-label="Align right"><AlignEndVertical /></button>
          <button onClick={() => align('top')} title="Align top" aria-label="Align top"><AlignStartHorizontal /></button>
          <button onClick={() => align('middle')} title="Align middles" aria-label="Align middles"><AlignCenterHorizontal /></button>
          <button onClick={() => align('bottom')} title="Align bottom" aria-label="Align bottom"><AlignEndHorizontal /></button>
        </>}
        {selectedNodes.length > 1 && <><button onClick={() => arrange('horizontal')} title="Horizontal connection-aware layout" aria-label="Horizontal layout"><ArrowRight /></button><button onClick={() => arrange('vertical')} title="Vertical connection-aware layout" aria-label="Vertical layout"><Workflow /></button></>}
        {selectedNodes.length > 2 && <><button onClick={() => distribute('horizontal')} title="Distribute horizontally" aria-label="Distribute horizontally"><AlignHorizontalDistributeCenter /></button><button onClick={() => distribute('vertical')} title="Distribute vertically" aria-label="Distribute vertically"><AlignVerticalDistributeCenter /></button></>}
        <i aria-hidden="true">{historyVersion}</i>
      </div>

      {selectedNodes.length > 0 && <div className="selection-toolbar" role="toolbar" aria-label="Selection actions">
        <button onClick={duplicateSelection} title="Duplicate selected" aria-label="Duplicate selected"><Copy /></button>
        {selectedNodes.every((node) => node.data?.locked)
          ? <button onClick={() => setSelectedLock(false)} title="Unlock selected components" aria-label="Unlock selected components"><Unlock /></button>
          : <button onClick={() => setSelectedLock(true)} title="Lock selected components" aria-label="Lock selected components"><Lock /></button>}
        {selectedNodes.length > 1 && <button onClick={groupSelection} title="Group selected components" aria-label="Group selected components"><Group /></button>}
        {selectedGroups.size > 0 && <button onClick={ungroupSelection} title="Ungroup selected components" aria-label="Ungroup selected components"><Ungroup /></button>}
        <button onClick={() => reorderSelection('front')} title="Bring selected forward" aria-label="Bring selected forward"><BringToFront /></button>
        <button onClick={() => reorderSelection('back')} title="Send selected backward" aria-label="Send selected backward"><SendToBack /></button>
        <button onClick={deleteSelection} title="Delete selected" aria-label="Delete selection"><Trash2 /></button>
      </div>}

      <div className="canvas-navigation" role="toolbar" aria-label="Canvas navigation">
        <button className={gridVisible ? 'active' : ''} aria-pressed={gridVisible} onClick={() => setGridVisible((value) => !value)} title="Toggle grid" aria-label="Toggle grid"><Grid3X3 /></button>
        <button className={snapEnabled ? 'active' : ''} aria-pressed={snapEnabled} onClick={() => setSnapEnabled((value) => !value)} title="Toggle snap to grid" aria-label="Toggle snap to grid"><Magnet /></button>
        <span />
        <button onClick={() => flow.zoomOut()} title="Zoom out" aria-label="Zoom out"><ZoomOut /></button>
        <button className="zoom-value" onClick={() => flow.zoomTo(1)} title="Reset zoom">{zoom}%</button>
        <button onClick={() => flow.zoomIn()} title="Zoom in" aria-label="Zoom in"><ZoomIn /></button>
        <span />
        <button onClick={() => flow.fitView({ padding: 0.2 })} title="Fit diagram" aria-label="Fit diagram"><Focus /></button>
        <button className={minimapVisible ? 'active' : ''} onClick={() => setMinimapVisible((visible) => !visible)} title="Toggle minimap" aria-label="Toggle minimap"><LocateFixed /></button>
        <button onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.querySelector('.canvas-panel')?.requestFullscreen()} title="Fullscreen" aria-label="Fullscreen"><Expand /></button>
      </div>

      {selectedEdge && <ConnectionToolbar edge={selectedEdge} update={updateSelectedEdge} remember={remember} onDelete={deleteSelection} />}

    </div>
  )
}

function ConnectionToolbar({ edge, update, remember, onDelete }: { edge: Edge; update: (patch: Partial<Edge>, record?: boolean) => void; remember: () => void; onDelete: () => void }) {
  const color = String(edge.style?.stroke || '#68708a')
  const width = Number(edge.style?.strokeWidth || 2)
  const routing = String(edge.data?.routing || 'smoothstep')
  const editingLabel = useRef(false)
  return <div className="connection-toolbar" role="toolbar" aria-label="Connection formatting">
    <label className="connection-color" title="Line color" aria-label="Line color"><span style={{ background: color }} /><input type="color" value={color} onChange={(event) => update({ style: { ...edge.style, stroke: event.target.value } })} /></label>
    <label className="connection-select" title="Connection routing"><Spline /><select aria-label="Connection routing" value={routing} onChange={(event) => update({ data: { ...edge.data, routing: event.target.value } })}><option value="straight">Straight</option><option value="default">Curved</option><option value="smoothstep">Stepped</option></select></label>
    <label className="connection-select line-width" title="Line weight"><Minus /><select aria-label="Line weight" value={width} onChange={(event) => update({ style: { ...edge.style, strokeWidth: Number(event.target.value) } })}><option value="1">Thin</option><option value="2">Regular</option><option value="3">Bold</option><option value="5">Heavy</option></select></label>
    <span className="connection-divider" />
    <button className={edge.markerStart ? 'active' : ''} onClick={() => update({ markerStart: edge.markerStart ? undefined : { type: MarkerType.ArrowClosed } })} title="Toggle start arrow" aria-label="Toggle start arrow"><ArrowLeft /></button>
    <button className={edge.markerEnd ? 'active' : ''} onClick={() => update({ markerEnd: edge.markerEnd ? undefined : { type: MarkerType.ArrowClosed } })} title="Toggle end arrow" aria-label="Toggle end arrow"><ArrowRight /></button>
    <button className={edge.style?.strokeDasharray ? 'active dashed-line' : 'dashed-line'} onClick={() => update({ style: { ...edge.style, strokeDasharray: edge.style?.strokeDasharray ? undefined : '7 5' } })} title="Toggle dashed line" aria-label="Toggle dashed line">•••</button>
    <span className="connection-divider" />
    <input className="connection-label-input" aria-label="Connection label" value={String(edge.label || '')}
      onFocus={() => { if (!editingLabel.current) remember(); editingLabel.current = true }}
      onChange={(event) => update({ label: event.target.value }, false)}
      onBlur={() => { editingLabel.current = false }} placeholder="Add label" />
    <button className="connection-delete" onClick={onDelete} title="Delete connection" aria-label="Delete connection"><Trash2 /></button>
  </div>
}

export default function CanvasWorkspace(props: Props) {
  return <ReactFlowProvider><CanvasWorkspaceInner {...props} /></ReactFlowProvider>
}
