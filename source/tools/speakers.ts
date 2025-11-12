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
import {z} from 'zod';
import type {ListenHubClient} from '../client/index.js';
import type {Speaker} from '../types/index.js';
import {formatError} from './utils.js';

export function registerSpeakersTools(
	server: FastMCP,
	client: ListenHubClient,
) {
	server.addTool({
		name: 'get_speakers',
		description:
			'Get list of available published speakers for podcast generation. Supports filtering by language code (e.g. "zh", "en"). Returns speaker ID, name, language, gender and demo audio URL. Defaults to Chinese speakers if no language specified.',
		parameters: z.object({
			language: z
				.string()
				.optional()
				.default('zh')
				.describe(
					'Filter by language code (e.g. "zh" for Chinese, "en" for English). Default: zh',
				),
		}),
		annotations: {
			title: 'Get Speakers',
			openWorldHint: true,
			readOnlyHint: true,
		},
		async execute(args: {language?: string}, {log}: {log: any}) {
			try {
				const language = args.language ?? 'zh';
				log.info(`Fetching published speakers for language: ${language}`);

				const response = await client.speakers.getSpeakers(language);

				if (response.code !== 0) {
					return `Error: ${response.message ?? 'Failed to get speakers'}`;
				}

				const speakers = response.data?.items ?? [];

				if (speakers.length === 0) {
					return `No speakers available for language: ${language}`;
				}

				const speakerTable = speakers
					.map(
						(s: Speaker, index: number) =>
							`${index + 1}. ${s.name}\n   - ID: ${s.speakerId}\n   - Language: ${s.language}\n   - Gender: ${s.gender}\n   - Audio Preview: [🎧 Listen to voice sample](${s.demoAudioUrl})`,
					)
					.join('\n\n');

				log.info(`Successfully fetched ${speakers.length} published speakers`);
				return `Found ${speakers.length} available speakers for language: ${language}\n\nYou can use either the speaker name or speaker ID when creating podcasts.\n\n${speakerTable}`;
			} catch (error) {
				const errorMessage = formatError(error);
				log.error('Failed to get speakers', {error: errorMessage});
				return `Failed to get speakers: ${errorMessage}`;
			}
		},
	});
}
