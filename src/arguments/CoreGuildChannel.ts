import type { GuildBasedChannelTypes } from '@sapphire/discord.js-utilities';
import { container } from '@sapphire/pieces';
import { ApplicationCommandOptionType, type CommandInteractionOption } from 'discord.js';
import { Identifiers } from '../lib/errors/Identifiers';
import { resolveGuildChannel } from '../lib/resolvers/guildChannel';
import { Argument } from '../lib/structures/Argument';

export class CoreArgument extends Argument<GuildBasedChannelTypes> {
	public constructor(context: Argument.LoaderContext) {
		super(context, { name: 'guildChannel', optionType: ApplicationCommandOptionType.Channel });
	}

	public run(parameter: string | CommandInteractionOption, context: Argument.Context): Argument.Result<GuildBasedChannelTypes> {
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

		const resolved = resolveGuildChannel(parameter, guild);
		return resolved.mapErrInto((identifier) =>
			this.error({
				parameter,
				identifier,
				message: 'The argument did not resolve to a valid server channel.',
				context: { ...context, guild }
			})
		);
	}
}

void container.stores.loadPiece({
	name: 'guildChannel',
	piece: CoreArgument,
	store: 'arguments'
});
