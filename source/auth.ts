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

import {Buffer} from 'node:buffer';
import {timingSafeEqual} from 'node:crypto';
import type {IncomingMessage} from 'node:http';

export type HttpAuthSession = {
	authenticated: true;
};

export function extractBearerToken(
	headers: IncomingMessage['headers'],
): string | undefined {
	const {authorization} = headers;
	if (typeof authorization === 'string') {
		const [scheme, ...rest] = authorization.trim().split(/\s+/);
		if (scheme?.toLowerCase() === 'bearer' && rest.length > 0) {
			return rest.join(' ');
		}
	}

	const apiKey = headers['x-api-key'];
	if (typeof apiKey === 'string' && apiKey.length > 0) {
		return apiKey;
	}

	return undefined;
}

export function tokensMatch(expected: string, actual: string | undefined) {
	if (!actual) {
		return false;
	}

	const expectedBuffer = Buffer.from(expected);
	const actualBuffer = Buffer.from(actual);
	return (
		expectedBuffer.length === actualBuffer.length &&
		timingSafeEqual(expectedBuffer, actualBuffer)
	);
}

// FastMCP/mcp-proxy turn a thrown `Response` into that HTTP response for both
// the /mcp stream handler and the /sse handler; a plain Error would become 500.
export function createTokenAuthenticator(token: string) {
	return async (request: IncomingMessage): Promise<HttpAuthSession> => {
		if (!tokensMatch(token, extractBearerToken(request.headers))) {
			// eslint-disable-next-line @typescript-eslint/only-throw-error
			throw new Response('Unauthorized', {
				status: 401,
				statusText: 'Unauthorized',
				headers: {'WWW-Authenticate': 'Bearer realm="listenhub-mcp-server"'},
			});
		}

		return {authenticated: true};
	};
}
