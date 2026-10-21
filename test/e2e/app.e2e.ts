import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { spawn, ChildProcess } from 'child_process';

const PORT = 5173;
let proc: ChildProcess | null = null;

async function waitForServer(port: number, timeout = 30000) {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		try {
			const res = await fetch(`http://localhost:${port}/`, { method: 'GET' });
			if (res.status < 500) return;
		} catch {
			// ignore
		}
		await new Promise((r) => setTimeout(r, 250));
	}
	throw new Error('Timed out waiting for dev server');
}

beforeAll(async () => {
	proc = spawn('pnpm', ['run', 'dev'], {
		stdio: 'pipe',
		cwd: process.cwd(),
		env: process.env,
		shell: true
	});
	proc.stdout?.on('data', (d) => {
		process.stdout.write(d);
	});
	proc.stderr?.on('data', (d) => {
		process.stderr.write(d);
	});
	await waitForServer(PORT, 60000);
});

afterAll(async () => {
	if (proc && !proc.killed) {
		proc.kill();
		await new Promise((r) => setTimeout(r, 200));
	}
});

describe('E2E dev server checks', () => {
	it('serves known routes with 200 and HTML content', async () => {
		const urls = [
			'/',
			'/about',
			'/contact',
			'/works/body-navigation',
			'/consultancies/dr1-airlook'
		];

		for (const path of urls) {
			const res = await fetch(`http://localhost:${PORT}${path}`);
			expect(res.status).toBe(200);
			const text = await res.text();
			expect(text.toLowerCase()).toContain('<!doctype html>');
		}
	});
});
