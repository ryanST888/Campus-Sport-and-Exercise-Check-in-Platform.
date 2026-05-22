export type AccountLevel = "top" | "medium" | "basic" | "student";

export const currentAccount = {
  id: "principal",
  name: "校长/体育主管",
  level: "top" as AccountLevel,
};

export function canManageSettings(account = currentAccount) {
  return account.level === "top";
}
