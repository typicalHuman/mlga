import { formatTree } from "./formatter";
import { parseLogs } from "./parser";
import { styleTree } from "./styler";

export function FormatLogsToTree(logs: string) {
  const parsedTrees = parseLogs(logs);
  const styledTrees = [];
  for (let i = 0; i < parsedTrees.length; i++) {
    const formattedTree = formatTree(parsedTrees[i]);
    styledTrees.push(styleTree(null, formattedTree));
  }
  return styledTrees;
}
