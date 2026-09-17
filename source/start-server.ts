#!/usr/bin/env node
// Copyright 2025 MarsWave AI
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

import process from 'node:process';
import {createTokenAuthenticator} from './auth.js';
import {createServer, serverVersion} from './main.js';

// Parse command line arguments
const args = process.argv.slice(2);
const getArgValue = (flag: string): string | undefined => {
	const index = args.indexOf(flag);
	const value = index === -1 ? undefined : args[index + 1];
	// A following flag means the value is missing, not that the flag is the value.
	return value?.startsWith('--') ? undefined : value;
};

const hasFlag = (flag: string): boolean => args.includes(flag);

// Get transport mode from command line or environment variable
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
const transport =
	getArgValue('--transport') || process.env['TRANSPORT'] || 'stdio';
const port = Number(getArgValue('--port') || process.env['PORT'] || 3000);
const host = getArgValue('--host') || process.env['HOST'] || '127.0.0.1';
const authToken = getArgValue('--auth-token') || process.env['MCP_AUTH_TOKEN'];
const allowUnauthenticated =
	hasFlag('--allow-unauthenticated') ||
	process.env['MCP_ALLOW_UNAUTHENTICATED'] === 'true';
/* eslint-enable @typescript-eslint/prefer-nullish-coalescing */

type Server = ReturnType<typeof createServer>;
type StartArgs = Parameters<Server['start']>[0];

let server: Server;
let startArgs: StartArgs;

switch (transport.toLowerCase()) {
	case 'http':
	case 'httpstream':
	case 'sse': {
		// Every HTTP session proxies the operator's LISTENHUB_API_KEY, so an
		// unauthenticated listener hands that key's credits to whoever can reach
		// the port. Refuse to start rather than default to open.
		if (!authToken && !allowUnauthenticated) {
			console.error(
				'Error: HTTP/SSE transport requires MCP_AUTH_TOKEN (or --auth-token).',
			);
			console.error(
				'Clients must send "Authorization: Bearer <token>". To run without authentication on a trusted network, pass --allow-unauthenticated (or MCP_ALLOW_UNAUTHENTICATED=true).',
			);
			process.exit(1);
		}

		server = createServer(
			authToken ? {authenticate: createTokenAuthenticator(authToken)} : {},
		);
		startArgs = {
			transportType: 'httpStream',
			httpStream: {
				endpoint: '/mcp',
				host,
				port,
			},
		};
		console.error(`[ListenHub MCP] HTTP server running on ${host}:${port}`);
		console.error(
			`[ListenHub MCP] HTTP Stream endpoint: http://${host}:${port}/mcp`,
		);
		console.error(`[ListenHub MCP] SSE endpoint: http://${host}:${port}/sse`);
		console.error('[ListenHub MCP] Transport: HTTP Stream + SSE');
		console.error(
			authToken
				? '[ListenHub MCP] Authentication: Bearer token required'
				: '[ListenHub MCP] Authentication: DISABLED (--allow-unauthenticated)',
		);
		break;
	}

	default: {
		server = createServer();
		startArgs = {
			transportType: 'stdio',
		};
		console.error('[ListenHub MCP] Stdio transport started');
		console.error('[ListenHub MCP] Transport: Standard Input/Output');
	}
}

console.error(`[ListenHub MCP] Server version: ${serverVersion}`);
console.error('[ListenHub MCP] Ready to accept connections\n');
await server.start(startArgs);
