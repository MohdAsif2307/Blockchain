export async function connectWallet() {
  if (!window.ethereum) throw new Error("MetaMask is required");
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  return accounts[0];
}

export async function getCurrentAccount() {
  if (!window.ethereum) return null;
  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  return accounts.length > 0 ? accounts[0] : null;
}

export function listenForAccountChanges(onChange) {
  if (!window.ethereum) return;
  window.ethereum.on("accountsChanged", (accounts) => {
    onChange(accounts.length ? accounts[0] : null);
  });
}
