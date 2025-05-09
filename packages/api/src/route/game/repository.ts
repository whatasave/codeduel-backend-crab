import type { Database, Select } from '@codeduel-backend-crab/database';
import type { Game } from './data';

export class GameRepository {
  constructor(private readonly db: Database) {}

  async byId(id: Game['id']): Promise<Game | undefined> {
    const game = await this.db
      .selectFrom('game')
      .where('id', '=', id)
      .innerJoin('user as host', (join) => join.onRef('host_id', '=', 'host.id'))
      .innerJoin('challenge', (join) => join.onRef('challenge_id', '=', 'challenge.id'))
      .innerJoin('user as challenge_owner', (join) =>
        join.onRef('challenge.owner_id', '=', 'challenge_owner.id')
      )
      .select([
        'game.id',
        'game.max_players',
        'game.allowed_languages',
        'game.duration',
        'game.ended_at',
        'game.updated_at',
        'game.created_at',
        'host.id as host_id',
        'host.username as host_username',
        'host.name as host_name',
        'host.avatar as host_avatar',
        'host.background_image as host_background_image',
        'host.biography as host_biography',
        'host.created_at as host_created_at',
        'host.updated_at as host_updated_at',
        'challenge.id as challenge_id',
        'challenge.title as challenge_title',
        'challenge.description as challenge_description',
        'challenge.content as challenge_content',
        'challenge.owner_id as challenge_owner_id',
        'challenge.created_at as challenge_created_at',
        'challenge.updated_at as challenge_updated_at',
        'challenge_owner.id as challenge_owner_id',
        'challenge_owner.username as challenge_owner_username',
        'challenge_owner.name as challenge_owner_name',
        'challenge_owner.avatar as challenge_owner_avatar',
        'challenge_owner.background_image as challenge_owner_background_image',
        'challenge_owner.biography as challenge_owner_biography',
        'challenge_owner.created_at as challenge_owner_created_at',
        'challenge_owner.updated_at as challenge_owner_updated_at',
      ])
      .executeTakeFirst();

    return game && this.selectToGame(game);
  }

  private selectToGame(
    game: Select<'game'> &
      Select<'user', 'host_'> &
      Select<'challenge', 'challenge_'> &
      Select<'user', 'challenge_owner_'>
  ): Game {
    return {
      id: game.id,
      host: {
        id: game.host_id,
        username: game.host_username,
        name: game.host_name ?? undefined,
        avatar: game.host_avatar ?? undefined,
        backgroundImage: game.host_background_image ?? undefined,
        biography: game.host_biography ?? undefined,
        createdAt: game.host_created_at.toISOString(),
        updatedAt: game.host_updated_at.toISOString(),
      },
      challenge: {
        id: game.challenge_id,
        owner: {
          id: game.challenge_owner_id,
          username: game.challenge_owner_username,
          name: game.challenge_owner_name ?? undefined,
          avatar: game.challenge_owner_avatar ?? undefined,
          backgroundImage: game.challenge_owner_background_image ?? undefined,
          biography: game.challenge_owner_biography ?? undefined,
          createdAt: game.challenge_owner_created_at.toISOString(),
          updatedAt: game.challenge_owner_updated_at.toISOString(),
        },
        title: game.challenge_title,
        description: game.challenge_description,
        content: game.challenge_content,
        createdAt: game.challenge_created_at.toISOString(),
        updatedAt: game.challenge_updated_at.toISOString(),
      },
      maxPlayers: game.max_players,
      allowedLanguages: game.allowed_languages as string[],
      duration: game.duration,
      endedAt: game.ended_at ? game.ended_at.toISOString() : undefined,
    };
  }
}
