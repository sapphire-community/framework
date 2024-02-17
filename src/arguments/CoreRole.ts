import { container } from '@sapphire/pieces';
import type { Role } from 'discord.js';
import { Identifiers } from '../lib/errors/Identifiers';
import { resolveRole } from '../lib/resolvers/role';
import { Argument } from '../lib/structures/Argument';

export class CoreArgument extends Argument<Role> {
	public constructor(context: Argument.LoaderContext) {
		super(context, { name: 'role' });
	}

	public async run(parameter: string, context: Argument.Context): Argument.AsyncResult<Role> {
		const { guild } = context.messageOrInteraction;
		if (!guild) {
			return this.error({
				parameter,
				identifier: Identifiers.ArgumentRoleMissingGuild,
				message: 'This command can only be used in a server.',
				context
			});
		}

		const resolved = await resolveRole(parameter, guild);
		return resolved.mapErrInto((identifier) =>
			this.error({
				parameter,
				identifier,
				message: 'The given argument did not resolve to a role.',
				context: { ...context, guild }
			})
		);
	}
}

void container.stores.loadPiece({
	name: 'role',
	piece: CoreArgument,
	store: 'arguments'
});
