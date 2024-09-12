import { container } from '@sapphire/pieces';
import { ApplicationCommandOptionType, type CommandInteractionOption } from 'discord.js';
import type { URL } from 'node:url';
import { resolveHyperlink } from '../lib/resolvers/hyperlink';
import { Argument } from '../lib/structures/Argument';

export class CoreArgument extends Argument<URL> {
	public constructor(context: Argument.LoaderContext) {
		super(context, { name: 'hyperlink', aliases: ['url'], optionType: ApplicationCommandOptionType.String });
	}

	public run(parameter: string | CommandInteractionOption, context: Argument.Context): Argument.Result<URL> {
		if (typeof parameter !== 'string') parameter = parameter.value as string;
		const resolved = resolveHyperlink(parameter);
		return resolved.mapErrInto((identifier) =>
			this.error({
				parameter,
				identifier,
				message: 'The argument did not resolve to a valid URL.',
				context
			})
		);
	}
}

void container.stores.loadPiece({
	name: 'hyperlink',
	piece: CoreArgument,
	store: 'arguments'
});
