import { isDMChannel, type AnyInteraction } from '@sapphire/discord.js-utilities';
import { Result } from '@sapphire/result';
import type { DMChannel, Message } from 'discord.js';
import { Identifiers } from '../errors/Identifiers';
import { resolveChannel } from './channel';

export function resolveDMChannel(
	parameter: string,
	messageOrInteraction: Message | AnyInteraction
): Result<DMChannel, Identifiers.ArgumentChannelError | Identifiers.ArgumentDMChannelError> {
	const result = resolveChannel(parameter, messageOrInteraction);
	return result.mapInto((value) => {
		if (isDMChannel(value) && !value.partial) {
			return Result.ok(value);
		}

		return Result.err<Identifiers.ArgumentDMChannelError>(Identifiers.ArgumentDMChannelError);
	});
}
