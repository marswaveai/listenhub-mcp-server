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
import type {ListenHubClient} from '../client/index.js';

export function registerPrompts(server: FastMCP, client: ListenHubClient) {
	// Prompt: Guide for creating podcasts
	server.addPrompt({
		name: 'create_podcast_guide',
		description:
			'Step-by-step guide for creating podcasts with speaker name resolution',
		arguments: [
			{
				name: 'task',
				description:
					'Specific task: quick_start, speaker_selection, or troubleshooting',
				required: false,
			},
		],
		async load(args) {
			const task = args['task'] ?? 'quick_start';

			if (task === 'speaker_selection') {
				const speakers = await client.getCachedSpeakers();
				const speakerList = speakers
					.slice(0, 10)
					.map((s) => `- ${s.name} (${s.language}, ${s.gender})`)
					.join('\n');

				return `
## Speaker Selection Guide

You can use speaker names or IDs when creating podcasts. The system will automatically resolve names to IDs.

### Available Speakers (showing first 10):
${speakerList}

### IMPORTANT: Use the "name" field from get_speakers output

When creating podcasts, use the speaker's display name (the "name" field from get_speakers), not the speakerId.

### Usage Examples:

1. Using speaker names:
   speakers: ["David", "Lily (ASMR)"]

2. Using full speaker IDs (also supported):
   speakers: ["chinese-mandarin-male-anchor", "ASMR-Female-CN"]

### Tips:
- Always use the "name" field from get_speakers output
- Names are case-insensitive
- Partial name matching is supported
- Use get_speakers tool to see all available speakers
- Access listenhub://speakers resource for full speaker list
        `.trim();
			}

			if (task === 'troubleshooting') {
				return `
## Podcast Creation Troubleshooting

### Common Issues:

1. Speaker not found:
   - Use get_speakers tool to verify speaker availability
   - Check spelling of speaker names
   - Try using the full speaker ID instead

2. Language mismatch:
   - Ensure speakers match the podcast language
   - Use language parameter to filter speakers

3. Generation timeout:
   - Deep mode takes longer than quick mode
   - Check episode status with get_podcast_status
   - Generation can take 5-10 minutes for complex content

4. Invalid sources:
   - URLs must be accessible
   - Text sources should be well-formatted
   - Combine query + sources for best results
        `.trim();
			}

			// Default: quick_start
			return `
## Quick Start: Creating a Podcast

### Step 1: Choose Speakers
Use speaker names from get_speakers output - the "name" field, not the ID!

Example: If get_speakers returns:
- David (speakerId: chinese-mandarin-male-anchor)
- Lily (ASMR) (speakerId: ASMR-Female-CN)

### Step 2: Create Podcast
Use the create_podcast tool with speaker display names:

{
  "speakers": ["David", "Lily (ASMR)"],
  "query": "Explain artificial intelligence in simple terms",
  "language": "en",
  "mode": "debate"
}

The system will:
1. Automatically resolve speaker names to IDs
2. Generate podcast script
3. Generate audio
4. Return the complete episode

### Step 3: Check Status (Optional)
If generation takes time, use get_podcast_status with the episode ID.

### Available Modes:
- quick: Fast generation (3-5 minutes)
- deep: Detailed content (8-15 minutes)
- debate: Conversational discussion (5-10 minutes, requires 2 speakers)

### Pro Tips:
- ALWAYS use the "name" field from get_speakers, not the speakerId
- Use 1-2 speakers for best results
- Provide clear, specific topics in query
- Add sources (URLs or text) for richer content
- Check listenhub://speakers resource for all available speakers
      `.trim();
		},
	});
}
