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

import type {ListenHubConfig, Speaker} from '../types/index.js';
import {SpeakerCache} from './base.js';
import {FlowspeechClient} from './flowspeech.js';
import {PodcastClient} from './podcast.js';
import {SpeakersClient} from './speakers.js';
import {UserClient} from './user.js';

export {ListenHubClientError} from './base.js';

export class ListenHubClient {
	public user: UserClient;
	public speakers: SpeakersClient;
	public podcast: PodcastClient;
	public flowspeech: FlowspeechClient;

	private readonly speakerCache: SpeakerCache;

	constructor(config: ListenHubConfig) {
		this.user = new UserClient(config);
		this.speakers = new SpeakersClient(config);
		this.podcast = new PodcastClient(config);
		this.flowspeech = new FlowspeechClient(config);
		this.speakerCache = new SpeakerCache();
	}

	async getCachedSpeakers(language?: string): Promise<Speaker[]> {
		const cacheKey = '_all_speakers_';

		let allSpeakers = this.speakerCache.get(cacheKey);

		if (!allSpeakers) {
			const supportedLanguages = ['zh', 'en'];
			const speakersByLanguage: Speaker[] = [];

			for (const lang of supportedLanguages) {
				// eslint-disable-next-line no-await-in-loop
				const response = await this.speakers.getSpeakers(lang);
				if (response.code === 0 && response.data?.items) {
					speakersByLanguage.push(...response.data.items);
				}
			}

			const uniqueSpeakers = [
				...new Map(speakersByLanguage.map((s) => [s.speakerId, s])).values(),
			];

			allSpeakers = uniqueSpeakers;
			this.speakerCache.set(cacheKey, allSpeakers);
		}

		if (language) {
			return allSpeakers.filter((s) => s.language === language);
		}

		return allSpeakers;
	}

	async resolveSpeaker(nameOrId: string): Promise<Speaker | undefined> {
		const speakers = await this.getCachedSpeakers();

		// 1. Exact match by ID
		let found = speakers.find((s) => s.speakerId === nameOrId);
		if (found) return found;

		// 2. Exact match by name
		found = speakers.find((s) => s.name === nameOrId);
		if (found) return found;

		// 3. Case-insensitive exact match by name
		const lowerQuery = nameOrId.toLowerCase();
		found = speakers.find((s) => s.name.toLowerCase() === lowerQuery);
		if (found) return found;

		// 4. Partial match by name (contains)
		found = speakers.find((s) => s.name.toLowerCase().includes(lowerQuery));
		if (found) return found;

		// 5. Partial match by ID (contains)
		found = speakers.find((s) =>
			s.speakerId.toLowerCase().includes(lowerQuery),
		);
		if (found) return found;

		return undefined;
	}

	async resolveSpeakers(
		namesOrIds: string[],
	): Promise<Array<{speakerId: string; resolvedFrom?: string}>> {
		const results: Array<{speakerId: string; resolvedFrom?: string}> = [];
		const errors: string[] = [];

		const speakers = await this.getCachedSpeakers();

		for (const nameOrId of namesOrIds) {
			// Check if it looks like a full speaker ID (contains dash and is long)
			if (nameOrId.includes('-') && nameOrId.length > 20) {
				results.push({speakerId: nameOrId});
				continue;
			}

			// Try to resolve as name (search in all speakers, no language restriction)
			// eslint-disable-next-line no-await-in-loop
			const speaker = await this.resolveSpeaker(nameOrId);
			if (speaker) {
				results.push({
					speakerId: speaker.speakerId,
					resolvedFrom: nameOrId === speaker.speakerId ? undefined : nameOrId,
				});
			} else {
				errors.push(nameOrId);
			}
		}

		if (errors.length > 0) {
			const errorMessage = `Failed to resolve speaker(s): ${errors.join(', ')}.\n\nAvailable speakers (${speakers.length} total):\n${speakers
				.slice(0, 10)
				.map((s) => `- ${s.name} (${s.speakerId})`)
				.join(
					'\n',
				)}${speakers.length > 10 ? '\n... and more' : ''}\n\nUse get_speakers tool to see all available speakers.`;
			throw new Error(errorMessage);
		}

		return results;
	}

	clearSpeakerCache(): void {
		this.speakerCache.clear();
	}

	// Legacy methods for backward compatibility
	async getSpeakers(language?: string) {
		return this.speakers.getSpeakers(language);
	}

	async createPodcast(data: Parameters<PodcastClient['createPodcast']>[0]) {
		return this.podcast.createPodcast(data);
	}

	async getEpisodeStatus(episodeId: string) {
		return this.podcast.getEpisodeStatus(episodeId);
	}

	async getUserSubscription() {
		return this.user.getUserSubscription();
	}

	async createPodcastContentOnly(
		data: Parameters<PodcastClient['createPodcastContentOnly']>[0],
	) {
		return this.podcast.createPodcastContentOnly(data);
	}

	async generatePodcastAudio(
		episodeId: string,
		data?: Parameters<PodcastClient['generatePodcastAudio']>[1],
	) {
		return this.podcast.generatePodcastAudio(episodeId, data);
	}

	async createFlowspeech(
		data: Parameters<FlowspeechClient['createFlowspeech']>[0],
	) {
		return this.flowspeech.createFlowspeech(data);
	}

	async getFlowspeechStatus(episodeId: string) {
		return this.flowspeech.getFlowspeechStatus(episodeId);
	}
}
