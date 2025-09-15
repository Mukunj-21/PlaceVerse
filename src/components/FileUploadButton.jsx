// src/components/FileUploadButton.jsx
import { useRef, useState } from "react";
import { uploadFile } from "../utils/storage";

export default function FileUploadButton({ 
  label = "Upload",
  pathBuilder,          // (file) => "resumes/uid/filename" (required)
  onUploaded,           // ({url, fullPath}) => void
  accept = "*/*",
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const pick = () => inputRef.current?.click();

  const onChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!pathBuilder) return alert("No pathBuilder provided");
    setBusy(true);
    try {
      const path = pathBuilder(file);
      const res = await uploadFile(file, path);
      onUploaded?.(res);
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setBusy(false);
      e.target.value = ""; // reset
    }
  };

  return (
    <>
      <button className="rec-btn" onClick={pick} disabled={busy || disabled}>
        {busy ? "Uploading…" : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={onChange}
      />
    </>
  );
}
