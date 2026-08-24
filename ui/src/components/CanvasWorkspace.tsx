import {
  Background, BackgroundVariant, BaseEdge, ConnectionMode, Controls, EdgeLabelRenderer, Handle, MarkerType,
  MiniMap, ReactFlow, ReactFlowProvider, Position, addEdge, applyEdgeChanges,
  applyNodeChanges, getBezierPath, getSmoothStepPath, getStraightPath, reconnectEdge, useReactFlow,
  type Connection, type Edge, type EdgeChange, type EdgeProps, type Node, type NodeChange, type NodeProps,
} from '@xyflow/react'
import {
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter, AppWindow, Box, Boxes,
  Activity, ArrowLeft, ArrowRight, Bell, BellRing, Bot, BrainCircuit, Braces, ChevronDown, CircuitBoard,
  Cloud, Cog, Container, Cpu, Database, DatabaseZap, Expand, ExternalLink, FileCode2, FileText, Fingerprint,
  Focus, Gauge, GitBranch, Globe2, Hand, Group, Library, ListTree, LocateFixed, Lock, MessageSquareText,
  Mail, Minus, MousePointer2, Network, Plus, Redo2, ScrollText, Search, Server, ShieldCheck, Shuffle,
  ScanSearch, Smartphone, Sparkles, Spline, Trash2, Undo2, Unlock, UserCheck, UserRound, Warehouse,
  Waves, Waypoints, Webhook, Workflow, X, Zap, ZoomIn, ZoomOut, Clock3,
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

type CanvasTool = 'select' | 'pan' | 'connect'

type ArchitectureNodeData = {
  label?: string
  kind?: ArchitectureKind
  fill?: string
  border?: string
  textColor?: string
  locked?: boolean
  groupId?: string
  iconId?: string
}

type Snapshot = { nodes: Node[]; edges: Edge[] }
type CanvasHistoryApi = { remember: () => void }
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
}

const componentDefinitions: Array<{ kind: ArchitectureKind; label: string; description: string; iconId?: string; category?: string; keywords?: string }> = [
  { kind: 'service', label: 'Service / API', description: 'Backend or microservice', category: 'General' },
  { kind: 'service', label: 'Monolith', description: 'Single deployable application', iconId: 'monolith', category: 'General', keywords: 'monolithic application legacy system single tier all in one' },
  { kind: 'web', label: 'Web application', description: 'Browser-based application', category: 'General' },
  { kind: 'mobile', label: 'Mobile application', description: 'iOS or Android client', category: 'General' },
  { kind: 'service', label: 'Serverless Function', description: 'Event-driven stateless compute', iconId: 'serverless-function', category: 'General', keywords: 'lambda function faas cloud function' },
  { kind: 'service', label: 'Background Worker', description: 'Asynchronous processing service', iconId: 'background-worker', category: 'General', keywords: 'worker consumer processor daemon job' },
  { kind: 'service', label: 'Scheduled Job', description: 'Time-triggered workload', iconId: 'scheduled-job', category: 'General', keywords: 'cron scheduler batch timer' },
  { kind: 'cache', label: 'Cache', description: 'Fast temporary storage', category: 'General' },
  { kind: 'queue', label: 'Message Queue', description: 'Buffered asynchronous messaging', iconId: 'message-queue', category: 'General', keywords: 'queue broker fifo consumer producer' },
  { kind: 'external', label: 'External system', description: 'Third-party dependency', category: 'General' },
  { kind: 'actor', label: 'User / Actor', description: 'Person or system actor', category: 'General' },
  { kind: 'container', label: 'Boundary', description: 'System, network, or provider boundary', category: 'General' },
  { kind: 'note', label: 'Note', description: 'Diagram annotation', category: 'General' },
  { kind: 'text', label: 'Text', description: 'Standalone label', category: 'General' },
  { kind: 'service', label: 'AWS Lambda', description: 'Serverless function', iconId: 'aws-lambda', category: 'AWS', keywords: 'amazon function faas' },
  { kind: 'database', label: 'Amazon DynamoDB', description: 'Managed NoSQL database', iconId: 'aws-dynamodb', category: 'AWS', keywords: 'aws dynamo nosql key value document table' },
  { kind: 'service', label: 'Amazon ECS', description: 'Elastic Container Service', iconId: 'aws-ecs', category: 'AWS', keywords: 'aws elastic container service cluster task' },
  { kind: 'service', label: 'AWS Fargate', description: 'Serverless container compute', iconId: 'aws-fargate', category: 'AWS', keywords: 'aws ecs serverless container task compute' },
  { kind: 'service', label: 'Amazon EC2', description: 'Elastic virtual machines', iconId: 'aws-ec2', category: 'AWS', keywords: 'aws compute instance virtual machine vm' },
  { kind: 'storage', label: 'Amazon S3', description: 'Managed object storage', iconId: 'aws-s3', category: 'AWS', keywords: 'aws bucket blob object file storage' },
  { kind: 'database', label: 'Amazon RDS', description: 'Managed relational database', iconId: 'aws-rds', category: 'AWS', keywords: 'aws sql mysql postgres aurora relational' },
  { kind: 'queue', label: 'Amazon SQS', description: 'Managed message queue', iconId: 'aws-sqs', category: 'AWS', keywords: 'aws messaging queue fifo' },
  { kind: 'queue', label: 'Amazon SNS', description: 'Managed pub/sub notifications', iconId: 'aws-sns', category: 'AWS', keywords: 'aws notification topic pubsub messaging' },
  { kind: 'service', label: 'Amazon API Gateway', description: 'Managed API entry point', iconId: 'aws-api-gateway', category: 'AWS', keywords: 'aws rest http websocket ingress endpoint' },
  { kind: 'external', label: 'Amazon CloudFront', description: 'Global content delivery network', iconId: 'aws-cloudfront', category: 'AWS', keywords: 'aws cdn edge cache distribution' },
  { kind: 'service', label: 'Amazon EKS', description: 'Managed Kubernetes service', iconId: 'aws-eks', category: 'AWS', keywords: 'aws elastic kubernetes k8s cluster' },
  { kind: 'service', label: 'Azure Function', description: 'Serverless function', iconId: 'azure-function', category: 'Azure', keywords: 'microsoft function faas' },
  { kind: 'service', label: 'Azure App Service', description: 'Managed web application platform', iconId: 'azure-app-service', category: 'Azure', keywords: 'microsoft web api paas application' },
  { kind: 'service', label: 'Azure Virtual Machine', description: 'Cloud virtual machine', iconId: 'azure-vm', category: 'Azure', keywords: 'microsoft compute instance vm' },
  { kind: 'storage', label: 'Azure Storage Account', description: 'Blob, file, queue, and table storage', iconId: 'azure-storage', category: 'Azure', keywords: 'microsoft blob file object storage' },
  { kind: 'database', label: 'Azure Cosmos DB', description: 'Globally distributed NoSQL database', iconId: 'azure-cosmos-db', category: 'Azure', keywords: 'microsoft nosql document database' },
  { kind: 'queue', label: 'Azure Service Bus', description: 'Enterprise message broker', iconId: 'azure-service-bus', category: 'Azure', keywords: 'microsoft queue topic messaging broker' },
  { kind: 'service', label: 'Azure Kubernetes Service', description: 'Managed Kubernetes service', iconId: 'azure-aks', category: 'Azure', keywords: 'microsoft aks k8s cluster container' },
  { kind: 'storage', label: 'Azure Key Vault', description: 'Managed secrets and keys', iconId: 'azure-key-vault', category: 'Azure', keywords: 'microsoft secret certificate security key' },
  { kind: 'service', label: 'Azure Application Gateway', description: 'Layer 7 load balancer', iconId: 'azure-application-gateway', category: 'Azure', keywords: 'microsoft ingress waf load balancer networking' },
  { kind: 'queue', label: 'GCP Pub/Sub', description: 'Managed messaging', iconId: 'gcp-pubsub', category: 'Google Cloud', keywords: 'google cloud events topic subscription' },
  { kind: 'service', label: 'Compute Engine', description: 'Cloud virtual machines', iconId: 'gcp-compute-engine', category: 'Google Cloud', keywords: 'google cloud compute instance vm' },
  { kind: 'service', label: 'Cloud Run', description: 'Serverless container platform', iconId: 'gcp-cloud-run', category: 'Google Cloud', keywords: 'google cloud serverless container service' },
  { kind: 'service', label: 'Cloud Functions', description: 'Serverless functions', iconId: 'gcp-cloud-functions', category: 'Google Cloud', keywords: 'google cloud function faas' },
  { kind: 'storage', label: 'Cloud Storage', description: 'Managed object storage', iconId: 'gcp-cloud-storage', category: 'Google Cloud', keywords: 'google cloud bucket blob object file' },
  { kind: 'database', label: 'Cloud SQL', description: 'Managed relational database', iconId: 'gcp-cloud-sql', category: 'Google Cloud', keywords: 'google cloud mysql postgres relational database' },
  { kind: 'database', label: 'Firestore', description: 'Managed document database', iconId: 'gcp-firestore', category: 'Google Cloud', keywords: 'google cloud firebase nosql document database' },
  { kind: 'service', label: 'Google Kubernetes Engine', description: 'Managed Kubernetes service', iconId: 'gcp-gke', category: 'Google Cloud', keywords: 'google cloud gke k8s cluster container' },
  { kind: 'database', label: 'BigQuery', description: 'Serverless data warehouse', iconId: 'gcp-bigquery', category: 'Google Cloud', keywords: 'google cloud analytics warehouse sql data' },
  { kind: 'service', label: 'Cloud Load Balancing', description: 'Global managed load balancing', iconId: 'gcp-load-balancing', category: 'Google Cloud', keywords: 'google cloud networking traffic ingress balancer' },
  { kind: 'service', label: 'Container', description: 'Packaged application workload', iconId: 'container', category: 'General', keywords: 'runtime image pod workload' },
  { kind: 'service', label: 'Kubernetes Cluster', description: 'Container orchestration', iconId: 'kubernetes', category: 'General', keywords: 'k8s cluster pod deployment kubernetes' },
  { kind: 'queue', label: 'Kafka', description: 'Distributed event streaming', iconId: 'kafka', category: 'General', keywords: 'apache event stream broker' },
  { kind: 'cache', label: 'Redis', description: 'In-memory data store', iconId: 'redis', category: 'General', keywords: 'cache key value' },
  { kind: 'database', label: 'PostgreSQL', description: 'Relational database', iconId: 'postgresql', category: 'General', keywords: 'postgres sql rdbms' },
  { kind: 'service', label: 'Docker', description: 'Application container', iconId: 'docker', category: 'General', keywords: 'container image runtime' },
  { kind: 'service', label: 'API Gateway', description: 'API entry point and routing', iconId: 'api-gateway', category: 'General', keywords: 'ingress endpoint routing rest' },
  { kind: 'service', label: 'Load Balancer', description: 'Distribute network traffic', iconId: 'load-balancer', category: 'General', keywords: 'alb elb traffic proxy' },
  { kind: 'service', label: 'Reverse Proxy', description: 'Proxy and route inbound traffic', iconId: 'reverse-proxy', category: 'General', keywords: 'nginx envoy ingress routing proxy' },
  { kind: 'external', label: 'DNS', description: 'Domain name resolution', iconId: 'dns', category: 'General', keywords: 'domain nameserver route53 lookup' },
  { kind: 'container', label: 'Network / VPC', description: 'Isolated network boundary', iconId: 'network-vpc', category: 'General', keywords: 'virtual private cloud subnet network boundary' },
  { kind: 'service', label: 'Firewall / WAF', description: 'Filter and protect network traffic', iconId: 'firewall-waf', category: 'General', keywords: 'security rules web application firewall acl' },
  { kind: 'storage', label: 'Object Storage', description: 'Blob and object storage', iconId: 'object-storage', category: 'General', keywords: 's3 bucket blob files' },
  { kind: 'external', label: 'CDN', description: 'Content delivery network', iconId: 'cdn', category: 'General', keywords: 'cloudfront edge cache content delivery' },
  { kind: 'database', label: 'SQL Database', description: 'Relational data store', iconId: 'sql-database', category: 'General', keywords: 'rdbms relational mysql' },
  { kind: 'database', label: 'NoSQL Database', description: 'Document or key-value store', iconId: 'nosql-database', category: 'General', keywords: 'dynamodb mongodb document key value' },
  { kind: 'database', label: 'Search Engine', description: 'Indexed full-text search', iconId: 'search-engine', category: 'General', keywords: 'elasticsearch opensearch index query' },
  { kind: 'database', label: 'Data Warehouse', description: 'Analytical data platform', iconId: 'data-warehouse', category: 'General', keywords: 'analytics olap reporting bigquery redshift' },
  { kind: 'queue', label: 'Event Bus', description: 'Route domain events', iconId: 'event-bus', category: 'General', keywords: 'eventbridge topic pubsub events' },
  { kind: 'queue', label: 'Event Stream', description: 'Ordered stream of events', iconId: 'event-stream', category: 'General', keywords: 'streaming log partition topic events' },
  { kind: 'storage', label: 'Secrets Manager', description: 'Credentials and secret storage', iconId: 'secrets-manager', category: 'General', keywords: 'vault key credentials password' },
  { kind: 'external', label: 'Monitoring', description: 'Metrics, logs, and alerts', iconId: 'monitoring', category: 'Operations - CD/CI', keywords: 'observability telemetry logs metrics alerts' },
  { kind: 'external', label: 'Logging', description: 'Centralized application logs', iconId: 'logging', category: 'Operations - CD/CI', keywords: 'log aggregation observability audit events' },
  { kind: 'service', label: 'CI/CD Pipeline', description: 'Automated build and deployment', iconId: 'ci-cd-pipeline', category: 'Operations - CD/CI', keywords: 'continuous integration delivery deployment build release' },
  { kind: 'external', label: 'Git Repository', description: 'Source code repository', iconId: 'git-repository', category: 'Operations - CD/CI', keywords: 'git source control github gitlab bitbucket scm' },
  { kind: 'service', label: 'Jenkins', description: 'Build and delivery automation', iconId: 'jenkins', category: 'Operations - CD/CI', keywords: 'ci cd pipeline build automation devops' },
  { kind: 'service', label: 'GitHub Actions', description: 'Repository-native workflow automation', iconId: 'github-actions', category: 'Operations - CD/CI', keywords: 'ci cd workflow github runner pipeline' },
  { kind: 'service', label: 'GitLab CI', description: 'Integrated CI/CD pipelines', iconId: 'gitlab-ci', category: 'Operations - CD/CI', keywords: 'gitlab runner pipeline continuous integration delivery' },
  { kind: 'service', label: 'Argo CD', description: 'GitOps continuous delivery', iconId: 'argo-cd', category: 'Operations - CD/CI', keywords: 'argocd gitops kubernetes deployment delivery' },
  { kind: 'service', label: 'Terraform', description: 'Infrastructure as code', iconId: 'terraform', category: 'Operations - CD/CI', keywords: 'hashicorp iac provisioning cloud infrastructure' },
  { kind: 'service', label: 'Ansible', description: 'Configuration and deployment automation', iconId: 'ansible', category: 'Operations - CD/CI', keywords: 'automation configuration management playbook devops' },
  { kind: 'service', label: 'Helm', description: 'Kubernetes package management', iconId: 'helm', category: 'Operations - CD/CI', keywords: 'kubernetes chart release deployment package' },
  { kind: 'external', label: 'Prometheus', description: 'Metrics collection and alerting', iconId: 'prometheus', category: 'Operations - CD/CI', keywords: 'sre monitoring metrics alert observability' },
  { kind: 'external', label: 'Grafana', description: 'Operational dashboards and visualization', iconId: 'grafana', category: 'Operations - CD/CI', keywords: 'sre dashboard metrics logs observability' },
  { kind: 'external', label: 'OpenTelemetry', description: 'Vendor-neutral telemetry collection', iconId: 'opentelemetry', category: 'Operations - CD/CI', keywords: 'otel traces metrics logs observability sre' },
  { kind: 'external', label: 'PagerDuty', description: 'Incident response and on-call management', iconId: 'pagerduty', category: 'Operations - CD/CI', keywords: 'sre incident alert oncall operations' },
  { kind: 'service', label: 'AI Agent', description: 'Autonomous tool-using AI workflow', iconId: 'ai-agent', category: 'AI / ML', keywords: 'agent assistant autonomous tool calling' },
  { kind: 'service', label: 'Foundation Model / LLM', description: 'Large language or foundation model', iconId: 'foundation-model', category: 'AI / ML', keywords: 'llm generative model transformer' },
  { kind: 'service', label: 'Embedding Model', description: 'Convert content into vectors', iconId: 'embedding-model', category: 'AI / ML', keywords: 'embedding vector representation semantic' },
  { kind: 'service', label: 'Multimodal Model', description: 'Text, image, audio, or video model', iconId: 'multimodal-model', category: 'AI / ML', keywords: 'vision audio image video vlm' },
  { kind: 'text', label: 'Prompt Template', description: 'Versioned model instructions', iconId: 'prompt-template', category: 'AI / ML', keywords: 'prompt system instruction template' },
  { kind: 'service', label: 'RAG Pipeline', description: 'Retrieval-augmented generation flow', iconId: 'rag-pipeline', category: 'AI / ML', keywords: 'rag retrieve augment context generation' },
  { kind: 'service', label: 'Retriever', description: 'Fetch relevant knowledge', iconId: 'retriever', category: 'AI / ML', keywords: 'search retrieval context semantic' },
  { kind: 'database', label: 'Vector Database', description: 'Store and search embeddings', iconId: 'vector-database', category: 'AI / ML', keywords: 'vector store similarity semantic index' },
  { kind: 'service', label: 'AI Tool / Function', description: 'Capability callable by an agent', iconId: 'ai-tool', category: 'AI / ML', keywords: 'function tool calling action plugin' },
  { kind: 'service', label: 'MCP Server', description: 'Model Context Protocol tool server', iconId: 'mcp-server', category: 'AI / ML', keywords: 'mcp context protocol tools resources' },
  { kind: 'service', label: 'Model Gateway', description: 'Route requests across models', iconId: 'model-gateway', category: 'AI / ML', keywords: 'proxy router fallback provider llm gateway' },
  { kind: 'service', label: 'Inference Endpoint', description: 'Production model-serving endpoint', iconId: 'inference-endpoint', category: 'AI / ML', keywords: 'serve deploy prediction api model' },
  { kind: 'storage', label: 'Model Registry', description: 'Version and govern model artifacts', iconId: 'model-registry', category: 'AI / ML', keywords: 'model artifact version registry mlops' },
  { kind: 'service', label: 'AI Guardrail', description: 'Validate model input and output', iconId: 'ai-guardrail', category: 'AI / ML', keywords: 'safety moderation policy validation' },
  { kind: 'external', label: 'Evaluation Service', description: 'Test model and agent quality', iconId: 'evaluation-service', category: 'AI / ML', keywords: 'eval benchmark quality test score' },
  { kind: 'actor', label: 'Human Approval', description: 'Human-in-the-loop decision', iconId: 'human-approval', category: 'AI / ML', keywords: 'hitl review approve oversight' },
  { kind: 'service', label: 'GPU Compute', description: 'Accelerated AI compute', iconId: 'gpu-compute', category: 'AI / ML', keywords: 'gpu cuda accelerator training inference' },
  { kind: 'external', label: 'OpenAI', description: 'Foundation models and AI APIs', iconId: 'openai', category: 'AI / ML', keywords: 'gpt responses embeddings realtime' },
  { kind: 'external', label: 'Anthropic Claude', description: 'Claude models and API', iconId: 'anthropic-claude', category: 'AI / ML', keywords: 'anthropic claude llm model api' },
  { kind: 'external', label: 'Google Gemini', description: 'Google multimodal model platform', iconId: 'google-gemini', category: 'AI / ML', keywords: 'google gemini ai model api' },
  { kind: 'external', label: 'Meta Llama', description: 'Open foundation model family', iconId: 'meta-llama', category: 'AI / ML', keywords: 'meta llama open model' },
  { kind: 'external', label: 'Mistral AI', description: 'Mistral model platform', iconId: 'mistral-ai', category: 'AI / ML', keywords: 'mistral mixtral model api' },
  { kind: 'external', label: 'Cohere', description: 'Enterprise language model platform', iconId: 'cohere', category: 'AI / ML', keywords: 'command rerank embed model api' },
  { kind: 'external', label: 'Hugging Face', description: 'Model hub and inference platform', iconId: 'hugging-face', category: 'AI / ML', keywords: 'transformers hub models datasets inference' },
  { kind: 'service', label: 'LangChain', description: 'LLM application framework', iconId: 'langchain', category: 'AI / ML', keywords: 'chain agent rag framework' },
  { kind: 'service', label: 'LangGraph', description: 'Stateful agent orchestration', iconId: 'langgraph', category: 'AI / ML', keywords: 'agent graph workflow durable orchestration' },
  { kind: 'service', label: 'LlamaIndex', description: 'Data framework for LLM applications', iconId: 'llamaindex', category: 'AI / ML', keywords: 'rag retrieval data framework index' },
  { kind: 'service', label: 'Semantic Kernel', description: 'Microsoft agent and AI SDK', iconId: 'semantic-kernel', category: 'AI / ML', keywords: 'microsoft agent orchestration sdk plugins' },
  { kind: 'service', label: 'CrewAI', description: 'Multi-agent orchestration framework', iconId: 'crewai', category: 'AI / ML', keywords: 'crew multi agent workflow framework' },
  { kind: 'database', label: 'Pinecone', description: 'Managed vector database', iconId: 'pinecone', category: 'AI / ML', keywords: 'vector database similarity search' },
  { kind: 'database', label: 'Weaviate', description: 'AI-native vector database', iconId: 'weaviate', category: 'AI / ML', keywords: 'vector database semantic search' },
  { kind: 'database', label: 'Milvus', description: 'Open-source vector database', iconId: 'milvus', category: 'AI / ML', keywords: 'vector database similarity search' },
  { kind: 'database', label: 'Qdrant', description: 'Vector search engine', iconId: 'qdrant', category: 'AI / ML', keywords: 'vector database similarity search' },
  { kind: 'database', label: 'Chroma', description: 'Embedding database for AI', iconId: 'chroma', category: 'AI / ML', keywords: 'chromadb vector embeddings database' },
  { kind: 'database', label: 'pgvector', description: 'PostgreSQL vector extension', iconId: 'pgvector', category: 'AI / ML', keywords: 'postgres vector similarity extension' },
  { kind: 'service', label: 'vLLM', description: 'High-throughput model serving', iconId: 'vllm', category: 'AI / ML', keywords: 'inference serving engine llm' },
  { kind: 'service', label: 'Ollama', description: 'Local model runtime', iconId: 'ollama', category: 'AI / ML', keywords: 'local model inference runtime' },
  { kind: 'service', label: 'Hugging Face Inference', description: 'Managed model inference', iconId: 'hf-inference', category: 'AI / ML', keywords: 'hugging face endpoint serving model' },
  { kind: 'service', label: 'NVIDIA NIM', description: 'Optimized inference microservice', iconId: 'nvidia-nim', category: 'AI / ML', keywords: 'nvidia inference microservice gpu' },
  { kind: 'service', label: 'NVIDIA Triton', description: 'Production inference server', iconId: 'nvidia-triton', category: 'AI / ML', keywords: 'nvidia triton model serving inference' },
  { kind: 'service', label: 'Text Generation Inference', description: 'Hugging Face LLM serving engine', iconId: 'tgi', category: 'AI / ML', keywords: 'hugging face tgi model server' },
  { kind: 'service', label: 'SGLang', description: 'High-performance model runtime', iconId: 'sglang', category: 'AI / ML', keywords: 'inference serving structured generation' },
  { kind: 'external', label: 'LangSmith', description: 'Agent tracing and evaluation', iconId: 'langsmith', category: 'AI / ML', keywords: 'langchain trace eval observability prompt' },
  { kind: 'external', label: 'MLflow', description: 'ML lifecycle and model tracking', iconId: 'mlflow', category: 'AI / ML', keywords: 'mlops experiment registry tracking' },
  { kind: 'external', label: 'Weights & Biases', description: 'ML experiments and observability', iconId: 'weights-biases', category: 'AI / ML', keywords: 'wandb experiment tracking evaluation' },
  { kind: 'external', label: 'Arize Phoenix', description: 'Open-source AI observability', iconId: 'arize-phoenix', category: 'AI / ML', keywords: 'trace eval observability llm' },
  { kind: 'external', label: 'Helicone', description: 'LLM observability gateway', iconId: 'helicone', category: 'AI / ML', keywords: 'llm logs proxy metrics observability' },
  { kind: 'external', label: 'Promptfoo', description: 'Prompt testing and red teaming', iconId: 'promptfoo', category: 'AI / ML', keywords: 'eval test prompt security red team' },
  { kind: 'service', label: 'Amazon Bedrock', description: 'AWS foundation model platform', iconId: 'aws-bedrock', category: 'AWS', keywords: 'aws generative ai agents foundation model' },
  { kind: 'service', label: 'Amazon SageMaker AI', description: 'AWS machine learning platform', iconId: 'aws-sagemaker', category: 'AWS', keywords: 'aws ml training endpoint model' },
  { kind: 'service', label: 'Azure OpenAI', description: 'OpenAI models hosted on Azure', iconId: 'azure-openai', category: 'Azure', keywords: 'microsoft ai gpt model endpoint' },
  { kind: 'service', label: 'Azure AI Foundry', description: 'Azure AI application platform', iconId: 'azure-ai-foundry', category: 'Azure', keywords: 'microsoft ai studio model agent' },
  { kind: 'service', label: 'Google Vertex AI', description: 'Google Cloud AI platform', iconId: 'gcp-vertex-ai', category: 'Google Cloud', keywords: 'gcp vertex machine learning model endpoint' },
  { kind: 'service', label: 'Google Gemini API', description: 'Gemini models on Google Cloud', iconId: 'gcp-gemini-api', category: 'Google Cloud', keywords: 'gcp google gemini generative ai model api' },
  { kind: 'external', label: 'Identity Provider', description: 'Authentication and identity', iconId: 'identity-provider', category: 'General', keywords: 'idp auth oauth oidc sso' },
  { kind: 'external', label: 'Email', description: 'Email delivery and communication', iconId: 'email', category: 'General', keywords: 'smtp mail message ses sendgrid' },
  { kind: 'external', label: 'Notification', description: 'Application alerts and notifications', iconId: 'notification', category: 'General', keywords: 'alert push notify bell message' },
  { kind: 'external', label: 'Slack', description: 'Team messaging and automation', iconId: 'slack', category: 'General', keywords: 'chat collaboration webhook notification workspace' },
  { kind: 'external', label: 'Microsoft Teams', description: 'Team collaboration and communication', iconId: 'microsoft-teams', category: 'General', keywords: 'teams microsoft chat meeting webhook notification' },
  { kind: 'external', label: 'SMS', description: 'Text message delivery', iconId: 'sms', category: 'General', keywords: 'mobile phone text message notification' },
  { kind: 'external', label: 'Push Notification', description: 'Mobile and browser push delivery', iconId: 'push-notification', category: 'General', keywords: 'alert device browser mobile notification' },
  { kind: 'external', label: 'Webhook', description: 'HTTP event callback', iconId: 'webhook', category: 'General', keywords: 'http callback integration event api' },
  { kind: 'external', label: 'Microsoft Outlook', description: 'Microsoft email and calendar', iconId: 'microsoft-outlook', category: 'General', keywords: 'outlook office 365 email mail calendar' },
  { kind: 'external', label: 'Gmail', description: 'Google email service', iconId: 'gmail', category: 'General', keywords: 'google workspace email mail' },
  { kind: 'external', label: 'Twilio', description: 'Programmable communications platform', iconId: 'twilio', category: 'General', keywords: 'sms voice phone messaging api' },
  { kind: 'external', label: 'SendGrid', description: 'Transactional email delivery', iconId: 'sendgrid', category: 'General', keywords: 'email smtp transactional delivery twilio' },
  { kind: 'external', label: 'Discord', description: 'Community messaging platform', iconId: 'discord', category: 'General', keywords: 'chat community webhook notification bot' },
]

const iconByKind = {
  service: Server, web: AppWindow, mobile: Smartphone, database: Database, cache: Braces,
  queue: Workflow, storage: Cloud, external: ExternalLink, actor: UserRound, container: Boxes,
  note: MessageSquareText, text: FileText,
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

const generalGroupOrder = ['Applications', 'Data', 'Messaging', 'Communication', 'Networking', 'Security', 'Platform', 'Utilities'] as const
type GeneralComponentGroup = typeof generalGroupOrder[number]
const generalGroupByLabel: Record<string, GeneralComponentGroup> = {
  'Service / API': 'Applications', Monolith: 'Applications', 'Web application': 'Applications',
  'Mobile application': 'Applications', 'Serverless Function': 'Applications', 'Background Worker': 'Applications',
  'Scheduled Job': 'Applications', Cache: 'Data', Redis: 'Data', PostgreSQL: 'Data',
  'Object Storage': 'Data', 'SQL Database': 'Data', 'NoSQL Database': 'Data', 'Search Engine': 'Data',
  'Data Warehouse': 'Data', 'Message Queue': 'Messaging', Kafka: 'Messaging', 'Event Bus': 'Messaging',
  'Event Stream': 'Messaging', 'API Gateway': 'Networking', 'Load Balancer': 'Networking',
  Email: 'Communication', Notification: 'Communication', Slack: 'Communication', 'Microsoft Teams': 'Communication',
  SMS: 'Communication', 'Push Notification': 'Communication', Webhook: 'Communication',
  'Microsoft Outlook': 'Communication', Gmail: 'Communication', Twilio: 'Communication',
  SendGrid: 'Communication', Discord: 'Communication',
  'Reverse Proxy': 'Networking', DNS: 'Networking', 'Network / VPC': 'Networking', CDN: 'Networking',
  'Firewall / WAF': 'Security', 'Secrets Manager': 'Security', 'Identity Provider': 'Security',
  Container: 'Platform', 'Kubernetes Cluster': 'Platform', Docker: 'Platform',
  'External system': 'Utilities', 'User / Actor': 'Utilities', Boundary: 'Utilities', Note: 'Utilities', Text: 'Utilities',
}

const aiGroupOrder = ['Architecture', 'Model Providers', 'Agent Frameworks', 'Vector Data', 'Inference', 'Observability'] as const
type AiComponentGroup = typeof aiGroupOrder[number]
const aiGroupByLabel: Record<string, AiComponentGroup> = {
  'AI Agent': 'Architecture', 'Foundation Model / LLM': 'Architecture', 'Embedding Model': 'Architecture',
  'Multimodal Model': 'Architecture', 'Prompt Template': 'Architecture', 'RAG Pipeline': 'Architecture',
  Retriever: 'Architecture', 'Vector Database': 'Architecture', 'AI Tool / Function': 'Architecture',
  'MCP Server': 'Architecture', 'Model Gateway': 'Architecture', 'Inference Endpoint': 'Architecture',
  'Model Registry': 'Architecture', 'AI Guardrail': 'Architecture', 'Evaluation Service': 'Architecture',
  'Human Approval': 'Architecture', 'GPU Compute': 'Architecture', OpenAI: 'Model Providers',
  'Anthropic Claude': 'Model Providers', 'Google Gemini': 'Model Providers', 'Meta Llama': 'Model Providers',
  'Mistral AI': 'Model Providers', Cohere: 'Model Providers', 'Hugging Face': 'Model Providers',
  LangChain: 'Agent Frameworks', LangGraph: 'Agent Frameworks', LlamaIndex: 'Agent Frameworks',
  'Semantic Kernel': 'Agent Frameworks', CrewAI: 'Agent Frameworks', Pinecone: 'Vector Data',
  Weaviate: 'Vector Data', Milvus: 'Vector Data', Qdrant: 'Vector Data', Chroma: 'Vector Data',
  pgvector: 'Vector Data', vLLM: 'Inference', Ollama: 'Inference', 'Hugging Face Inference': 'Inference',
  'NVIDIA NIM': 'Inference', 'NVIDIA Triton': 'Inference', 'Text Generation Inference': 'Inference',
  SGLang: 'Inference', LangSmith: 'Observability', MLflow: 'Observability',
  'Weights & Biases': 'Observability', 'Arize Phoenix': 'Observability', Helicone: 'Observability',
  Promptfoo: 'Observability',
}

function BidirectionalHandle({ position, id }: { position: Position; id: string }) {
  return <>
    <Handle type="source" position={position} id={id} />
    <Handle type="target" position={position} id={id} />
  </>
}

function ArchitectureNode({ id, data, selected }: NodeProps<Node<ArchitectureNodeData>>) {
  const { getNode, updateNode } = useReactFlow()
  const history = useCanvasHistory()
  const editing = useRef(false)
  const kind = data.kind || 'service'
  const Icon = (data.iconId && iconById[data.iconId]) || iconByKind[kind]
  const label = data.label || ''
  const labelLength = label.length
  const iconDensity = labelLength > 24 ? 'icon-compact' : labelLength > 14 ? 'icon-medium' : 'icon-large'

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
      className={`architecture-node architecture-node-${kind} ${iconDensity}${selected ? ' selected' : ''}${data.locked ? ' locked' : ''}`}
      style={{ background: data.fill, borderColor: data.border, color: data.textColor }}
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
          onChange={(event) => updateContent(event.target.value)}
          onBlur={() => { updateContent(label.trim() || 'Untitled component'); editing.current = false }}
          rows={getComponentSize(label, kind).height > 52 ? 2 : 1} /> : <strong title={data.label}>{truncateCanvasText(data.label || 'Untitled component', COMPONENT_TITLE_LIMIT)}</strong>}
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

function normalizedNode(node: Node): Node {
  if (node.type === 'architecture') return node
  return {
    ...node,
    type: 'architecture',
    data: { kind: 'service', label: String(node.data?.label || 'Service') },
    style: undefined,
  }
}

export function groupSelectedNodes(nodes: Node[], groupId: string): Node[] {
  return nodes.map((node) => node.selected
    ? { ...node, data: { ...node.data, groupId } }
    : node)
}

export function ungroupSelectedNodes(nodes: Node[]): Node[] {
  const groupIds = new Set(nodes.filter((node) => node.selected).map((node) => node.data?.groupId).filter(Boolean))
  if (!groupIds.size) return nodes
  return nodes.map((node) => groupIds.has(node.data?.groupId)
    ? { ...node, data: { ...node.data, groupId: undefined } }
    : node)
}

export function selectPersistentGroup(nodes: Node[], selectedNode: Node): Node[] {
  const groupId = selectedNode.data?.groupId
  if (!groupId) return nodes
  return nodes.map((node) => ({ ...node, selected: node.data?.groupId === groupId }))
}

export function applyGroupAwareNodeChanges(changes: NodeChange[], nodes: Node[]): Node[] {
  const expanded = [...changes]
  const changedIds = new Set(changes.filter((change) => change.type === 'position').map((change) => change.id))
  for (const change of changes) {
    if (change.type !== 'position' || !change.position) continue
    const moved = nodes.find((node) => node.id === change.id)
    const groupId = moved?.data?.groupId
    if (!moved || !groupId) continue
    const delta = { x: change.position.x - moved.position.x, y: change.position.y - moved.position.y }
    for (const member of nodes.filter((node) => node.data?.groupId === groupId && !changedIds.has(node.id))) {
      expanded.push({
        type: 'position', id: member.id, dragging: change.dragging,
        position: { x: member.position.x + delta.x, y: member.position.y + delta.y },
      })
      changedIds.add(member.id)
    }
  }
  return applyNodeChanges(expanded, nodes)
}

export function arrangeCanvasNodes(nodes: Node[], edges: Edge[], direction: 'horizontal' | 'vertical'): Node[] {
  const candidates = nodes.filter((node) => node.selected && !node.data?.locked)
  if (candidates.length < 2) return nodes
  const ids = new Set(candidates.map((node) => node.id))
  const rank = new Map(candidates.map((node) => [node.id, 0]))
  for (let pass = 0; pass < candidates.length; pass++) {
    let changed = false
    for (const edge of edges.filter((item) => ids.has(item.source) && ids.has(item.target))) {
      const next = Math.min(candidates.length - 1, (rank.get(edge.source) || 0) + 1)
      if (next > (rank.get(edge.target) || 0)) { rank.set(edge.target, next); changed = true }
    }
    if (!changed) break
  }
  const originX = Math.min(...candidates.map((node) => node.position.x))
  const originY = Math.min(...candidates.map((node) => node.position.y))
  const lanes = new Map<number, number>()
  return nodes.map((node) => {
    if (!ids.has(node.id)) return node
    const level = rank.get(node.id) || 0
    const lane = lanes.get(level) || 0
    lanes.set(level, lane + 1)
    return { ...node, position: direction === 'horizontal'
      ? { x: originX + level * 200, y: originY + lane * 120 }
      : { x: originX + lane * 180, y: originY + level * 120 } }
  })
}

export function distributeCanvasNodes(nodes: Node[], direction: 'horizontal' | 'vertical'): Node[] {
  const selected = nodes.filter((node) => node.selected && !node.data?.locked)
    .sort((a, b) => direction === 'horizontal' ? a.position.x - b.position.x : a.position.y - b.position.y)
  if (selected.length < 3) return nodes
  const first = direction === 'horizontal' ? selected[0].position.x : selected[0].position.y
  const last = direction === 'horizontal' ? selected.at(-1)!.position.x : selected.at(-1)!.position.y
  const spacing = (last - first) / (selected.length - 1)
  const positions = new Map(selected.map((node, index) => [node.id, first + spacing * index]))
  return nodes.map((node) => !positions.has(node.id) ? node : ({ ...node, position: direction === 'horizontal'
    ? { ...node.position, x: positions.get(node.id)! }
    : { ...node.position, y: positions.get(node.id)! } }))
}

function CanvasWorkspaceInner({ nodes, edges, setNodes, setEdges }: Props) {
  const flow = useReactFlow()
  const [tool, setTool] = useState<CanvasTool>('select')
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [minimapVisible, setMinimapVisible] = useState(true)
  const [search, setSearch] = useState('')
  const [componentCategory, setComponentCategory] = useState('All')
  const [openGeneralGroups, setOpenGeneralGroups] = useState<Set<GeneralComponentGroup>>(() => new Set(['Applications']))
  const [openAiGroups, setOpenAiGroups] = useState<Set<AiComponentGroup>>(() => new Set(['Architecture']))
  const [zoom, setZoom] = useState(100)
  const [historyVersion, setHistoryVersion] = useState(0)
  const undoStack = useRef<Snapshot[]>([])
  const redoStack = useRef<Snapshot[]>([])
  const clipboard = useRef<Snapshot>({ nodes: [], edges: [] })
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const dragSnapshot = useRef<Snapshot | null>(null)

  useEffect(() => { nodesRef.current = nodes }, [nodes])
  useEffect(() => { edgesRef.current = edges }, [edges])
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

  function remember(snapshot: Snapshot = { nodes: nodesRef.current, edges: edgesRef.current }) {
    undoStack.current.push(structuredClone(snapshot))
    if (undoStack.current.length > 50) undoStack.current.shift()
    redoStack.current = []
    setHistoryVersion((value) => value + 1)
  }

  const historyApi = useMemo<CanvasHistoryApi>(() => ({ remember: () => remember() }), [])

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

  function addComponent(kind: ArchitectureKind, iconId?: string) {
    const definition = componentDefinitions.find((item) => item.kind === kind && item.iconId === iconId)!
    const size = getComponentSize(definition.label, kind)
    const viewportCenter = flow.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    const node: Node<ArchitectureNodeData> = {
      id: crypto.randomUUID(),
      type: 'architecture',
      position: { x: viewportCenter.x - 80, y: viewportCenter.y - 40 },
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

  const selectGroup = useCallback((node: Node) => {
    if (node.data?.groupId) setNodes((current) => selectPersistentGroup(current, node))
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

  const align = (direction: 'horizontal' | 'vertical') => {
    if (selectedNodes.length < 2) return
    remember()
    if (direction === 'horizontal') {
      const y = selectedNodes.reduce((total, node) => total + node.position.y, 0) / selectedNodes.length
      setNodes((current) => current.map((node) => node.selected ? { ...node, position: { ...node.position, y } } : node))
    } else {
      const x = selectedNodes.reduce((total, node) => total + node.position.x, 0) / selectedNodes.length
      setNodes((current) => current.map((node) => node.selected ? { ...node, position: { ...node.position, x } } : node))
    }
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

  const changeSelectedIcon = (iconId: string) => {
    if (selectedNodes.length !== 1) return
    remember()
    setNodes((current) => current.map((node) => node.id === selectedNodes[0].id
      ? { ...node, data: { ...node.data, iconId: iconId || undefined } }
      : node))
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
      if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); deleteSelection() }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  })

  const componentCategories = ['All', ...new Set(componentDefinitions.map((item) => item.category || 'General'))]
  const filteredComponents = componentDefinitions.filter((item) =>
    (componentCategory === 'All' || item.category === componentCategory)
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
        onNodeClick={(_, node) => selectGroup(node)}
        onNodeDragStart={(_, node) => {
          selectGroup(node)
          dragSnapshot.current = structuredClone({ nodes: nodesRef.current, edges: edgesRef.current })
        }}
        onNodeDragStop={() => { if (dragSnapshot.current) remember(dragSnapshot.current); dragSnapshot.current = null }}
        onMove={(_, viewport) => setZoom(Math.round(viewport.zoom * 100))}
        panOnDrag={tool === 'pan' ? true : [1]}
        nodesDraggable={tool !== 'pan'}
        nodesConnectable={tool === 'connect' || tool === 'select'}
        edgesReconnectable={tool !== 'pan'}
        reconnectRadius={18}
        elevateEdgesOnSelect
        connectionMode={ConnectionMode.Loose}
        selectionOnDrag={tool === 'select'}
        snapToGrid
        snapGrid={[16, 16]}
        deleteKeyCode={null}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} />
        {minimapVisible && <MiniMap pannable zoomable />}
        <Controls showZoom={false} showFitView={false} showInteractive={false} />
      </ReactFlow>
      </CanvasHistoryContext.Provider>

      <div className="canvas-toolbox" role="toolbar" aria-label="Canvas tools">
        <button className={tool === 'select' ? 'active' : ''} onClick={() => setTool('select')} title="Select (Esc)" aria-label="Select"><MousePointer2 /></button>
        <button className={tool === 'pan' ? 'active' : ''} onClick={() => setTool('pan')} title="Pan" aria-label="Pan"><Hand /></button>
        <span />
        <button className={libraryOpen ? 'active' : ''} onClick={() => setLibraryOpen((open) => !open)} title="Add component" aria-label="Add component"><Plus /></button>
        <button onClick={() => addComponent('text')} title="Add text" aria-label="Add text"><FileText /></button>
        <button onClick={() => addComponent('note')} title="Add note" aria-label="Add note"><MessageSquareText /></button>
        <button className={tool === 'connect' ? 'active' : ''} onClick={() => setTool('connect')} title="Connect components" aria-label="Connect components"><Network /></button>
        <button onClick={() => addComponent('container')} title="Add container" aria-label="Add container"><Box /></button>
        <span />
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

      <div className="canvas-history" role="toolbar" aria-label="Canvas history and layout">
        <button onClick={undo} disabled={!undoStack.current.length} title="Undo" aria-label="Undo canvas change"><Undo2 /></button>
        <button onClick={redo} disabled={!redoStack.current.length} title="Redo" aria-label="Redo canvas change"><Redo2 /></button>
        {selectedNodes.length > 1 && <><span /><button onClick={() => align('horizontal')} title="Align horizontally" aria-label="Align horizontally"><AlignHorizontalDistributeCenter /></button><button onClick={() => align('vertical')} title="Align vertically" aria-label="Align vertically"><AlignVerticalDistributeCenter /></button></>}
        {selectedNodes.length > 1 && <><button onClick={() => arrange('horizontal')} title="Horizontal connection-aware layout" aria-label="Horizontal layout"><ArrowRight /></button><button onClick={() => arrange('vertical')} title="Vertical connection-aware layout" aria-label="Vertical layout"><Workflow /></button></>}
        {selectedNodes.length > 2 && <><button onClick={() => distribute('horizontal')} title="Distribute horizontally" aria-label="Distribute horizontally"><AlignHorizontalDistributeCenter /></button><button onClick={() => distribute('vertical')} title="Distribute vertically" aria-label="Distribute vertically"><AlignVerticalDistributeCenter /></button></>}
        {selectedNodes.length > 1 && <button onClick={groupSelection} title="Group selected components (Ctrl+G)" aria-label="Group selected components"><Group /></button>}
        {selectedGroups.size > 0 && <button onClick={ungroupSelection} title="Ungroup selected components (Ctrl+Shift+G)" aria-label="Ungroup selected components"><Ungroup /></button>}
        {selectedNodes.length === 1 && <select className="canvas-icon-picker" aria-label="Component icon" value={String(selectedNodes[0].data?.iconId || '')} onChange={(event) => changeSelectedIcon(event.target.value)}>
          <option value="">Default icon</option>{componentDefinitions.filter((item) => item.iconId).map((item) => <option key={item.iconId} value={item.iconId}>{item.label}</option>)}
        </select>}
        <i aria-hidden="true">{historyVersion}</i>
      </div>

      <div className="canvas-navigation" role="toolbar" aria-label="Canvas navigation">
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
