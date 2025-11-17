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
import dotenv from 'dotenv';
import {FastMCP} from 'fastmcp';
import {ListenHubClient} from './client/index.js';
import {registerAllTools} from './tools/index.js';

dotenv.config({debug: false});

const listenhubApiKey = process.env['LISTENHUB_API_KEY'] ?? '';
const listenHubBaseUrl =
	process.env['LISTENHUB_BASE_URL'] ?? 'https://api.marswave.ai/openapi';

if (!listenhubApiKey) {
	console.error('Error: LISTENHUB_API_KEY environment variable is required');
	process.exit(1);
}

const client = new ListenHubClient({
	baseUrl: listenHubBaseUrl,
	apiKey: listenhubApiKey,
});

const server = new FastMCP({
	name: 'listenhub-mcp-server',
	version: '1.1.0',
});

registerAllTools(server, client);

export default server;
