import { LogNode } from "../types/tree";
import { removeExcessFromLabel } from "./formatter";

function extractTraces(logs: string) {
  const regex = /(?<=Traces:)[\s\S]*?(?=\n(\[PASS\]|\[FAIL\]|Suite result))/g;
  const matches = [...logs.matchAll(regex)];
  const combinedResult = matches.map((match) => match[0].trim()).join("\n");
  return combinedResult;
}

export function parseLogs(logs: string) {
  const lines = extractTraces(logs)
    .trim()
    .split("\n")
    .map((item) => ({
      value: removeExcessFromLabel(item),
      level: (item.match(/[│├└]/g) || []).length,
    }))
    .filter((item) => item.value !== "");
  const trees = [];
  for (let k = 0; k < lines.length; ) {
    const tree: LogNode = {
      label: lines[k].value,
      children: [],
    };
    let i = k + 1;
    for (; i < lines.length; i++) {
      if (lines[i].level === 0) {
        break;
      }
      let children = tree.children;
      let counter = 1;
      while (
        lines[i].level > counter &&
        children[children.length - 1] &&
        children[children.length - 1].children
      ) {
        children = children[children.length - 1].children;
        counter++;
      }
      const formattedValue = removeExcessFromLabel(lines[i].value);

      if (formattedValue !== "[Stop]" && formattedValue !== "[Return]") {
        children.push({
          label: formattedValue,
          children: [],
        });
      }
    }
    trees.push(tree);
    k = i;
  }

  return trees;
}
