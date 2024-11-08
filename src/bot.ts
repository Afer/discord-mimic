import { createAudioResource, getVoiceConnection, VoiceConnection } from '@discordjs/voice';
import { GatewayIntentBits } from 'discord-api-types/v10';
import { Interaction, Constants, Client } from 'discord.js';
import { deploy } from './deploy';
import { interactionHandlers, rootPath } from './interactions';
import * as fs from 'fs';

const { Events } = Constants;
const { token } = require('../config.json') as { token: string };

// Discord client
const client = new Client({
	intents: [GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.Guilds],
});

const test = false;

client.on(Events.CLIENT_READY, async () => {
	if (test) {
		const userDirs = fs.readdirSync(rootPath);
		const randoUserDirIndex = Math.floor(Math.random()*userDirs.length);
		const dirPath = userDirs[randoUserDirIndex] + '/';
		const soundFiles = fs.readdirSync(rootPath + dirPath);
		const randoSoundIndex = Math.floor(Math.random()*soundFiles.length);

		const randoFileName = soundFiles[randoSoundIndex];
		const resource = createAudioResource(rootPath + dirPath + randoFileName);

		console.log(rootPath + dirPath + randoFileName);
	}
});

client.on(Events.MESSAGE_CREATE, async (message) => {
	if (!message.guild) return;
	if (!client.application?.owner) await client.application?.fetch();

	if (message.content.toLowerCase() === '!deploy' && message.author.id === client.application?.owner?.id) {
		await deploy(message.guild);
		await message.reply('Deployed!');
	}
});

client.on(Events.INTERACTION_CREATE, async (interaction: Interaction) => {
	if (!interaction.isCommand() || !interaction.guildId) return;

	const handler = interactionHandlers.get(interaction.commandName);

	try {
		if (handler) {
			global.voiceConnectionId = interaction.guildId;
			await handler(interaction, client, getVoiceConnection(interaction.guildId));
		}
		else {
			await interaction.reply('Unknown command');
		}
	}
	catch (error) {
		console.warn(error);
	}
});

client.on(Events.ERROR, console.warn);

void client.login(token);
