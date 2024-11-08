import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import type { Guild } from 'discord.js';

export const deploy = async (guild: Guild) => {
	await guild.commands.set([
		{
			name: 'join',
			description: 'Joins the voice channel that you are in',
			options: [
				{
					name: 'mimicDelay',
					type: ApplicationCommandOptionType.Number,
					description: 'Time to wait before saying anything',
				},
				{
					name: 'mimicInterval',
					type: ApplicationCommandOptionType.Number,
					description: 'Time between saying things',
				},
				{
					name: 'mimicUser',
					type: ApplicationCommandOptionType.User,
					description: 'Only speak in the form of this user',
				},
			],
		},
		{
			name: 'leave',
			description: 'Leave the voice channel',
		}
	]);
};
