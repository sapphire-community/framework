import { container } from '@sapphire/pieces';
import type { ThreadChannel } from 'discord.js';
import { Identifiers } from '../lib/errors/Identifiers';
import { resolveGuildNewsThreadChannel } from '../lib/resolvers/guildNewsThreadChannel';
import { Argument } from '../lib/structures/Argument';

export class CoreArgument extends Argument<ThreadChannel> {
	public constructor(context: Argument.LoaderContext) {
		super(context, { name: 'guildNewsThreadChannel' });
	}

	public run(parameter: string, context: Argument.Context): Argument.Result<ThreadChannel> {
		const { guild } = context.messageOrInteraction;
		if (!guild) {
			return this.error({
				parameter,
				identifier: Identifiers.ArgumentGuildChannelMissingGuildError,
				message: 'This command can only be used in a server.',
				context
			});
		}

		const resolved = resolveGuildNewsThreadChannel(parameter, guild);
		return resolved.mapErrInto((identifier) =>
			this.error({
				parameter,
				identifier,
				message: 'The given argument did not resolve to a valid announcements thread.',
				context: { ...context, guild }
			})
		);
	}
}

void container.stores.loadPiece({
	name: 'guildNewsThreadChannel',
	piece: CoreArgument,
	store: 'arguments'
});
