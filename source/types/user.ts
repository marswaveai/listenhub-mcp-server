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

export type UserSubscriptionPlan = {
	name: 'pro' | 'business' | 'creator';
	duration: 'monthly' | 'annual' | 'one-time';
	platform: 'ios' | 'android' | 'web';
};

export type UserSubscriptionInfo = {
	subscriptionStartedAt: number;
	subscriptionExpiresAt: number;
	usageAvailableMonthlyCredits: number;
	usageTotalMonthlyCredits: number;
	usageAvailablePermanentCredits: number;
	usageTotalPermanentCredits: number;
	usageAvailableLimitedTimeCredits: number;
	totalAvailableCredits: number;
	resetAt: number;
	platform: string;
	renewStatus: boolean;
	paidStatus: boolean;
	subscriptionPlan: UserSubscriptionPlan;
};
