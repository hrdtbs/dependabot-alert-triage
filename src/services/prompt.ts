import { select } from "@inquirer/prompts";
import type { UserInfo, OrgInfo, ScopeSelection } from "../types.js";

export async function selectScope(
  user: UserInfo,
  orgs: OrgInfo[]
): Promise<ScopeSelection> {
  const choices: Array<{ name: string; value: ScopeSelection }> = [
    {
      name: `個人アカウント (${user.login})`,
      value: { type: "user", login: user.login },
    },
    ...orgs.map((org) => ({
      name: `Organization: ${org.login}${org.description ? ` - ${org.description}` : ""}`,
      value: { type: "org" as const, org: org.login },
    })),
  ];

  if (choices.length === 1) {
    console.error(`Using personal account: ${user.login}`);
    return choices[0].value;
  }

  return select<ScopeSelection>({
    message: "スコープを選択してください:",
    choices,
  });
}
