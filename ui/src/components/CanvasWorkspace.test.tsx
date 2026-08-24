import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import CanvasWorkspace, { applyGroupAwareNodeChanges, arrangeCanvasNodes, distributeCanvasNodes, selectPersistentGroup } from './CanvasWorkspace'
import { clearNodeSelection, selectOnlyEdge } from './canvasSelection'
import { getComponentSize, getEdgeLabelWidth, truncateCanvasText } from './canvasSizing'
import { useState } from 'react'
import type { Edge, Node } from '@xyflow/react'

afterEach(cleanup)

function Harness() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  return <div style={{ width: 1000, height: 700 }}><CanvasWorkspace nodes={nodes} edges={edges} setNodes={setNodes} setEdges={setEdges} /></div>
}

function ConnectionHarness() {
  const [nodes, setNodes] = useState<Node[]>([
    { id: 'a', type: 'architecture', position: { x: 0, y: 0 }, data: { label: 'Web', kind: 'web' } },
    { id: 'b', type: 'architecture', position: { x: 300, y: 0 }, data: { label: 'API', kind: 'service' } },
  ])
  const [edges, setEdges] = useState<Edge[]>([{ id: 'a-b', source: 'a', target: 'b', selected: true, label: 'depends on' }])
  return <div style={{ width: 1000, height: 700 }}><CanvasWorkspace nodes={nodes} edges={edges} setNodes={setNodes} setEdges={setEdges} /></div>
}

function UnselectedComponentHarness() {
  const [nodes, setNodes] = useState<Node[]>([
    { id: 'service', type: 'architecture', position: { x: 0, y: 0 }, data: { label: 'API', kind: 'service' }, style: { width: 44, height: 52 } },
  ])
  const [edges, setEdges] = useState<Edge[]>([])
  return <div style={{ width: 1000, height: 700 }}><CanvasWorkspace nodes={nodes} edges={edges} setNodes={setNodes} setEdges={setEdges} /></div>
}

function SelectedComponentHarness() {
  const size = getComponentSize('API', 'service')
  const [nodes, setNodes] = useState<Node[]>([
    { id: 'service', type: 'architecture', position: { x: 0, y: 0 }, selected: true,
      data: { label: 'API', kind: 'service' }, style: size },
  ])
  const [edges, setEdges] = useState<Edge[]>([])
  return <div style={{ width: 1000, height: 700 }}><CanvasWorkspace nodes={nodes} edges={edges} setNodes={setNodes} setEdges={setEdges} /></div>
}

function GroupHarness() {
  const [nodes, setNodes] = useState<Node[]>([
    { id: 'a', type: 'architecture', position: { x: 0, y: 0 }, selected: true, data: { label: 'Web', kind: 'web' } },
    { id: 'b', type: 'architecture', position: { x: 200, y: 0 }, selected: true, data: { label: 'API', kind: 'service' } },
  ])
  const [edges, setEdges] = useState<Edge[]>([
    { id: 'a-b', source: 'a', target: 'b', type: 'editable', label: 'HTTPS' },
  ])
  return <div style={{ width: 1000, height: 700 }}>
    <output data-testid="group-state">{JSON.stringify({ nodes, edges })}</output>
    <CanvasWorkspace nodes={nodes} edges={edges} setNodes={setNodes} setEdges={setEdges} />
  </div>
}

describe('CanvasWorkspace', () => {
  it('sizes components according to their visible content', () => {
    const compact = getComponentSize('API', 'service')
    const expanded = getComponentSize('Customer identity and access service', 'service')
    expect(compact).toEqual({ width: 44, height: 52 })
    expect(expanded.width).toBeGreaterThan(compact.width)
    expect(expanded.width).toBeLessThanOrEqual(132)
    expect(expanded.height).toBeGreaterThan(compact.height)
    expect(getComponentSize('Boundary', 'container')).toEqual({ width: 360, height: 240 })
  })

  it('limits read-only text without changing the full value', () => {
    const fullTitle = 'Customer identity and access management service'
    expect(truncateCanvasText(fullTitle, 28)).toBe('Customer identity and acces…')
    expect(fullTitle).toBe('Customer identity and access management service')
  })

  it('keeps arrow labels compact around their text', () => {
    expect(getEdgeLabelWidth('')).toBe(46)
    expect(getEdgeLabelWidth('HTTPS')).toBe(33)
    expect(getEdgeLabelWidth('A very long connection label that should be capped')).toBeLessThanOrEqual(144)
  })

  it('adds a searchable component and edits it inline', () => {
    render(<Harness />)

    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.change(screen.getByPlaceholderText('Search components'), { target: { value: 'database' } })
    const databaseCard = screen.getByText('SQL Database', { selector: 'strong' }).closest('button')!
    expect(databaseCard).toBeInTheDocument()

    fireEvent.click(databaseCard)
    expect(screen.queryByRole('complementary', { name: 'Properties inspector' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Component name').closest('.architecture-node')).toHaveClass('architecture-node-database')

    fireEvent.change(screen.getByLabelText('Component name'), { target: { value: 'Orders Database' } })
    fireEvent.blur(screen.getByLabelText('Component name'))
    expect(screen.getByLabelText('Component name')).toHaveValue('Orders Database')
    expect(screen.getByLabelText('Component name').closest('.architecture-node')).toHaveClass('icon-medium')
    expect(screen.queryByLabelText('Component subtitle')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Component name')).toHaveAttribute('rows', '1')
    expect(screen.getByLabelText('Component name').closest('.react-flow__node')).toHaveStyle({ width: '122px', height: '52px' })
    fireEvent.change(screen.getByLabelText('Component name'), { target: { value: 'Orders\nDatabase' } })
    expect(screen.getByLabelText('Component name')).toHaveValue('Orders\nDatabase')
    expect(screen.getByLabelText('Component name').closest('.react-flow__node')).toHaveStyle({ height: '64px' })
    expect(screen.getByLabelText('Lock component')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Lock component'))
    expect(screen.getByLabelText('Unlock component')).toBeInTheDocument()
  })

  it('shows connection formatting in a separate toolbar', () => {
    render(<ConnectionHarness />)

    expect(screen.getByRole('toolbar', { name: 'Connection formatting' })).toBeInTheDocument()
    expect(screen.getByLabelText('Connection routing')).toBeInTheDocument()
    expect(screen.getByLabelText('Line weight')).toBeInTheDocument()
    expect(screen.getByLabelText('Toggle start arrow')).toBeInTheDocument()
    expect(screen.getByLabelText('Toggle end arrow')).toBeInTheDocument()
    expect(screen.getByLabelText('Connection label')).toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Properties inspector' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Connection label'), { target: { value: 'HTTPS' } })
    expect(screen.getByLabelText('Connection label')).toHaveValue('HTTPS')
  })

  it('searches technology aliases and persists a selectable icon', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.change(screen.getByPlaceholderText('Search components'), { target: { value: 'apache event stream' } })
    fireEvent.click(screen.getByRole('button', { name: /Kafka/ }))
    expect(screen.getByLabelText('Component name')).toHaveValue('Kafka')
    expect(screen.getByLabelText('Component icon')).toHaveValue('kafka')
    fireEvent.change(screen.getByLabelText('Component icon'), { target: { value: 'kubernetes' } })
    expect(screen.getByLabelText('Component icon')).toHaveValue('kubernetes')
  })

  it('groups the optimized catalog and finds high-value architecture aliases', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    const categories = screen.getByLabelText('Component categories')
    expect(categories).toHaveTextContent('AllGeneralAWSAzureGoogle CloudOperations - CD/CIAI / ML')
    expect(categories).not.toHaveTextContent('Containers')
    expect(categories).not.toHaveTextContent('Documentation')
    fireEvent.click(screen.getByRole('button', { name: 'General' }))
    expect(screen.getByText('Monolith', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Serverless Function', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Background Worker', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Scheduled Job', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.queryByText('Kubernetes Cluster', { selector: 'strong' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Platform/ }))
    expect(screen.getByText('Kubernetes Cluster', { selector: 'strong' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Networking/ }))
    expect(screen.getByText('API Gateway', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Reverse Proxy', { selector: 'strong' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Security/ }))
    expect(screen.getByText('Secrets Manager', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Firewall / WAF', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.queryByText('CI/CD Pipeline', { selector: 'strong' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Operations - CD/CI' }))
    expect(screen.getByText('Monitoring', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('CI/CD Pipeline', { selector: 'strong' })).toBeInTheDocument()
    for (const label of [
      'Jenkins', 'GitHub Actions', 'GitLab CI', 'Argo CD', 'Terraform', 'Ansible', 'Helm',
      'Prometheus', 'Grafana', 'OpenTelemetry', 'PagerDuty',
    ]) expect(screen.getByText(label, { selector: 'strong' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'General' }))
    fireEvent.click(screen.getByRole('button', { name: /Data/ }))
    expect(screen.getByText('PostgreSQL', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Search Engine', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Data Warehouse', { selector: 'strong' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Messaging/ }))
    expect(screen.getByText('Kafka', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Message Queue', { selector: 'strong' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Communication/ }))
    expect(screen.getByText('Email', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Notification', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Slack', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Microsoft Teams', { selector: 'strong' })).toBeInTheDocument()
    for (const label of ['SMS', 'Push Notification', 'Webhook', 'Microsoft Outlook', 'Gmail', 'Twilio', 'SendGrid', 'Discord']) {
      expect(screen.getByText(label, { selector: 'strong' })).toBeInTheDocument()
    }
    fireEvent.click(screen.getByRole('button', { name: /Utilities/ }))
    expect(screen.getByText('Boundary', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.queryByText('Database', { selector: 'strong' })).not.toBeInTheDocument()
    expect(screen.queryByText('File storage', { selector: 'strong' })).not.toBeInTheDocument()
    expect(screen.queryByText('Queue / Event bus', { selector: 'strong' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    fireEvent.change(screen.getByPlaceholderText('Search components'), { target: { value: 'cloudfront' } })
    expect(screen.getByText('CDN', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.queryByText('Amazon Web Services', { selector: 'strong' })).not.toBeInTheDocument()
  })

  it('adds a monolith with its dedicated component icon', () => {
    const { container } = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.click(screen.getByRole('button', { name: 'General' }))
    fireEvent.click(screen.getByText('Monolith', { selector: 'strong' }).closest('button')!)

    expect(screen.getByLabelText('Component icon')).toHaveValue('monolith')
    expect(container.querySelector('.component-kind-icon .lucide-box')).toBeInTheDocument()
  })

  it('adds CI/CD and SRE tools with stable branded icon IDs', () => {
    const { container } = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.change(screen.getByPlaceholderText('Search components'), { target: { value: 'argocd' } })
    fireEvent.click(screen.getByText('Argo CD', { selector: 'strong' }).closest('button')!)

    expect(screen.getByLabelText('Component icon')).toHaveValue('argo-cd')
    expect(container.querySelector('.component-kind-icon svg')).toBeInTheDocument()
  })

  it('adds communication tools with stable branded icon IDs', () => {
    const { container } = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.change(screen.getByPlaceholderText('Search components'), { target: { value: 'slack' } })
    fireEvent.click(screen.getByText('Slack', { selector: 'strong' }).closest('button')!)

    expect(screen.getByLabelText('Component icon')).toHaveValue('slack')
    expect(container.querySelector('.component-kind-icon svg')).toBeInTheDocument()
  })

  it('organizes the complete AI stack into dedicated collapsible groups', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.click(screen.getByRole('button', { name: 'AI / ML' }))

    expect(screen.getByText('AI Agent', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('RAG Pipeline', { selector: 'strong' })).toBeInTheDocument()
    for (const [group, labels] of [
      ['Model Providers', ['OpenAI', 'Anthropic Claude', 'Google Gemini', 'Meta Llama', 'Mistral AI', 'Cohere', 'Hugging Face']],
      ['Agent Frameworks', ['LangChain', 'LangGraph', 'LlamaIndex', 'Semantic Kernel', 'CrewAI']],
      ['Vector Data', ['Pinecone', 'Weaviate', 'Milvus', 'Qdrant', 'Chroma', 'pgvector']],
      ['Inference', ['vLLM', 'Ollama', 'Hugging Face Inference', 'NVIDIA NIM', 'NVIDIA Triton', 'Text Generation Inference', 'SGLang']],
      ['Observability', ['LangSmith', 'MLflow', 'Weights & Biases', 'Arize Phoenix', 'Helicone', 'Promptfoo']],
    ] as const) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${group} \\d+$`) }))
      for (const label of labels) expect(screen.getByText(label, { selector: 'strong' })).toBeInTheDocument()
    }
  })

  it('adds cloud-native AI services to their provider categories', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.click(screen.getByRole('button', { name: 'AWS' }))
    expect(screen.getByText('Amazon Bedrock', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Amazon SageMaker AI', { selector: 'strong' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Azure' }))
    expect(screen.getByText('Azure OpenAI', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Azure AI Foundry', { selector: 'strong' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Google Cloud' }))
    expect(screen.getByText('Google Vertex AI', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Google Gemini API', { selector: 'strong' })).toBeInTheDocument()
  })

  it('keeps catalog labels and selectable icon IDs unique', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    const labels = screen.getAllByRole('button')
      .map((button) => button.querySelector('strong')?.textContent)
      .filter((label): label is string => Boolean(label))
    expect(new Set(labels).size).toBe(labels.length)

    fireEvent.click(screen.getByText('Monolith', { selector: 'strong' }).closest('button')!)
    const iconValues = Array.from((screen.getByLabelText('Component icon') as HTMLSelectElement).options)
      .map((option) => option.value)
      .filter(Boolean)
    expect(new Set(iconValues).size).toBe(iconValues.length)
  })

  it('uses visually distinct SQL and NoSQL component icons', () => {
    const sqlView = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.change(screen.getByPlaceholderText('Search components'), { target: { value: 'SQL Database' } })
    fireEvent.click(screen.getByText('SQL Database', { selector: 'strong' }).closest('button')!)
    expect(sqlView.container.querySelector('.component-kind-icon .lucide-database')).toBeInTheDocument()
    sqlView.unmount()

    const noSqlView = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.change(screen.getByPlaceholderText('Search components'), { target: { value: 'NoSQL Database' } })
    fireEvent.click(screen.getByText('NoSQL Database', { selector: 'strong' }).closest('button')!)
    expect(noSqlView.container.querySelector('.component-kind-icon .lucide-braces')).toBeInTheDocument()
  })

  it('provides AWS services with official architecture icons', () => {
    const { container } = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.click(screen.getByRole('button', { name: 'AWS' }))
    expect(screen.getByText('AWS Lambda', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Amazon DynamoDB', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Amazon ECS', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('AWS Fargate', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Amazon EC2', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Amazon S3', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Amazon RDS', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Amazon SQS', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Amazon SNS', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Amazon API Gateway', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Amazon CloudFront', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Amazon EKS', { selector: 'strong' })).toBeInTheDocument()

    fireEvent.click(screen.getByText('Amazon DynamoDB', { selector: 'strong' }).closest('button')!)
    expect(screen.getByLabelText('Component icon')).toHaveValue('aws-dynamodb')
    expect(container.querySelector('.component-kind-icon title')?.textContent).toContain('Amazon-DynamoDB')
  })

  it('provides recognizable Azure service icons with stable icon IDs', () => {
    const { container } = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.click(screen.getByRole('button', { name: 'Azure' }))

    for (const label of [
      'Azure Function', 'Azure App Service', 'Azure Virtual Machine', 'Azure Storage Account',
      'Azure Cosmos DB', 'Azure Service Bus', 'Azure Kubernetes Service', 'Azure Key Vault',
      'Azure Application Gateway',
    ]) expect(screen.getByText(label, { selector: 'strong' })).toBeInTheDocument()

    fireEvent.click(screen.getByText('Azure Cosmos DB', { selector: 'strong' }).closest('button')!)
    expect(screen.getByLabelText('Component icon')).toHaveValue('azure-cosmos-db')
    expect(container.querySelector('.component-kind-icon svg')).toBeInTheDocument()
  })

  it('provides recognizable Google Cloud service icons with stable icon IDs', () => {
    const { container } = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.click(screen.getByRole('button', { name: 'Google Cloud' }))

    for (const label of [
      'GCP Pub/Sub', 'Compute Engine', 'Cloud Run', 'Cloud Functions', 'Cloud Storage', 'Cloud SQL',
      'Firestore', 'Google Kubernetes Engine', 'BigQuery', 'Cloud Load Balancing',
    ]) expect(screen.getByText(label, { selector: 'strong' })).toBeInTheDocument()

    fireEvent.click(screen.getByText('Google Kubernetes Engine', { selector: 'strong' }).closest('button')!)
    expect(screen.getByLabelText('Component icon')).toHaveValue('gcp-gke')
    expect(container.querySelector('.component-kind-icon svg')).toBeInTheDocument()
  })

  it('undoes and redoes a connection label edit as one action', () => {
    render(<ConnectionHarness />)
    const label = screen.getByLabelText('Connection label')

    fireEvent.focus(label)
    fireEvent.change(label, { target: { value: 'HTTPS' } })
    fireEvent.blur(label)
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true })
    expect(screen.getByLabelText('Connection label')).toHaveValue('depends on')

    fireEvent.keyDown(document, { key: 'y', ctrlKey: true })
    expect(screen.getByLabelText('Connection label')).toHaveValue('HTTPS')
  })

  it('restores a component title and its automatic size together', () => {
    render(<SelectedComponentHarness />)
    const title = screen.getByLabelText('Component name')
    const node = title.closest('.react-flow__node')
    expect(node).toHaveStyle({ width: '44px', height: '52px' })

    fireEvent.focus(title)
    fireEvent.change(title, { target: { value: 'Customer identity and access service' } })
    fireEvent.blur(title)
    expect(node).not.toHaveStyle({ width: '44px' })

    fireEvent.keyDown(document, { key: 'z', ctrlKey: true })
    expect(screen.getByLabelText('Component name')).toHaveValue('API')
    expect(screen.getByLabelText('Component name').closest('.react-flow__node')).toHaveStyle({ width: '44px', height: '52px' })

    fireEvent.keyDown(document, { key: 'z', ctrlKey: true, shiftKey: true })
    expect(screen.getByLabelText('Component name')).toHaveValue('Customer identity and access service')
  })

  it('undoes lock and connection formatting mutations independently', () => {
    const component = render(<SelectedComponentHarness />)
    fireEvent.click(screen.getByLabelText('Lock component'))
    expect(screen.getByLabelText('Unlock component')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true })
    expect(screen.getByLabelText('Lock component')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'y', ctrlKey: true })
    expect(screen.getByLabelText('Unlock component')).toBeInTheDocument()
    component.unmount()

    const { container } = render(<ConnectionHarness />)
    fireEvent.change(screen.getByLabelText('Connection routing'), { target: { value: 'straight' } })
    expect(screen.getByLabelText('Connection routing')).toHaveValue('straight')
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true })
    expect(screen.getByLabelText('Connection routing')).toHaveValue('smoothstep')
    fireEvent.keyDown(document, { key: 'y', ctrlKey: true })
    expect(screen.getByLabelText('Connection routing')).toHaveValue('straight')

    const lineColor = container.querySelector<HTMLInputElement>('.connection-color input')!
    fireEvent.change(lineColor, { target: { value: '#ff0000' } })
    expect(lineColor).toHaveValue('#ff0000')
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true })
    expect(container.querySelector('.connection-color input')).toHaveValue('#68708a')
    fireEvent.keyDown(document, { key: 'y', ctrlKey: true })
    expect(container.querySelector('.connection-color input')).toHaveValue('#ff0000')

    fireEvent.click(screen.getByLabelText('Toggle start arrow'))
    expect(screen.getByLabelText('Toggle start arrow')).toHaveClass('active')
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true })
    expect(screen.getByLabelText('Toggle start arrow')).not.toHaveClass('active')
  })

  it('creates and removes persistent group membership', () => {
    render(<GroupHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Group selected components' }))

    let state = JSON.parse(screen.getByTestId('group-state').textContent!)
    expect(state.nodes[0].data.groupId).toBeTruthy()
    expect(state.nodes[1].data.groupId).toBe(state.nodes[0].data.groupId)
    expect(JSON.parse(JSON.stringify(state)).nodes[0].data.groupId).toBe(state.nodes[0].data.groupId)
    expect(screen.getByRole('button', { name: 'Ungroup selected components' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ungroup selected components' }))
    state = JSON.parse(screen.getByTestId('group-state').textContent!)
    expect(state.nodes.every((node: Node) => !node.data.groupId)).toBe(true)
  })

  it('selects every member when one persistent group member is selected', () => {
    const nodes: Node[] = [
      { id: 'a', position: { x: 0, y: 0 }, data: { groupId: 'group-1' } },
      { id: 'b', position: { x: 0, y: 0 }, data: { groupId: 'group-1' } },
      { id: 'c', position: { x: 0, y: 0 }, selected: true, data: {} },
    ]
    expect(selectPersistentGroup(nodes, nodes[0]).map((node) => Boolean(node.selected)))
      .toEqual([true, true, false])
  })

  it('moves every group member when one member is dragged', () => {
    const nodes: Node[] = [
      { id: 'a', position: { x: 10, y: 20 }, data: { groupId: 'group-1' } },
      { id: 'b', position: { x: 50, y: 80 }, data: { groupId: 'group-1' } },
      { id: 'c', position: { x: 0, y: 0 }, data: {} },
    ]
    const moved = applyGroupAwareNodeChanges([
      { type: 'position', id: 'a', position: { x: 30, y: 50 }, dragging: true },
    ], nodes)
    expect(moved.map((node) => node.position)).toEqual([
      { x: 30, y: 50 }, { x: 70, y: 110 }, { x: 0, y: 0 },
    ])
  })

  it('arranges by connection direction, preserves locks, and distributes evenly', () => {
    const nodes: Node[] = [
      { id: 'a', position: { x: 300, y: 200 }, selected: true, data: {} },
      { id: 'b', position: { x: 10, y: 20 }, selected: true, data: {} },
      { id: 'c', position: { x: 50, y: 60 }, selected: true, data: { locked: true } },
    ]
    const arranged = arrangeCanvasNodes(nodes, [{ id: 'a-b', source: 'a', target: 'b' }], 'horizontal')
    expect(arranged.find((node) => node.id === 'b')!.position.x).toBeGreaterThan(arranged.find((node) => node.id === 'a')!.position.x)
    expect(arranged.find((node) => node.id === 'c')!.position).toEqual({ x: 50, y: 60 })

    const distributed = distributeCanvasNodes([
      { id: 'a', position: { x: 0, y: 0 }, selected: true, data: {} },
      { id: 'b', position: { x: 80, y: 0 }, selected: true, data: {} },
      { id: 'c', position: { x: 300, y: 0 }, selected: true, data: {} },
    ], 'horizontal')
    expect(distributed.map((node) => node.position.x)).toEqual([0, 150, 300])
  })

  it('duplicates a group with remapped membership and internal connection', () => {
    render(<GroupHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Group selected components' }))
    fireEvent.keyDown(document, { key: 'd', ctrlKey: true })

    const state = JSON.parse(screen.getByTestId('group-state').textContent!)
    expect(state.nodes).toHaveLength(4)
    expect(state.edges).toHaveLength(2)
    const groups = new Map<string, Node[]>()
    for (const node of state.nodes as Node[]) {
      const groupId = String(node.data.groupId)
      const members = groups.get(groupId) || []
      groups.set(groupId, [...members, node])
    }
    expect(groups.size).toBe(2)
    expect([...groups.values()].map((members) => members.length)).toEqual([2, 2])
    for (const edge of state.edges as Edge[]) {
      const source = state.nodes.find((node: Node) => node.id === edge.source)
      const target = state.nodes.find((node: Node) => node.id === edge.target)
      expect(source.data.groupId).toBe(target.data.groupId)
    }
  })

  it('switches selection from a component to only the requested connection', () => {
    const nodes: Node[] = [
      { id: 'a', position: { x: 0, y: 0 }, data: {}, selected: true },
      { id: 'b', position: { x: 0, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [
      { id: 'a-b', source: 'a', target: 'b' },
      { id: 'b-a', source: 'b', target: 'a', selected: true },
    ]

    expect(clearNodeSelection(nodes).every((node) => !node.selected)).toBe(true)
    expect(selectOnlyEdge(edges, 'a-b').map(({ id, selected }) => ({ id, selected }))).toEqual([
      { id: 'a-b', selected: true },
      { id: 'b-a', selected: false },
    ])
  })

  it('reveals connection handles when connect mode is active', () => {
    const { container } = render(<UnselectedComponentHarness />)

    expect(container.querySelector('.canvas-workspace')).not.toHaveClass('connect-mode')
    expect(container.querySelectorAll('.react-flow__handle')).toHaveLength(8)
    expect(container.querySelector('.source[data-handleid="left"]')).toBeInTheDocument()
    expect(container.querySelector('.target[data-handleid="left"]')).toBeInTheDocument()
    expect(container.querySelector('.source[data-handleid="right"]')).toBeInTheDocument()
    expect(container.querySelector('.target[data-handleid="right"]')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Connect components' }))
    expect(container.querySelector('.canvas-workspace')).toHaveClass('connect-mode')
  })

  it('locks a component without entering edit mode', () => {
    render(<UnselectedComponentHarness />)

    fireEvent.pointerDown(screen.getByLabelText('Lock component'))
    fireEvent.click(screen.getByLabelText('Lock component'))

    expect(screen.getByLabelText('Unlock component')).toBeInTheDocument()
    expect(screen.queryByLabelText('Component name')).not.toBeInTheDocument()
  })
})
