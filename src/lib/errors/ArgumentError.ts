import type { CommandInteractionOption } from 'discord.js';
import type { IArgument } from '../structures/Argument';
import { UserError } from './UserError';

/**
 * Errors thrown by the argument parser
 * @since 1.0.0
 * @property name This will be `'ArgumentError'` and can be used to distinguish the type of error when any error gets thrown
 */
export class ArgumentError<T = unknown> extends UserError {
	public readonly argument: IArgument<T>;
	public readonly parameter: string | CommandInteractionOption;

	public constructor(options: ArgumentError.Options<T>) {
		super({ ...options, identifier: options.identifier ?? options.argument.name });
		this.argument = options.argument;
		this.parameter = options.parameter;
	}

	// eslint-disable-next-line @typescript-eslint/class-literal-property-style
	public override get name(): string {
		return 'ArgumentError';
	}
}

export namespace ArgumentError {
	/**
	 * The options for {@link ArgumentError}.
	 * @since 1.0.0
	 */
	export interface Options<T> extends Omit<UserError.Options, 'identifier'> {
		/**
		 * The argument that caused the error.
		 * @since 1.0.0
		 */
		argument: IArgument<T>;

		/**
		 * The parameter that failed to be parsed.
		 * @since 1.0.0
		 */
		parameter: string | CommandInteractionOption;

		/**
		 * The identifier.
		 * @since 1.0.0
		 * @default argument.name
		 */
		identifier?: string;
	}
}
