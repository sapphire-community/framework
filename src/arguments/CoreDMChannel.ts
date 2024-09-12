import { container } from '@sapphire/pieces';
import { ApplicationCommandOptionType, type CommandInteractionOption, type DMChannel } from 'discord.js';
import { resolveDMChannel } from '../lib/resolvers/dmChannel';
import { Argument } from '../lib/structures/Argument';

export class CoreArgument extends Argument<DMChannel> {
	public constructor(context: Argument.LoaderContext) {
		super(context, { name: 'dmChannel', optionType: ApplicationCommandOptionType.Channel });
	}

	public run(parameter: string | CommandInteractionOption, context: Argument.Context): Argument.Result<DMChannel> {
		if (typeof parameter !== 'string') parameter = parameter.channel!.id;
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
