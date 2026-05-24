import { describe, expect, test } from 'bun:test'
import { generateSlug } from '../slug'
import { app } from '../index'

describe('generateSlug', () => {
	test('"sara pantaleão" -> "sara_pantaleao"', () => {
		expect(generateSlug('sara pantaleão')).toBe('sara_pantaleao')
	})

	test('"João Silva" -> "joao_silva"', () => {
		expect(generateSlug('João Silva')).toBe('joao_silva')
	})

	test('"  foo  bar  " -> "foo_bar"', () => {
		expect(generateSlug('  foo  bar  ')).toBe('foo_bar')
	})
})

describe('POST /api/crm/provision', () => {
	test('returns 400 when nome is missing', async () => {
		const res = await app.fetch(
			new Request('http://localhost/api/crm/provision', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ linkNotion: 'https://notion.so/test' }),
			}),
		)
		expect(res.status).toBe(400)
		const body = (await res.json()) as Record<string, unknown>
		expect(body.success).toBe(false)
		expect(body.failedStep).toBe('validation')
	})

	test('returns 400 when linkNotion is invalid', async () => {
		const res = await app.fetch(
			new Request('http://localhost/api/crm/provision', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ nome: 'Teste', linkNotion: 'not-a-notion-url' }),
			}),
		)
		expect(res.status).toBe(400)
		const body = (await res.json()) as Record<string, unknown>
		expect(body.success).toBe(false)
		expect(body.failedStep).toBe('validation')
	})
})
