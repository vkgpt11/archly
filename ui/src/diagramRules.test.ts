import { describe, expect, it } from 'vitest'
import { parseDiagramCode } from './diagramCode'
import { validateDiagramRules } from './diagramRules'

describe('diagram architecture rules', () => {
  it('reports built-in rule violations with stable metadata and remediation', () => {
    const source = `region public "Public subnet" {
  database db "Customer DB"
}
service api "API"
connection plain api -> db : "REST"
metadata-edge plain protocol=REST encrypted=false`
    const { nodes, edges } = parseDiagramCode(source)
    const violations = validateDiagramRules(nodes, edges, source)
    expect(violations.map((item) => item.ruleId)).toEqual([
      'no-public-database',
      'no-cross-boundary-connection-without-encryption',
      'services-must-use-tls',
    ])
    expect(violations[0]).toMatchObject({
      severity: 'error',
      affectedSymbols: ['db'],
      location: { line: 2 },
    })
    expect(violations[0].remediation).toContain('private boundary')
  })

  it('supports severity configuration and explicit suppression reasons', () => {
    const source = `rule no-orphan-component severity=warning suppress="accepted isolated actor"
actor user "User"`
    const { nodes, edges } = parseDiagramCode(source)
    expect(validateDiagramRules(nodes, edges, source)).toEqual([
      expect.objectContaining({
        ruleId: 'no-orphan-component',
        severity: 'warning',
        suppressed: true,
        suppressionReason: 'accepted isolated actor',
      }),
    ])
  })

  it('rejects unknown rule configuration safely', () => {
    expect(() => validateDiagramRules([], [], 'rule made-up severity=error')).toThrow('unknown architecture rule')
    expect(() => validateDiagramRules([], [], 'rule no-orphan-component severity=blocker')).toThrow('rule severity')
    expect(() => validateDiagramRules([], [], 'rule no-orphan-component suppress="x"')).toThrow('suppression requires a reason')
  })
})
