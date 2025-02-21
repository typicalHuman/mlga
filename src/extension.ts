import * as vscode from "vscode";
import { FormatLogsToTree } from "./parser";
import { filterNode, findRoot } from "./parser/styler";
import { StyledLogNode } from "./types/tree";
import path from "path";
import fs from "fs";

let jsonData: StyledLogNode[] = [];
let lastContent = "";
class TreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    contextValue: string,
    id: number,
    iconPath?: string | vscode.ThemeIcon
  ) {
    super(label, collapsibleState);
    this.id = id.toString();
    this.resourceUri = vscode.Uri.parse(`mlga:${contextValue}`);
    if (iconPath) {
      this.iconPath = iconPath;
    }
  }
}

class MLGATreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    TreeItem | undefined | null | void
  > = new vscode.EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    TreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;
  public filter: string | undefined = undefined;
  public expanded = true;
  public showSetups = false;
  // ! counter is just a workaround because simply updating collapsibility is not enough for vs code to re-render tree
  private counter = 0;
  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }
  getCollapsibleState(item: StyledLogNode) {
    var res =
      item.children.length === 0
        ? vscode.TreeItemCollapsibleState.None
        : this.expanded
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.Collapsed;
    return res;
  }
  getFilteredColor(item: StyledLogNode) {
    if (!this.filter) {
      return item.contextValue;
    }
    const isCurrentNodeTrue = item.label
      .toLowerCase()
      .includes(this.filter.toLowerCase());
    return isCurrentNodeTrue ? item.contextValue : "inactive";
  }
  getChildren(element?: TreeItem): TreeItem[] {
    if (!element) {
      return jsonData
        .filter(
          (item) =>
            (!this.filter || filterNode(this.filter, item)) &&
            (this.showSetups || !item.label.includes("::setUp"))
        )
        .map(
          (folder) =>
            new TreeItem(
              folder.label,
              this.getCollapsibleState(folder),
              this.getFilteredColor(folder),
              ++this.counter,
              folder.iconPath
            )
        );
    } else {
      const folder = findRoot((element.label || "").toString(), jsonData);
      if (folder) {
        return folder.children
          .filter((item) => !this.filter || filterNode(this.filter, item))
          .map(
            (child) =>
              new TreeItem(
                child.label,
                this.getCollapsibleState(child),
                this.getFilteredColor(child),
                ++this.counter,
                child.iconPath
              )
          );
      }
    }
    return [];
  }

  refresh(expanded: boolean, filter?: string, showSetups?: boolean): void {
    this.expanded = expanded;
    this.filter = filter;
    this.showSetups = showSetups ?? false;
    this._onDidChangeTreeData.fire();
  }
}
class MLGADecorationProvider implements vscode.FileDecorationProvider {
  private readonly _onDidChangeDecorations: vscode.EventEmitter<
    vscode.Uri | vscode.Uri[]
  > = new vscode.EventEmitter<vscode.Uri | vscode.Uri[]>();
  readonly onDidChangeFileDecorations: vscode.Event<vscode.Uri | vscode.Uri[]> =
    this._onDidChangeDecorations.event;

  provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
    if (uri.scheme === "mlga") {
      return { color: new vscode.ThemeColor(`${uri.scheme}.${uri.path}`) };
    }
  }
}

export async function activate(context: vscode.ExtensionContext) {
  const treeDataProvider = new MLGATreeDataProvider();
  const treeDecorationProvider = new MLGADecorationProvider();

  // Register the tree view
  const treeView = vscode.window.createTreeView("mlgaTreeView", {
    treeDataProvider: treeDataProvider,
    canSelectMany: true,
  });
  vscode.window.registerFileDecorationProvider(treeDecorationProvider);
  await vscode.commands.executeCommand(
    "setContext",
    "expanded",
    context.workspaceState.get("expanded", true)
  );
  await vscode.commands.executeCommand(
    "setContext",
    "filtered",
    context.workspaceState.get("filtered", false)
  );
  await vscode.commands.executeCommand(
    "setContext",
    "showSetups",
    context.workspaceState.get("showSetups", false)
  );
  context.subscriptions.push(treeView);
  context.subscriptions.push(
    vscode.commands.registerCommand("mlga.expand", expand)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("mlga.collapse", collapse)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("mlga.showSetups", showSetups)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("mlga.hideSetups", hideSetups)
  );
  vscode.commands.registerCommand("mlga.copy", (item: vscode.TreeItem) => {
    vscode.env.clipboard.writeText(item.label ? item.label.toString() : "");
  });
  context.subscriptions.push(
    vscode.commands.registerCommand("mlga.filter", async function () {
      const term = await vscode.window.showInputBox({
        prompt: "Filter logs",
      });
      let currentFilter = term;
      if (currentFilter) {
        await vscode.commands.executeCommand("setContext", "filtered", true);
        await vscode.commands.executeCommand("setContext", "expanded", true);

        treeDataProvider.refresh(
          true,
          currentFilter,
          treeDataProvider.showSetups
        );
      }
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("mlga.filterClear", async function () {
      await vscode.commands.executeCommand("setContext", "filtered", false);
      await vscode.commands.executeCommand("setContext", "expanded", true);

      treeDataProvider.refresh(true, undefined, treeDataProvider.showSetups);
    })
  );

  async function expand() {
    await vscode.commands.executeCommand("setContext", "expanded", true);
    treeDataProvider.refresh(
      true,
      treeDataProvider.filter,
      treeDataProvider.showSetups
    );
  }
  async function collapse() {
    await vscode.commands.executeCommand("setContext", "expanded", false);
    treeDataProvider.refresh(
      false,
      treeDataProvider.filter,
      treeDataProvider.showSetups
    );
  }
  async function showSetups() {
    await vscode.commands.executeCommand("setContext", "showSetups", true);
    treeDataProvider.refresh(
      treeDataProvider.expanded,
      treeDataProvider.filter,
      true
    );
  }
  async function hideSetups() {
    await vscode.commands.executeCommand("setContext", "showSetups", false);
    treeDataProvider.refresh(
      treeDataProvider.expanded,
      treeDataProvider.filter,
      false
    );
  }

  vscode.workspace.onDidChangeTextDocument((e) => {
    if (!e.document.fileName.includes("mlga")) {
      return;
    }
    updateTree(treeDataProvider);
  });
  updateTree(treeDataProvider);
}

function updateTree(treeDataProvider: MLGATreeDataProvider) {
  const rootPath = vscode.workspace.workspaceFolders
    ? vscode.workspace.workspaceFolders[0].uri.fsPath
    : null;
  if (rootPath) {
    const filePath = path.join(rootPath, "mlga.txt");
    fs.readFile(filePath, "utf8", (err, data) => {
      if (lastContent !== data) {
        jsonData = FormatLogsToTree(data);
        treeDataProvider.refresh(
          treeDataProvider.expanded,
          treeDataProvider.filter,
          treeDataProvider.showSetups
        );
        lastContent = data;
      }
    });
  }
}
export function deactivate() {}
