import type { AnyInteraction, ChannelTypes, GuildBasedChannelTypes } from '@sapphire/discord.js-utilities';
import { container } from '@sapphire/pieces';
import { Result } from '@sapphire/result';
import type { Awaitable } from '@sapphire/utilities';
import type {
	ApplicationCommandOptionType,
	CategoryChannel,
	ChannelType,
	DMChannel,
	GuildMember,
	Message,
	NewsChannel,
	Role,
	StageChannel,
	TextChannel,
	ThreadChannel,
	User,
	VoiceChannel
} from 'discord.js';
import { ArgumentError } from '../errors/ArgumentError';
import { Identifiers } from '../errors/Identifiers';
import { UserError } from '../errors/UserError';
import type { EmojiObject } from '../resolvers/emoji';
import type { Argument, IArgument } from '../structures/Argument';
import type { Command } from '../structures/Command';

export abstract class Args {
	public abstract start(): this;
	public abstract pickResult<T extends ArgsOptions>(options: T): Promise<ResultType<InferArgReturnType<T>>>;
	public abstract pick<T extends ArgsOptions>(options: T): Promise<InferArgReturnType<T>>;
	public abstract restResult<T extends ArgsOptions>(options: T): Promise<ResultType<InferArgReturnType<T>>>;
	public abstract rest<T extends ArgsOptions>(options: T): Promise<InferArgReturnType<T>>;
	public abstract repeatResult<T extends ArgsOptions>(options: T): Promise<ArrayResultType<InferArgReturnType<T>>>;
	public abstract repeat<T extends ArgsOptions>(options: T): Promise<InferArgReturnType<T>[]>;
	public abstract peekResult<T extends PeekArgsOptions>(options: T): Promise<ResultType<InferArgReturnType<T>>>;
	public abstract peek<T extends PeekArgsOptions>(options: T): Promise<InferArgReturnType<T>>;

	protected unavailableArgument<T>(type: string | IArgument<T>): Result.Err<UserError> {
		const name = typeof type === 'string' ? type : type.name;
		return Result.err(
			new UserError({
				identifier: Identifiers.ArgsUnavailable,
				message: `The argument "${name}" was not found.`,
				context: { name, ...this.toJSON() }
			})
		);
	}

	protected missingArguments(): Result.Err<UserError> {
		return Result.err(new UserError({ identifier: Identifiers.ArgsMissing, message: 'There are no more arguments.', context: this.toJSON() }));
	}

	/**
	 * Resolves an argument.
	 * @param arg The argument name or {@link IArgument} instance.
	 */
	protected resolveArgument<T>(arg: keyof ArgType | IArgument<T>): IArgument<T> | undefined {
		if (typeof arg === 'object') return arg;
		return container.stores.get('arguments').get(arg as string) as IArgument<T> | undefined;
	}

	/**
	 * Converts a callback into a usable argument.
	 * @param cb The callback to convert into an {@link IArgument}.
	 * @param name The name of the argument.
	 */
	public static make<T>(cb: IArgument<T>['run'], optionType: ApplicationCommandOptionType, name = ''): IArgument<T> {
		return { run: cb, optionType, name };
	}

	/**
	 * Constructs an {@link Ok} result.
	 * @param value The value to pass.
	 */
	public static ok<T>(value: T): Result.Ok<T> {
		return Result.ok(value);
	}

	/**
	 * Constructs an {@link Err} result containing an {@link ArgumentError}.
	 * @param options The options for the argument error.
	 */
	public static error<T>(options: ArgumentError.Options<T>): Result.Err<ArgumentError<T>> {
		return Result.err(new ArgumentError<T>(options));
	}

	/**
	 * Defines the `JSON.stringify` override.
	 */
	public abstract toJSON(): ArgsJson;
}

export interface ArgsJson {
	messageOrInteraction: Message | AnyInteraction;
	command: Command;
	commandContext: Record<PropertyKey, unknown>;
}

export interface ArgType {
	boolean: boolean;
	channel: ChannelTypes;
	date: Date;
	dmChannel: DMChannel;
	emoji: EmojiObject;
	float: number;
	guildCategoryChannel: CategoryChannel;
	guildChannel: GuildBasedChannelTypes;
	guildNewsChannel: NewsChannel;
	guildNewsThreadChannel: ThreadChannel & { type: ChannelType.AnnouncementThread; parent: NewsChannel | null };
	guildPrivateThreadChannel: ThreadChannel & { type: ChannelType.PrivateThread; parent: TextChannel | null };
	guildPublicThreadChannel: ThreadChannel & { type: ChannelType.PublicThread; parent: TextChannel | null };
	guildStageVoiceChannel: StageChannel;
	guildTextChannel: TextChannel;
	guildThreadChannel: ThreadChannel;
	guildVoiceChannel: VoiceChannel;
	hyperlink: URL;
	integer: number;
	member: GuildMember;
	message: Message;
	number: number;
	role: Role;
	string: string;
	url: URL;
	user: User;
	enum: string;
}

export interface ArgsOptions<T = unknown, K extends keyof ArgType = keyof ArgType>
	extends Omit<Argument.Context, 'messageOrInteraction' | 'command'> {
	// Up to the person implementing if this should always be required or only required for chat commands, but this should
	// always be required for chat commands, and be used to find the starting point for our parsing
	name: string;
	type: IArgument<T> | K;
	minimum?: number;
	maximum?: number;
	inclusive?: boolean;
}

export interface RepeatArgsOptions extends ArgsOptions {
	/**
	 * The maximum amount of times the argument can be repeated.
	 * @default Infinity
	 */
	times?: number;
}

export interface PeekArgsOptions<T = unknown, K extends keyof ArgType = keyof ArgType> extends Omit<ArgsOptions, 'type'> {
	name: string;
	type: (() => Awaitable<Argument.Result<T>>) | K;
}

export type InferArgReturnType<T extends ArgsOptions | PeekArgsOptions> = T extends ArgsOptions
	? T['type'] extends IArgument<infer R>
		? R
		: T['type'] extends keyof ArgType
			? ArgType[T['type']]
			: never
	: T['type'] extends Awaitable<Argument.Result<infer R>>
		? R
		: T['type'] extends keyof ArgType
			? ArgType[T['type']]
			: never;

export interface ArgType {
	boolean: boolean;
	channel: ChannelTypes;
	date: Date;
	dmChannel: DMChannel;
	emoji: EmojiObject;
	float: number;
	guildCategoryChannel: CategoryChannel;
	guildChannel: GuildBasedChannelTypes;
	guildNewsChannel: NewsChannel;
	guildNewsThreadChannel: ThreadChannel & { type: ChannelType.AnnouncementThread; parent: NewsChannel | null };
	guildPrivateThreadChannel: ThreadChannel & { type: ChannelType.PrivateThread; parent: TextChannel | null };
	guildPublicThreadChannel: ThreadChannel & { type: ChannelType.PublicThread; parent: TextChannel | null };
	guildStageVoiceChannel: StageChannel;
	guildTextChannel: TextChannel;
	guildThreadChannel: ThreadChannel;
	guildVoiceChannel: VoiceChannel;
	hyperlink: URL;
	integer: number;
	member: GuildMember;
	message: Message;
	number: number;
	role: Role;
	string: string;
	url: URL;
	user: User;
	enum: string;
}

export type ResultType<T> = Result<T, UserError | ArgumentError<T>>;
export type ArrayResultType<T> = Result<T[], UserError | ArgumentError<T>>;
