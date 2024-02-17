import { container } from '@sapphire/pieces';
import type { ThreadChannel } from 'discord.js';
import { Identifiers } from '../lib/errors/Identifiers';
import { resolveGuildPublicThreadChannel } from '../lib/resolvers/guildPublicThreadChannel';
import { Argument } from '../lib/structures/Argument';

export class CoreArgument extends Argument<ThreadChannel> {
	public constructor(context: Argument.LoaderContext) {
		super(context, { name: 'guildPublicThreadChannel' });
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

		const resolved = resolveGuildPublicThreadChannel(parameter, guild);
		return resolved.mapErrInto((identifier) =>
			this.error({
				parameter,
				identifier,
				message: 'The given argument did not resolve to a valid public thread.',
				context: { ...context, guild }
			})
		);
	}
}

void container.stores.loadPiece({
	name: 'guildPublicThreadChannel',
	piece: CoreArgument,
	store: 'arguments'
});
