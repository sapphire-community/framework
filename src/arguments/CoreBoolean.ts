import { container } from '@sapphire/pieces';
import { resolveBoolean } from '../lib/resolvers/boolean';
import { Argument } from '../lib/structures/Argument';
import type { BooleanArgumentContext } from '../lib/types/ArgumentContexts';
import { ApplicationCommandOptionType, type CommandInteractionOption } from 'discord.js';

export class CoreArgument extends Argument<boolean> {
	public constructor(context: Argument.LoaderContext) {
		super(context, { name: 'boolean', optionType: ApplicationCommandOptionType.Boolean });
	}

	public run(parameter: string | CommandInteractionOption, context: BooleanArgumentContext): Argument.Result<boolean> {
		if (typeof parameter !== 'string') return this.ok(parameter.value as boolean);
		const resolved = resolveBoolean(parameter, { truths: context.truths, falses: context.falses });
		return resolved.mapErrInto((identifier) =>
			this.error({
				parameter,
				identifier,
				message: 'The argument did not resolve to a boolean.',
				context
			})
		);
	}
}

void container.stores.loadPiece({
	name: 'boolean',
	piece: CoreArgument,
	store: 'arguments'
});
