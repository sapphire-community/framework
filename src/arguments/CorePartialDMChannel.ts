import { container } from '@sapphire/pieces';
import { ApplicationCommandOptionType, type CommandInteractionOption, type DMChannel, type PartialDMChannel } from 'discord.js';
import { resolvePartialDMChannel } from '../lib/resolvers/partialDMChannel';
import { Argument } from '../lib/structures/Argument';

export class CoreArgument extends Argument<DMChannel | PartialDMChannel> {
	public constructor(context: Argument.LoaderContext) {
		super(context, { name: 'partialDMChannel', optionType: ApplicationCommandOptionType.Channel });
	}

	public run(parameter: string | CommandInteractionOption, context: Argument.Context): Argument.Result<DMChannel | PartialDMChannel> {
		if (typeof parameter !== 'string') parameter = parameter.channel!.id;
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
