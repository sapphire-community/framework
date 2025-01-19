import { container } from '@sapphire/pieces';
import { ApplicationCommandOptionType, type CommandInteractionOption, type VoiceChannel } from 'discord.js';
import { Identifiers } from '../lib/errors/Identifiers';
import { resolveGuildVoiceChannel } from '../lib/resolvers/guildVoiceChannel';
import { Argument } from '../lib/structures/Argument';

export class CoreArgument extends Argument<VoiceChannel> {
	public constructor(context: Argument.LoaderContext) {
		super(context, { name: 'guildVoiceChannel', optionType: ApplicationCommandOptionType.Channel });
	}

	public run(parameter: string | CommandInteractionOption, context: Argument.Context): Argument.Result<VoiceChannel> {
		if (typeof parameter !== 'string') parameter = parameter.channel!.id;
		const { guild } = context.messageOrInteraction;
		if (!guild) {
			return this.error({
				parameter,
				identifier: Identifiers.ArgumentGuildChannelMissingGuildError,
				message: 'This command can only be used in a server.',
				context
			});
		}

		const resolved = resolveGuildVoiceChannel(parameter, guild);
		return resolved.mapErrInto((identifier) =>
			this.error({
				parameter,
				identifier,
				message: 'The given argument did not resolve to a valid voice channel.',
				context: { ...context, guild }
			})
		);
	}
}

void container.stores.loadPiece({
	name: 'guildVoiceChannel',
	piece: CoreArgument,
	store: 'arguments'
});
