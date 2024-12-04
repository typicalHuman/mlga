import { LogNode, StyledLogNode, ViewLogNode } from "../types/tree";
import * as vscode from "vscode";
import {
  isConsoleLog,
  isContractCreation,
  isEvent,
  isReturn,
  isVmOperation,
} from "./filter";

export function findRoot(label: string, trees: StyledLogNode[]) {
  for (let i = 0; i < trees.length; i++) {
    const foundRoot = _findRoot(label, trees[i]);
    if (foundRoot) {
      return foundRoot;
    }
  }
  return null;
}

function _findRoot(label: string, tree: StyledLogNode): StyledLogNode | null {
  if (tree.label === label) {
    return tree;
  }

  if (Array.isArray(tree.children)) {
    for (let child of tree.children) {
      const result: any = _findRoot(label, child);
      if (result) {
        return result;
      }
    }
  }

  return null;
}
export function filterNode(filter: string, tree: StyledLogNode): boolean {
  if (tree.label.toLowerCase().includes(filter.toLowerCase())) {
    return true;
  }

  if (Array.isArray(tree.children)) {
    for (let child of tree.children) {
      const result: boolean = filterNode(filter, child);
      if (result) {
        return result;
      }
    }
  }

  return false;
}

export function styleTree(root: StyledLogNode | null, tree: LogNode) {
  const styledNode = styleNode(root, tree);
  if (tree.children.length === 0) {
    return styledNode;
  }
  const children: StyledLogNode[] = [];
  for (let i = 0; i < tree.children.length; i++) {
    children.push(styleTree(styledNode, tree.children[i]));
  }
  styledNode.children = children;
  return styledNode;
}

function styleNode(root: StyledLogNode | null, node: LogNode): StyledLogNode {
  const styledNode: ViewLogNode = {
    label: node.label,
    children: node.children,
    collapsibleState:
      node.children.length > 0
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None,
    ...getStyleByText(
      root,
      node.label,
      root !== null && root.children.length === 1 && node.children.length === 0
    ),
  };
  return styledNode as StyledLogNode;
}

function getStyleByText(
  root: StyledLogNode | null,
  label: string,
  inherit = true
): {
  iconPath: vscode.ThemeIcon;
  contextValue: string;
} {
  if (isContractCreation(label)) {
    return {
      contextValue: "new",
      iconPath: new vscode.ThemeIcon("search-new-editor"),
    };
  }
  if (isVmOperation(label)) {
    return {
      contextValue: "vm",
      iconPath: new vscode.ThemeIcon("settings-view-bar-icon"),
    };
  }
  if (isEvent(label)) {
    return {
      contextValue: "event",
      iconPath: new vscode.ThemeIcon("symbol-event"),
    };
  }
  if (isReturn(label)) {
    return {
      contextValue: "return",
      iconPath: new vscode.ThemeIcon("output"),
    };
  }
  if (isConsoleLog(label)) {
    return {
      contextValue: "console",
      iconPath: new vscode.ThemeIcon("console"),
    };
  }
  if (!inherit || !root) {
    return {
      contextValue: "default",
      iconPath: new vscode.ThemeIcon("debug-console-evaluation-input"),
    };
  }
  return {
    iconPath: root.iconPath,
    contextValue: root.contextValue,
  };
}
