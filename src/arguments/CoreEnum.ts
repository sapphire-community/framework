import { container } from '@sapphire/pieces';
import { ApplicationCommandOptionType, type CommandInteractionOption } from 'discord.js';
import { resolveEnum } from '../lib/resolvers/enum';
import { Argument } from '../lib/structures/Argument';
import type { EnumArgumentContext } from '../lib/types/ArgumentContexts';

export class CoreArgument extends Argument<string> {
	public constructor(context: Argument.LoaderContext) {
		super(context, { name: 'enum', optionType: ApplicationCommandOptionType.String });
	}

	public run(parameter: string | CommandInteractionOption, context: EnumArgumentContext): Argument.Result<string> {
		if (typeof parameter !== 'string') parameter = parameter.value as string;
		const resolved = resolveEnum(parameter, { enum: context.enum, caseInsensitive: context.caseInsensitive });
		return resolved.mapErrInto((identifier) =>
			this.error({
				parameter,
				identifier,
				message: `The argument must have one of the following values: ${context.enum?.join(', ')}`,
				context
			})
		);
	}
}

void container.stores.loadPiece({
	name: 'enum',
	piece: CoreArgument,
	store: 'arguments'
});
