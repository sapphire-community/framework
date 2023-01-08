import type { Result } from '@sapphire/result';
import type { Awaitable } from '@sapphire/utilities';
import type { ChatInputCommandInteraction, ContextMenuCommandInteraction, Message } from 'discord.js';
import type { UserError } from '../../errors/UserError';
import type { Command } from '../../structures/Command';
import type { PreconditionContext } from '../../structures/Precondition';

/**
 * Defines the result's value for a PreconditionContainer.
 * @since 1.0.0
 */
export type PreconditionContainerResult = Result<unknown, UserError>;

/**
 * Defines the return type of the generic {@link IPreconditionContainer.messageRun}.
 * @since 1.0.0
 */
export type PreconditionContainerReturn = Awaitable<PreconditionContainerResult>;

/**
 * Async-only version of {@link PreconditionContainerReturn}, to be used when the run method is async.
 * @since 1.0.0
 */
export type AsyncPreconditionContainerReturn = Promise<PreconditionContainerResult>;

/**
 * An abstracted precondition container to be implemented by classes.
 * @since 1.0.0
 */
export interface IPreconditionContainer {
	/**
	 * Runs a precondition container.
	 * @since 1.0.0
	 * @param message The message that ran this precondition.
	 * @param command The command the message invoked.
	 * @param context The context for the precondition.
	 */
	messageRun(message: Message, command: Command, context?: PreconditionContext): PreconditionContainerReturn;
	/**
	 * Runs a precondition container.
	 * @since 3.0.0
	 * @param interaction The interaction that ran this precondition.
	 * @param command The command the interaction invoked.
	 * @param context The context for the precondition.
	 */
	chatInputRun(interaction: ChatInputCommandInteraction, command: Command, context?: PreconditionContext): PreconditionContainerReturn;
	/**
	 * Runs a precondition container.
	 * @since 3.0.0
	 * @param interaction The interaction that ran this precondition.
	 * @param command The command the interaction invoked.
	 * @param context The context for the precondition.
	 */
	contextMenuRun(interaction: ContextMenuCommandInteraction, command: Command, context?: PreconditionContext): PreconditionContainerReturn;
}
