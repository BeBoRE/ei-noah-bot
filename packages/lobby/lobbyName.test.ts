import { describe, expect, it } from 'vitest';

import { ChannelType, generateLobbyName } from '.';

describe('generateLobbyName', () => {
  const owner = { displayName: 'owner' };

  it('should return template name with lobby type icon if none provided', () => {
    expect(generateLobbyName(ChannelType.Public, owner)).toStrictEqual({
      full: "🔊 owner's Lobby",
      icon: '🔊',
      name: "owner's Lobby",
    });

    expect(generateLobbyName(ChannelType.Mute, owner)).toStrictEqual({
      full: "🙊 owner's Lobby",
      icon: '🙊',
      name: "owner's Lobby",
    });

    expect(generateLobbyName(ChannelType.Nojoin, owner)).toStrictEqual({
      full: "🔐 owner's Lobby",
      icon: '🔐',
      name: "owner's Lobby",
    });
  });

  it('should return null if only provided icon', () => {
    expect(generateLobbyName(ChannelType.Public, owner, '🍔')).toStrictEqual(
      null,
    );
  });

  it('should return null if name too long', () => {
    expect(
      generateLobbyName(ChannelType.Public, owner, 'a'.repeat(96)),
    ).toStrictEqual(null);
  });

  it('should return replaced emoji if provided icon is lobbyType icon or text channel icon', () => {
    expect(
      generateLobbyName(ChannelType.Public, owner, '🔊 custom'),
    ).toStrictEqual({
      full: '🔊 custom',
      icon: '🔊',
      name: 'custom',
    });

    expect(generateLobbyName(ChannelType.Mute, owner, '🔐 abc')).toStrictEqual({
      full: '🙊 abc',
      icon: '🙊',
      name: 'abc',
    });

    expect(
      generateLobbyName(ChannelType.Nojoin, owner, '🙊 abc'),
    ).toStrictEqual({
      full: '🔐 abc',
      icon: '🔐',
      name: 'abc',
    });

    expect(
      generateLobbyName(ChannelType.Public, owner, '🔊 custom'),
    ).toStrictEqual({
      full: '🔊 custom',
      icon: '🔊',
      name: 'custom',
    });

    expect(generateLobbyName(ChannelType.Mute, owner, '🔊 abc')).toStrictEqual({
      full: '🙊 abc',
      icon: '🙊',
      name: 'abc',
    });

    expect(
      generateLobbyName(ChannelType.Nojoin, owner, '🔊 abc'),
    ).toStrictEqual({
      full: '🔐 abc',
      icon: '🔐',
      name: 'abc',
    });
  });

  it('should return name with custom emoji if provided', () => {
    expect(
      generateLobbyName(ChannelType.Public, owner, '🍔 custom'),
    ).toStrictEqual({
      full: '🍔 custom',
      icon: '🍔',
      name: 'custom',
    });

    expect(
      generateLobbyName(ChannelType.Mute, owner, '🍔 custom'),
    ).toStrictEqual({
      full: '🍔 custom',
      icon: '🍔',
      name: 'custom',
    });

    expect(
      generateLobbyName(ChannelType.Nojoin, owner, '🍔 custom'),
    ).toStrictEqual({
      full: '🍔 custom',
      icon: '🍔',
      name: 'custom',
    });
  });
});
