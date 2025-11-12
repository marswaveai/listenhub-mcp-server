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

export type FlowspeechSource = {
	type: 'text' | 'url';
	content: string;
	uri?: string;
	metadata?: Record<string, any>;
};

export type CreateFlowspeechRequest = {
	sources: FlowspeechSource[];
	speakers: Array<{speakerId?: string}>;
	language?: string;
	mode?: 'smart' | 'direct';
};

export type CreateFlowspeechResponse = {
	episodeId: string;
};

export type FlowspeechEpisodeInfo = {
	episodeId: string;
	createdAt?: number;
	credits?: number;
	message?: string;
	failCode?: number;
	processStatus: 'pending' | 'success' | 'failed';
	completedTime?: number;
	sourceProcessResult?: SourceProcessResult;
	title?: string;
	language?: string;
	outline?: string;
	cover?: string;
	audioUrl?: string;
	audioStreamUrl?: string;
	scripts?: string;
	audioDuration?: number;
};
