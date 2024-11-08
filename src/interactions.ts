import { createAudioResource, entersState, getVoiceConnection, joinVoiceChannel, VoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';
import { Client, CommandInteraction, GuildMember, Snowflake } from 'discord.js';
import { createListeningStream } from './createListeningStream';
import * as fs from 'fs';

export const defaultMimicDelay = 100;
export const defaultMimicIntervalObj = {min: 30, max: 60};
export const rootPath = './recordings/';

const cleanupOldRecordings = function() {
	const userDirs = fs.readdirSync(rootPath);

	userDirs.forEach((dir) => {
		const dirPath = rootPath + dir + '/';

		fs.rmSync(dirPath, {recursive: true});
	});
}

function initializeMimic(interaction: CommandInteraction, connection: VoiceConnection) {
	const { createAudioPlayer } = require('@discordjs/voice');
	const player = createAudioPlayer();
	
	let mimicDelay = interaction.options.get('mimicDelay')?.value as number;
	let mimicIntervalVal = interaction.options.get('mimicInterval')?.value as number;
	let mimicUser = interaction.options.get('mimicUser')?.value;

	mimicDelay = mimicDelay ? mimicDelay : defaultMimicDelay;
	let mimicInterval = mimicIntervalVal ? {min: mimicIntervalVal-20, max: mimicIntervalVal+20} : defaultMimicIntervalObj;
	let intervalMimicSeconds = Math.floor(Math.random() * mimicInterval.min + (mimicInterval.max-mimicInterval.min));
			
	if (connection) {
		connection.subscribe(player);
	}
	else {
		console.log('Init Mimic - no connection found for player');
	}

	setTimeout(() => {
		setInterval(() => {
			if (connection) {
				const userDirs = fs.readdirSync(rootPath);
				let randoFileName = 'undefined';
				let dirPath = null;

				const randoUserDirIndex = Math.floor(Math.random()*userDirs.length);
				dirPath = rootPath + userDirs[randoUserDirIndex] + '/';
				const soundFiles = fs.readdirSync(dirPath);
				const randoSoundIndex = Math.floor(Math.random()*soundFiles.length);

				randoFileName = soundFiles[randoSoundIndex];

				const resource = createAudioResource(dirPath + randoFileName);
				console.log('Playing: ' + dirPath + randoFileName);
				player.play(resource);
			}
			else {
				console.log('Play Sound - no connection found');
			}
	
		}, intervalMimicSeconds * 1000);
	}, mimicDelay * 1000);
}

async function join(
	interaction: CommandInteraction,
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
				selfDeaf: false,
				selfMute: true,
				// @ts-expect-error Currently voice is built in mind with API v10 whereas discord.js v13 uses API v9.
				adapterCreator: channel.guild.voiceAdapterCreator,
			});
			connection.on('stateChange', (oldState, newState) => {
				const oldNetworking = Reflect.get(oldState, 'networking');
				const newNetworking = Reflect.get(newState, 'networking');
			  
				const networkStateChangeHandler = (oldNetworkState: any, newNetworkState: any) => {
				  const newUdp = Reflect.get(newNetworkState, 'udp');
				  clearInterval(newUdp?.keepAliveInterval);
				}
			  
				oldNetworking?.off('stateChange', networkStateChangeHandler);
				newNetworking?.on('stateChange', networkStateChangeHandler);
			  });
		} else {
			await interaction.followUp('Join a voice channel and then try that again!');
			return;
		}
	}

	try {
		await entersState(connection, VoiceConnectionStatus.Ready, 20e3);
		const receiver = connection.receiver;

		initializeMimic(interaction, connection);

		receiver.speaking.on('start', (userId) => {
			// A dash of randomness so we don't record absolutely everything
			if (Math.random()*2 <= 1) {
				return;
			}
			
			console.log('started speaking', +userId-308423748980310000);
			createListeningStream(receiver, userId, client.users.cache.get(userId));
		});

		//receiver.speaking.on('end', (userId) => {
		//	console.log('Done Speaking', +userId-308423748980310000);
		//});
	} catch (error) {
		console.warn(error);
		await interaction.followUp('Failed to join voice channel within 20 seconds, please try again later!');
	}

	//await interaction.followUp('Ready!');
}

async function leave(
	interaction: CommandInteraction,
	_client: Client,
	connection?: VoiceConnection,
) {
	if (connection) {
		connection.destroy();
		await interaction.reply({ ephemeral: true, content: 'Left the channel!' });
	} else {
		await interaction.reply({ ephemeral: true, content: 'Not playing in this server!' });
	}
}

export const interactionHandlers = new Map<
	string,
	(
		interaction: CommandInteraction,
		client: Client,
		connection?: VoiceConnection,
	) => Promise<void>
>();
interactionHandlers.set('join', join);
interactionHandlers.set('leave', leave);
