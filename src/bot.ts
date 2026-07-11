import { createAudioResource, generateDependencyReport, getVoiceConnection, VoiceConnection } from '@discordjs/voice';
import { GatewayIntentBits } from 'discord-api-types/v10';
import { Client, Events, Interaction } from 'discord.js';
import { deploy } from './deploy';
import { interactionHandlers, rootPath } from './interactions';
import * as fs from 'fs';

const { token } = require('../config.json') as { token: string };

process.env.DEBUG = "discordjs:voice";

// Discord client
const client = new Client({
	intents: [GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
});

const test = false;

client.on(Events.ClientReady, async () => {
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
	
	//const guild = await client.guilds.fetch("YOUR_GUILD_ID");
    //await deploy(guild);
    //console.log("Slash commands deployed.");

	//console.log(generateDependencyReport());
});

client.on(Events.MessageCreate, async (message) => {
	if (!message.guild) return;
	if (!client.application?.owner) await client.application?.fetch();

	if (message.content.toLowerCase() === '!deploy' && message.member?.permissions.has("Administrator")) {
		console.log('here');
		await deploy(message.guild);
		await message.reply('Deployed!');
	}
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
	if (!interaction.isChatInputCommand() || !interaction.guildId) return;

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

client.on(Events.Error, console.warn);

void client.login(token);
