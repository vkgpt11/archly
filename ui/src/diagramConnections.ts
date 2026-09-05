export const connectionProtocols = ['HTTP', 'HTTPS', 'REST', 'GRPC', 'TCP', 'UDP', 'SQL', 'AMQP', 'MQTT', 'KAFKA', 'CUSTOM']
export function connectionMetadata(options: Record<string, string>): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(options)) {
    if (!['protocol', 'port', 'async', 'encrypted', 'direction', 'description'].includes(key)) throw new Error(`unknown connection property “${key}”`)
    if (key === 'protocol') {
      if (!connectionProtocols.includes(value.toUpperCase())) throw new Error(`protocol must be ${connectionProtocols.join(', ')}`)
      data.protocol = value.toUpperCase()
    } else if (key === 'port') {
      if (!/^\d{1,5}(?:-\d{1,5})?$/.test(value)) throw new Error('port must be a number or inclusive range')
      const [start, end = start] = value.split('-').map(Number)
      if (start < 1 || end > 65535 || start > end) throw new Error('port range must be ordered within 1–65535')
      data.port = value
    } else if (key === 'async' || key === 'encrypted') {
      if (!['true', 'false'].includes(value)) throw new Error(`${key} must be true or false`)
      data[key] = value === 'true'
    } else if (key === 'direction') {
      if (!['forward', 'reverse', 'bidirectional', 'none'].includes(value)) throw new Error('direction must be forward, reverse, bidirectional, or none')
      data.direction = value
    } else {
      if (value.length > 2000) throw new Error('connection description exceeds 2000 characters')
      data.description = value
    }
  }
  return data
}
export function metadataOptions(data: Record<string, unknown> = {}) {
  return ['protocol', 'port', 'async', 'encrypted', 'direction', 'description'].filter((key) => data[key] !== undefined && data[key] !== '')
    .map((key) => `${key}=${JSON.stringify(data[key])}`).join(' ')
}
