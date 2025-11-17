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

import axios, {type AxiosError, type AxiosInstance} from 'axios';
import type {ListenHubConfig, Speaker} from '../types/index.js';

export class ListenHubClientError extends Error {
	constructor(
		message: string,
		public statusCode?: number,
		public responseData?: any,
	) {
		super(message);
		this.name = 'ListenHubClientError';
	}
}

export abstract class BaseClient {
	protected axiosInstance: AxiosInstance;

	constructor(config: ListenHubConfig) {
		this.axiosInstance = axios.create({
			// eslint-disable-next-line @typescript-eslint/naming-convention
			baseURL: config.baseUrl,
			headers: {
				'Content-Type': 'application/json',
				// eslint-disable-next-line @typescript-eslint/naming-convention
				Authorization: `Bearer ${config.apiKey}`,
				'User-Agent': 'listenhub-mcp-server/1.1.0',
			},
			timeout: 30_000,
		});

		this.setupInterceptors();
	}

	private setupInterceptors(): void {
		this.axiosInstance.interceptors.response.use(
			(response) => response,
			(error: AxiosError) => {
				if (error.response) {
					const {status} = error.response;
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					const data = error.response.data as any;

					throw new ListenHubClientError(
						// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
						data?.message ?? `HTTP ${status}: ${error.message}`,
						status,
						data,
					);
				} else if (error.request) {
					throw new ListenHubClientError(
						'Network error: No response received from server',
						undefined,
						undefined,
					);
				} else {
					throw new ListenHubClientError(
						`Request setup error: ${error.message}`,
						undefined,
						undefined,
					);
				}
			},
		);
	}
}

type SpeakerCacheEntry = {
	data: Speaker[];
	timestamp: number;
};

export class SpeakerCache {
	private readonly cache = new Map<string, SpeakerCacheEntry>();
	private readonly ttl: number = 10 * 60 * 1000; // 10 minutes

	set(key: string, speakers: Speaker[]): void {
		this.cache.set(key, {
			data: speakers,
			timestamp: Date.now(),
		});
	}

	get(key: string): Speaker[] | undefined {
		const entry = this.cache.get(key);

		if (!entry) {
			return undefined;
		}

		const now = Date.now();
		if (now - entry.timestamp > this.ttl) {
			this.cache.delete(key);
			return undefined;
		}

		return entry.data;
	}

	clear(): void {
		this.cache.clear();
	}
}
