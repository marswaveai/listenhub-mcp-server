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

import type {
	ApiResponse,
	CreatePodcastContentOnlyRequest,
	CreatePodcastContentOnlyResponse,
	CreatePodcastRequest,
	CreatePodcastResponse,
	GeneratePodcastAudioRequest,
	GeneratePodcastAudioResponse,
	PodcastEpisodeStatusResponse,
} from '../types/index.js';
import {BaseClient} from './base.js';

export class PodcastClient extends BaseClient {
	async createPodcast(
		data: CreatePodcastRequest,
	): Promise<ApiResponse<CreatePodcastResponse>> {
		const response = await this.axiosInstance.post<
			ApiResponse<CreatePodcastResponse>
		>('/v1/podcast/episodes', data);
		return response.data;
	}

	async getEpisodeStatus(
		episodeId: string,
	): Promise<ApiResponse<PodcastEpisodeStatusResponse>> {
		const response = await this.axiosInstance.get<
			ApiResponse<PodcastEpisodeStatusResponse>
		>(`/v1/podcast/episodes/${episodeId}`);
		return response.data;
	}

	async createPodcastContentOnly(
		data: CreatePodcastContentOnlyRequest,
	): Promise<ApiResponse<CreatePodcastContentOnlyResponse>> {
		const response = await this.axiosInstance.post<
			ApiResponse<CreatePodcastContentOnlyResponse>
		>('/v1/podcast/episodes/text-content', data);
		return response.data;
	}

	async generatePodcastAudio(
		episodeId: string,
		data?: GeneratePodcastAudioRequest,
	): Promise<ApiResponse<GeneratePodcastAudioResponse>> {
		const response = await this.axiosInstance.post<
			ApiResponse<GeneratePodcastAudioResponse>
		>(`/v1/podcast/episodes/${episodeId}/audio`, data ?? {});
		return response.data;
	}
}
