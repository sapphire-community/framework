import { container } from '@sapphire/pieces';
import { ApplicationCommandOptionType, type CommandInteractionOption, type User } from 'discord.js';
import { resolveUser } from '../lib/resolvers/user';
import { Argument } from '../lib/structures/Argument';

export class CoreArgument extends Argument<User> {
	public constructor(context: Argument.LoaderContext) {
		super(context, { name: 'user', optionType: ApplicationCommandOptionType.User });
	}

	public async run(parameter: string | CommandInteractionOption, context: Argument.Context): Argument.AsyncResult<User> {
		if (typeof parameter !== 'string') return this.ok(parameter.user!);
		const resolved = await resolveUser(parameter);
		return resolved.mapErrInto((identifier) =>
			this.error({
				parameter,
				identifier,
				message: 'The given argument did not resolve to a Discord user.',
				context
			})
		);
	}
}

void container.stores.loadPiece({
	name: 'user',
	piece: CoreArgument,
	store: 'arguments'
});
