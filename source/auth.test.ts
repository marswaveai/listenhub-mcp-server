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

import assert from 'node:assert/strict';
import type {IncomingMessage} from 'node:http';
import test from 'node:test';
import {
	createTokenAuthenticator,
	extractBearerToken,
	tokensMatch,
} from './auth.js';

const request = (headers: IncomingMessage['headers']): IncomingMessage => {
	const message: Partial<IncomingMessage> = {headers};
	return message as IncomingMessage;
};

await test('extractBearerToken reads Authorization: Bearer', () => {
	assert.equal(
		extractBearerToken({authorization: 'Bearer secret-token'}),
		'secret-token',
	);
	assert.equal(
		extractBearerToken({authorization: 'bearer   secret-token'}),
		'secret-token',
	);
	assert.equal(
		extractBearerToken({authorization: 'Bearer with  inner spaces'}),
		'with  inner spaces',
	);
	assert.equal(extractBearerToken({authorization: 'Bearer '}), undefined);
});

await test('extractBearerToken falls back to x-api-key', () => {
	assert.equal(
		extractBearerToken({'x-api-key': 'secret-token'}),
		'secret-token',
	);
	assert.equal(extractBearerToken({authorization: 'Basic abc'}), undefined);
	assert.equal(extractBearerToken({}), undefined);
});

await test('tokensMatch rejects empty, different-length and different tokens', () => {
	assert.equal(tokensMatch('secret', undefined), false);
	assert.equal(tokensMatch('secret', ''), false);
	assert.equal(tokensMatch('secret', 'secret1'), false);
	assert.equal(tokensMatch('secret', 'secreT'), false);
	assert.equal(tokensMatch('secret', 'secret'), true);
});

await test('authenticator throws a 401 Response without a valid token', async () => {
	const authenticate = createTokenAuthenticator('secret');

	await assert.rejects(authenticate(request({})), (error: unknown) => {
		assert.ok(error instanceof Response);
		assert.equal(error.status, 401);
		assert.equal(
			error.headers.get('www-authenticate')?.startsWith('Bearer'),
			true,
		);
		return true;
	});
	await assert.rejects(
		authenticate(request({authorization: 'Bearer wrong'})),
		(error: unknown) => error instanceof Response && error.status === 401,
	);
});

await test('authenticator returns a session for a valid token', async () => {
	const authenticate = createTokenAuthenticator('secret');
	assert.deepEqual(
		await authenticate(request({authorization: 'Bearer secret'})),
		{authenticated: true},
	);
	assert.deepEqual(await authenticate(request({'x-api-key': 'secret'})), {
		authenticated: true,
	});
});
