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

import {
	type ApiResponse,
	SpeakerStatus,
	type SpeakersListResponse,
} from '../types/index.js';
import {BaseClient} from './base.js';

export class SpeakersClient extends BaseClient {
	async getSpeakers(
		language?: string,
	): Promise<ApiResponse<SpeakersListResponse>> {
		const parameters: Record<string, any> = {
			status: SpeakerStatus.PUBLISHED,
		};
		if (language) {
			parameters['language'] = language;
		}

		const response = await this.axiosInstance.get<
			ApiResponse<SpeakersListResponse>
		>('/v1/speakers/list', {params: parameters});
		return response.data;
	}
}
