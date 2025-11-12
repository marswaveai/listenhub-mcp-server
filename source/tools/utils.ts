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

import {ListenHubClientError} from '../client/index.js';
import type {FlowspeechEpisodeInfo, PodcastEpisode} from '../types/index.js';

export function formatError(error: unknown): string {
	if (error instanceof ListenHubClientError) {
		return `${error.message} (Status: ${error.statusCode ?? 'N/A'})`;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}

export type PollResult<T> = {
	success: boolean;
	data?: T;
	lastStatus: string;
	error?: string;
};

export async function pollUntilComplete<T extends {processStatus: string}>(
	fetchStatus: () => Promise<T>,
	options: {
		pollInterval?: number;
		maxRetries?: number;
		onProgress?: (status: string, retry: number) => void;
	} = {},
): Promise<PollResult<T>> {
	const {pollInterval = 5000, maxRetries = 120, onProgress} = options;

	let retries = 0;
	let lastStatus = 'pending';

	while (retries < maxRetries) {
		try {
			// eslint-disable-next-line no-await-in-loop
			const data = await fetchStatus();
			lastStatus = data.processStatus;

			if (onProgress) {
				onProgress(lastStatus, retries);
			}

			if (data.processStatus === 'success') {
				return {success: true, data, lastStatus};
			}

			if (data.processStatus === 'failed') {
				return {
					success: false,
					data,
					lastStatus,
					error:
						((data as any).message ?? (data as any).failCode)
							? `Error code: ${(data as any).failCode}`
							: 'Unknown error',
				};
			}

			// eslint-disable-next-line no-await-in-loop, no-promise-executor-return
			await new Promise((resolve) => setTimeout(resolve, pollInterval));
			retries++;
		} catch (error) {
			return {
				success: false,
				lastStatus,
				error: formatError(error),
			};
		}
	}

	return {
		success: false,
		lastStatus,
		error: `Timeout (exceeded ${(maxRetries * pollInterval) / 1000} seconds)`,
	};
}

export function formatTimestamp(timestamp?: number): string {
	if (!timestamp) return 'N/A';
	return new Date(timestamp).toISOString();
}

export function formatDuration(startTime?: number, endTime?: number): string {
	if (!startTime || !endTime) return 'N/A';
	const seconds = Math.floor((endTime - startTime) / 1000);
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}m ${remainingSeconds}s`;
}

export function formatAudioDuration(durationInSeconds?: number): string {
	if (!durationInSeconds) return 'N/A';
	const seconds = Math.floor(durationInSeconds);
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}m ${remainingSeconds}s`;
}

export function formatPodcastEpisode(episode: PodcastEpisode): string {
	const generationTime = formatDuration(
		episode.createdAt,
		episode.completedTime,
	);
	const audioDuration = formatAudioDuration(episode.audioDuration);

	const speakersInfo =
		episode.scripts && episode.scripts.length > 0
			? episode.scripts
					.map((s) => s.speakerName)
					.filter((name, index, self) => self.indexOf(name) === index)
					.join(', ')
			: 'N/A';

	const parts = [
		`**Episode ID**: \`${episode.episodeId}\``,
		`**Title**: ${episode.title ?? 'N/A'}`,
		`**Speakers**: ${speakersInfo}`,
		`**Language**: ${episode.language ?? 'N/A'}`,
		`**Status**: ${episode.processStatus}`,
	];

	if (episode.contentStatus) {
		parts.push(`**Content Status**: ${episode.contentStatus}`);
	}

	parts.push(
		`**Audio Duration**: ${audioDuration}`,
		`**Generation Time**: ${generationTime}`,
		`**Credits Used**: ${episode.credits ?? 'N/A'}`,
		`**Created**: ${formatTimestamp(episode.createdAt)}`,
		`**Completed**: ${formatTimestamp(episode.completedTime)}`,
	);

	if (episode.audioUrl) {
		parts.push(`\n🎧 **Audio**: [Listen to Podcast](${episode.audioUrl})`);
	}

	if (episode.audioStreamUrl) {
		parts.push(`🔊 **Stream**: [Open Stream](${episode.audioStreamUrl})`);
	}

	if (episode.outline) {
		parts.push('', '---', '', '## 📋 Outline', '', episode.outline);
	}

	if (episode.scripts && episode.scripts.length > 0) {
		const scriptsText = episode.scripts
			.map(
				(s, index) =>
					`### Speaker ${index + 1}: ${s.speakerName}\n\n${s.content}`,
			)
			.join('\n\n');

		parts.push('', '---', '', '## 📝 Scripts', '', scriptsText);
	}

	return parts.filter(Boolean).join('\n');
}

export function formatFlowspeechEpisode(
	episode: FlowspeechEpisodeInfo,
): string {
	const generationTime = formatDuration(
		episode.createdAt,
		episode.completedTime,
	);
	const audioDuration = formatAudioDuration(episode.audioDuration);

	const parts = [
		`**Episode ID**: \`${episode.episodeId}\``,
		`**Title**: ${episode.title ?? 'N/A'}`,
		`**Language**: ${episode.language ?? 'N/A'}`,
		`**Status**: ${episode.processStatus}`,
		`**Audio Duration**: ${audioDuration}`,
		`**Generation Time**: ${generationTime}`,
		`**Credits Used**: ${episode.credits ?? 'N/A'}`,
		`**Created**: ${formatTimestamp(episode.createdAt)}`,
		`**Completed**: ${formatTimestamp(episode.completedTime)}`,
	];

	if (episode.audioUrl) {
		parts.push(`\n🎧 **Audio**: [Listen to FlowSpeech](${episode.audioUrl})`);
	}

	if (episode.audioStreamUrl) {
		parts.push(`🔊 **Stream**: [Open Stream](${episode.audioStreamUrl})`);
	}

	if (episode.outline) {
		parts.push('', '---', '', '## 📋 Outline', '', episode.outline);
	}

	if (episode.scripts) {
		parts.push('', '---', '', '## 📝 Script', '', episode.scripts);
	}

	return parts.filter(Boolean).join('\n');
}

export function validateSpeakers(
	speakers: Array<{speakerId: string}>,
	minCount = 1,
	maxCount = 2,
): string | undefined {
	if (speakers.length < minCount) {
		return `At least ${minCount} speaker(s) required`;
	}

	if (speakers.length > maxCount) {
		return `Maximum ${maxCount} speaker(s) allowed`;
	}

	const uniqueSpeakers = new Set(speakers.map((s) => s.speakerId));
	if (uniqueSpeakers.size !== speakers.length) {
		return 'Duplicate speakers are not allowed';
	}

	return undefined;
}
