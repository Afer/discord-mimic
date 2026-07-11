import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream';
import { EndBehaviorType, VoiceReceiver } from '@discordjs/voice';
import type { User } from 'discord.js';
import * as prism from 'prism-media';
import { rootPath } from './interactions';

const fs = require('fs');

function getDisplayName(userId: string, user?: User) {
	return user ? user.username : userId;
}

export function createListeningStream(receiver: VoiceReceiver, userId: string, user?: User) {
	const opusStream = receiver.subscribe(userId, {
		end: {
			behavior: EndBehaviorType.AfterSilence,
			duration: 700,
		},
	});

	const oggStream = new prism.opus.OggLogicalBitstream({
		opusHead: new prism.opus.OpusHead({
			channelCount: 1,
			sampleRate: 48000,
		}),
		pageSizeControl: {
			maxPackets: 10,
		},
	});

	const directory = getDisplayName(userId, user).split('_')[0]?.split('.')[0];
	if (!fs.existsSync(rootPath + directory)) {
		fs.mkdirSync(rootPath + directory);
	}

	const filename = `${rootPath}${directory}/${Date.now()}-${getDisplayName(userId, user).split('.')[0]}.ogg`;

	const out = createWriteStream(filename);

	console.log(`👂 Started recording ${filename}`);

	pipeline(opusStream, oggStream, out, (err) => {
		try {
			if (err) {
				console.warn(`❌ Error recording file ${filename} - ${err.message}`);
			}
			else {
				const stats = fs.statSync(filename);
				if (stats.size > 8000) {
					console.log(`✅ Recorded ${filename}`);
				}
				else {
					console.log(`😒 Recording too small`);
					fs.unlinkSync(filename);

				}
			}
		}
		catch (e) {
			console.log('oops, failed to delete file');
		}
	});
}
