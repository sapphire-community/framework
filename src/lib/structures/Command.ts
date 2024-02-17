import { ArgumentStream, Lexer, Parser, type IUnorderedStrategy } from '@sapphire/lexure';
import { AliasPiece } from '@sapphire/pieces';
import { isFunction, isNullish, isObject, type Awaitable } from '@sapphire/utilities';
import { ChannelType, ChatInputCommandInteraction, ContextMenuCommandInteraction, type AutocompleteInteraction, type Message } from 'discord.js';
import { Args } from '../parsers/Args';
import {
	parseConstructorPreConditionsCooldown,
	parseConstructorPreConditionsNsfw,
	parseConstructorPreConditionsRequiredClientPermissions,
	parseConstructorPreConditionsRequiredUserPermissions,
	parseConstructorPreConditionsRunIn
} from '../precondition-resolvers/index';
import type {
	AutocompleteCommand,
	ChatInputCommand,
	CommandJSON,
	CommandOptions,
	CommandOptionsRunType,
	CommandRunInUnion,
	CommandSpecificRunIn,
	ContextMenuCommand,
	DetailedDescriptionCommand,
	MessageCommand
} from '../types/CommandTypes';
import { RegisterBehavior } from '../types/Enums';
import { acquire, getDefaultBehaviorWhenNotIdentical, handleBulkOverwrite } from '../utils/application-commands/ApplicationCommandRegistries';
import type { ApplicationCommandRegistry } from '../utils/application-commands/ApplicationCommandRegistry';
import { getNeededRegistryParameters } from '../utils/application-commands/getNeededParameters';
import { emitPerRegistryError } from '../utils/application-commands/registriesErrors';
import { PreconditionContainerArray } from '../utils/preconditions/PreconditionContainerArray';
import { FlagUnorderedStrategy } from '../utils/strategies/FlagUnorderedStrategy';
import { ChatInputParser } from '../parsers/ChatInputParser';

const ChannelTypes = Object.values(ChannelType).filter((type) => typeof type === 'number') as readonly ChannelType[];
const GuildChannelTypes = ChannelTypes.filter((type) => type !== ChannelType.DM && type !== ChannelType.GroupDM) as readonly ChannelType[];

export class Command<PreParseReturn = Args, Options extends Command.Options = Command.Options> extends AliasPiece<Options, 'commands'> {
	/**
	 * The raw name of the command as provided through file name or constructor options.
	 *
	 * This is exactly what is set by the developer, completely unmodified internally by the framework.
	 * Unlike the `name` which gets lowercased for storing it uniquely in the {@link CommandStore}.
	 */
	public rawName: string;

	/**
	 * A basic summary about the command
	 * @since 1.0.0
	 */
	public description: string;

	/**
	 * The preconditions to be run.
	 * @since 1.0.0
	 */
	public preconditions: PreconditionContainerArray;

	/**
	 * Longer version of command's summary and how to use it
	 * @since 1.0.0
	 */
	public detailedDescription: DetailedDescriptionCommand;

	/**
	 * The full category for the command, can be overridden by setting the {@link Command.Options.fullCategory} option.
	 *
	 * If {@link Command.Options.fullCategory} is not set, then:
	 * - If the command is loaded from the file system, then this is the command's location in file system relative to
	 *   the commands folder. For example, if you have a command located at `commands/General/Information/info.ts` then
	 *   this property will be `['General', 'Info']`.
	 * - If the command is virtual, then this will be `[]`.
	 *
	 * @since 2.0.0
	 */
	public readonly fullCategory: readonly string[];

	/**
	 * The strategy to use for the lexer.
	 * @since 1.0.0
	 */
	public strategy: IUnorderedStrategy;

	/**
	 * If {@link SapphireClient.typing} is true, it can be overridden for a specific command using this property, set via its options.
	 * Otherwise, this property will be ignored.
	 * @default true
	 */
	public typing: boolean;

	/**
	 * The application command registry associated with this command.
	 * @since 3.0.0
	 */
	public readonly applicationCommandRegistry = acquire(this.name);

	/**
	 * The lexer to be used for command parsing
	 * @since 1.0.0
	 * @private
	 */
	protected lexer: Lexer;

	/**
	 * @since 1.0.0
	 * @param context The context.
	 * @param options Optional Command settings.
	 */
	public constructor(context: Command.LoaderContext, options: Options = {} as Options) {
		const name = options.name ?? context.name;
		super(context, { ...options, name: name.toLowerCase() });

		this.rawName = name;
		this.description = options.description ?? '';
		this.detailedDescription = options.detailedDescription ?? '';
		this.strategy = new FlagUnorderedStrategy(options);
		this.fullCategory = options.fullCategory ?? this.location.directories;
		this.typing = options.typing ?? true;

		this.lexer = new Lexer({
			quotes: options.quotes ?? [
				['"', '"'], // Double quotes
				['“', '”'], // Fancy quotes (on iOS)
				['「', '」'], // Corner brackets (CJK)
				['«', '»'] // French quotes (guillemets)
			]
		});

		if (options.generateDashLessAliases) {
			const dashLessAliases: string[] = [];
			if (this.name.includes('-')) dashLessAliases.push(this.name.replace(/-/g, ''));
			for (const alias of this.aliases) if (alias.includes('-')) dashLessAliases.push(alias.replace(/-/g, ''));

			this.aliases = [...this.aliases, ...dashLessAliases];
		}

		if (options.generateUnderscoreLessAliases) {
			const underscoreLessAliases: string[] = [];
			if (this.name.includes('_')) underscoreLessAliases.push(this.name.replace(/_/g, ''));
			for (const alias of this.aliases) if (alias.includes('_')) underscoreLessAliases.push(alias.replace(/_/g, ''));

			this.aliases = [...this.aliases, ...underscoreLessAliases];
		}

		this.preconditions = new PreconditionContainerArray(options.preconditions);
		this.parseConstructorPreConditions(options);
	}

	/**
	 * The message pre-parse method. This method can be overridden by plugins to define their own argument parser.
	 * @param message The message that triggered the command.
	 * @param parameters The raw parameters as a single string.
	 * @param context The command-context used in this execution.
	 */
	public messagePreParse(message: Message, parameters: string, context: MessageCommand.RunContext): Awaitable<PreParseReturn> {
		const parser = new Parser(this.strategy);
		const args = new ArgumentStream(parser.run(this.lexer.run(parameters)));
		return new Args(message, this as Command, args, context) as PreParseReturn;
	}

	public chatInputPreParse(interaction: ChatInputCommandInteraction, context: ChatInputCommand.RunContext): Awaitable<PreParseReturn> {
		const args = new ChatInputParser(interaction);
		return new Args(interaction, this as Command, args, context) as PreParseReturn;
	}

	/**
	 * The main category for the command, if any.
	 *
	 * This getter retrieves the first value of {@link Command.fullCategory}, if it has at least one item, otherwise it
	 * returns `null`.
	 *
	 * @note You can set {@link Command.Options.fullCategory} to override the built-in category resolution.
	 */
	public get category(): string | null {
		return this.fullCategory.at(0) ?? null;
	}

	/**
	 * The sub-category for the command, if any.
	 *
	 * This getter retrieves the second value of {@link Command.fullCategory}, if it has at least two items, otherwise
	 * it returns `null`.
	 *
	 * @note You can set {@link Command.Options.fullCategory} to override the built-in category resolution.
	 */
	public get subCategory(): string | null {
		return this.fullCategory.at(1) ?? null;
	}

	/**
	 * The parent category for the command.
	 *
	 * This getter retrieves the last value of {@link Command.fullCategory}, if it has at least one item, otherwise it
	 * returns `null`.
	 *
	 * @note You can set {@link Command.Options.fullCategory} to override the built-in category resolution.
	 */
	public get parentCategory(): string | null {
		return this.fullCategory.at(-1) ?? null;
	}

	/**
	 * Executes the message command's logic.
	 * @param message The message that triggered the command.
	 * @param args The value returned by {@link Command.messagePreParse}, by default an instance of {@link Args}.
	 * @param context The context in which the command was executed.
	 */
	public messageRun?(message: Message, args: PreParseReturn, context: MessageCommand.RunContext): Awaitable<unknown>;

	/**
	 * Executes the application command's logic.
	 * @param interaction The interaction that triggered the command.
	 * @param context The chat input command run context.
	 */
	public chatInputRun?(interaction: ChatInputCommandInteraction, args: PreParseReturn, context: ChatInputCommand.RunContext): Awaitable<unknown>;

	/**
	 * Executes the context menu's logic.
	 * @param interaction The interaction that triggered the command.
	 * @param context The context menu command run context.
	 */
	public contextMenuRun?(interaction: ContextMenuCommandInteraction, context: ContextMenuCommand.RunContext): Awaitable<unknown>;

	/**
	 * Executes the autocomplete logic.
	 *
	 * :::tip
	 *
	 * You may use this, or alternatively create an {@link InteractionHandler interaction handler} to handle autocomplete interactions.
	 * Keep in mind that commands take precedence over interaction handlers.
	 *
	 * :::
	 *
	 * @param interaction The interaction that triggered the autocomplete.
	 */
	public autocompleteRun?(interaction: AutocompleteInteraction): Awaitable<unknown>;

	/**
	 * Defines the JSON.stringify behavior of the command.
	 */
	public override toJSON(): CommandJSON {
		return {
			...super.toJSON(),
			description: this.description,
			detailedDescription: this.detailedDescription,
			category: this.category
		};
	}

	/**
	 * Registers the application commands that should be handled by this command.
	 * @param registry This command's registry
	 */
	public registerApplicationCommands?(registry: ApplicationCommandRegistry): Awaitable<void>;

	/**
	 * Type-guard that ensures the command supports message commands by checking if the handler for it is present
	 */
	public supportsMessageCommands(): this is MessageCommand {
		return isFunction(Reflect.get(this, 'messageRun'));
	}

	/**
	 * Type-guard that ensures the command supports chat input commands by checking if the handler for it is present
	 */
	public supportsChatInputCommands(): this is ChatInputCommand {
		return isFunction(Reflect.get(this, 'chatInputRun'));
	}

	/**
	 * Type-guard that ensures the command supports context menu commands by checking if the handler for it is present
	 */
	public supportsContextMenuCommands(): this is ContextMenuCommand {
		return isFunction(Reflect.get(this, 'contextMenuRun'));
	}

	/**
	 * Type-guard that ensures the command supports handling autocomplete interactions by checking if the handler for it is present
	 */
	public supportsAutocompleteInteractions(): this is AutocompleteCommand {
		return isFunction(Reflect.get(this, 'autocompleteRun'));
	}

	public override async reload() {
		// Remove the aliases from the command store
		const { store } = this;
		const registry = this.applicationCommandRegistry;

		for (const nameOrId of registry.chatInputCommands) {
			const aliasedPiece = store.aliases.get(nameOrId);
			if (aliasedPiece === this) {
				store.aliases.delete(nameOrId);
			}
		}

		for (const nameOrId of registry.contextMenuCommands) {
			const aliasedPiece = store.aliases.get(nameOrId);
			if (aliasedPiece === this) {
				store.aliases.delete(nameOrId);
			}
		}

		// Reset the registry's contents
		registry.chatInputCommands.clear();
		registry.contextMenuCommands.clear();
		registry.guildIdsToFetch.clear();
		registry['apiCalls'].length = 0;

		// Reload the command
		await super.reload();

		// Get the command from the store to get any changes from the reload
		const updatedPiece = store.get(this.name);

		// This likely shouldn't happen but not worth continuing if the piece is somehow no longer available
		if (!updatedPiece) return;

		const updatedRegistry = updatedPiece.applicationCommandRegistry;

		if (updatedPiece.registerApplicationCommands) {
			// Rerun the registry
			try {
				await updatedPiece.registerApplicationCommands(updatedRegistry);
			} catch (err) {
				emitPerRegistryError(err, updatedPiece);
				// No point on continuing
				return;
			}
		}

		// If there are no API calls to execute then exit out early
		if (!updatedRegistry['apiCalls'].length) {
			return;
		}

		// If the default behavior is set to bulk overwrite, handle it as such and return.
		if (getDefaultBehaviorWhenNotIdentical() === RegisterBehavior.BulkOverwrite) {
			await handleBulkOverwrite(store, this.container.client.application!.commands);
			return;
		}

		// Re-initialize the store and the API data (insert in the store handles the register method)
		const { applicationCommands, globalCommands, guildCommands } = await getNeededRegistryParameters(updatedRegistry.guildIdsToFetch);

		// Handle the API calls
		// eslint-disable-next-line @typescript-eslint/dot-notation
		await updatedRegistry['runAPICalls'](applicationCommands, globalCommands, guildCommands);

		// Re-set the aliases
		for (const nameOrId of updatedRegistry.chatInputCommands) {
			store.aliases.set(nameOrId, updatedPiece);
		}

		for (const nameOrId of updatedRegistry.contextMenuCommands) {
			store.aliases.set(nameOrId, updatedPiece);
		}
	}

	/**
	 * Parses the command's options and processes them, calling {@link Command#parseConstructorPreConditionsRunIn},
	 * {@link Command#parseConstructorPreConditionsNsfw},
	 * {@link Command#parseConstructorPreConditionsRequiredClientPermissions}, and
	 * {@link Command#parseConstructorPreConditionsCooldown}.
	 * @since 2.0.0
	 * @param options The command options given from the constructor.
	 */
	protected parseConstructorPreConditions(options: Command.Options): void {
		this.parseConstructorPreConditionsRunIn(options);
		this.parseConstructorPreConditionsNsfw(options);
		this.parseConstructorPreConditionsRequiredClientPermissions(options);
		this.parseConstructorPreConditionsRequiredUserPermissions(options);
		this.parseConstructorPreConditionsCooldown(options);
	}

	/**
	 * Appends the `NSFW` precondition if {@link Command.Options.nsfw} is set to true.
	 * @param options The command options given from the constructor.
	 */
	protected parseConstructorPreConditionsNsfw(options: Command.Options) {
		parseConstructorPreConditionsNsfw(options.nsfw, this.preconditions);
	}

	/**
	 * Appends the `RunIn` precondition based on the values passed, defaulting to `null`, which doesn't add a
	 * precondition.
	 * @param options The command options given from the constructor.
	 */
	protected parseConstructorPreConditionsRunIn(options: Command.Options) {
		parseConstructorPreConditionsRunIn(options.runIn, this.resolveConstructorPreConditionsRunType.bind(this), this.preconditions);
	}

	/**
	 * Appends the `ClientPermissions` precondition when {@link Command.Options.requiredClientPermissions} resolves to a
	 * non-zero bitfield.
	 * @param options The command options given from the constructor.
	 */
	protected parseConstructorPreConditionsRequiredClientPermissions(options: Command.Options) {
		parseConstructorPreConditionsRequiredClientPermissions(options.requiredClientPermissions, this.preconditions);
	}

	/**
	 * Appends the `UserPermissions` precondition when {@link Command.Options.requiredUserPermissions} resolves to a
	 * non-zero bitfield.
	 * @param options The command options given from the constructor.
	 */
	protected parseConstructorPreConditionsRequiredUserPermissions(options: Command.Options) {
		parseConstructorPreConditionsRequiredUserPermissions(options.requiredUserPermissions, this.preconditions);
	}

	/**
	 * Appends the `Cooldown` precondition when {@link Command.Options.cooldownLimit} and
	 * {@link Command.Options.cooldownDelay} are both non-zero.
	 * @param options The command options given from the constructor.
	 */
	protected parseConstructorPreConditionsCooldown(options: Command.Options) {
		parseConstructorPreConditionsCooldown(
			this,
			options.cooldownLimit,
			options.cooldownDelay,
			options.cooldownScope,
			options.cooldownFilteredUsers,
			this.preconditions
		);
	}

	/**
	 * Resolves the {@link Command.Options.runIn} option into a {@link Command.RunInTypes} array.
	 * @param types The types to resolve.
	 * @returns The resolved types, or `null` if no types were resolved.
	 */
	protected resolveConstructorPreConditionsRunType(types: CommandRunInUnion): readonly ChannelType[] | null {
		if (isNullish(types)) return null;
		if (typeof types === 'number') return [types];
		if (typeof types === 'string') {
			switch (types) {
				case 'DM':
					return [ChannelType.DM];
				case 'GUILD_TEXT':
					return [ChannelType.GuildText];
				case 'GUILD_VOICE':
					return [ChannelType.GuildVoice];
				case 'GUILD_NEWS':
					return [ChannelType.GuildAnnouncement];
				case 'GUILD_NEWS_THREAD':
					return [ChannelType.AnnouncementThread];
				case 'GUILD_PUBLIC_THREAD':
					return [ChannelType.PublicThread];
				case 'GUILD_PRIVATE_THREAD':
					return [ChannelType.PrivateThread];
				case 'GUILD_ANY':
					return GuildChannelTypes;
				default:
					return null;
			}
		}

		// If there's no channel it can run on, throw an error:
		if (types.length === 0) {
			throw new Error(`${this.constructor.name}[${this.name}]: "runIn" was specified as an empty array.`);
		}

		if (types.length === 1) {
			return this.resolveConstructorPreConditionsRunType(types[0]);
		}

		const resolved = new Set<ChannelType>();
		for (const typeResolvable of types) {
			for (const type of this.resolveConstructorPreConditionsRunType(typeResolvable) ?? []) resolved.add(type);
		}

		// If all types were resolved, optimize to null:
		if (resolved.size === ChannelTypes.length) return null;

		// Return the resolved types in ascending order:
		return [...resolved].sort((a, b) => a - b);
	}

	public static runInTypeIsSpecificsObject(types: Command.Options['runIn']): types is CommandSpecificRunIn {
		if (!isObject(types)) {
			return false;
		}

		const specificTypes = types as CommandSpecificRunIn;
		return Boolean(specificTypes.chatInputRun || specificTypes.messageRun || specificTypes.contextMenuRun);
	}
}

export namespace Command {
	export type Options = CommandOptions;
	export type JSON = CommandJSON;
	/** @deprecated Use {@linkcode LoaderContext} instead. */
	export type Context = LoaderContext;
	export type LoaderContext = AliasPiece.LoaderContext<'commands'>;
	export type RunInTypes = CommandOptionsRunType;
	export type RunInUnion = CommandRunInUnion;
	export type SpecificRunIn = CommandSpecificRunIn;
	export type ChatInputCommandInteraction<Cached extends import('discord.js').CacheType = import('discord.js').CacheType> =
		import('discord.js').ChatInputCommandInteraction<Cached>;
	export type ContextMenuCommandInteraction<Cached extends import('discord.js').CacheType = import('discord.js').CacheType> =
		import('discord.js').ContextMenuCommandInteraction<Cached>;
	export type AutocompleteInteraction<Cached extends import('discord.js').CacheType = import('discord.js').CacheType> =
		import('discord.js').AutocompleteInteraction<Cached>;
	export type Registry = ApplicationCommandRegistry;
}
