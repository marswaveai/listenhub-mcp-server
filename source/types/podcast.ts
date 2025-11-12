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

import type {SourceProcessResult} from './common.js';

export type PodcastScript = {
	speakerId: string;
	speakerName: string;
	content: string;
};

export type PodcastSource = {
	type: 'text' | 'url';
	content: string;
};

export type CreatePodcastRequest = {
	query?: string;
	sources?: PodcastSource[];
	speakers: Array<{speakerId: string}>;
	language?: string;
	mode?: 'quick' | 'deep' | 'debate';
};

export type CreatePodcastResponse = {
	episodeId: string;
};

export type CreatePodcastContentOnlyRequest = {
	query?: string;
	sources?: PodcastSource[];
	speakers: Array<{speakerId: string}>;
	language: string;
	mode?: 'deep' | 'quick' | 'debate';
};

export type CreatePodcastContentOnlyResponse = {
	episodeId: string;
	status?: string;
	message?: string;
};

export type GeneratePodcastAudioRequest = {
	scripts?: Array<{
		content: string;
		speakerId: string;
	}>;
};

export type GeneratePodcastAudioResponse = {
	success: boolean;
	message: string;
	episodeId: string;
	status: string;
	contentStatus?: 'text-success' | 'text-fail' | 'audio-success' | 'audio-fail';
};

export type PodcastEpisode = {
	episodeId: string;
	title?: string;
	language?: string;
	processStatus: 'pending' | 'success' | 'failed';
	contentStatus?: 'text-success' | 'text-fail' | 'audio-success' | 'audio-fail';
	audioUrl?: string;
	audioStreamUrl?: string;
	outline?: string;
	cover?: string;
	scripts?: PodcastScript[];
	createdAt?: number;
	completedTime?: number;
	credits?: number;
	message?: string;
	failCode?: number;
	sourceProcessResult?: SourceProcessResult;
	audioDuration?: number;
};

export type PodcastEpisodeStatusResponse = {} & PodcastEpisode;
