import {
	acquire,
	getBulkOverwriteRetries,
	getDefaultBehaviorWhenNotIdentical,
	getDefaultGuildIds,
	registries,
	setBulkOverwriteRetries,
	setDefaultBehaviorWhenNotIdentical,
	setDefaultGuildIds
} from './lib/utils/application-commands/ApplicationCommandRegistries';
import type { ApplicationCommandRegistry } from './lib/utils/application-commands/ApplicationCommandRegistry';
import { CorePrecondition as ClientPermissions, type PermissionPreconditionContext } from './preconditions/ClientPermissions';
import { CorePrecondition as Cooldown, type CooldownPreconditionContext } from './preconditions/Cooldown';
import { CorePrecondition as DMOnly } from './preconditions/DMOnly';
import { CorePrecondition as Enabled } from './preconditions/Enabled';
import { CorePrecondition as GuildNewsOnly } from './preconditions/GuildNewsOnly';
import { CorePrecondition as GuildNewsThreadOnly } from './preconditions/GuildNewsThreadOnly';
import { CorePrecondition as GuildOnly } from './preconditions/GuildOnly';
import { CorePrecondition as GuildPrivateThreadOnly } from './preconditions/GuildPrivateThreadOnly';
import { CorePrecondition as GuildPublicThreadOnly } from './preconditions/GuildPublicThreadOnly';
import { CorePrecondition as GuildTextOnly } from './preconditions/GuildTextOnly';
import { CorePrecondition as GuildThreadOnly } from './preconditions/GuildThreadOnly';
import { CorePrecondition as GuildVoiceOnly } from './preconditions/GuildVoiceOnly';
import { CorePrecondition as NSFW } from './preconditions/NSFW';
import { CorePrecondition as RunIn } from './preconditions/RunIn';
import { CorePrecondition as UserPermissions } from './preconditions/UserPermissions';

const ApplicationCommandRegistries = {
	acquire,
	setDefaultBehaviorWhenNotIdentical,
	setDefaultGuildIds,
	setBulkOverwriteRetries,
	getDefaultGuildIds,
	getDefaultBehaviorWhenNotIdentical,
	getBulkOverwriteRetries,
	get registries(): ReadonlyMap<string, ApplicationCommandRegistry> {
		return registries;
	}
};

export {
	AliasPiece,
	AliasStore,
	LoaderError,
	MissingExportsError,
	Piece,
	Store,
	StoreRegistry,
	container,
	type AliasPieceJSON,
	type AliasPieceOptions,
	type Container,
	type LoaderPieceContext,
	type PieceContext, // eslint-disable-line deprecation/deprecation
	type PieceJSON,
	type PieceLocationJSON,
	type PieceOf,
	type PieceOptions,
	type StoreManagerManuallyRegisteredPiece,
	type StoreManuallyRegisteredPiece,
	type StoreOf,
	type StoreOptions,
	type StoreRegistryEntries,
	type StoreRegistryKey,
	type StoreRegistryValue
} from '@sapphire/pieces';
export * from '@sapphire/result';
export type { Awaitable } from '@sapphire/utilities';
export * from './lib/SapphireClient';
export * from './lib/errors/ArgumentError';
export * from './lib/errors/Identifiers';
export * from './lib/errors/PreconditionError';
export * from './lib/errors/UserError';
export * from './lib/parsers/Args';
export * from './lib/parsers/ChatInputCommandArgs';
export * from './lib/parsers/MessageArgs';
export * from './lib/plugins/Plugin';
export * from './lib/plugins/PluginManager';
export * from './lib/plugins/symbols';
export * as PreconditionResolvers from './lib/precondition-resolvers/index';
export type { EmojiObject } from './lib/resolvers/emoji';
export * as Resolvers from './lib/resolvers/index';
export type { MessageResolverOptions } from './lib/resolvers/message';
export * from './lib/structures/Argument';
export * from './lib/structures/ArgumentStore';
export * from './lib/structures/Command';
export * from './lib/structures/CommandStore';
export * from './lib/structures/InteractionHandler';
export * from './lib/structures/InteractionHandlerStore';
export * from './lib/structures/Listener';
export * from './lib/structures/ListenerLoaderStrategy';
export * from './lib/structures/ListenerStore';
export * from './lib/structures/Precondition';
export * from './lib/structures/PreconditionStore';
export * from './lib/types/ArgumentContexts';
export * from './lib/types/CommandTypes';
export * from './lib/types/Enums';
export * from './lib/types/Events';
export {
	ApplicationCommandRegistry,
	type ApplicationCommandRegistryRegisterOptions
} from './lib/utils/application-commands/ApplicationCommandRegistry';
export * from './lib/utils/logger/ILogger';
export * from './lib/utils/logger/Logger';
export * from './lib/utils/preconditions/IPreconditionContainer';
export * from './lib/utils/preconditions/PreconditionContainerArray';
export * from './lib/utils/preconditions/PreconditionContainerSingle';
export * from './lib/utils/preconditions/conditions/IPreconditionCondition';
export * from './lib/utils/preconditions/conditions/PreconditionConditionAnd';
export * from './lib/utils/preconditions/conditions/PreconditionConditionOr';
export * from './lib/utils/preconditions/containers/ClientPermissionsPrecondition';
export * from './lib/utils/preconditions/containers/UserPermissionsPrecondition';
export { ApplicationCommandRegistries };

/* eslint-disable deprecation/deprecation */
export const CorePreconditions = {
	ClientPermissions,
	Cooldown,
	/** @deprecated Use {@link RunIn} instead. */
	DMOnly,
	Enabled,
	RunIn,
	/** @deprecated Use {@link RunIn} instead. */
	GuildNewsOnly,
	/** @deprecated Use {@link RunIn} instead. */
	GuildNewsThreadOnly,
	/** @deprecated Use {@link RunIn} instead. */
	GuildOnly,
	/** @deprecated Use {@link RunIn} instead. */
	GuildPrivateThreadOnly,
	/** @deprecated Use {@link RunIn} instead. */
	GuildPublicThreadOnly,
	/** @deprecated Use {@link RunIn} instead. */
	GuildTextOnly,
	/** @deprecated Use {@link RunIn} instead. */
	GuildVoiceOnly,
	/** @deprecated Use {@link RunIn} instead. */
	GuildThreadOnly,
	NSFW,
	UserPermissions
};
/* eslint-enable deprecation/deprecation */

export namespace CorePreconditions {
	export type UserPermissionsPreconditionContext = PermissionPreconditionContext;
	export type CooldownContext = CooldownPreconditionContext;
}

/**
 * The [@sapphire/framework](https://github.com/sapphiredev/framework) version that you are currently using.
 * An example use of this is showing it of in a bot information command.
 *
 * Note to Sapphire developers: This needs to explicitly be `string` so it is not typed as the string that gets replaced by esbuild
 */
// eslint-disable-next-line @typescript-eslint/no-inferrable-types
export const version: string = '[VI]{{inject}}[/VI]';
