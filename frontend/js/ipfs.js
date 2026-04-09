import { BACKEND_URL } from "./config.js";

export async function uploadToIPFS(file) {
  if (!file) {
    throw new Error("No file provided for upload");
  }

  const formData = new FormData();
  formData.append("file", file);

  console.log("🔄 Uploading file:", file.name, "Size:", (file.size / 1024).toFixed(2), "KB");

  const response = await fetch(`${BACKEND_URL}/upload`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: "Unknown error" }));
    console.error("❌ IPFS upload failed:", response.status, errorBody);
    throw new Error(errorBody.error || `Upload failed (HTTP ${response.status})`);
  }

  const data = await response.json();
  if (!data.hash) {
    throw new Error("No hash returned from IPFS upload");
  }
  console.log("✅ File uploaded to IPFS. Hash:", data.hash);
  return data.hash;
}

export function getIpfsUrl(hash) {
  return `https://ipfs.io/ipfs/${hash}`;
}
