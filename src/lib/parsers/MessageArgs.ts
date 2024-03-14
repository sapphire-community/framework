import { type ArgumentStream, join, type Parameter } from '@sapphire/lexure';
import { Option, Result } from '@sapphire/result';
import type { Message } from 'discord.js';
import { ArgumentError } from '../errors/ArgumentError';
import { UserError } from '../errors/UserError';
import { Command } from '../structures/Command';
import {
	Args,
	type ArgsJson,
	type ArgsOptions,
	type ArrayResultType,
	type InferArgReturnType,
	type PeekArgsOptions,
	type RepeatArgsOptions,
	type ResultType
} from './Args';
import type { MessageCommand } from '../types/CommandTypes';

/**
 * The argument parser to be used in {@link Command}.
 */
export class MessageArgs extends Args {
	/**
	 * The original message that triggered the command.
	 */
	public readonly message: Message;

	/**
	 * The command that is being run.
	 */
	public readonly command: MessageCommand;

	/**
	 * The context of the command being run.
	 */
	public readonly commandContext: Record<PropertyKey, unknown>;

	/**
	 * The internal Lexure parser.
	 */
	protected readonly parser: ArgumentStream;

	/**
	 * The states stored in the args.
	 * @see Args#save
	 * @see Args#restore
	 */
	private readonly states: ArgumentStream.State[] = [];

	public constructor(message: Message, command: MessageCommand, parser: ArgumentStream, context: Record<PropertyKey, unknown>) {
		super();
		this.message = message;
		this.command = command;
		this.parser = parser;
		this.commandContext = context;
	}

	/**
	 * Sets the parser to the first token.
	 */
	public start(): this {
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
	public async pickResult<T extends ArgsOptions>(options: T): Promise<ResultType<InferArgReturnType<T>>>;
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
	public async pickResult<T extends ArgsOptions>(options: T): Promise<ResultType<InferArgReturnType<T>>> {
		const argument = this.resolveArgument(options.type);
		if (!argument) return this.unavailableArgument(options.type);

		const result = await this.parser.singleParseAsync(async (arg) =>
			argument.run(arg, {
				args: this,
				argument,
				messageOrInteraction: this.message,
				command: this.command,
				commandContext: this.commandContext,
				...options
			})
		);
		if (result.isErrAnd((value) => value === null)) {
			return this.missingArguments();
		}

		return result as ResultType<InferArgReturnType<T>>;
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
	public async pick<T extends ArgsOptions>(options: T): Promise<InferArgReturnType<T>>;
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
	public async pick<T extends ArgsOptions>(options: T): Promise<InferArgReturnType<T>> {
		const result = await this.pickResult(options);
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
	public async restResult<T extends ArgsOptions>(options: T): Promise<ResultType<InferArgReturnType<T>>>;
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
	public async restResult<T extends ArgsOptions>(options: T): Promise<ResultType<InferArgReturnType<T>>> {
		const argument = this.resolveArgument(options.type);
		if (!argument) return this.unavailableArgument(options.type);
		if (this.parser.finished) return this.missingArguments();

		const state = this.parser.save();
		const data = join(this.parser.many().unwrapOr<Parameter[]>([]));
		const result = await argument.run(data, {
			args: this,
			argument,
			messageOrInteraction: this.message,
			command: this.command,
			commandContext: this.commandContext,
			...options
		});

		return result.inspectErr(() => this.parser.restore(state)) as ResultType<InferArgReturnType<T>>;
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
	public async rest<T extends ArgsOptions>(options: T): Promise<InferArgReturnType<T>>;
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
	public async rest<T extends ArgsOptions>(options: T): Promise<InferArgReturnType<T>> {
		const result = await this.restResult(options);
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
	public async repeatResult<T extends ArgsOptions>(options: T): Promise<ArrayResultType<InferArgReturnType<T>>>;
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
	public async repeatResult<T extends RepeatArgsOptions>(options: T): Promise<ArrayResultType<InferArgReturnType<T>>> {
		const argument = this.resolveArgument(options.type);
		if (!argument) return this.unavailableArgument(options.type);
		if (this.parser.finished) return this.missingArguments();

		const output: InferArgReturnType<T>[] = [];

		for (let i = 0, times = options.times ?? Infinity; i < times; i++) {
			const result = await this.parser.singleParseAsync(async (arg) =>
				argument.run(arg, {
					args: this,
					argument,
					messageOrInteraction: this.message,
					command: this.command,
					commandContext: this.commandContext,
					...options
				})
			);

			if (result.isErr()) {
				const error = result.unwrapErr();
				if (error === null) break;

				if (output.length === 0) {
					return result as Result.Err<UserError | ArgumentError<InferArgReturnType<T>>>;
				}

				break;
			}

			output.push(result.unwrap() as InferArgReturnType<T>);
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
	public async repeat<T>(options: RepeatArgsOptions): Promise<T[]>;
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
	public async repeat<T extends ArgsOptions>(options: RepeatArgsOptions): Promise<InferArgReturnType<T>[]> {
		const result = await this.repeatResult(options);
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
	public async peekResult<T extends PeekArgsOptions>(options: T): Promise<ResultType<InferArgReturnType<T>>>;
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
	public async peekResult<T extends PeekArgsOptions>(options: T): Promise<ResultType<InferArgReturnType<T>>>;
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
	public async peekResult<T extends PeekArgsOptions>(options: T): Promise<ResultType<InferArgReturnType<T>>> {
		this.save();
		const result =
			typeof options.type === 'function'
				? ((await options.type()) as ResultType<InferArgReturnType<T>>)
				: await this.pickResult(options as unknown as ArgsOptions);
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
	public async peek<T extends PeekArgsOptions>(options: T): Promise<InferArgReturnType<T>>;
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
	public async peek<T extends ArgsOptions>(options: T): Promise<InferArgReturnType<T>>;
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
	public async peek<T extends PeekArgsOptions>(options: T): Promise<InferArgReturnType<T>> {
		const result = await this.peekResult(options);
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
	public nextMaybe(): Option<string>;
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
	public nextMaybe<T>(cb?: ArgsNextCallback<T>): Option<T | string> {
		return Option.from<T | string>(typeof cb === 'function' ? this.parser.singleMap(cb) : this.parser.single());
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
	public next<T>(cb?: ArgsNextCallback<T>): T | string | null {
		const value = cb ? this.nextMaybe<T | string | null>(cb) : this.nextMaybe();
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
		return { messageOrInteraction: this.message, command: this.command, commandContext: this.commandContext };
	}
}

/**
 * The callback used for {@link Args.nextMaybe} and {@link Args.next}.
 */
export interface ArgsNextCallback<T> {
	/**
	 * The value to be mapped.
	 */
	(value: string): Option<T>;
}
