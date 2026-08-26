export const generalGroupOrder = ['Applications', 'Data', 'Messaging', 'Communication', 'Networking', 'Security', 'Platform', 'Utilities'] as const
export type GeneralComponentGroup = typeof generalGroupOrder[number]
export const generalGroupByLabel: Record<string, GeneralComponentGroup> = {
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
  'Custom Component': 'Utilities',
}

export const aiGroupOrder = ['Architecture', 'Model Providers', 'Agent Frameworks', 'Vector Data', 'Inference', 'Observability'] as const
export type AiComponentGroup = typeof aiGroupOrder[number]
export const aiGroupByLabel: Record<string, AiComponentGroup> = {
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
