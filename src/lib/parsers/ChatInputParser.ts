import { type CommandInteraction } from 'discord.js';
import type { Arg, Parser } from './Parser';
import { Option, Result } from '@sapphire/result';
import { type Parameter } from '@sapphire/lexure';

export class ChatInputParser implements Parser {
	public position: number = 0;

	public constructor(public interaction: CommandInteraction) {}

	public get finished(): boolean {
		return this.position === this.interaction.options.data.length;
	}

	public reset(): void {
		this.position = 0;
	}

	public save(): number {
		return this.position;
	}

	public restore(state: number): void {
		this.position = state;
	}

	public single(): Option<Arg> {
		if (this.finished) return Option.none;
		return Option.some(this.interaction.options.data[this.position++]);
	}

	public singleMap<T>(predicate: (value: Arg) => Option<T>, useAnyways?: boolean): Option<T> {
		if (this.finished) return Option.none;

		const result = predicate(this.interaction.options.data[this.position]);
		if (result.isSome() || useAnyways) {
			this.position++;
		}
		return result;
	}

	public async singleParseAsync<T, E>(predicate: (arg: Arg) => Promise<Result<T, E>>, useAnyways?: boolean): Promise<Result<T, E | null>> {
		if (this.finished) return Result.err(null);

		const result = await predicate(this.interaction.options.data[this.position]);
		if (result.isOk() || useAnyways) {
			this.position++;
		}
		return result;
	}

	// TODO: This method doesn't really make sense for slash commands. Currently tries to convert CommandInteractionOptions back to strings. Any suggestions?
	public many(): Option<Parameter[]> {
		const parameters: Parameter[] = [];
		for (const option of this.interaction.options.data) {
			const keys = ['value', 'user', 'member', 'channel', 'role', 'attachment', 'message'] as const;
			let value = '';
			for (const key of keys) {
				const optionValue = option[key];
				if (optionValue) {
					// eslint-disable-next-line @typescript-eslint/no-base-to-string
					value = optionValue.toString();
					break;
				}
			}

			parameters.push({ value, raw: value, separators: [], leading: '' });
		}

		return parameters.length === 0 ? Option.none : Option.some(parameters);
	}

	public flag(..._names: string[]): boolean {
		// TODO: Figure out what to do for slash commands
		return false;
	}

	public option(..._names: string[]): Option<string> {
		// TODO: Figure out what to do for slash commands
		return Option.none;
	}

	public options(..._names: string[]): Option<string[]> {
		// TODO: Figure out what to do for slash commands
		return Option.none;
	}
}
