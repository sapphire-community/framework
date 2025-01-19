import { container } from '@sapphire/pieces';
import { ApplicationCommandOptionType, type CommandInteractionOption, type Message } from 'discord.js';
import { resolveMessage } from '../lib/resolvers/message';
import { Argument } from '../lib/structures/Argument';
import type { MessageArgumentContext } from '../lib/types/ArgumentContexts';

export class CoreArgument extends Argument<Message> {
	public constructor(context: Argument.LoaderContext) {
		super(context, { name: 'message', optionType: ApplicationCommandOptionType.String });
	}

	public async run(parameter: string | CommandInteractionOption, context: MessageArgumentContext): Argument.AsyncResult<Message> {
		if (typeof parameter !== 'string') parameter = parameter.value as string;
		const channel = context.channel ?? context.messageOrInteraction.channel;
		const resolved = await resolveMessage(parameter, {
			messageOrInteraction: context.messageOrInteraction,
			channel: context.channel,
			scan: context.scan ?? false
		});

		return resolved.mapErrInto((identifier) =>
			this.error({
				parameter,
				identifier,
				message: 'The given argument did not resolve to a message.',
				context: { ...context, channel }
			})
		);
	}
}

void container.stores.loadPiece({
	name: 'message',
	piece: CoreArgument,
	store: 'arguments'
});
