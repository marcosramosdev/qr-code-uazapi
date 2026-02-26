import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { ApiResponse } from 'shared';
import { logger } from 'hono/logger';
import { serveStatic } from 'hono/bun';

export const app = new Hono()

	.use(logger())
	.use(cors())

	.get('/', (c) => {
		return c.text('Hello Hono!');
	})
	.use('*', serveStatic({ root: './static' }))

	.get('*', async (c, next) => {
		return serveStatic({ root: './static', path: 'index.html' })(c, next);
	})

	.get('/hello', async (c) => {
		const data: ApiResponse = {
			message: 'Hello BHVR!',
			success: true,
		};

		return c.json(data, { status: 200 });
	});

export default app;
