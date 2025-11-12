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

export type ListenHubConfig = {
	baseUrl: string;
	apiKey: string;
};

export type ApiResponse<T = any> = {
	code: number;
	message?: string;
	data?: T;
};

export type Speaker = {
	speakerId: string;
	name: string;
	language: string;
	gender: string;
	demoAudioUrl: string;
};

export type SpeakersListResponse = {
	items: Speaker[];
	total?: number;
};

export enum SpeakerStatus {
	PUBLISHED = 3,
}

export type SourceProcessResult = {
	content?: string;
	references?: Array<{
		type: string;
		urlCitation?: {
			title: string;
			url: string;
			favicon?: string;
		};
	}>;
};
