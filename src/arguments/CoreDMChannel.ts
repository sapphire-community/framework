import { container } from '@sapphire/pieces';
import type { DMChannel } from 'discord.js';
import { resolveDMChannel } from '../lib/resolvers/dmChannel';
import { Argument } from '../lib/structures/Argument';

export class CoreArgument extends Argument<DMChannel> {
	public constructor(context: Argument.LoaderContext) {
		super(context, { name: 'dmChannel' });
	}

	public run(parameter: string, context: Argument.Context): Argument.Result<DMChannel> {
		const resolved = resolveDMChannel(parameter, context.messageOrInteraction);
		return resolved.mapErrInto((identifier) =>
			this.error({
				parameter,
				identifier,
				message: 'The argument did not resolve to a DM channel.',
				context
			})
		);
	}
}

void container.stores.loadPiece({
	name: 'dmChannel',
	piece: CoreArgument,
	store: 'arguments'
});
