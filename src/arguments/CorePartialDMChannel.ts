import { container } from '@sapphire/pieces';
import type { DMChannel, PartialDMChannel } from 'discord.js';
import { resolvePartialDMChannel } from '../lib/resolvers/partialDMChannel';
import { Argument } from '../lib/structures/Argument';

export class CoreArgument extends Argument<DMChannel | PartialDMChannel> {
	public constructor(context: Argument.LoaderContext) {
		super(context, { name: 'partialDMChannel' });
	}

	public run(parameter: string, context: Argument.Context): Argument.Result<DMChannel | PartialDMChannel> {
		const resolved = resolvePartialDMChannel(parameter, context.messageOrInteraction);
		return resolved.mapErrInto((identifier) =>
			this.error({
				parameter,
				identifier,
				message: 'The argument did not resolve to a Partial DM channel.',
				context
			})
		);
	}
}

void container.stores.loadPiece({
	name: 'partialDMChannel',
	piece: CoreArgument,
	store: 'arguments'
});
