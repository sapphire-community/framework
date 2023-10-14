import type { ChannelType, ChatInputCommandInteraction, ContextMenuCommandInteraction, Message } from 'discord.js';
import { Identifiers } from '../lib/errors/Identifiers';
import type { ChatInputCommand, ContextMenuCommand, MessageCommand } from '../lib/structures/Command';
import { AllFlowsPrecondition, type Preconditions, type RunInPreconditionCommandSpecificData } from '../lib/structures/Precondition';

export interface RunInPreconditionContext extends AllFlowsPrecondition.Context {
	types?: Preconditions['RunIn']['types'];
}

export class CorePrecondition extends AllFlowsPrecondition {
	public override messageRun(message: Message<boolean>, _: MessageCommand, context: RunInPreconditionContext): AllFlowsPrecondition.Result {
		if (!context.types) return this.ok();

		const channelType = message.channel.type;

		if (typesIsArray(context.types)) {
			return context.types.includes(channelType) ? this.ok() : this.makeSharedError(context);
		}

		return context.types.messageRun.includes(channelType) ? this.ok() : this.makeSharedError(context);
	}

	public override async chatInputRun(
		interaction: ChatInputCommandInteraction,
		_: ChatInputCommand,
		context: RunInPreconditionContext
	): AllFlowsPrecondition.AsyncResult {
		if (!context.types) return this.ok();

		const channelType = (await this.fetchChannelFromInteraction(interaction)).type;

		if (typesIsArray(context.types)) {
			return context.types.includes(channelType) ? this.ok() : this.makeSharedError(context);
		}

		return context.types.chatInputRun.includes(channelType) ? this.ok() : this.makeSharedError(context);
	}

	public override async contextMenuRun(
		interaction: ContextMenuCommandInteraction,
		_: ContextMenuCommand,
		context: RunInPreconditionContext
	): AllFlowsPrecondition.AsyncResult {
		if (!context.types) return this.ok();

		const channelType = (await this.fetchChannelFromInteraction(interaction)).type;

		if (typesIsArray(context.types)) {
			return context.types.includes(channelType) ? this.ok() : this.makeSharedError(context);
		}

		return context.types.contextMenuRun.includes(channelType) ? this.ok() : this.makeSharedError(context);
	}

	private makeSharedError(context: RunInPreconditionContext): AllFlowsPrecondition.Result {
		return this.error({
			identifier: Identifiers.PreconditionRunIn,
			message: 'You cannot run this message command in this type of channel.',
			context: { types: context.types }
		});
	}
}

function typesIsArray(types: readonly ChannelType[] | RunInPreconditionCommandSpecificData): types is readonly ChannelType[] {
	return Array.isArray(types);
}
