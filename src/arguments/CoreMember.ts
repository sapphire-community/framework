import { container } from '@sapphire/pieces';
import { ApplicationCommandOptionType, type CommandInteractionOption, type GuildMember } from 'discord.js';
import { Identifiers } from '../lib/errors/Identifiers';
import { resolveMember } from '../lib/resolvers/member';
import { Argument } from '../lib/structures/Argument';
import type { MemberArgumentContext } from '../lib/types/ArgumentContexts';

export class CoreArgument extends Argument<GuildMember> {
	public constructor(context: Argument.LoaderContext) {
		super(context, { name: 'member', optionType: ApplicationCommandOptionType.User });
	}

	public async run(parameter: string | CommandInteractionOption, context: MemberArgumentContext): Argument.AsyncResult<GuildMember> {
		if (typeof parameter !== 'string') parameter = parameter.user!.id;
		const { guild } = context.messageOrInteraction;

		if (!guild) {
			return this.error({
				parameter,
				identifier: Identifiers.ArgumentMemberMissingGuild,
				message: 'This command can only be used in a server.',
				context
			});
		}

		const resolved = await resolveMember(parameter, guild, context.performFuzzySearch ?? true);
		return resolved.mapErrInto((identifier) =>
			this.error({
				parameter,
				identifier,
				message: 'The given argument did not resolve to a server member.',
				context: { ...context, guild }
			})
		);
	}
}

void container.stores.loadPiece({
	name: 'member',
	piece: CoreArgument,
	store: 'arguments'
});
