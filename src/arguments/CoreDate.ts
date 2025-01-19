import { container } from '@sapphire/pieces';
import { ApplicationCommandOptionType, type CommandInteractionOption } from 'discord.js';
import { Identifiers } from '../lib/errors/Identifiers';
import { resolveDate } from '../lib/resolvers/date';
import { Argument } from '../lib/structures/Argument';

export class CoreArgument extends Argument<Date> {
	private readonly messages = {
		[Identifiers.ArgumentDateTooEarly]: ({ minimum }: Argument.Context) => `The given date must be after ${new Date(minimum!).toISOString()}.`,
		[Identifiers.ArgumentDateTooFar]: ({ maximum }: Argument.Context) => `The given date must be before ${new Date(maximum!).toISOString()}.`,
		[Identifiers.ArgumentDateError]: () => 'The argument did not resolve to a date.'
	} as const;

	public constructor(context: Argument.LoaderContext) {
		super(context, { name: 'date', optionType: ApplicationCommandOptionType.String });
	}

	public run(parameter: string | CommandInteractionOption, context: Argument.Context): Argument.Result<Date> {
		if (typeof parameter !== 'string') parameter = parameter.value as string;
		const resolved = resolveDate(parameter, { minimum: context.minimum, maximum: context.maximum });
		return resolved.mapErrInto((identifier) =>
			this.error({
				parameter,
				identifier,
				message: this.messages[identifier](context),
				context
			})
		);
	}
}

void container.stores.loadPiece({
	name: 'date',
	piece: CoreArgument,
	store: 'arguments'
});
