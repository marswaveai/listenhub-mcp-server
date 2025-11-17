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
import server from './main.js';

// Parse command line arguments
const args = process.argv.slice(2);
const getArgValue = (flag: string): string | undefined => {
	const index = args.indexOf(flag);
	return index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
};

// Get transport mode from command line or environment variable
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
const transport =
	getArgValue('--transport') || process.env['TRANSPORT'] || 'stdio';
const port = Number(getArgValue('--port') || process.env['PORT'] || 3000);
/* eslint-enable @typescript-eslint/prefer-nullish-coalescing */

type StartArgs = Parameters<typeof server.start>[0];

let startArgs: StartArgs;

switch (transport.toLowerCase()) {
	case 'http':
	case 'httpstream':
	case 'sse': {
		startArgs = {
			transportType: 'httpStream',
			httpStream: {
				endpoint: '/mcp',
				port,
			},
		};
		console.error(`[ListenHub MCP] HTTP server running on port ${port}`);
		console.error(
			`[ListenHub MCP] HTTP Stream endpoint: http://localhost:${port}/mcp`,
		);
		console.error(`[ListenHub MCP] SSE endpoint: http://localhost:${port}/sse`);
		console.error('[ListenHub MCP] Transport: HTTP Stream + SSE');
		break;
	}

	default: {
		startArgs = {
			transportType: 'stdio',
		};
		console.error('[ListenHub MCP] Stdio transport started');
		console.error('[ListenHub MCP] Transport: Standard Input/Output');
	}
}

console.error('[ListenHub MCP] Server version: 1.1.0');
console.error('[ListenHub MCP] Ready to accept connections\n');
await server.start(startArgs);
