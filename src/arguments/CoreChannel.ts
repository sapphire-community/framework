import type { ChannelTypes } from '@sapphire/discord.js-utilities';
import { container } from '@sapphire/pieces';
import { resolveChannel } from '../lib/resolvers/channel';
import { Argument } from '../lib/structures/Argument';

export class CoreArgument extends Argument<ChannelTypes> {
	public constructor(context: Argument.LoaderContext) {
		super(context, { name: 'channel' });
	}

	public run(parameter: string, context: Argument.Context): Argument.Result<ChannelTypes> {
		const resolved = resolveChannel(parameter, context.messageOrInteraction);
		return resolved.mapErrInto((identifier) =>
			this.error({
				parameter,
				identifier,
				message: 'The argument did not resolve to a channel.',
				context
			})
		);
	}
}

void container.stores.loadPiece({
	name: 'channel',
	piece: CoreArgument,
	store: 'arguments'
});
