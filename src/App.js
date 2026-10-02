import React, { useState } from "react";
import "./App.css";

const toBase64Url = (bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const fromBase64Url = (value) => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
};

const deriveKey = async (password, salt) => {
  const textEncoder = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

const encryptText = async (value, password) => {
  const textEncoder = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    textEncoder.encode(value)
  );

  return ["SL1", toBase64Url(salt), toBase64Url(iv), toBase64Url(new Uint8Array(encrypted))].join(".");
};

const decryptText = async (payload, password) => {
  const parts = payload.trim().split(".");
  if (parts.length !== 4 || parts[0] !== "SL1") {
    throw new Error("Invalid encrypted string.");
  }

  const salt = fromBase64Url(parts[1]);
  const iv = fromBase64Url(parts[2]);
  const encrypted = fromBase64Url(parts[3]);
  const key = await deriveKey(password, salt);
  const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);

  return new TextDecoder().decode(decrypted);
};

function App() {
  const [activeTab, setActiveTab] = useState("encrypt");

  const [encryptInput, setEncryptInput] = useState("");
  const [encryptPassword, setEncryptPassword] = useState("");
  const [encryptOutput, setEncryptOutput] = useState("");

  const [decryptInput, setDecryptInput] = useState("");
  const [decryptPassword, setDecryptPassword] = useState("");
  const [decryptOutput, setDecryptOutput] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalMode, setPasswordModalMode] = useState("decrypt");
  const [error, setError] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState("");

  const handleEncrypt = async (event) => {
    event.preventDefault();
    setError("");

    if (!encryptInput) {
      setError("Enter a string to encrypt.");
      return;
    }
    if (!encryptPassword) {
      setError("Choose a password before encrypting.");
      return;
    }

    setIsWorking(true);
    try {
      setEncryptOutput(await encryptText(encryptInput, encryptPassword));
      setShowPasswordModal(false);
      setEncryptPassword("");
    } catch {
      setError("Encryption failed in this browser.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleDecrypt = async (event) => {
    event.preventDefault();
    setError("");

    if (!decryptInput) {
      setError("Enter an encrypted string to decrypt.");
      setShowPasswordModal(false);
      return;
    }
    if (!decryptPassword) {
      setError("Enter the password used for encryption.");
      return;
    }

    setIsWorking(true);
    try {
      setDecryptOutput(await decryptText(decryptInput, decryptPassword));
      setShowPasswordModal(false);
      setDecryptPassword("");
    } catch {
      setError("Unable to decrypt. Check the encrypted string and password.");
    } finally {
      setIsWorking(false);
    }
  };

  const openPasswordModal = (mode) => {
    setError("");
    if (mode === "encrypt" && !encryptInput) {
      setError("Enter a string to encrypt.");
      return;
    }
    setPasswordModalMode(mode);
    setShowPasswordModal(true);
  };

  const handleCopy = async (value, outputName) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopiedOutput(outputName);
      window.setTimeout(() => setCopiedOutput(""), 2000);
    } catch {
      setError("Unable to copy the output. Check your browser permissions.");
    }
  };

  return (
    <div className="app">
      <h1>StringLock</h1>
      <div className="container">


        {/* Tabs */}
        <div className="tabs">
          <button
            className={activeTab === "encrypt" ? "tab active" : "tab"}
            onClick={() => setActiveTab("encrypt")}
          >
            Encrypt
          </button>

          <button
            className={activeTab === "decrypt" ? "tab active" : "tab"}
            onClick={() => setActiveTab("decrypt")}
          >
            Decrypt
          </button>
        </div>

        {/* Encrypt Tab */}
        {activeTab === "encrypt" && (
          <div className="tab-content">

            <div className="field">
              <label htmlFor="encrypt-input">Input</label>
              <textarea
                id="encrypt-input"
                placeholder="Enter the string you want to encrypt..."
                value={encryptInput}
                onChange={(e) => setEncryptInput(e.target.value)}
              />
            </div>

            <div className="field">
              <div className="output-label">
                <label htmlFor="encrypt-output">Output</label>
                <button
                  type="button"
                  className="copy-button"
                  onClick={() => handleCopy(encryptOutput, "encrypt")}
                  disabled={!encryptOutput}
                >
                  {copiedOutput === "encrypt" ? "Copied" : "Copy"}
                </button>
              </div>
              <textarea
                id="encrypt-output"
                placeholder="Encrypted string will appear here..."
                value={encryptOutput}
                readOnly
              />
            </div>

            <button
              className="action-button"
              onClick={() => openPasswordModal("encrypt")}
              disabled={isWorking}
            >
              Encrypt
            </button>

          </div>
        )}

        {/* Decrypt Tab */}
        {activeTab === "decrypt" && (
          <div className="tab-content">

            <div className="field">
              <label htmlFor="decrypt-input">Encrypted Input</label>
              <textarea
                id="decrypt-input"
                placeholder="Enter the encrypted string..."
                value={decryptInput}
                onChange={(e) => setDecryptInput(e.target.value)}
              />
            </div>

            <div className="field">
              <div className="output-label">
                <label htmlFor="decrypt-output">Original Output</label>
                <button
                  type="button"
                  className="copy-button"
                  onClick={() => handleCopy(decryptOutput, "decrypt")}
                  disabled={!decryptOutput}
                >
                  {copiedOutput === "decrypt" ? "Copied" : "Copy"}
                </button>
              </div>
              <textarea
                id="decrypt-output"
                placeholder="Original string will appear here..."
                value={decryptOutput}
                readOnly
              />
            </div>

            <button
              className="action-button"
              onClick={() => openPasswordModal("decrypt")}
              disabled={isWorking}
            >
              {isWorking ? "Decrypting..." : "Decrypt"}
            </button>

          </div>
        )}

      </div>
      {error && <p className="error-message" role="alert">{error}</p>}
      {showPasswordModal && (
        <div className="modal-overlay">
          <form
            className="password-modal"
            onSubmit={passwordModalMode === "encrypt" ? handleEncrypt : handleDecrypt}
          >

            <h2>{passwordModalMode === "encrypt" ? "Set Encryption Password" : "Enter Password"}</h2>

            <input
              id="password-modal-input"
              type="password"
              placeholder={passwordModalMode === "encrypt" ? "Choose a password..." : "Enter password..."}
              value={passwordModalMode === "encrypt" ? encryptPassword : decryptPassword}
              onChange={(e) => {
                if (passwordModalMode === "encrypt") {
                  setEncryptPassword(e.target.value);
                } else {
                  setDecryptPassword(e.target.value);
                }
              }}
              autoFocus
            />

            <div className="modal-buttons">
              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  setShowPasswordModal(false);
                  setEncryptPassword("");
                  setDecryptPassword("");
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="unlock-button"
                disabled={isWorking}
              >
                {isWorking
                  ? passwordModalMode === "encrypt" ? "Encrypting..." : "Unlocking..."
                  : passwordModalMode === "encrypt" ? "Encrypt" : "Unlock"}
              </button>
            </div>

          </form>
        </div>
      )}
    </div>
  );
}

export default App;