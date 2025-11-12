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

import type {FastMCP} from 'fastmcp';
import {z} from 'zod';
import type {ListenHubClient} from '../client/index.js';
import {formatError, formatTimestamp} from './utils.js';

export function registerUserTools(server: FastMCP, client: ListenHubClient) {
	server.addTool({
		name: 'get_user_subscription',
		description:
			'Get current user subscription information, including subscription status, credit usage, plan details, and renewal status.',
		parameters: z.object({}),
		annotations: {
			title: 'Get User Subscription',
			openWorldHint: true,
			readOnlyHint: true,
		},
		async execute(_args, {log}: {log: any}) {
			try {
				log.info('Querying user subscription information');

				const response = await client.user.getUserSubscription();

				if (response.code !== 0) {
					return `Failed to query subscription: ${response.message ?? 'Unknown error'}`;
				}

				if (!response.data) {
					return 'No subscription data available';
				}

				const sub = response.data;

				const parts = [
					'=== Subscription Information ===',
					'',
					'** Subscription Period **',
					`Started: ${formatTimestamp(sub.subscriptionStartedAt)}`,
					`Expires: ${formatTimestamp(sub.subscriptionExpiresAt)}`,
					`Reset Date: ${formatTimestamp(sub.resetAt)}`,
					'',
					'** Credit Usage **',
					`Monthly Credits: ${sub.usageAvailableMonthlyCredits} / ${sub.usageTotalMonthlyCredits} available`,
					`Permanent Credits: ${sub.usageAvailablePermanentCredits} / ${sub.usageTotalPermanentCredits} available`,
					`Limited-Time Credits: ${sub.usageAvailableLimitedTimeCredits}`,
					`Total Available Credits: ${sub.totalAvailableCredits}`,
					'',
					'** Subscription Plan **',
					`Plan: ${sub.subscriptionPlan.name.toUpperCase()}`,
					`Duration: ${sub.subscriptionPlan.duration}`,
					`Platform: ${sub.subscriptionPlan.platform}`,
					'',
					'** Status **',
					`Auto-Renew: ${sub.renewStatus ? 'Enabled' : 'Disabled'}`,
					`Paid Status: ${sub.paidStatus ? 'Active' : 'Inactive'}`,
				];

				log.info('User subscription retrieved', {
					plan: sub.subscriptionPlan.name,
					totalCredits: sub.totalAvailableCredits,
				});

				return parts.join('\n');
			} catch (error) {
				const errorMessage = formatError(error);
				log.error('Failed to query user subscription', {error: errorMessage});
				return `Failed to query user subscription: ${errorMessage}`;
			}
		},
	});
}
