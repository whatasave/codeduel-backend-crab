import type { Kysely } from 'kysely';
import type { DB } from '../src/database';

export async function seed(db: Kysely<DB>): Promise<void> {
  const { id: owner_id } = await db
    .insertInto('user')
    .values({
      username: 'Codeduel',
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  const { id: challenge_id } = await db
    .insertInto('challenge')
    .values({
      owner_id,
      title: 'Two Sum',
      description:
        'Given an array of integers, return indices of the two numbers such that they add up to a specific target.',
      content: `# Two Sum
Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

## Example 1
**Input:** \`nums = [2,7,11,15], target = 9\`

**Output:** \`[0,1]\`

**Explanation:** Because \`nums[0] + nums[1] == 9\`, we return \`[0, 1]\`.

## Example 2
**Input:** \`nums = [3,2,4], target = 6\`

**Output:** \`[1,2]\`

**Explanation:** Because \`nums[1] + nums[2] == 6\`, we return \`[1, 2]\`.

## Example 3
**Input:** \`nums = [3,3], target = 6\`

**Output:** \`[0,1]\`

**Explanation:** Because \`nums[0] + nums[1] == 6\`, we return \`[0, 1]\`.

## Constraints
* \`2 <= nums.length <= 10^4\`
* \`-10^9 <= nums[i] <= 10^9\`
* \`-10^9 <= target <= 10^9\``,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  await db
    .insertInto('test_case')
    .values([
      {
        challenge_id,
        input: '9\n4\n2 7 11 15',
        output: '0 1',
        hidden: false,
      },
      {
        challenge_id,
        input: '6\n3\n3 2 4',
        output: '1 2',
        hidden: false,
      },
      {
        challenge_id,
        input: '6\n2\n3 3',
        output: '0 1',
        hidden: false,
      },
      {
        challenge_id,
        input: '0\n2\n0 0',
        output: '0 1',
        hidden: true,
      },
    ])
    .returningAll()
    .execute();
}
