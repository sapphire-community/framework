import type { Parameter } from '@sapphire/lexure';
import type { Option, Result } from '@sapphire/result';
import type { CommandInteractionOption } from 'discord.js';

export type Arg = string | CommandInteractionOption;

export interface Parser {
	reset(): void;

	save(): unknown;

	restore(state: unknown): void;

	single(): Option<Arg>;

	singleMap<T>(predicate: (value: Arg) => Option<T>, useAnyways?: boolean): Option<T>;

	singleParseAsync<T, E>(predicate: (arg: Arg) => Promise<Result<T, E>>, useAnyways?: boolean): Promise<Result<T, E | null>>;

	many(): Option<Parameter[]>;

	flag(...names: string[]): boolean;

	option(...names: string[]): Option<string>;

	options(...names: string[]): Option<readonly string[]>;

	finished: boolean;
}
