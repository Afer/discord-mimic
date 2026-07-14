import { createAudioPlayer, createAudioResource, entersState, getVoiceConnection, joinVoiceChannel, VoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';
import { ChatInputCommandInteraction, Client, GuildMember, MessageFlags } from 'discord.js';
import { createListeningStream } from './createListeningStream';
import * as fs from 'fs';

export const defaultMimicDelay = 100;
export const defaultMimicIntervalObj = {min: 20, max: 40};
export const rootPath = './recordings/';

const cleanupOldRecordings = function() {
	const userDirs = fs.readdirSync(rootPath);

	userDirs.forEach((dir) => {
		const dirPath = rootPath + dir + '/';

		fs.rmSync(dirPath, {recursive: true});
	});
}

function initializeMimic(interaction: ChatInputCommandInteraction, connection: VoiceConnection) {
	const player = createAudioPlayer();
	
	let mimicDelay = interaction.options.get('mimicdelay')?.value as number;
	let mimicIntervalVal = interaction.options.get('mimicinterval')?.value as number;
	let mimicUser = interaction.options.get('mimicuser')?.value;

	mimicDelay = mimicDelay ? mimicDelay : defaultMimicDelay;
	const mimicInterval = mimicIntervalVal ? {min: mimicIntervalVal-20, max: mimicIntervalVal+20} : defaultMimicIntervalObj;

	const getNextIntervalSeconds = () => Math.floor(Math.random() * mimicInterval.min + (mimicInterval.max-mimicInterval.min));

	if (connection) {
		connection.subscribe(player);
	}
	else {
		console.log('Init Mimic - no connection found for player');
	}

	const scheduleNextMimic = () => {
		const nextInterval = getNextIntervalSeconds();
		console.log(`Next mimicInterval scheduled for: ${nextInterval} seconds`);
		setTimeout(() => {
			if (connection) {
				const userDirs = fs.readdirSync(rootPath);
				let randoFileName = '';
				let dirPath = null;

				const randoUserDirIndex = Math.floor(Math.random()*userDirs.length);
				dirPath = rootPath + userDirs[randoUserDirIndex] + '/';
				const soundFiles = fs.readdirSync(dirPath);
				const randoSoundIndex = Math.floor(Math.random()*soundFiles.length);

				if (soundFiles[randoSoundIndex]) {
					randoFileName = soundFiles[randoSoundIndex];
					const resource = createAudioResource(dirPath + randoFileName);
					console.log('Playing: ' + dirPath + randoFileName);
					player.play(resource);
				}
			}
			else {
				console.log('Play Sound - no connection found');
			}

			scheduleNextMimic();
		}, nextInterval * 1000);
	};

	console.log(`Starting mimic playback with ${mimicDelay}s initial delay`);
	setTimeout(scheduleNextMimic, mimicDelay * 1000);
}

async function join(
	interaction: ChatInputCommandInteraction,
	client: Client,
	connection?: VoiceConnection,
) {

	cleanupOldRecordings();
	await interaction.deferReply();
	if (!connection) {
		if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
			const channel = interaction.member.voice.channel;
			connection = joinVoiceChannel({
				channelId: channel.id,
				guildId: channel.guild.id,
				adapterCreator: channel.guild.voiceAdapterCreator,
				selfDeaf: false,
				selfMute: true,
			});
		} else {
			await interaction.followUp('Join a voice channel and then try that again!');
			return;
		}
	}

	try {
		await entersState(connection, VoiceConnectionStatus.Ready, 30e3);
		const receiver = connection.receiver;

		initializeMimic(interaction, connection);

		receiver.speaking.on('start', (userId) => {
			// A dash of randomness so we don't record absolutely everything
			if (Math.random()*2 <= 1) {
				return;
			}
			
			console.log('started speaking', userId);
			createListeningStream(receiver, userId, client.users.cache.get(userId));
		});

		await interaction.followUp('Ready!');
	} catch (error) {
		console.warn(error);
		connection.destroy();
		await interaction.followUp('Failed to join voice channel within 30 seconds, please try again later!');
	}
}

async function leave(
	interaction: ChatInputCommandInteraction,
	_client: Client,
	connection?: VoiceConnection,
) {
	if (connection) {
		connection.destroy();
		await interaction.reply({ flags: MessageFlags.Ephemeral, content: 'Left the channel!' });
	} else {
		await interaction.reply({ flags: MessageFlags.Ephemeral, content: 'Not playing in this server!' });
	}
}

export const interactionHandlers = new Map<
	string,
	(
		interaction: ChatInputCommandInteraction,
		client: Client,
		connection?: VoiceConnection,
	) => Promise<void>
>();
interactionHandlers.set('join', join);
interactionHandlers.set('leave', leave);
