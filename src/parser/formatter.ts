import { LogNode } from "../types/tree";
import { isContractCreation, isVmOperation } from "./filter";

export function formatTree(tree: LogNode) {
  formatNode(tree);
  if (tree.children.length === 0) {
    return tree;
  }
  handleContractCreation(tree);
  handleAccountCreation(tree);
  for (let i = 0; i < tree.children.length; i++) {
    formatTree(tree.children[i]);
  }
  return tree;
}
export function removeExcessFromLabel(label: string) {
  return label
    .replace(/[│├└─←→]/g, "")
    .replace(/\[\d+\]/g, "")
    .trimStart()
    .trimEnd();
}

function formatNode(node: LogNode) {
  node.label = shortenEthereumAddresses(
    node.label.replace(/\[Return\]( \d+ bytes of code)/g, "[Deployed]$1")
  );
}
function shortenEthereumAddresses(input: string): string {
  const addressRegex = /(?<![a-zA-Z0-9])0x[a-fA-F0-9]{40}(?![a-zA-Z0-9])/g;
  return input.replace(addressRegex, (match) => {
    const shortened = `${match.slice(0, 8)}...${match.slice(-6)}`;
    return shortened;
  });
}

function handleContractCreation(tree: LogNode) {
  if (isContractCreation(tree.label)) {
    const child = tree.children.find(
      (item) =>
        item.label.includes("[Deployed]") || item.label.includes("[Return]")
    );
    if (child) {
      tree.label = `${tree.label} (${child.label
        .replace("[Deployed] ", "")
        .replace("[Return] ", "")
        .replace(" of code", "")})`;
      tree.children = tree.children.filter(
        (item) => item.label !== child.label
      );
    }
  }
}

function handleAccountCreation(tree: LogNode) {
  if (isVmOperation(tree.label) && tree.label.startsWith("VM::addr")) {
    const child = tree.children[0];
    tree.label = tree.label
      .replace("<pk>", `${child.label.replace("[Return] ", "")}`)
      .replace("VM::addr", "VM::createAddr");
    tree.children = [];
  }
}
