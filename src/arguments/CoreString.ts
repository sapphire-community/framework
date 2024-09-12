import { container } from '@sapphire/pieces';
import { ApplicationCommandOptionType, type CommandInteractionOption } from 'discord.js';
import { Identifiers } from '../lib/errors/Identifiers';
import { resolveString } from '../lib/resolvers/string';
import { Argument } from '../lib/structures/Argument';

export class CoreArgument extends Argument<string> {
	private readonly messages = {
		[Identifiers.ArgumentStringTooShort]: ({ minimum }: Argument.Context) => `The argument must be longer than ${minimum} characters.`,
		[Identifiers.ArgumentStringTooLong]: ({ maximum }: Argument.Context) => `The argument must be shorter than ${maximum} characters.`
	} as const;

	public constructor(context: Argument.LoaderContext) {
		super(context, { name: 'string', optionType: ApplicationCommandOptionType.String });
	}

	public run(parameter: string | CommandInteractionOption, context: Argument.Context): Argument.Result<string> {
		if (typeof parameter !== 'string') return this.ok(parameter.value as string);
		const resolved = resolveString(parameter, { minimum: context?.minimum, maximum: context?.maximum });
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
	name: 'string',
	piece: CoreArgument,
	store: 'arguments'
});
