// src/utils/storage.js
import { storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

export async function uploadFile(file, path) {
  // path example: `resumes/${uid}/${Date.now()}_${file.name}`
  const r = ref(storage, path);
  const snap = await uploadBytes(r, file);
  const url = await getDownloadURL(snap.ref);
  return { url, fullPath: snap.ref.fullPath };
}

export async function deleteByPath(fullPath) {
  const r = ref(storage, fullPath);
  await deleteObject(r);
}

export async function replaceFile(oldFullPath, file, newPath) {
  if (oldFullPath) {
    try { await deleteByPath(oldFullPath); } catch {}
  }
  return uploadFile(file, newPath);
}
