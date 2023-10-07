import {
  ApplicationCommandOptionChoiceData,
  ApplicationCommandOptionType,
  ApplicationCommandSubCommandData,
  ApplicationCommandType,
  AutocompleteInteraction,
  CategoryChannel,
  Channel,
  Client,
  CommandInteraction,
  ContextMenuCommandInteraction,
  Guild as DiscordGuild,
  User as DiscordUser,
  DMChannel,
  GuildMember,
  InteractionReplyOptions,
  NewsChannel,
  Role,
  TextChannel,
} from 'discord.js';
import { i18n as I18n } from 'i18next';
import { Logger } from 'winston';

import { DrizzleClient } from '@ei/drizzle';
import { Category, Guild, GuildUser, User } from '@ei/drizzle/tables/schema';

export interface ContextMenuInfo {
  interaction: ContextMenuCommandInteraction;
  drizzle: DrizzleClient;
  i18n: I18n;
  logger: Logger;
  getUser: (user: Pick<DiscordUser, 'id'>) => Promise<User>;
  getGuildUser: (
    user: Pick<DiscordUser, 'id'>,
    guild: Pick<DiscordGuild, 'id'>,
  ) => Promise<GuildUser>;
  getGuild: (guild: Pick<DiscordGuild, 'id'>) => Promise<Guild>;
  getCategory: (category: Pick<CategoryChannel, 'id'>) => Promise<Category>;
}

export interface RouteInfo {
  msg: CommandInteraction | AutocompleteInteraction;
  absoluteParams: Array<string | DiscordUser | Role | Channel>;
  params: Array<string | DiscordUser | Role | Channel>;
  flags: Map<
    string,
    Array<string | DiscordUser | Role | Channel | boolean | number>
  >;
  readonly guildUser: GuildUser | null;
  readonly user: User;
  getUser: (user: Pick<DiscordUser, 'id'>) => Promise<User>;
  getGuildUser: (
    user: Pick<DiscordUser, 'id'>,
    guild: Pick<DiscordGuild, 'id'>,
  ) => Promise<GuildUser>;
  getGuild: (guild: Pick<DiscordGuild, 'id'>) => Promise<Guild>;
  getCategory: (category: Pick<CategoryChannel, 'id'>) => Promise<Category>;
  drizzle: DrizzleClient;
  i18n: I18n;
  logger: Logger;
}

export interface MsgRouteInfo extends RouteInfo {
  msg: CommandInteraction;
}

export interface AutocompleteRouteInfo extends RouteInfo {
  msg: AutocompleteInteraction;
}

type BothRouteInfo = DMMsgRouteInfo | GuildMsgRouteInfo;
type BothAutocompleteRouteInfo =
  | DMAutocompleteRouteInfo
  | GuildAutocompleteRouteInfo;

export interface DMMsgRouteInfo extends MsgRouteInfo {
  msg: CommandInteraction & {
    channel: DMChannel;
    guild: null;
    member: null;
  };
  readonly guildUser: null;
}

export interface DMAutocompleteRouteInfo extends MsgRouteInfo {
  msg: CommandInteraction & {
    channel: DMChannel;
    guild: null;
    member: null;
  };
  readonly guildUser: null;
}

export interface GuildMsgRouteInfo extends MsgRouteInfo {
  msg: CommandInteraction & {
    channel: TextChannel | NewsChannel;
    guild: DiscordGuild;
    member: GuildMember;
  };
  readonly guildUser: GuildUser;
}

export interface GuildAutocompleteRouteInfo extends MsgRouteInfo {
  msg: CommandInteraction & {
    channel: TextChannel | NewsChannel;
    guild: DiscordGuild;
    member: GuildMember;
  };
  readonly guildUser: GuildUser;
}

export type HandlerReturn = InteractionReplyOptions | string | null;

export type AutocompleteHandlerReturn = ApplicationCommandOptionChoiceData[];

export enum HandlerType {
  DM = 'dm',
  GUILD = 'guild',
  BOTH = 'both',
}

export interface BothHandler {
  (info: BothRouteInfo): HandlerReturn | Promise<HandlerReturn>;
}

export interface BothAutocompleteHandler {
  (
    info: BothAutocompleteRouteInfo,
  ): AutocompleteHandlerReturn | Promise<AutocompleteHandlerReturn>;
}

interface BothHandlerCombined {
  (info: BothRouteInfo): HandlerReturn | Promise<HandlerReturn>;
  autocomplete?: BothAutocompleteHandler;
  type: HandlerType.BOTH;
}

export interface DMHandler {
  (info: DMMsgRouteInfo): HandlerReturn | Promise<HandlerReturn>;
}

export interface DMAutocompleteHandler {
  (
    info: DMAutocompleteRouteInfo,
  ): AutocompleteHandlerReturn | Promise<AutocompleteHandlerReturn>;
}

interface DMHandlerCombined {
  (info: DMMsgRouteInfo): HandlerReturn | Promise<HandlerReturn>;
  autocomplete?: DMAutocompleteHandler;
  type: HandlerType.DM;
}

export interface GuildHandler {
  (info: GuildMsgRouteInfo): HandlerReturn | Promise<HandlerReturn>;
}

export interface GuildAutocompleteHandler {
  (
    info: GuildAutocompleteRouteInfo,
  ): AutocompleteHandlerReturn | Promise<AutocompleteHandlerReturn>;
}

interface GuildHandlerCombined {
  (info: GuildMsgRouteInfo): HandlerReturn | Promise<HandlerReturn>;
  autocomplete?: GuildAutocompleteHandler;
  type: HandlerType.GUILD;
}

interface RouteList {
  [path: string]:
    | Router
    | BothHandlerCombined
    | DMHandlerCombined
    | GuildHandlerCombined
    | undefined;
}

export interface IRouter {
  use(
    route: string,
    using: BothHandler,
    type?: HandlerType.BOTH,
    commandData?: Omit<ApplicationCommandSubCommandData, 'name' | 'type'>,
    autocomplete?: BothAutocompleteHandler,
  ): void;
  use(
    route: string,
    using: DMHandler,
    type: HandlerType.DM,
    commandData?: Omit<ApplicationCommandSubCommandData, 'name' | 'type'>,
    autocomplete?: DMAutocompleteHandler,
  ): void;
  use(
    route: string,
    using: GuildHandler,
    type: HandlerType.GUILD,
    commandData?: Omit<ApplicationCommandSubCommandData, 'name' | 'type'>,
    autocomplete?: GuildAutocompleteHandler,
  ): void;
  use(route: string, using: Router | BothHandler): void;
  use(
    route: string,
    using: Router | BothHandler | DMHandler | GuildHandler,
    type?: HandlerType,
    commandData?: Omit<ApplicationCommandSubCommandData, 'name' | 'type'>,
    autocomplete?: BothAutocompleteHandler,
  ): void;

  onInit?: (
    client: Client,
    drizzle: DrizzleClient,
    i18n: I18n,
    logger: Logger,
  ) => void | Promise<void>;
}

export type ContextMenuHandler = (
  info: ContextMenuInfo,
) =>
  | InteractionReplyOptions
  | string
  | Promise<InteractionReplyOptions | string>;
export interface ContextMenuHandlerInfo {
  type: Exclude<ApplicationCommandType, 'CHAT_INPUT'>;
  handler: ContextMenuHandler;
}

export default class Router implements IRouter {
  public readonly description: string;

  constructor(description: string) {
    this.description = description;
  }

  private routes: RouteList = {};

  private _isInitialized: boolean = false;

  public get isInitialized() {
    // eslint-disable-next-line no-underscore-dangle
    return this._isInitialized;
  }

  public commandDataList: Map<
    string,
    Omit<ApplicationCommandSubCommandData, 'name'>
  > = new Map();

  public contextHandlers: Map<string, ContextMenuHandlerInfo> = new Map();

  // Met use geef je aan welk commando waarheen gaat
  use(
    route: string,
    using: BothHandler,
    type?: HandlerType.BOTH,
    commandData?: Omit<ApplicationCommandSubCommandData, 'name' | 'type'>,
    autocomplete?: BothAutocompleteHandler,
  ): void;

  use(
    route: string,
    using: DMHandler,
    type: HandlerType.DM,
    commandData?: Omit<ApplicationCommandSubCommandData, 'name' | 'type'>,
    autocomplete?: DMAutocompleteHandler,
  ): void;

  use(
    route: string,
    using: GuildHandler,
    type: HandlerType.GUILD,
    commandData?: Omit<ApplicationCommandSubCommandData, 'name' | 'type'>,
    autocomplete?: GuildAutocompleteHandler,
  ): void;

  use(route: string, using: Router | BothHandler): void;

  use(
    route: string,
    using: Router | BothHandler | DMHandler | GuildHandler,
    type: HandlerType = HandlerType.BOTH,
    commandData?: Omit<ApplicationCommandSubCommandData, 'name' | 'type'>,
    autocomplete?:
      | BothAutocompleteHandler
      | GuildAutocompleteHandler
      | DMAutocompleteHandler,
  ): void {
    const newUsing = <
      Router | BothHandlerCombined | DMHandlerCombined | GuildHandlerCombined
    >using;

    if (this.routes[route.toUpperCase()])
      throw new Error('This Route Already Exists');

    if (!(newUsing instanceof Router)) {
      newUsing.type = type;
      if (!newUsing.autocomplete) newUsing.autocomplete = autocomplete;
    }

    this.routes[route.toUpperCase()] = newUsing;

    if (commandData) {
      this.commandDataList.set(route.toLowerCase(), {
        ...commandData,
        type: ApplicationCommandOptionType.Subcommand,
      });
    }
  }

  public useContext(
    name: string,
    type: Exclude<ApplicationCommandType, 'CHAT_INPUT'>,
    handler: ContextMenuHandler,
  ): void {
    if (this.contextHandlers.has(name))
      throw new Error('There is already a context menu handler with that name');

    this.contextHandlers.set(name, {
      type,
      handler,
    });
  }

  // INTERNAL
  // Zorgt dat de commando's op de goede plek terecht komen
  public handle(
    info: AutocompleteRouteInfo,
  ): Promise<AutocompleteHandlerReturn>;

  public handle(info: MsgRouteInfo): Promise<HandlerReturn>;

  public handle(
    info: MsgRouteInfo | AutocompleteRouteInfo,
  ): Promise<HandlerReturn | AutocompleteHandlerReturn> {
    return new Promise((resolve, reject) => {
      const currentRoute = info.params[0];

      let handler:
        | Router
        | BothHandlerCombined
        | DMHandlerCombined
        | GuildHandlerCombined
        | undefined;
      const newInfo = info;

      if (typeof currentRoute === 'string') {
        const nameHandler = this.routes[currentRoute.toUpperCase()];

        if (nameHandler) {
          const newParams = [...info.params];
          newParams.shift();

          newInfo.params = newParams;
          handler = nameHandler;
        }
      }

      if (!handler) {
        handler = this.routes.HELP;
      }

      const isAutocomplete = newInfo.msg instanceof AutocompleteInteraction;
      if (handler) {
        if (handler instanceof Router) {
          handler
            .handle(<MsgRouteInfo>newInfo)
            .then(resolve)
            .catch(reject);
        } else {
          try {
            let handling:
              | HandlerReturn
              | AutocompleteHandlerReturn
              | Promise<HandlerReturn | AutocompleteHandlerReturn>;

            if (handler.type === HandlerType.DM) {
              if (newInfo.msg.guild) {
                if (!isAutocomplete)
                  handling = newInfo.i18n.t('error.onlyUsableOnGuild');
                else {
                  handling = [
                    {
                      name:
                        newInfo.i18n.t('error.onlyUsableOnGuild') ||
                        'onlyInGuild',
                      value: 'onlyInGuild',
                    },
                  ];
                }
              } else if (!isAutocomplete)
                handling = handler(<DMMsgRouteInfo>newInfo);
              else if (handler.autocomplete) {
                handling = handler.autocomplete(
                  <DMAutocompleteRouteInfo>newInfo,
                );
              } else {
                handling = [
                  {
                    name: 'No Autocomplete Handler Present',
                    value: 'noAutoComplete',
                  },
                ];
              }
            } else if (handler.type === HandlerType.GUILD) {
              if (!newInfo.msg.guild) {
                if (!isAutocomplete)
                  handling = newInfo.i18n.t('error.onlyUsableOnDM');
                else {
                  handling = [
                    {
                      name:
                        newInfo.i18n.t('error.onlyUsableOnGuild') ||
                        'onlyInGuild',
                      value: 'onlyInGuild',
                    },
                  ];
                }
              } else if (!isAutocomplete)
                handling = handler(<GuildMsgRouteInfo>newInfo);
              else if (handler.autocomplete) {
                handling = handler.autocomplete(
                  <GuildAutocompleteRouteInfo>newInfo,
                );
              } else {
                handling = [
                  {
                    name: 'No Autocomplete Handler Present',
                    value: 'noAutoComplete',
                  },
                ];
              }
            } else if (!isAutocomplete)
              handling = handler(<BothRouteInfo>newInfo);
            else if (handler.autocomplete) {
              handling = handler.autocomplete(
                <BothAutocompleteRouteInfo>newInfo,
              );
            } else {
              handling = [
                {
                  name: 'No Autocomplete Handler Present',
                  value: 'noAutoComplete',
                },
              ];
            }

            if (handling instanceof Promise)
              handling.then(resolve).catch(reject);
            else resolve(handling);
          } catch (err) {
            reject(err);
          }
        }
      } else if (!isAutocomplete) {
        resolve(
          `Ja ik heb toch geen idee wat \`${info.absoluteParams
            .map((param) => {
              if (typeof param === 'string') return param;
              if (param instanceof Role) return `@${param.name}`;
              if (param instanceof DiscordUser) return `@${param.username}`;
              return '[UNKNOWN]';
            })
            .join(' ')}\` moet betekenen`,
        );
      } else {
        resolve([
          { name: 'No Autocomplete Handler Present', value: 'noAutoComplete' },
        ]);
      }
    });
  }

  protected initialize(
    client: Client,
    drizzle: DrizzleClient,
    i18n: I18n,
    logger: Logger,
  ) {
    Object.values(this.routes).forEach((route) => {
      if (route instanceof Router && !route.isInitialized) {
        route.initialize(client, drizzle, i18n, logger);
      }
    });

    if (this.onInit) {
      this.onInit(client, drizzle, i18n, logger);
      // eslint-disable-next-line no-underscore-dangle
      this._isInitialized = true;
    }
  }

  public onInit?: (
    client: Client,
    orm: DrizzleClient,
    i18n: I18n,
    logger: Logger,
  ) => void | Promise<void>;
}
