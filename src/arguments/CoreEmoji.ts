import { container } from '@sapphire/pieces';
import { ApplicationCommandOptionType, type CommandInteractionOption } from 'discord.js';
import { resolveEmoji, type EmojiObject } from '../lib/resolvers/emoji';
import { Argument } from '../lib/structures/Argument';

export class CoreArgument extends Argument<EmojiObject> {
	public constructor(context: Argument.LoaderContext) {
		super(context, { name: 'emoji', optionType: ApplicationCommandOptionType.String });
	}

	public run(parameter: string | CommandInteractionOption, context: Argument.Context): Argument.Result<EmojiObject> {
		if (typeof parameter !== 'string') parameter = parameter.value as string;
		const resolved = resolveEmoji(parameter);
		return resolved.mapErrInto((identifier) =>
			this.error({
				parameter,
				identifier,
				message: 'The argument did not resolve to an emoji.',
				context
			})
		);
	}
}

void container.stores.loadPiece({
	name: 'emoji',
	piece: CoreArgument,
	store: 'arguments'
});
