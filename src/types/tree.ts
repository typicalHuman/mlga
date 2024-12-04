import * as vscode from "vscode";

export type LogNode = {
  label: string;
  children: Array<LogNode>;
};

type BaseStyledNode = {
  label: string;
  collapsibleState: vscode.TreeItemCollapsibleState;
  contextValue: string;
  iconPath: vscode.ThemeIcon;
};

export type ViewLogNode = {
  children: ViewLogNode[] | LogNode[];
} & BaseStyledNode;

export type StyledLogNode = {
  children: StyledLogNode[];
} & BaseStyledNode;
