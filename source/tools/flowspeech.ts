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
import type {
	CreateFlowspeechRequest,
	FlowspeechSource,
} from '../types/index.js';
import {
	formatError,
	formatFlowspeechEpisode,
	pollUntilComplete,
} from './utils.js';

export function registerFlowspeechTools(
	server: FastMCP,
	client: ListenHubClient,
) {
	// Create FlowSpeech episode
	server.addTool({
		name: 'create_flowspeech',
		description:
			'Create a FlowSpeech episode by converting text or URL content to speech. Supports smart mode (AI-enhanced, fixes grammar) and direct mode (no modifications). This tool will automatically poll until generation is complete.',
		parameters: z.object({
			sourceType: z.enum(['text', 'url']).describe('Source type: text or url'),
			sourceContent: z.string().min(1).describe('Source content (text or URL)'),
			speakerId: z
				.string()
				.min(1)
				.describe(
					'Speaker name or ID. Use speaker name from get_speakers tool output (the "name" field, not speakerId). Full speaker ID also supported.',
				),
			language: z
				.string()
				.optional()
				.describe(
					'Language code (e.g., "zh" for Chinese, "en" for English). Default: zh',
				),
			mode: z
				.enum(['smart', 'direct'])
				.default('smart')
				.describe(
					'Generation mode: "smart" (AI-enhanced, fixes grammar) or "direct" (no modifications)',
				),
		}),
		annotations: {
			title: 'Create FlowSpeech',
			openWorldHint: true,
			readOnlyHint: false,
		},
		async execute(args, {log}: {log: any}) {
			try {
				// Resolve speaker name/ID to actual speaker ID
				log.info('Resolving speaker identifier', {
					input: args.speakerId,
					language: args.language,
				});

				const resolvedSpeakers = await client.resolveSpeakers([args.speakerId]);
				const speakers = [{speakerId: resolvedSpeakers[0]?.speakerId}];
				const sources: FlowspeechSource[] = [
					{
						type: args.sourceType,
						content: args.sourceContent,
					},
				];

				// Use provided language or infer from resolved speaker
				const allSpeakers = await client.getCachedSpeakers();
				const resolvedSpeaker = allSpeakers.find(
					(s) => s.speakerId === resolvedSpeakers[0]?.speakerId,
				);
				const language = args.language ?? resolvedSpeaker?.language ?? 'zh';

				log.info('Creating FlowSpeech episode', {
					sourceType: args.sourceType,
					contentLength: args.sourceContent.length,
					speakerId: resolvedSpeakers[0]?.speakerId,
					language,
					mode: args.mode,
				});

				const requestData: CreateFlowspeechRequest = {
					sources,
					speakers,
					mode: args.mode,
					language,
				};

				const submitResponse =
					await client.flowspeech.createFlowspeech(requestData);

				if (submitResponse.code !== 0) {
					return `Failed to submit task: ${submitResponse.message ?? 'Unknown error'}`;
				}

				const episodeId = submitResponse.data?.episodeId;
				if (!episodeId) {
					return 'Failed to submit task: No episodeId returned';
				}

				log.info(`FlowSpeech task submitted successfully`, {episodeId});

				const result = await pollUntilComplete(
					async () => {
						const statusResponse =
							await client.flowspeech.getFlowspeechStatus(episodeId);
						if (statusResponse.code !== 0) {
							throw new Error(
								statusResponse.message ?? 'Failed to query status',
							);
						}

						if (!statusResponse.data) {
							throw new Error('No episode data returned');
						}

						return statusResponse.data;
					},
					{
						pollInterval: 5000,
						maxRetries: 120,
						onProgress(status, retry) {
							log.debug(`FlowSpeech generation status: ${status}`, {
								episodeId,
								retry: `${retry}/120`,
							});
						},
					},
				);

				if (!result.success) {
					if (result.error) {
						log.error('FlowSpeech generation failed', {
							episodeId,
							error: result.error,
						});
						return `FlowSpeech generation failed: ${result.error}`;
					}

					log.warn('FlowSpeech generation timeout', {
						episodeId,
						lastStatus: result.lastStatus,
					});
					return `FlowSpeech generation timeout\nLast status: ${result.lastStatus}\nEpisode ID: ${episodeId}`;
				}

				const episode = result.data!;
				log.info('FlowSpeech generation completed', {episodeId});

				return formatFlowspeechEpisode(episode);
			} catch (error) {
				const errorMessage = formatError(error);
				log.error('Failed to create FlowSpeech', {error: errorMessage});
				return `Failed to create FlowSpeech: ${errorMessage}`;
			}
		},
	});

	// Get FlowSpeech episode status
	server.addTool({
		name: 'get_flowspeech_status',
		description:
			'Query detailed information of a FlowSpeech episode, including generation status, audio URLs, scripts, outline, and metadata. Does not poll - returns current status immediately.',
		parameters: z.object({
			episodeId: z.string().min(1).describe('The FlowSpeech episode ID'),
		}),
		annotations: {
			title: 'Get FlowSpeech Status',
			openWorldHint: true,
			readOnlyHint: true,
		},
		async execute(args: {episodeId: string}, {log}: {log: any}) {
			try {
				log.info('Querying FlowSpeech episode status', {
					episodeId: args.episodeId,
				});

				const response = await client.flowspeech.getFlowspeechStatus(
					args.episodeId,
				);

				if (response.code !== 0) {
					return `Failed to query episode: ${response.message ?? 'Unknown error'}`;
				}

				if (!response.data) {
					return 'Episode not found';
				}

				log.info('FlowSpeech episode status retrieved', {
					episodeId: args.episodeId,
					status: response.data.processStatus,
				});

				return `FlowSpeech Episode Information\n\n${formatFlowspeechEpisode(response.data)}`;
			} catch (error) {
				const errorMessage = formatError(error);
				log.error('Failed to query FlowSpeech episode status', {
					error: errorMessage,
				});
				return `Failed to query FlowSpeech episode status: ${errorMessage}`;
			}
		},
	});
}
