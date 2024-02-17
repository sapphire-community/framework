import type { AnyInteraction, ChannelTypes, GuildBasedChannelTypes } from '@sapphire/discord.js-utilities';
import { join, type Parameter } from '@sapphire/lexure';
import { container } from '@sapphire/pieces';
import { Option, Result } from '@sapphire/result';
import type { Awaitable } from '@sapphire/utilities';
import type {
	CategoryChannel,
	ChannelType,
	ChatInputCommandInteraction,
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
import type { URL } from 'node:url';
import { ArgumentError } from '../errors/ArgumentError';
import { Identifiers } from '../errors/Identifiers';
import { UserError } from '../errors/UserError';
import type { EmojiObject } from '../resolvers/emoji';
import type { Argument, IArgument } from '../structures/Argument';
import { Command } from '../structures/Command';
import type { Parser, Arg } from './Parser';

/**
 * The argument parser to be used in {@link Command}.
 */
export class Args {
	/**
	 * The original message or interaction that triggered the command.
	 */
	public readonly messageOrInteraction: Message | ChatInputCommandInteraction;

	/**
	 * The command that is being run.
	 */
	public readonly command: Command;

	/**
	 * The context of the command being run.
	 */
	public readonly commandContext: Record<PropertyKey, unknown>;

	/**
	 * The internal Lexure parser.
	 */
	protected readonly parser: Parser;

	/**
	 * The states stored in the args.
	 * @see Args#save
	 * @see Args#restore
	 */
	private readonly states: unknown[] = [];

	public constructor(
		messageOrInteraction: Message | ChatInputCommandInteraction,
		command: Command,
		parser: Parser,
		context: Record<PropertyKey, unknown>
	) {
		this.messageOrInteraction = messageOrInteraction;
		this.command = command;
		this.parser = parser;
		this.commandContext = context;
	}

	/**
	 * Sets the parser to the first token.
	 */
	public start(): Args {
		this.parser.reset();
		return this;
	}

	/**
	 * Retrieves the next parameter and parses it. Advances index on success.
	 * @param type The type of the argument.
	 * @param options The pickResult options.
	 * @example
	 * ```typescript
	 * // !square 5
	 * const resolver = Args.make((parameter, { argument }) => {
	 *   const parsed = Number(parameter);
	 *   if (Number.isNaN(parsed)) {
	 *     return Args.error({ argument, parameter, identifier: 'ArgumentNumberNaN', message: 'You must write a valid number.' });
	 *   }
	 *
	 *   return Args.ok(parsed);
	 * });
	 *
	 * const a = await args.pickResult(resolver);
	 * if (!a.success) {
	 *   throw new UserError({ identifier: 'ArgumentNumberNaN', message: 'You must write a valid number.' });
	 * }
	 *
	 * await message.channel.send(`The result is: ${a.value ** 2}!`);
	 * // Sends "The result is: 25"
	 * ```
	 */
	public async pickResult<T>(type: IArgument<T>, options?: ArgOptions): Promise<ResultType<T>>;
	/**
	 * Retrieves the next parameter and parses it. Advances index on success.
	 * @param type The type of the argument.
	 * @param options The pickResult options.
	 * @example
	 * ```typescript
	 * // !add 1 2
	 * const a = await args.pickResult('integer');
	 * if (!a.success) {
	 *   throw new UserError({ identifier: 'AddArgumentError', message: 'You must write two numbers, but the first one did not match.' });
	 * }
	 *
	 * const b = await args.pickResult('integer');
	 * if (!b.success) {
	 *   throw new UserError({ identifier: 'AddArgumentError', message: 'You must write two numbers, but the second one did not match.' });
	 * }
	 *
	 * await message.channel.send(`The result is: ${a.value + b.value}!`);
	 * // Sends "The result is: 3"
	 * ```
	 */
	public async pickResult<K extends keyof ArgType>(type: K, options?: ArgOptions): Promise<ResultType<ArgType[K]>>;
	public async pickResult<K extends keyof ArgType>(type: K, options: ArgOptions = {}): Promise<ResultType<ArgType[K]>> {
		const argument = this.resolveArgument<ArgType[K]>(type);
		if (!argument) return this.unavailableArgument(type);

		const result = await this.parser.singleParseAsync(async (arg) =>
			argument.run(arg, {
				args: this,
				argument,
				messageOrInteraction: this.messageOrInteraction,
				command: this.command,
				commandContext: this.commandContext,
				...options
			})
		);
		if (result.isErrAnd((value) => value === null)) {
			return this.missingArguments();
		}

		return result as ResultType<ArgType[K]>;
	}

	/**
	 * Similar to {@link Args.pickResult} but returns the value on success, throwing otherwise.
	 * @param type The type of the argument.
	 * @param options The pick options.
	 * @example
	 * ```typescript
	 * // !square 5
	 * const resolver = Args.make((parameter, { argument }) => {
	 *   const parsed = Number(parameter);
	 *   if (Number.isNaN(parsed)) {
	 *     return Args.error({ argument, parameter, identifier: 'ArgumentNumberNaN', message: 'You must write a valid number.' });
	 *   }
	 *
	 *   return Args.ok(parsed);
	 * });
	 *
	 * const a = await args.pick(resolver);
	 *
	 * await message.channel.send(`The result is: ${a ** 2}!`);
	 * // Sends "The result is: 25"
	 * ```
	 */
	public async pick<T>(type: IArgument<T>, options?: ArgOptions): Promise<T>;
	/**
	 * Similar to {@link Args.pickResult} but returns the value on success, throwing otherwise.
	 * @param type The type of the argument.
	 * @param options The pick options.
	 * @example
	 * ```typescript
	 * // !add 1 2
	 * const a = await args.pick('integer');
	 * const b = await args.pick('integer');
	 * await message.channel.send(`The result is: ${a + b}!`);
	 * // Sends "The result is: 3"
	 * ```
	 */
	public async pick<K extends keyof ArgType>(type: K, options?: ArgOptions): Promise<ArgType[K]>;
	public async pick<K extends keyof ArgType>(type: K, options?: ArgOptions): Promise<ArgType[K]> {
		const result = await this.pickResult(type, options);
		return result.unwrapRaw();
	}

	/**
	 * Retrieves all the following arguments.
	 * @param type The type of the argument.
	 * @param options The restResult options.
	 * @example
	 * ```typescript
	 * // !reverse Hello world!
	 * const resolver = Args.make((parameter) => Args.ok(parameter.split('').reverse()));
	 *
	 * const a = await args.restResult(resolver);
	 * if (!a.success) {
	 *   throw new UserError({ identifier: 'AddArgumentError', message: 'You must write some text.' });
	 * }
	 *
	 * await message.channel.send(`The reversed value is... ${a.value}`);
	 * // Sends "The reversed value is... !dlrow olleH"
	 * ```
	 */
	public async restResult<T>(type: IArgument<T>, options?: ArgOptions): Promise<ResultType<T>>;
	/**
	 * Retrieves all the following arguments.
	 * @param type The type of the argument.
	 * @param options The restResult options.
	 * @example
	 * ```typescript
	 * // !add 2 Hello World!
	 * const a = await args.pickResult('integer');
	 * if (!a.success) {
	 *   throw new UserError({ identifier: 'AddArgumentError', message: 'You must write a number and a text, but the former did not match.' });
	 * }
	 *
	 * const b = await args.restResult('string', { minimum: 1 });
	 * if (!b.success) {
	 *   throw new UserError({ identifier: 'AddArgumentError', message: 'You must write a number and a text, but the latter did not match.' });
	 * }
	 *
	 * await message.channel.send(`The repeated value is... ${b.value.repeat(a.value)}!`);
	 * // Sends "The repeated value is... Hello World!Hello World!"
	 * ```
	 */
	public async restResult<K extends keyof ArgType>(type: K, options?: ArgOptions): Promise<ResultType<ArgType[K]>>;
	public async restResult<T>(type: keyof ArgType | IArgument<T>, options: ArgOptions = {}): Promise<ResultType<T>> {
		const argument = this.resolveArgument(type);
		if (!argument) return this.unavailableArgument(type);
		if (this.parser.finished) return this.missingArguments();

		const state = this.parser.save();
		const data = join(this.parser.many().unwrapOr<Parameter[]>([]));
		const result = await argument.run(data, {
			args: this,
			argument,
			messageOrInteraction: this.messageOrInteraction,
			command: this.command,
			commandContext: this.commandContext,
			...options
		});

		return result.inspectErr(() => this.parser.restore(state));
	}

	/**
	 * Similar to {@link Args.restResult} but returns the value on success, throwing otherwise.
	 * @param type The type of the argument.
	 * @param options The rest options.
	 * @example
	 * ```typescript
	 * // !reverse Hello world!
	 * const resolver = Args.make((arg) => Args.ok(arg.split('').reverse()));
	 * const a = await args.rest(resolver);
	 * await message.channel.send(`The reversed value is... ${a}`);
	 * // Sends "The reversed value is... !dlrow olleH"
	 * ```
	 */
	public async rest<T>(type: IArgument<T>, options?: ArgOptions): Promise<T>;
	/**
	 * Similar to {@link Args.restResult} but returns the value on success, throwing otherwise.
	 * @param type The type of the argument.
	 * @param options The rest options.
	 * @example
	 * ```typescript
	 * // !add 2 Hello World!
	 * const a = await args.pick('integer');
	 * const b = await args.rest('string', { minimum: 1 });
	 * await message.channel.send(`The repeated value is... ${b.repeat(a)}!`);
	 * // Sends "The repeated value is... Hello World!Hello World!"
	 * ```
	 */
	public async rest<K extends keyof ArgType>(type: K, options?: ArgOptions): Promise<ArgType[K]>;
	public async rest<K extends keyof ArgType>(type: K, options?: ArgOptions): Promise<ArgType[K]> {
		const result = await this.restResult(type, options);
		return result.unwrapRaw();
	}

	/**
	 * Retrieves all the following arguments.
	 * @param type The type of the argument.
	 * @param options The repeatResult options.
	 * @example
	 * ```typescript
	 * // !add 2 Hello World!
	 * const resolver = Args.make((arg) => Args.ok(arg.split('').reverse()));
	 * const result = await args.repeatResult(resolver, { times: 5 });
	 * if (!result.success) {
	 *   throw new UserError({ identifier: 'CountArgumentError', message: 'You must write up to 5 words.' });
	 * }
	 *
	 * await message.channel.send(`You have written ${result.value.length} word(s): ${result.value.join(' ')}`);
	 * // Sends "You have written 2 word(s): olleH !dlroW"
	 * ```
	 */
	public async repeatResult<T>(type: IArgument<T>, options?: RepeatArgOptions): Promise<ArrayResultType<T>>;
	/**
	 * Retrieves all the following arguments.
	 * @param type The type of the argument.
	 * @param options The repeatResult options.
	 * @example
	 * ```typescript
	 * // !reverse-each 2 Hello World!
	 * const result = await args.repeatResult('string', { times: 5 });
	 * if (!result.success) {
	 *   throw new UserError({ identifier: 'CountArgumentError', message: 'You must write up to 5 words.' });
	 * }
	 *
	 * await message.channel.send(`You have written ${result.value.length} word(s): ${result.value.join(' ')}`);
	 * // Sends "You have written 2 word(s): Hello World!"
	 * ```
	 */
	public async repeatResult<K extends keyof ArgType>(type: K, options?: RepeatArgOptions): Promise<ArrayResultType<ArgType[K]>>;
	public async repeatResult<K extends keyof ArgType>(type: K, options: RepeatArgOptions = {}): Promise<ArrayResultType<ArgType[K]>> {
		const argument = this.resolveArgument(type);
		if (!argument) return this.unavailableArgument(type);
		if (this.parser.finished) return this.missingArguments();

		const output: ArgType[K][] = [];

		for (let i = 0, times = options.times ?? Infinity; i < times; i++) {
			const result = await this.parser.singleParseAsync(async (arg) =>
				argument.run(arg, {
					args: this,
					argument,
					messageOrInteraction: this.messageOrInteraction,
					command: this.command,
					commandContext: this.commandContext,
					...options
				})
			);

			if (result.isErr()) {
				const error = result.unwrapErr();
				if (error === null) break;

				if (output.length === 0) {
					return result as Result.Err<UserError | ArgumentError<ArgType[K]>>;
				}

				break;
			}

			output.push(result.unwrap() as ArgType[K]);
		}

		return Result.ok(output);
	}

	/**
	 * Similar to {@link Args.repeatResult} but returns the value on success, throwing otherwise.
	 * @param type The type of the argument.
	 * @param options The repeat options.
	 * @example
	 * ```typescript
	 * // !reverse-each 2 Hello World!
	 * const resolver = Args.make((arg) => Args.ok(arg.split('').reverse()));
	 * const result = await args.repeat(resolver, { times: 5 });
	 * await message.channel.send(`You have written ${result.length} word(s): ${result.join(' ')}`);
	 * // Sends "You have written 2 word(s): Hello World!"
	 * ```
	 */
	public async repeat<T>(type: IArgument<T>, options?: RepeatArgOptions): Promise<T[]>;
	/**
	 * Similar to {@link Args.repeatResult} but returns the value on success, throwing otherwise.
	 * @param type The type of the argument.
	 * @param options The repeat options.
	 * @example
	 * ```typescript
	 * // !add 2 Hello World!
	 * const words = await args.repeat('string', { times: 5 });
	 * await message.channel.send(`You have written ${words.length} word(s): ${words.join(' ')}`);
	 * // Sends "You have written 2 word(s): Hello World!"
	 * ```
	 */
	public async repeat<K extends keyof ArgType>(type: K, options?: RepeatArgOptions): Promise<ArgType[K][]>;
	public async repeat<K extends keyof ArgType>(type: K, options?: RepeatArgOptions): Promise<ArgType[K][]> {
		const result = await this.repeatResult(type, options);
		return result.unwrapRaw();
	}

	/**
	 * Peeks the following parameter(s) without advancing the parser's state.
	 * Passing a function as a parameter allows for returning {@link Args.pickResult}, {@link Args.repeatResult},
	 * or {@link Args.restResult}; otherwise, passing the custom argument or the argument type with options
	 * will use {@link Args.pickResult} and only peek a single argument.
	 * @param type The function, custom argument, or argument name.
	 * @example
	 * ```typescript
	 * // !reversedandscreamfirst hello world
	 * const resolver = Args.make((arg) => Args.ok(arg.split('').reverse().join('')));
	 *
	 * const result = await args.repeatResult(resolver);
	 * await result.inspectAsync((value) =>
	 * 	message.channel.send(`Reversed ${value.length} word(s): ${value.join(' ')}`)
	 * ); // Reversed 2 word(s): olleh dlrow
	 *
	 * const firstWord = await args.pickResult('string');
	 * await firstWord.inspectAsync((value) =>
	 * 	message.channel.send(firstWord.value.toUpperCase())
	 * ); // HELLO
	 * ```
	 */
	public async peekResult<T>(type: () => Argument.Result<T>): Promise<ResultType<T>>;
	/**
	 * Peeks the following parameter(s) without advancing the parser's state.
	 * Passing a function as a parameter allows for returning {@link Args.pickResult}, {@link Args.repeatResult},
	 * or {@link Args.restResult}; otherwise, passing the custom argument or the argument type with options
	 * will use {@link Args.pickResult} and only peek a single argument.
	 * @param type The function, custom argument, or argument name.
	 * @param options The peekResult options.
	 * @example
	 * ```typescript
	 * // !reverseandscreamfirst sapphire community
	 * const resolver = Args.make((arg) => Args.ok(arg.split('').reverse().join('')));
	 *
	 * const peekedWord = await args.peekResult(resolver);
	 * await peekedWord.inspectAsync((value) => message.channel.send(value)); // erihppas
	 *
	 * const firstWord = await args.pickResult('string');
	 * await firstWord.inspectAsync((value) => message.channel.send(value.toUpperCase())); // SAPPHIRE
	 * ```
	 */
	public async peekResult<T>(type: IArgument<T>, options?: ArgOptions): Promise<ResultType<T>>;
	/**
	 * Peeks the following parameter(s) without advancing the parser's state.
	 * Passing a function as a parameter allows for returning {@link Args.pickResult}, {@link Args.repeatResult},
	 * or {@link Args.restResult}; otherwise, passing the custom argument or the argument type with options
	 * will use {@link Args.pickResult} and only peek a single argument.
	 * @param type The function, custom argument, or argument name.
	 * @param options The peekResult options.
	 * @example
	 * ```typescript
	 * // !datethenaddtwo 1608867472611
	 * const date = await args.peekResult('date');
	 * await date.inspectAsync((value) =>
	 * 	message.channel.send(`Your date (in UTC): ${value.toUTCString()}`)
	 * ); // Your date (in UTC): Fri, 25 Dec 2020 03:37:52 GMT
	 *
	 * const result = await args.pickResult('number', { maximum: Number.MAX_SAFE_INTEGER - 2 });
	 * await result.inspectAsync((value) =>
	 * 	message.channel.send(`Your number plus two: ${value + 2}`)
	 * ); // Your number plus two: 1608867472613
	 * ```
	 */
	public async peekResult<K extends keyof ArgType>(
		type: (() => Awaitable<Argument.Result<ArgType[K]>>) | K,
		options?: ArgOptions
	): Promise<ResultType<ArgType[K]>>;

	public async peekResult<K extends keyof ArgType>(
		type: (() => Awaitable<Argument.Result<ArgType[K]>>) | K,
		options: ArgOptions = {}
	): Promise<ResultType<ArgType[K]>> {
		this.save();
		const result = typeof type === 'function' ? await type() : await this.pickResult(type, options);
		this.restore();
		return result;
	}

	/**
	 * Similar to {@link Args.peekResult} but returns the value on success, throwing otherwise.
	 * @param type The function, custom argument, or argument name.
	 * @example
	 * ```typescript
	 * // !bigintsumthensquarefirst 25 50 75
	 * const resolver = Args.make((arg, { argument }) => {
	 *   try {
	 *     return Args.ok(BigInt(arg));
	 *   } catch {
	 *     return Args.error({ parameter: arg, argument, identifier: 'InvalidBigInt', message: 'You must specify a valid number for a bigint.' })
	 *   }
	 * });
	 *
	 * const peeked = await args.repeatResult(resolver);
	 * await peeked.inspectAsync((value) => message.channel.send(`Sum: **${value.reduce((x, y) => x + y, 0n)}**`)); // Sum: 150n
	 *
	 * const first = await args.pick(resolver);
	 * await message.channel.send(`First bigint squared: ${first**2n}`); // First bigint squared: 625
	 * ```
	 */
	public async peek<T>(type: () => Argument.Result<T>): Promise<T>;
	/**
	 * Similar to {@link Args.peekResult} but returns the value on success, throwing otherwise.
	 * @param type The function, custom argument, or argument name.
	 * @param options The peek options.
	 * @example
	 * ```typescript
	 * import { SnowflakeRegex } from '@sapphire/discord.js-utilities';
	 * import { DiscordSnowflake } from '@sapphire/snowflake';
	 *
	 * // !createdat 730159185517477900
	 * const snowflakeResolver = Args.make<bigint>((arg, { argument }) => {
	 *   return SnowflakeRegex.test(arg)
	 *     ? Args.ok(BigInt(arg))
	 *     : Args.error({ parameter: arg, argument, identifier: 'InvalidSnowflake', message: 'You must specify a valid snowflake.' });
	 * });
	 *
	 * const snowflake = await args.peek(snowflakeResolver);
	 * const timestamp = Number((snowflake >> 22n) + DiscordSnowflake.epoch);
	 * const createdAt = new Date(timestamp);
	 *
	 * await message.channel.send(
	 *   `The snowflake ${snowflake} was registered on ${createdAt.toUTCString()}.`
	 * ); // The snowflake 730159185517477900 was registered on Tue, 07 Jul 2020 20:31:55 GMT.
	 *
	 * const id = await args.pick('string');
	 * await message.channel.send(`Your ID, reversed: ${id.split('').reverse().join('')}`); // Your ID, reversed: 009774715581951037
	 * ```
	 */
	public async peek<T>(type: IArgument<T>, options?: ArgOptions): Promise<T>;
	/**
	 * Similar to {@link Args.peekResult} but returns the value on success, throwing otherwise.
	 * @param type The function, custom argument, or argument name.
	 * @param options The peek options.
	 * @example
	 * ```typescript
	 * // !messagelink https://discord.com/channels/737141877803057244/737142209639350343/791843123898089483
	 * const remoteMessage = await args.peek('message');
	 * await message.channel.send(
	 *   `${remoteMessage.author.tag}: ${remoteMessage.content}`
	 * ); // RealShadowNova#7462: Yeah, Sapphire has been a great experience so far, especially being able to help and contribute.
	 *
	 * const url = await args.pick('hyperlink');
	 * await message.channel.send(`Hostname: ${url.hostname}`); // Hostname: discord.com
	 * ```
	 */
	public async peek<K extends keyof ArgType>(type: (() => Argument.Result<ArgType[K]>) | K, options?: ArgOptions): Promise<ArgType[K]>;
	public async peek<K extends keyof ArgType>(type: (() => Argument.Result<ArgType[K]>) | K, options?: ArgOptions): Promise<ArgType[K]> {
		const result = await this.peekResult(type, options);
		return result.unwrapRaw();
	}

	/**
	 * Retrieves the next raw argument from the parser.
	 * @example
	 * ```typescript
	 * // !numbers 1 2 3
	 *
	 * console.log(args.nextMaybe());
	 * // -> { exists: true, value: '1' }
	 * ```
	 */
	public nextMaybe(): Option<Arg>;
	/**
	 * Retrieves the value of the next unused ordered token, but only if it could be transformed.
	 * That token will now be used if the transformation succeeds.
	 * @typeparam T Output type of the {@link ArgsNextCallback callback}.
	 * @param cb Gives an option of either the resulting value, or nothing if failed.
	 * @example
	 * ```typescript
	 * // !numbers 1 2 3
	 * const parse = (x: string) => {
	 *   const n = Number(x);
	 *   return Number.isNaN(n) ? none() : some(n);
	 * };
	 *
	 * console.log(args.nextMaybe(parse));
	 * // -> { exists: true, value: 1 }
	 * ```
	 */
	public nextMaybe<T>(cb: ArgsNextCallback<T>): Option<T>;
	public nextMaybe<T>(cb?: ArgsNextCallback<T>): Option<T | Arg> {
		return Option.from<T | Arg>(typeof cb === 'function' ? this.parser.singleMap(cb) : this.parser.single());
	}

	/**
	 * Similar to {@link Args.nextMaybe} but returns the value on success, null otherwise.
	 * @example
	 * ```typescript
	 * // !numbers 1 2 3
	 *
	 * console.log(args.next());
	 * // -> '1'
	 * ```
	 */
	public next(): string;
	/**
	 * Similar to {@link Args.nextMaybe} but returns the value on success, null otherwise.
	 * @typeparam T Output type of the {@link ArgsNextCallback callback}.
	 * @param cb Gives an option of either the resulting value, or nothing if failed.
	 * @example
	 * ```typescript
	 * // !numbers 1 2 3
	 * const parse = (x: string) => {
	 *   const n = Number(x);
	 *   return Number.isNaN(n) ? none() : some(n);
	 * };
	 *
	 * console.log(args.nextMaybe(parse));
	 * // -> 1
	 * ```
	 */
	public next<T>(cb: ArgsNextCallback<T>): T;
	public next<T>(cb?: ArgsNextCallback<T>): T | Arg | null {
		const value = cb ? this.nextMaybe<T | Arg | null>(cb) : this.nextMaybe();
		return value.unwrapOr(null);
	}

	/**
	 * Checks if one or more flag were given.
	 * @param keys The name(s) of the flag.
	 * @example
	 * ```typescript
	 * // Suppose args are from '--f --g'.
	 * console.log(args.getFlags('f'));
	 * // >>> true
	 *
	 * console.log(args.getFlags('g', 'h'));
	 * // >>> true
	 *
	 * console.log(args.getFlags('h'));
	 * // >>> false
	 * ```
	 */
	public getFlags(...keys: readonly string[]): boolean {
		return this.parser.flag(...keys);
	}

	/**
	 * Gets the last value of one or more options as an {@link Option}.
	 * If you do not care about safely handling non-existing values
	 * you can use {@link Args.getOption} to get `string | null` as return type
	 * @param keys The name(s) of the option.
	 * @example
	 * ```typescript
	 * // Suppose args are from '--a=1 --b=2 --c=3'.
	 * console.log(args.getOptionResult('a'));
	 * // >>> Some { value: '1' }
	 *
	 * console.log(args.getOptionResult('b', 'c'));
	 * // >>> Some { value: '2' }
	 *
	 * console.log(args.getOptionResult('d'));
	 * // >>> None {}
	 * ```
	 */
	public getOptionResult(...keys: readonly string[]): Option<string> {
		return this.parser.option(...keys);
	}

	/**
	 * Gets the last value of one or more options.
	 * Similar to {@link Args.getOptionResult} but returns the value on success, or `null` if not.
	 * @param keys The name(s) of the option.
	 * @example
	 * ```typescript
	 * // Suppose args are from '--a=1 --b=2 --c=3'.
	 * console.log(args.getOption('a'));
	 * // >>> '1'
	 *
	 * console.log(args.getOption('b', 'c'));
	 * // >>> '2'
	 *
	 * console.log(args.getOption('d'));
	 * // >>> null
	 * ```
	 */
	public getOption(...keys: readonly string[]): string | null {
		return this.parser.option(...keys).unwrapOr(null);
	}

	/**
	 * Gets all the values of one or more option.
	 * @param keys The name(s) of the option.
	 * @example
	 * ```typescript
	 * // Suppose args are from '--a=1 --a=1 --b=2 --c=3'.
	 * console.log(args.getOptionsResult('a'));
	 * // >>> Some { value: [ '1' ] }
	 *
	 * console.log(args.getOptionsResult('a', 'd'));
	 * // >>> Some { value: [ '1' ] }
	 *
	 * console.log(args.getOptionsResult('b', 'c'));
	 * // >>> Some { value: [ '2', '3' ] }
	 *
	 * console.log(args.getOptionsResult('d'));
	 * // >>> None {}
	 * ```
	 */
	public getOptionsResult(...keys: readonly string[]): Option<readonly string[]> {
		return this.parser.options(...keys);
	}

	/**
	 * Gets all the values of one or more option.
	 * Similar to {@link Args.getOptionsResult} but returns the value on success, or `null` if not.
	 * @param keys The name(s) of the option.
	 * @example
	 * ```typescript
	 * // Suppose args are from '--a=1 --a=1 --b=2 --c=3'.
	 * console.log(args.getOptions('a'));
	 * // >>> ['1', '1']
	 *
	 * console.log(args.getOptions('b', 'c'));
	 * // >>> ['2', '3']
	 *
	 * console.log(args.getOptions('d'));
	 * // >>> null
	 * ```
	 */
	public getOptions(...keys: readonly string[]): readonly string[] | null {
		return this.parser.options(...keys).unwrapOr(null);
	}

	/**
	 * Saves the current state into the stack following a FILO strategy (first-in, last-out).
	 * @see Args#restore
	 */
	public save(): void {
		this.states.push(this.parser.save());
	}

	/**
	 * Restores the previously saved state from the stack.
	 * @see Args#save
	 */
	public restore(): void {
		if (this.states.length !== 0) this.parser.restore(this.states.pop()!);
	}

	/**
	 * Whether all arguments have been consumed.
	 */
	public get finished(): boolean {
		return this.parser.finished;
	}

	/**
	 * Defines the `JSON.stringify` override.
	 */
	public toJSON(): ArgsJson {
		return { message: this.messageOrInteraction, command: this.command, commandContext: this.commandContext };
	}

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
	private resolveArgument<T>(arg: keyof ArgType | IArgument<T>): IArgument<T> | undefined {
		if (typeof arg === 'object') return arg;
		return container.stores.get('arguments').get(arg as string) as IArgument<T> | undefined;
	}

	/**
	 * Converts a callback into a usable argument.
	 * @param cb The callback to convert into an {@link IArgument}.
	 * @param name The name of the argument.
	 */
	public static make<T>(cb: IArgument<T>['run'], name = ''): IArgument<T> {
		return { run: cb, name };
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
}

export interface ArgsJson {
	message: Message | AnyInteraction;
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

export interface ArgOptions extends Omit<Argument.Context, 'message' | 'command'> {}

export interface RepeatArgOptions extends ArgOptions {
	/**
	 * The maximum amount of times the argument can be repeated.
	 * @default Infinity
	 */
	times?: number;
}

/**
 * The callback used for {@link Args.nextMaybe} and {@link Args.next}.
 */
export interface ArgsNextCallback<T> {
	/**
	 * The value to be mapped.
	 */
	(value: Arg): Option<T>;
}

export type ResultType<T> = Result<T, UserError | ArgumentError<T>>;
export type ArrayResultType<T> = Result<T[], UserError | ArgumentError<T>>;
