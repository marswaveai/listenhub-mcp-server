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
	CreatePodcastContentOnlyRequest,
	CreatePodcastRequest,
	PodcastSource,
} from '../types/index.js';
import {
	formatError,
	formatPodcastEpisode,
	pollUntilComplete,
	validateSpeakers,
} from './utils.js';

export function registerPodcastTools(server: FastMCP, client: ListenHubClient) {
	// Create podcast with full generation (text + audio)
	server.addTool({
		name: 'create_podcast',
		description:
			'Create a podcast episode with full generation (text + audio). Supports single-speaker (solo) or dual-speaker (dialogue) formats with 1-2 speakers (can use speaker names or IDs). Choose from 3 generation modes: quick (3-5 min podcast), deep (8-15 min podcast), or debate (5-10 min podcast). Accepts text or URL sources. This tool will automatically poll until generation is complete (may take several minutes).',
		parameters: z.object({
			query: z
				.string()
				.optional()
				.describe(
					'The content or topic for the podcast (optional if sources provided)',
				),
			sources: z
				.array(
					z.object({
						type: z.enum(['text', 'url']).describe('Source type: text or url'),
						content: z
							.string()
							.describe('Source content (text content or URL)'),
					}),
				)
				.optional()
				.describe('Additional sources (text or URLs)'),
			speakers: z
				.array(z.string())
				.min(1)
				.max(2)
				.describe(
					'1-2 speaker names or IDs. Use speaker names from get_speakers tool output (the "name" field, not speakerId). Full speaker IDs also supported. Names will be automatically resolved to IDs.',
				),
			language: z
				.string()
				.optional()
				.describe(
					'Language code (e.g., "zh" for Chinese, "en" for English). Should match the selected speaker\'s language. If not specified, will use the first speaker\'s language.',
				),
			mode: z
				.enum(['quick', 'deep', 'debate'])
				.default('quick')
				.describe(
					'Generation mode (time indicates podcast audio length): ' +
						'"quick" (3-5 min audio): Fast-paced content for simple topics, news summaries, brief introductions. Supports 1-2 speakers. ' +
						'"deep" (8-15 min audio): Comprehensive analysis for detailed topics, in-depth explanations, thorough coverage. Supports 1-2 speakers. ' +
						'"debate" (5-10 min audio): Conversational discussion, interviews, dialogues, debates, Q&A sessions. Supports 1-2 speakers. Default: quick',
				),
		}),
		annotations: {
			title: 'Create Podcast',
			openWorldHint: true,
			readOnlyHint: false,
		},
		// eslint-disable-next-line complexity
		async execute(args, {log}: {log: any}) {
			try {
				// Resolve speaker names/IDs to actual speaker IDs
				log.info('Resolving speaker identifiers', {
					input: args.speakers,
					language: args.language,
				});

				const resolvedSpeakers = await client.resolveSpeakers(args.speakers);
				const speakers = resolvedSpeakers.map((r) => ({
					speakerId: r.speakerId,
				}));
				const validationError = validateSpeakers(speakers, 1, 2);
				if (validationError) {
					return `Validation error: ${validationError}`;
				}

				// Use provided language or infer from resolved speaker
				const allSpeakers = await client.getCachedSpeakers();
				const resolvedSpeaker = allSpeakers.find(
					(s) => s.speakerId === resolvedSpeakers[0]?.speakerId,
				);
				const language = args.language ?? resolvedSpeaker?.language ?? 'zh';

				log.info('Creating podcast episode', {
					query: args.query?.slice(0, 50),
					speakerCount: speakers.length,
					sourcesCount: args.sources?.length ?? 0,
					language,
					mode: args.mode,
				});

				const requestData: CreatePodcastRequest = {
					speakers,
					mode: args.mode,
					language,
				};

				if (args.query) {
					requestData.query = args.query;
				}

				if (args.sources && args.sources.length > 0) {
					requestData.sources = args.sources as PodcastSource[];
				}

				const submitResponse = await client.podcast.createPodcast(requestData);

				if (submitResponse.code !== 0) {
					return `Failed to submit task: ${submitResponse.message ?? 'Unknown error'}`;
				}

				const episodeId = submitResponse.data?.episodeId;
				if (!episodeId) {
					return 'Failed to submit task: No episodeId returned';
				}

				log.info(`Podcast task submitted successfully`, {episodeId});

				const result = await pollUntilComplete(
					async () => {
						const statusResponse =
							await client.podcast.getEpisodeStatus(episodeId);
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
						maxRetries: 60,
						onProgress(status, retry) {
							log.debug(`Podcast generation status: ${status}`, {
								episodeId,
								retry: `${retry}/60`,
							});
						},
					},
				);

				if (!result.success) {
					if (result.error) {
						log.error('Podcast generation failed', {
							episodeId,
							error: result.error,
						});
						return `Podcast generation failed: ${result.error}`;
					}

					log.warn('Podcast generation timeout', {
						episodeId,
						lastStatus: result.lastStatus,
					});
					return `Task is still processing after 5 minutes.\n\nEpisode ID: ${episodeId}\nLast Status: ${result.lastStatus}\n\nThe task is running in the background. Use get_podcast_status tool with this Episode ID to check progress.`;
				}

				const episode = result.data!;
				log.info('Podcast generation completed', {episodeId});

				const hasOutline = Boolean(episode.outline);
				const hasScripts = Boolean(
					episode.scripts && episode.scripts.length > 0,
				);

				return `Podcast Generation Completed

Content Included:
- Basic Info: Episode ID, Title, Speakers, Language, Status
- Audio Files: ${episode.audioUrl ? 'Yes' : 'No'}
- Outline: ${hasOutline ? 'Yes (see below)' : 'No'}
- Scripts: ${hasScripts ? 'Yes (see below)' : 'No'}

${formatPodcastEpisode(episode)}`;
			} catch (error) {
				const errorMessage = formatError(error);
				log.error('Failed to create podcast', {error: errorMessage});
				return `Failed to create podcast: ${errorMessage}`;
			}
		},
	});

	// Get podcast episode status
	server.addTool({
		name: 'get_podcast_status',
		description:
			'Query detailed information of a podcast episode, including generation status, audio URLs, scripts, outline, and metadata. Does not poll - returns current status immediately.',
		parameters: z.object({
			episodeId: z
				.string()
				.min(24)
				.max(24)
				.describe(
					'The complete 24-character episode ID. IMPORTANT: Must be exactly 24 characters. Copy the FULL Episode ID from the Episode ID field in the previous response.',
				),
		}),
		annotations: {
			title: 'Get Podcast Status',
			openWorldHint: true,
			readOnlyHint: true,
		},
		async execute(args: {episodeId: string}, {log}: {log: any}) {
			try {
				log.info('Querying podcast episode status', {
					episodeId: args.episodeId,
				});

				const response = await client.podcast.getEpisodeStatus(args.episodeId);

				if (response.code !== 0) {
					return `Failed to query episode: ${response.message ?? 'Unknown error'}`;
				}

				if (!response.data) {
					return 'Episode not found';
				}

				log.info('Episode status retrieved', {
					episodeId: args.episodeId,
					status: response.data.processStatus,
				});

				return `Podcast Episode Information\n\n${formatPodcastEpisode(response.data)}`;
			} catch (error) {
				const errorMessage = formatError(error);
				log.error('Failed to query episode status', {error: errorMessage});
				return `Failed to query episode status: ${errorMessage}`;
			}
		},
	});

	// Create podcast content only (text generation, no audio)
	server.addTool({
		name: 'create_podcast_text_only',
		description:
			'Create podcast episode with text content only (no audio generation). Supports single-speaker (solo) or dual-speaker (dialogue) formats with 1-2 speakers (can use speaker names or IDs). Choose from 3 generation modes: quick (3-5 min podcast), deep (8-15 min podcast), or debate (5-10 min podcast). This is the first stage of two-stage generation. After text generation completes, you can review the scripts. To use modified scripts, call generate_podcast_audio with customScripts parameter to override the generated scripts when generating audio.',
		parameters: z.object({
			query: z
				.string()
				.optional()
				.describe(
					'The content or topic for the podcast (optional if sources provided)',
				),
			sources: z
				.array(
					z.object({
						type: z.enum(['text', 'url']).describe('Source type: text or url'),
						content: z
							.string()
							.describe('Source content (text content or URL)'),
					}),
				)
				.optional()
				.describe('Additional sources (text or URLs)'),
			speakerIds: z
				.array(z.string())
				.min(1)
				.max(2)
				.describe(
					'1-2 speaker names or IDs. Use speaker names from get_speakers tool output (the "name" field, not speakerId). Full speaker IDs also supported.',
				),
			language: z
				.string()
				.describe(
					'Language code (e.g., "zh" for Chinese, "en" for English). Must match the selected speaker\'s language - REQUIRED',
				),
			mode: z
				.enum(['quick', 'deep', 'debate'])
				.default('quick')
				.describe(
					'Generation mode (time indicates podcast audio length): ' +
						'"quick" (3-5 min audio): Fast-paced content for simple topics, news summaries, brief introductions. Supports 1-2 speakers. ' +
						'"deep" (8-15 min audio): Comprehensive analysis for detailed topics, in-depth explanations, thorough coverage. Supports 1-2 speakers. ' +
						'"debate" (5-10 min audio): Conversational discussion, interviews, dialogues, debates, Q&A sessions. Supports 1-2 speakers. Default: quick',
				),
			waitForCompletion: z
				.boolean()
				.default(true)
				.describe('Whether to wait for text generation to complete'),
		}),
		annotations: {
			title: 'Create Podcast Text Only',
			openWorldHint: true,
			readOnlyHint: false,
		},
		async execute(args, {log}: {log: any}) {
			try {
				// Resolve speaker names/IDs to actual speaker IDs
				log.info('Resolving speaker identifiers', {
					input: args.speakerIds,
					language: args.language,
				});

				const resolvedSpeakers = await client.resolveSpeakers(args.speakerIds);
				const speakers = resolvedSpeakers.map((r) => ({
					speakerId: r.speakerId,
				}));
				const validationError = validateSpeakers(speakers, 1, 2);
				if (validationError) {
					return `Validation error: ${validationError}`;
				}

				log.info('Creating podcast text content', {
					query: args.query?.slice(0, 50),
					speakerCount: speakers.length,
					language: args.language,
					mode: args.mode,
				});

				const requestData: CreatePodcastContentOnlyRequest = {
					speakers,
					language: args.language,
					mode: args.mode,
				};

				if (args.query) {
					requestData.query = args.query;
				}

				if (args.sources && args.sources.length > 0) {
					requestData.sources = args.sources as PodcastSource[];
				}

				const submitResponse =
					await client.podcast.createPodcastContentOnly(requestData);

				if (submitResponse.code !== 0) {
					return `Failed to submit task: ${submitResponse.message ?? 'Unknown error'}`;
				}

				const episodeId = submitResponse.data?.episodeId;
				if (!episodeId) {
					return 'Failed to submit task: No episodeId returned';
				}

				log.info(`Podcast text generation task submitted`, {episodeId});

				if (!args.waitForCompletion) {
					return `Podcast text generation started\n\nEpisode ID: ${episodeId}\nStatus: pending\n\nUse get_podcast_status to check progress.`;
				}

				const result = await pollUntilComplete(
					async () => {
						const statusResponse =
							await client.podcast.getEpisodeStatus(episodeId);
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
						maxRetries: 60,
						onProgress(status, retry) {
							log.debug(`Text generation status: ${status}`, {
								episodeId,
								retry: `${retry}/60`,
							});
						},
					},
				);

				if (!result.success) {
					if (result.error) {
						log.error('Text generation failed', {
							episodeId,
							error: result.error,
						});
						return `Text generation failed: ${result.error}`;
					}

					log.warn('Text generation timeout', {
						episodeId,
						lastStatus: result.lastStatus,
					});
					return `Task is still processing after 5 minutes.\n\nEpisode ID: ${episodeId}\nLast Status: ${result.lastStatus}\n\nThe task is running in the background. Use get_podcast_status tool with this Episode ID to check progress.`;
				}

				const episode = result.data!;
				log.info('Text generation completed', {episodeId});

				const hasOutline = Boolean(episode.outline);
				const hasScripts = Boolean(
					episode.scripts && episode.scripts.length > 0,
				);

				return `Podcast Text Generation Completed

Content Generated:
- Outline: ${hasOutline ? 'Yes (see below)' : 'No'}
- Scripts: ${hasScripts ? 'Yes (see below)' : 'No'}

${formatPodcastEpisode(episode)}

Next step: Use generate_podcast_audio to create audio from these scripts.`;
			} catch (error) {
				const errorMessage = formatError(error);
				log.error('Failed to create podcast text', {error: errorMessage});
				return `Failed to create podcast text: ${errorMessage}`;
			}
		},
	});

	// Generate podcast audio from existing text content
	server.addTool({
		name: 'generate_podcast_audio',
		description:
			'Generate audio for a podcast episode that already has text content. This is the second stage of two-stage generation. The episode must have contentStatus=text-success. You can optionally provide customScripts parameter to override the generated scripts when generating audio. NOTE: This is the ONLY way to use modified scripts - there is no separate tool to edit scripts after generation.',
		parameters: z.object({
			episodeId: z
				.string()
				.min(24)
				.max(24)
				.describe(
					'The complete 24-character episode ID from the previous create_podcast_text_only response. IMPORTANT: Must be exactly 24 characters. Copy the FULL Episode ID - do not truncate or shorten it.',
				),
			customScripts: z
				.array(
					z.object({
						content: z.string().describe('Script text content'),
						speakerId: z.string().describe('Speaker ID'),
					}),
				)
				.optional()
				.describe('Optional custom scripts to override generated ones'),
			waitForCompletion: z
				.boolean()
				.default(true)
				.describe('Whether to wait for audio generation to complete'),
		}),
		annotations: {
			title: 'Generate Podcast Audio',
			openWorldHint: true,
			readOnlyHint: false,
		},
		async execute(args, {log}: {log: any}) {
			try {
				log.info('Generating podcast audio', {
					episodeId: args.episodeId,
					hasCustomScripts: Boolean(args.customScripts),
				});

				// Check episode status first
				const statusResponse = await client.podcast.getEpisodeStatus(
					args.episodeId,
				);
				if (statusResponse.code !== 0) {
					return `Failed to query episode: ${statusResponse.message ?? 'Unknown error'}`;
				}

				const episode = statusResponse.data;
				if (!episode) {
					return 'Episode not found';
				}

				if (episode.contentStatus !== 'text-success') {
					return `Cannot generate audio: Episode contentStatus is ${episode.contentStatus ?? 'unknown'}, must be text-success`;
				}

				const requestData = args.customScripts
					? {scripts: args.customScripts}
					: undefined;
				const submitResponse = await client.podcast.generatePodcastAudio(
					args.episodeId,
					requestData,
				);

				if (submitResponse.code !== 0) {
					return `Failed to start audio generation: ${submitResponse.message ?? 'Unknown error'}`;
				}

				log.info(`Audio generation task submitted`, {
					episodeId: args.episodeId,
				});

				if (!args.waitForCompletion) {
					return `Audio generation started\n\nEpisode ID: ${args.episodeId}\nStatus: pending\n\nUse get_podcast_status to check progress.`;
				}

				const result = await pollUntilComplete(
					async () => {
						const response = await client.podcast.getEpisodeStatus(
							args.episodeId,
						);
						if (response.code !== 0) {
							throw new Error(response.message ?? 'Failed to query status');
						}

						if (!response.data) {
							throw new Error('No episode data returned');
						}

						return response.data;
					},
					{
						pollInterval: 5000,
						maxRetries: 60,
						onProgress(status, retry) {
							log.debug(`Audio generation status: ${status}`, {
								episodeId: args.episodeId,
								retry: `${retry}/60`,
							});
						},
					},
				);

				if (!result.success) {
					if (result.error) {
						log.error('Audio generation failed', {
							episodeId: args.episodeId,
							error: result.error,
						});
						return `Audio generation failed: ${result.error}`;
					}

					log.warn('Audio generation timeout', {
						episodeId: args.episodeId,
						lastStatus: result.lastStatus,
					});
					return `Task is still processing after 5 minutes.\n\nEpisode ID: ${args.episodeId}\nLast Status: ${result.lastStatus}\n\nThe task is running in the background. Use get_podcast_status tool with this Episode ID to check progress.`;
				}

				const finalEpisode = result.data!;
				log.info('Audio generation completed', {episodeId: args.episodeId});

				const hasOutline = Boolean(finalEpisode.outline);
				const hasScripts = Boolean(
					finalEpisode.scripts && finalEpisode.scripts.length > 0,
				);

				return `Podcast Audio Generation Completed

Content Included:
- Audio Files: ${finalEpisode.audioUrl ? 'Yes' : 'No'}
- Outline: ${hasOutline ? 'Yes (see below)' : 'No'}
- Scripts: ${hasScripts ? 'Yes (see below)' : 'No'}

${formatPodcastEpisode(finalEpisode)}`;
			} catch (error) {
				const errorMessage = formatError(error);
				log.error('Failed to generate podcast audio', {error: errorMessage});
				return `Failed to generate podcast audio: ${errorMessage}`;
			}
		},
	});
}
