import { describe, expect, test } from 'bun:test'
import {
	rawCrmWorkflow,
	sanitizeWorkflow,
	injectWorkflow,
} from '../templates/crmWorkflow'

describe('sanitizeWorkflow', () => {
	test('removes pinData from the root', () => {
		const result = sanitizeWorkflow(rawCrmWorkflow)
		expect(result).not.toHaveProperty('pinData')
	})

	test('removes pinData from all nodes', () => {
		const wf = structuredClone(rawCrmWorkflow)
		if (wf.nodes[0]) {
			(wf.nodes[0] as Record<string, unknown>).pinData = { some: 'data' }
		}
		const result = sanitizeWorkflow(wf)
		for (const node of result.nodes) {
			expect(node).not.toHaveProperty('pinData')
		}
	})

	test('removes active from the root', () => {
		const wf = structuredClone(rawCrmWorkflow)
		wf.active = true
		const result = sanitizeWorkflow(wf)
		expect(result).not.toHaveProperty('active')
	})

	test('removes unsupported settings keys', () => {
		const result = sanitizeWorkflow(rawCrmWorkflow)
		expect(result.settings).not.toHaveProperty('errorWorkflow')
		expect(result.settings).not.toHaveProperty('callerIds')
		expect(result.settings).not.toHaveProperty('timeSavedPerExecution')
		expect(result.settings).not.toHaveProperty('availableInMCP')
		expect(result.settings).not.toHaveProperty('saveExecutionProgress')
	})

	test('preserves supported settings keys', () => {
		const result = sanitizeWorkflow(rawCrmWorkflow)
		expect(result.settings).toHaveProperty('executionOrder')
		expect(result.settings.executionOrder).toBe('v1')
	})
})

describe('injectWorkflow', () => {
	test('sets name on the root', () => {
		const result = injectWorkflow(rawCrmWorkflow, {
			name: 'My CRM',
			slug: 'my-slug',
			contaId: 'abc-123',
		})
		expect(result.name).toBe('My CRM')
	})

	test('sets slug on Webhook node path', () => {
		const result = injectWorkflow(rawCrmWorkflow, {
			name: 'My CRM',
			slug: 'my-slug',
			contaId: 'abc-123',
		})
		const webhook = result.nodes.find((n) => n.name === 'Webhook')
		expect(webhook?.parameters.path).toBe('my-slug')
	})

	test('sets contaId on Edit Fields node', () => {
		const result = injectWorkflow(rawCrmWorkflow, {
			name: 'My CRM',
			slug: 'my-slug',
			contaId: 'abc-123',
		})
		const editFields = result.nodes.find((n) => n.name === 'Edit Fields')
		const assignments = editFields?.parameters.assignments as {
			assignments: Array<{ name: string; value: string }>
		}
		const field = assignments.assignments.find((v) => v.name === 'id_cliente')
		expect(field?.value).toBe('abc-123')
	})
})
