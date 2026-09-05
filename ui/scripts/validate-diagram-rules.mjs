#!/usr/bin/env node
import { readFileSync } from 'node:fs'

const files = process.argv.slice(2)
if (!files.length || files.includes('--help')) {
  console.error('Usage: node scripts/validate-diagram-rules.mjs <export.archly-metadata.json|export.mmd|export.puml|export.d2> [...]')
  process.exit(files.includes('--help') ? 0 : 2)
}

const prefixes = [/^%% archly-metadata: /, /^' archly-metadata: /, /^# archly-metadata: /]
let failures = 0
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const first = text.split(/\r?\n/, 1)[0]
  const payload = prefixes.reduce((value, prefix) => value.replace(prefix, ''), first)
  const metadataText = file.endsWith('.json') ? text : payload
  let metadata
  try {
    metadata = JSON.parse(metadataText)
  } catch {
    console.error(`${file}: missing or invalid Archly metadata`)
    failures++
    continue
  }
  const diagnostics = Array.isArray(metadata.validation?.diagnostics) ? metadata.validation.diagnostics : []
  const blocking = diagnostics.filter((item) => item && item.severity === 'error' && !item.suppressed)
  if (blocking.length) {
    failures += blocking.length
    for (const item of blocking) console.error(`${file}:${item.location?.line || 1}: ${item.ruleId}: ${item.message}`)
  } else {
    console.log(`${file}: passed`)
  }
}
process.exit(failures ? 1 : 0)
