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

import type {FastMCP} from 'fastmcp';
import type {ListenHubClient} from '../client/index.js';
import {registerFlowspeechTools} from './flowspeech.js';
import {registerPodcastTools} from './podcast.js';
import {registerPrompts} from './prompts.js';
import {registerSpeakersTools} from './speakers.js';
import {registerUserTools} from './user.js';

export function registerAllTools(server: FastMCP, client: ListenHubClient) {
	// Register tools
	registerSpeakersTools(server, client);
	registerPodcastTools(server, client);
	registerFlowspeechTools(server, client);
	registerUserTools(server, client);

	// Register prompts
	registerPrompts(server, client);
}

export * from './utils.js';
