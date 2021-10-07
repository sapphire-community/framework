import { Piece, PieceContext, PieceJSON, PieceOptions } from '@sapphire/pieces';
import type { Awaitable } from '@sapphire/utilities';
import type { Interaction } from 'discord.js';
import { some, Maybe, none, None, UnwrapMaybeValue } from '../parsers/Maybe';

export abstract class InteractionHandler extends Piece {
	/**
	 * The type for this handler
	 * @since 2.0.0
	 */
	public readonly interactionHandlerType: InteractionHandlerTypes;

	public constructor(context: PieceContext, options: InteractionHandlerOptions) {
		super(context, options);

		this.interactionHandlerType = options.interactionHandlerType;
	}

	public abstract run(interaction: Interaction, parsedData?: unknown): unknown;

	/**
	 * A custom function that will be called when checking if an interaction should be passed to this handler.
	 * You can use this method to not only filter by ids, but also pre-parse the data from the id for use in the run method.
	 *
	 * By default, all interactions of the type you specified will run in a handler. You should override this method
	 * to change that behavior.
	 *
	 * @example
	 * ```typescript
	 * // Parsing a button handler
	 * public override parse(interaction: ButtonInteraction) {
	 *   if (interaction.customId.startsWith('my-awesome-clicky-button')) {
	 * 	   // Returning a `some` here means that the run method should be called next!
	 *     return this.some({ isMyBotAwesome: true, awesomenessLevel: 9001 });
	 *   }
	 *
	 *   // Returning a `none` means this interaction shouldn't run in this handler
	 *   return this.none();
	 * }
	 * ```
	 *
	 * @example
	 * ```typescript
	 * // Getting data from a database based on the custom id
	 * public override async parse(interaction: ButtonInteraction) {
	 *   // This code is purely for demonstration purposes only!
	 *   if (interaction.customId.startsWith('example-data')) {
	 *     const [, userId, channelId] = interaction.customId.split('.');
	 *
	 * 	   const dataFromDatabase = await container.prisma.exampleData.findFirst({ where: { userId, channelId } });
	 *
	 *     // Returning a `some` here means that the run method should be called next!
	 *     return this.some(dataFromDatabase);
	 *   }
	 *
	 *   // Returning a `none` means this interaction shouldn't run in this handler
	 *   return this.none();
	 * }
	 * ```
	 *
	 * @returns A {@link Maybe} (or a {@link Promise Promised} {@link Maybe}) that indicates if this interaction should be
	 * handled by this handler, and any extra data that should be passed to the {@link InteractionHandler#run run method}
	 */
	public parse(_interaction: Interaction): Awaitable<Maybe<unknown>> {
		return this.some();
	}

	public some(): Maybe<never>;
	public some<T>(data: T): Maybe<T>;
	public some<T>(data?: T): Maybe<T | undefined> {
		return some(data);
	}

	public none(): None {
		return none();
	}

	public toJSON(): InteractionHandlerJSON {
		return {
			...super.toJSON(),
			interactionHandlerType: this.interactionHandlerType
		};
	}
}

export interface InteractionHandlerOptions extends PieceOptions {
	readonly interactionHandlerType: InteractionHandlerTypes;
}

export interface InteractionHandlerJSON extends PieceJSON {
	interactionHandlerType: InteractionHandlerTypes;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace InteractionHandler {
	export type Options = InteractionHandlerOptions;
	export type ParseResult<Instance extends InteractionHandler> = UnwrapMaybeValue<Awaited<ReturnType<Instance['parse']>>>;
}

export const enum InteractionHandlerTypes {
	// Specifically focused types
	Button = 'BUTTON',
	SelectMenu = 'SELECT_MENU',

	// More free-falling handlers, for 1 shared handler between buttons and select menus (someone will have a use for this >,>)
	MessageComponent = 'MESSAGE_COMPONENT'
}

// TODO(vladfrangu): remove this once we upgrade to TS 4.5.0
/**
 * Recursively unwraps the "awaited type" of a type. Non-promise "thenables" should resolve to `never`. This emulates the behavior of `await`.
 */
type Awaited<T> = T extends null | undefined
	? T // special case for `null | undefined` when not in `--strictNullChecks` mode
	: // eslint-disable-next-line @typescript-eslint/ban-types
	T extends object & { then(onfulfilled: infer F): any } // `await` only unwraps object types with a callable `then`. Non-object types are not unwrapped
	? F extends (value: infer V) => any // if the argument to `then` is callable, extracts the argument
		? Awaited<V> // recursively unwrap the value
		: never // the argument to `then` was not callable
	: T; // non-object or non-thenable
