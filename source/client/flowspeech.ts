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
	CreateFlowspeechRequest,
	CreateFlowspeechResponse,
	FlowspeechEpisodeInfo,
} from '../types/index.js';
import {BaseClient} from './base.js';

export class FlowspeechClient extends BaseClient {
	async createFlowspeech(
		data: CreateFlowspeechRequest,
	): Promise<ApiResponse<CreateFlowspeechResponse>> {
		const response = await this.axiosInstance.post<
			ApiResponse<CreateFlowspeechResponse>
		>('/v1/flow-speech/episodes', data);
		return response.data;
	}

	async getFlowspeechStatus(
		episodeId: string,
	): Promise<ApiResponse<FlowspeechEpisodeInfo>> {
		const response = await this.axiosInstance.get<
			ApiResponse<FlowspeechEpisodeInfo>
		>(`/v1/flow-speech/episodes/${episodeId}`);
		return response.data;
	}
}
