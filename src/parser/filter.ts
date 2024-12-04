export function isFunctionCall(input: string) {
  if (!input.includes("::")) {
    return false;
  }

  const curlyBracketPattern = /\{[^{}]+\}/;
  return curlyBracketPattern.test(input);
}

export function isContractCreation(label: string) {
  return label.startsWith("new ");
}
export function isVmOperation(label: string) {
  return label.startsWith("VM::");
}
export function isEvent(label: string) {
  return label.startsWith("emit ");
}
export function isReturn(label: string) {
  return label.startsWith("[Return] ");
}
export function isConsoleLog(label: string) {
  return label.startsWith("console::");
}
