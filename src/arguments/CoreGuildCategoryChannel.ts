import { container } from '@sapphire/pieces';
import { ApplicationCommandOptionType, type CategoryChannel, type CommandInteractionOption } from 'discord.js';
import { Identifiers } from '../lib/errors/Identifiers';
import { resolveGuildCategoryChannel } from '../lib/resolvers/guildCategoryChannel';
import { Argument } from '../lib/structures/Argument';

export class CoreArgument extends Argument<CategoryChannel> {
	public constructor(context: Argument.LoaderContext) {
		super(context, { name: 'guildCategoryChannel', optionType: ApplicationCommandOptionType.Channel });
	}

	public run(parameter: string | CommandInteractionOption, context: Argument.Context): Argument.Result<CategoryChannel> {
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

		const resolved = resolveGuildCategoryChannel(parameter, guild);
		return resolved.mapErrInto((identifier) =>
			this.error({
				parameter,
				identifier,
				message: 'The argument did not resolve to a valid server category channel.',
				context: { ...context, guild }
			})
		);
	}
}

void container.stores.loadPiece({
	name: 'guildCategoryChannel',
	piece: CoreArgument,
	store: 'arguments'
});
