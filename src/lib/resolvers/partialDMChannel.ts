import { isDMChannel, type AnyInteraction } from '@sapphire/discord.js-utilities';
import { Result } from '@sapphire/result';
import type { DMChannel, Message, PartialDMChannel } from 'discord.js';
import { Identifiers } from '../errors/Identifiers';
import { resolveChannel } from './channel';

export function resolvePartialDMChannel(
	parameter: string,
	message: Message | AnyInteraction
): Result<DMChannel | PartialDMChannel, Identifiers.ArgumentChannelError | Identifiers.ArgumentDMChannelError> {
	const result = resolveChannel(parameter, message);
	return result.mapInto((channel) => {
		if (isDMChannel(channel)) {
			return Result.ok(channel);
		}

		return Result.err<Identifiers.ArgumentDMChannelError>(Identifiers.ArgumentDMChannelError);
	});
}
