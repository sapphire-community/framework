import { container } from '@sapphire/pieces';
import type { StageChannel } from 'discord.js';
import { Identifiers } from '../lib/errors/Identifiers';
import { resolveGuildStageVoiceChannel } from '../lib/resolvers/guildStageVoiceChannel';
import { Argument } from '../lib/structures/Argument';

export class CoreArgument extends Argument<StageChannel> {
	public constructor(context: Argument.LoaderContext) {
		super(context, { name: 'guildStageVoiceChannel' });
	}

	public run(parameter: string, context: Argument.Context): Argument.Result<StageChannel> {
		const { guild } = context.messageOrInteraction;
		if (!guild) {
			return this.error({
				parameter,
				identifier: Identifiers.ArgumentGuildChannelMissingGuildError,
				message: 'This command can only be used in a server.',
				context
			});
		}

		const resolved = resolveGuildStageVoiceChannel(parameter, guild);
		return resolved.mapErrInto((identifier) =>
			this.error({
				parameter,
				identifier,
				message: 'The given argument did not resolve to a valid stage voice channel.',
				context: { ...context, guild }
			})
		);
	}
}

void container.stores.loadPiece({
	name: 'guildStageVoiceChannel',
	piece: CoreArgument,
	store: 'arguments'
});
