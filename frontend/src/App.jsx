import { useEffect, useRef, useState } from "react";
import api from "./api";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);

  const [files, setFiles] = useState([]);
  const [trashFiles, setTrashFiles] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [stats, setStats] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activePage, setActivePage] = useState("drive");

  /* PROFILE MENU */
  const [profileOpen, setProfileOpen] = useState(false);

  /* SHARE */
  const [shareFileData, setShareFileData] = useState(null);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState("viewer");
  const [shareLinkPermission, setShareLinkPermission] =
    useState("viewer");
  const [shareLink, setShareLink] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  const fileInputRef = useRef(null);
  const profileRef = useRef(null);

  // =====================================================
  // STORAGE
  // =====================================================

  const STORAGE_LIMIT = 10 * 1024 * 1024 * 1024;

  // =====================================================
  // CHECK LOGIN
  // =====================================================

  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    try {
      const response = await api.get("/auth/me");

      setUser(response.data);

      await loadFiles();
      await loadStats();
    } catch (err) {
      console.log("User is not logged in");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // CLOSE PROFILE MENU
  // =====================================================

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoginLoading(true);

    try {
      await api.post("/auth/login", {
        email,
        password,
      });

      // Verify that the authentication cookie is working
      const meResponse = await api.get("/auth/me");

      setUser(meResponse.data);

      await loadFiles();
      await loadStats();
    } catch (err) {
      console.error("Login error:", err);

      setError(
        err.response?.data?.detail ||
        "Unable to login. Please check your credentials."
      );
    } finally {
      setLoginLoading(false);
    }
  };
  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");
    setRegisterLoading(true);

    try {
      await api.post("/auth/register", {
        name: registerName,
        email: registerEmail,
        password: registerPassword,
      });

      setShowRegister(false);

      setRegisterName("");
      setRegisterEmail("");
      setRegisterPassword("");

      setEmail(registerEmail);

      setError("");

      alert("Registration successful. Please login.");

    } catch (err) {
      console.error("Registration error:", err);

      setError(
        err.response?.data?.detail ||
        "Unable to create account."
      );
    } finally {
      setRegisterLoading(false);
    }
  };
  // =====================================================
  // LOAD FILES
  // =====================================================

  const loadFiles = async () => {
    try {
      const response = await api.get("/files/");

      setFiles(response.data);
    } catch (err) {
      console.error("Failed to load files:", err);

      if (err.response?.status === 401) {
        setUser(null);
      }
    }
  };

  // =====================================================
  // LOAD TRASH
  // =====================================================

  const loadTrash = async () => {
    try {
      const response = await api.get("/files/trash");

      setTrashFiles(response.data);
    } catch (err) {
      console.error("Failed to load trash:", err);
    }
  };
  const loadSharedFiles = async () => {
    try {
      const response = await api.get("/shares/received");

      setSharedFiles(response.data);
    } catch (err) {
      console.error("Failed to load shared files:", err);

      if (err.response?.status === 401) {
        setUser(null);
      }
    }
  };

  // =====================================================
  // UPLOAD
  // =====================================================

  const handleUpload = async (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    setUploadLoading(true);
    setError("");

    try {
      const formData = new FormData();

      formData.append(
        "uploaded_file",
        selectedFile
      );

      await api.post(
        "/files/upload",
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

      await loadFiles();

      setActivePage("drive");
    } catch (err) {
      console.error("Upload failed:", err);

      setError(
        err.response?.data?.detail ||
        "File upload failed. Please try again."
      );
    } finally {
      setUploadLoading(false);

      event.target.value = "";
    }
  };

  // =====================================================
  // STAR / UNSTAR
  // =====================================================

  const toggleStar = async (file) => {
    try {
      setError("");

      if (file.is_starred) {
        await api.delete(`/stars/${file.id}`);
      } else {
        await api.post(`/stars/${file.id}`);
      }

      await loadFiles();
    } catch (err) {
      console.error("Star error:", err);

      setError(
        err.response?.data?.detail ||
        "Unable to update star."
      );
    }
  };

  // =====================================================
  // DELETE / MOVE TO TRASH
  // =====================================================

  const deleteFile = async (fileId) => {
    const confirmed = window.confirm(
      "Move this file to trash?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await api.delete(`/files/${fileId}`);

      await loadFiles();

      if (activePage === "trash") {
        await loadTrash();
      }
    } catch (err) {
      console.error("Delete error:", err);

      setError(
        err.response?.data?.detail ||
        "Unable to delete file."
      );
    }
  };

  // =====================================================
  // PERMANENT DELETE
  // =====================================================

  const permanentlyDeleteFile = async (fileId) => {
    const confirmed = window.confirm(
      "Permanently delete this file?\n\nThis action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await api.delete(
        `/files/${fileId}/permanent`
      );

      await loadTrash();
      await loadFiles();
    } catch (err) {
      console.error(
        "Permanent delete error:",
        err
      );

      setError(
        err.response?.data?.detail ||
        "Unable to permanently delete file."
      );
    }
  };

  // =====================================================
  // RESTORE
  // =====================================================

  const restoreFile = async (fileId) => {
    try {
      setError("");

      await api.put(
        `/files/${fileId}/restore`
      );

      await loadTrash();
      await loadFiles();
    } catch (err) {
      console.error(
        "Restore error:",
        err
      );

      setError(
        err.response?.data?.detail ||
        "Unable to restore file."
      );
    }
  };
  // =====================================================
  // VIEW FILE
  // =====================================================

  const viewFile = async (file) => {
    try {
      setError("");

      const response = await api.get(
        `/files/${file.id}/view`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob(
        [response.data],
        {
          type:
            file.mime_type ||
            "application/octet-stream",
        }
      );

      const url =
        window.URL.createObjectURL(blob);

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );

      // Give the browser time to open the blob
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 10000);

    } catch (err) {
      console.error(
        "View error:",
        err
      );

      setError(
        err.response?.data?.detail ||
        "Unable to view file."
      );
    }
  };
  // =====================================================
  // DOWNLOAD
  // =====================================================

  const downloadFile = async (file) => {
    try {
      setError("");

      const response = await api.get(
        `/files/${file.id}/download`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob(
        [response.data],
        {
          type:
            file.mime_type ||
            "application/octet-stream",
        }
      );

      const url =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;
      link.download = file.name;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(
        "Download error:",
        err
      );

      setError(
        err.response?.data?.detail ||
        "Unable to download file."
      );
    }
  };
  // =====================================================
  // VIEW SHARED FILE
  // =====================================================

  const viewSharedFile = async (file) => {
    try {
      setError("");

      const response = await api.get(
        `/files/${file.file_id}/view`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob(
        [response.data],
        {
          type:
            file.mime_type ||
            "application/octet-stream",
        }
      );

      const url =
        window.URL.createObjectURL(blob);

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 10000);

    } catch (err) {
      console.error(
        "Shared file view error:",
        err
      );

      setError(
        err.response?.data?.detail ||
        "Unable to view shared file."
      );
    }
  };
  const downloadSharedFile = async (file) => {
    
    try {
      setError("");

      const response = await api.get(
        `/files/${file.file_id}/download`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob(
        [response.data],
        {
          type:
            file.mime_type ||
            "application/octet-stream",
        }
      );

      const url =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        file.file_name;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);

    } catch (err) {

      console.error(
        "Shared file download error:",
        err
      );

      setError(
        err.response?.data?.detail ||
        "Unable to download shared file."
      );
    }
  };
  // =====================================================
  // EDIT SHARED FILE
  // =====================================================

  const editSharedFile = async (file) => {
    try {
      setError("");

      // Download the current file
      const response = await api.get(
        `/files/${file.file_id}/download`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob(
        [response.data],
        {
          type:
            file.mime_type ||
            "application/octet-stream",
        }
      );

      const url = window.URL.createObjectURL(blob);

      // Open file in a new tab
      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 10000);

    } catch (err) {
      console.error(
        "Edit shared file error:",
        err
      );

      setError(
        err.response?.data?.detail ||
        "Unable to edit shared file."
      );
    }
  };


  // =====================================================
  // REMOVE SHARED FILE
  // =====================================================

  const removeSharedFile = async (file) => {
    const confirmed = window.confirm(
      `Remove "${file.file_name}" from your Shared files?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await api.delete(
        `/shares/${file.id}`
      );

      await loadSharedFiles();

    } catch (err) {
      console.error(
        "Remove shared file error:",
        err
      );

      setError(
        err.response?.data?.detail ||
        "Unable to remove shared file."
      );
    }
  };
  // =====================================================
  // CHANGE PAGE
  // =====================================================

  const changePage = async (page) => {
    setError("");
    setSearch("");
    setActivePage(page);

    if (page === "trash") {
      await loadTrash();
    }

    if (page === "shared") {
      await loadSharedFiles();
    }

    if (page === "stats") {
      await loadStats();
    }
  };
  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error(
        "Logout error:",
        err
      );
    }

    setUser(null);
    setFiles([]);
    setTrashFiles([]);
    setSharedFiles([]);
    setStats(null);

    setEmail("");
    setPassword("");

    setActivePage("drive");
    setProfileOpen(false);
  };

  // =====================================================
  // OPEN SHARE MODAL
  // =====================================================

  const openShareModal = (file) => {
    setShareFileData(file);

    setShareEmail("");
    setSharePermission("viewer");
    setShareLinkPermission("viewer");
    setShareLink("");
    setShareMessage("");
  };

  // =====================================================
  // CLOSE SHARE MODAL
  // =====================================================

  const closeShareModal = () => {
    if (shareLoading) {
      return;
    }

    setShareFileData(null);
    setShareEmail("");
    setShareLink("");
    setShareMessage("");
  };

  // =====================================================
  // SHARE WITH USER
  // =====================================================

  const shareWithUser = async () => {
    if (!shareFileData) {
      return;
    }

    if (!shareEmail.trim()) {
      setShareMessage(
        "Enter the user's email address."
      );

      return;
    }

    try {
      setShareLoading(true);
      setShareMessage("");

      await api.post("/shares", {
        file_id: shareFileData.id,
        folder_id: null,
        shared_with_email:
          shareEmail.trim(),
        permission:
          sharePermission,
      });

      setShareMessage(
        `File shared successfully as ${sharePermission === "editor"
          ? "Editor"
          : "Viewer"
        }.`
      );

      setShareEmail("");
    } catch (err) {
      console.error(
        "Share error:",
        err
      );

      setShareMessage(
        err.response?.data?.detail ||
        "Unable to share this file."
      );
    } finally {
      setShareLoading(false);
    }
  };

  // =====================================================
  // GENERATE PUBLIC LINK
  // =====================================================

  const generatePublicLink = async () => {
    if (!shareFileData) {
      return;
    }

    try {
      setShareLoading(true);
      setShareMessage("");

      const response = await api.post(
        "/links/",
        {
          file_id: shareFileData.id,
          expires_at: null,
          password: null,
          permission: shareLinkPermission,
        }
      );

      const token = response.data.token;

      if (!token) {
        throw new Error(
          "Backend did not return a public link token."
        );
      }

      const generatedLink =
        `http://localhost:8000/links/${token}`;

      setShareLink(generatedLink);

      setShareMessage(
        "Public link generated successfully."
      );
    } catch (err) {
      console.error(
        "Public link error:",
        err
      );

      setShareMessage(
        err.response?.data?.detail ||
        "Unable to generate public link."
      );
    } finally {
      setShareLoading(false);
    }
  };

  // =====================================================
  // COPY LINK
  // =====================================================

  const copyShareLink = async () => {
    if (!shareLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        shareLink
      );

      setShareMessage(
        "Link copied to clipboard."
      );
    } catch (err) {
      console.error(
        "Copy link error:",
        err
      );

      setShareMessage(
        "Unable to copy link."
      );
    }
  };

  // =====================================================
  // EMAIL LINK
  // =====================================================

  const emailShareLink = () => {
    if (
      !shareLink ||
      !shareFileData
    ) {
      return;
    }

    const subject =
      encodeURIComponent(
        `Cloudora file: ${shareFileData.name}`
      );

    const body =
      encodeURIComponent(
        `You have been given access to "${shareFileData.name}" on Cloudora.\n\nOpen the file:\n${shareLink}`
      );

    window.location.href =
      `mailto:?subject=${subject}&body=${body}`;
  };

  // =====================================================
  // OPEN LINK
  // =====================================================

  const openShareLink = () => {
    if (!shareLink) {
      return;
    }

    window.open(
      shareLink,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredFiles =
    files.filter((file) =>
      file.name
        ?.toLowerCase()
        .includes(
          search.toLowerCase()
        )
    );

  const starredFiles =
    filteredFiles.filter(
      (file) => file.is_starred
    );

  // =====================================================
  // STORAGE
  // =====================================================

  const usedStorage =
    files.reduce(
      (total, file) =>
        total +
        (Number(file.size) || 0),
      0
    );

  const storagePercent =
    Math.min(
      (usedStorage /
        STORAGE_LIMIT) *
      100,
      100
    );

  const freeStorage =
    Math.max(
      STORAGE_LIMIT -
      usedStorage,
      0
    );
  // =====================================================
  // LOAD STATS
  // =====================================================
  const loadStats = async () => {
    try {

      const response = await api.get("/files/stats");

      setStats(response.data);

    } catch (err) {

      console.error(
        "Failed to load statistics:",
        err
      );

    }
  };
  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">
          C
        </div>

        <h2>Cloudora</h2>

        <div className="spinner"></div>

        <p>
          Loading your cloud...
        </p>
      </div>
    );
  }

  // =====================================================
  // LOGIN
  // =====================================================

  if (!user) {
    return (
      <div className="login-page">

        {/* LEFT */}

        <div className="login-left">

          <div className="brand-large">

            <div className="brand-icon">
              C
            </div>

            <span>
              Cloudora
            </span>

          </div>

          <div className="login-hero">

            <h1>
              Your files.
              <br />

              <span>
                Anywhere.
              </span>
            </h1>

            <p>
              Securely store, manage and
              access your files from
              anywhere with Cloudora.
            </p>

            <div className="feature-list">

              <div className="feature">
                <span>✓</span>
                Secure cloud storage
              </div>

              <div className="feature">
                <span>✓</span>
                Easy file management
              </div>

              <div className="feature">
                <span>✓</span>
                Access your files anytime
              </div>

            </div>

          </div>

        </div>

        {/* RIGHT */}

        <div className="login-right">

          <div className="login-card">

            <div className="mobile-logo">

              <div className="brand-icon">
                C
              </div>

              <span>
                Cloudora
              </span>

            </div>

            <div className="login-heading">

              <h2>
                {showRegister
                  ? "Create your account"
                  : "Welcome back"}
              </h2>

              <p>
                {showRegister
                  ? "Create your Cloudora account"
                  : "Sign in to access your files"}
              </p>

            </div>

            {showRegister ? (

              <form onSubmit={handleRegister}>

                <div className="form-group">

                  <label>
                    Full name
                  </label>

                  <div className="input-wrapper">

                    <span>👤</span>

                    <input
                      type="text"
                      placeholder="Your name"
                      value={registerName}
                      onChange={(e) =>
                        setRegisterName(e.target.value)
                      }
                      required
                    />

                  </div>

                </div>

                <div className="form-group">

                  <label>
                    Email address
                  </label>

                  <div className="input-wrapper">

                    <span>✉</span>

                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={registerEmail}
                      onChange={(e) =>
                        setRegisterEmail(e.target.value)
                      }
                      required
                    />

                  </div>

                </div>

                <div className="form-group">

                  <label>
                    Password
                  </label>

                  <div className="input-wrapper">

                    <span>●</span>

                    <input
                      type="password"
                      placeholder="Create a password"
                      value={registerPassword}
                      onChange={(e) =>
                        setRegisterPassword(e.target.value)
                      }
                      required
                      minLength={6}
                    />

                  </div>

                </div>

                {error && (
                  <div className="error-box">
                    ⚠ {error}
                  </div>
                )}

                <button
                  className="login-button"
                  type="submit"
                  disabled={registerLoading}
                >
                  {registerLoading
                    ? "Creating account..."
                    : "Create account"}
                </button>

              </form>

            ) : (

              <form onSubmit={handleLogin}>

                <div className="form-group">

                  <label>
                    Email address
                  </label>

                  <div className="input-wrapper">

                    <span>✉</span>

                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      required
                    />

                  </div>

                </div>

                <div className="form-group">

                  <label>
                    Password
                  </label>

                  <div className="input-wrapper">

                    <span>●</span>

                    <input
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      required
                    />

                  </div>

                </div>

                {error && (
                  <div className="error-box">
                    ⚠ {error}
                  </div>
                )}

                <button
                  className="login-button"
                  type="submit"
                  disabled={loginLoading}
                >
                  {loginLoading
                    ? "Signing in..."
                    : "Sign in"}
                </button>

              </form>

            )}
            <div className="auth-switch">

              {showRegister ? (
                <>
                  <span>
                    Already have an account?
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setShowRegister(false);
                      setError("");
                    }}
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  <span>
                    Don't have an account?
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setShowRegister(true);
                      setError("");
                    }}
                  >
                    Create account
                  </button>
                </>
              )}

            </div>
            <div className="login-footer">

              <span>
                Secure authentication
              </span>

              <span>•</span>

              <span>
                Cloudora
              </span>

            </div>

          </div>

        </div>

      </div>
    );
  }

  // =====================================================
  // DISPLAY FILES
  // =====================================================

  const displayFiles =
    activePage === "starred"
      ? starredFiles
      : filteredFiles;

  // =====================================================
  // DASHBOARD
  // =====================================================

  return (
    <div className="app">

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="sidebar">

        <div className="sidebar-brand">

          <div className="brand-icon">
            C
          </div>

          <span>
            Cloudora
          </span>

        </div>

        {/* UPLOAD */}

        <button
          className={
            uploadLoading
              ? "new-upload uploading"
              : "new-upload"
          }
          onClick={() =>
            fileInputRef.current?.click()
          }
          disabled={
            uploadLoading
          }
        >

          <span>＋</span>

          {uploadLoading
            ? "Uploading..."
            : "Upload file"}

        </button>

        <input
          ref={fileInputRef}
          type="file"
          hidden
          onChange={
            handleUpload
          }
        />

        {/* NAVIGATION */}

        <nav className="navigation">

          <button
            className={
              activePage === "drive"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              changePage("drive")
            }
          >
            <span>▣</span>
            My Drive
          </button>

          <button
            className={
              activePage === "starred"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              changePage(
                "starred"
              )
            }
          >
            <span>☆</span>
            Starred
          </button>

          <button
            className={
              activePage === "shared"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              changePage(
                "shared"
              )
            }
          >
            <span>♧</span>
            Shared
          </button>
          <button
            className={
              activePage === "stats"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              changePage("stats")
            }
          >
            <span>◔</span>
            Statistics
          </button>

          <button
            className={
              activePage === "trash"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              changePage("trash")
            }
          >
            <span>♲</span>
            Trash
          </button>

        </nav>

        <div className="sidebar-spacer"></div>

        {/* STORAGE */}

        <div className="storage-box">

          <div className="storage-heading">

            <div>

              <span className="storage-label">
                Storage
              </span>

              <strong>
                {formatFileSize(
                  usedStorage
                )}

                <em>
                  {" "}
                  / 10 GB
                </em>
              </strong>

            </div>

            <span className="storage-percent">
              {Math.round(
                storagePercent
              )}
              %
            </span>

          </div>

          <div
            className="storage-bar"
            aria-label={`Storage used ${Math.round(
              storagePercent
            )} percent`}
          >
            <div
              style={{
                width: `${storagePercent}%`,
              }}
            ></div>
          </div>

          <div className="storage-meta">

            <span>
              {formatFileSize(
                freeStorage
              )}{" "}
              free
            </span>

            <span>
              10 GB plan
            </span>

          </div>

        </div>

        {/* SIDEBAR USER */}

        <div className="sidebar-user">

          <div className="avatar">
            {user.name
              ?.charAt(0)
              .toUpperCase()}
          </div>

          <div className="user-details">

            <strong>
              {user.name}
            </strong>

            <small>
              {user.email}
            </small>

          </div>

        </div>

      </aside>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="main">

        {/* TOPBAR */}

        <header className="topbar">

          <div>

            <h1>

              {activePage ===
                "drive" &&
                "My Drive"}

              {activePage ===
                "starred" &&
                "Starred"}

              {activePage ===
                "shared" &&
                "Shared"}

              {activePage ===
                "stats" &&
                "Statistics"}

              {activePage ===
                "trash" &&
                "Trash"}

            </h1>

            <p>

              {activePage ===
                "drive" &&
                `Welcome back, ${user.name}`}

              {activePage ===
                "starred" &&
                "Your favorite files"}

              {activePage ===
                "shared" &&
                "Files shared with you"}

              {activePage ===
                "stats" &&
                "Overview of your Cloudora activity"}

              {activePage ===
                "trash" &&
                "Recently deleted files"}

            </p>

          </div>

          {/* PROFILE */}

          <div
            className="profile-container"
            ref={profileRef}
          >

            <button
              className="profile-trigger"
              onClick={() =>
                setProfileOpen(
                  !profileOpen
                )
              }
              aria-expanded={
                profileOpen
              }
            >

              <div className="top-avatar">
                {user.name
                  ?.charAt(0)
                  .toUpperCase()}
              </div>

              <div className="profile-trigger-info">

                <strong>
                  {user.name}
                </strong>

                <small>
                  Cloudora user
                </small>

              </div>

              <span
                className={
                  profileOpen
                    ? "profile-chevron open"
                    : "profile-chevron"
                }
              >
                ▾
              </span>

            </button>

            {profileOpen && (

              <div className="profile-menu">

                <div className="profile-menu-user">

                  <div className="profile-menu-avatar">
                    {user.name
                      ?.charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>

                    <strong>
                      {user.name}
                    </strong>

                    <small>
                      {user.email}
                    </small>

                  </div>

                </div>

                <div className="profile-menu-divider"></div>

                <button
                  className="profile-logout"
                  onClick={logout}
                >
                  <span>
                    ↪
                  </span>

                  Logout
                </button>

              </div>

            )}

          </div>

        </header>

        {/* TOOLBAR */}

        {activePage !==
          "shared" && (

            <div className="toolbar">

              <div className="search-container">

                <span>
                  ⌕
                </span>

                <input
                  type="text"
                  placeholder="Search your files..."
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                />

              </div>

              {activePage ===
                "drive" && (

                  <button
                    className="toolbar-upload"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    disabled={
                      uploadLoading
                    }
                  >

                    ＋

                    {uploadLoading
                      ? "Uploading..."
                      : "Upload"}

                  </button>

                )}

            </div>

          )}

        {/* ERROR */}

        {error && user && (

          <div className="dashboard-error">

            <span>
              ⚠ {error}
            </span>

            <button
              onClick={() =>
                setError("")
              }
            >
              ×
            </button>

          </div>

        )}

        {/* =================================================
            SHARED
        ================================================= */}

        {activePage === "shared" ? (

          <section className="content">

            <div className="section-header">

              <div>

                <h2>
                  Shared with you
                </h2>

                <p>
                  {sharedFiles.length} file
                  {sharedFiles.length !== 1 ? "s" : ""}
                  {" "}shared with you
                </p>

              </div>

            </div>

            {sharedFiles.length === 0 ? (

              <div className="empty-state">

                <div className="empty-large">
                  ♧
                </div>

                <h3>
                  No shared files
                </h3>

                <p>
                  Files shared with you will appear here.
                </p>

              </div>

            ) : (

              <div className="file-grid">

                {sharedFiles.map((file) => (

                  <div
                    className="file-card"
                    key={file.id}
                  >

                    <div className="file-card-top">

                      <div className="file-icon">
                        {getFileIcon(file.mime_type)}
                      </div>

                    </div>

                    <div className="file-info">

                      <h3 title={file.file_name}>
                        {file.file_name}
                      </h3>

                      <p>
                        {formatFileSize(file.file_size)}
                      </p>

                      <small>
                        Shared by: {file.owner_name}
                      </small>

                      <small className="share-permission">
                        Permission:{" "}
                        {file.permission === "editor"
                          ? "Editor"
                          : "Viewer"}
                      </small>

                    </div>

                    <div className="file-actions">

                      <button
                        onClick={() =>
                          viewSharedFile(file)
                        }
                      >
                        View
                      </button>

                      <button
                        onClick={() =>
                          downloadSharedFile(file)
                        }
                      >
                        Download
                      </button>

                      {file.permission === "editor" && (
                        <button
                          className="edit-action"
                          onClick={() =>
                            editSharedFile(file)
                          }
                        >
                          Edit
                        </button>
                      )}

                      <button
                        className="delete-action"
                        onClick={() =>
                          removeSharedFile(file)
                        }
                      >
                        Remove
                      </button>

                    </div>
                  </div>

                ))}

              </div>

            )}

          </section>

        ) : activePage === "stats" ? (

          <section className="content">

            <div className="section-header">

              <div>

                <h2>
                  Storage Statistics
                </h2>

                <p>
                  Overview of your Cloudora usage
                </p>

              </div>

            </div>

            {!stats ? (

              <div className="empty-state">

                <div className="empty-large">
                  ◔
                </div>

                <h3>
                  Loading statistics...
                </h3>

              </div>

            ) : (

              <div className="stats-grid">

                <div className="stat-card">

                  <span className="stat-icon">
                    🗑️
                  </span>

                  <div>
                    <p>Trash Files</p>

                    <h3>
                      {stats.trash_files ?? 0}
                    </h3>
                  </div>

                </div>


                <div className="stat-card">

                  <span className="stat-icon">
                    💾
                  </span>

                  <div>
                    <p>Storage Used</p>

                    <h3>
                      {formatFileSize(
                        stats.total_storage ?? 0
                      )}
                    </h3>
                  </div>

                </div>


                <div className="stat-card">

                  <span className="stat-icon">
                    🔗
                  </span>

                  <div>
                    <p>Files Shared</p>

                    <h3>
                      {stats.total_shared ?? 0}
                    </h3>
                  </div>

                </div>


                <div className="stat-card">

                  <span className="stat-icon">
                    ⭐
                  </span>

                  <div>
                    <p>Starred Files</p>

                    <h3>
                      {stats.total_starred ?? 0}
                    </h3>
                  </div>

                </div>

              </div>

            )}

          </section>

        ) : activePage ===
          "trash" ? (

          /* =================================================
             TRASH
          ================================================= */

          <section className="content">

            <div className="section-header">

              <div>

                <h2>
                  Recently deleted
                </h2>

                <p>
                  {trashFiles.length} file
                  {trashFiles.length !==
                    1
                    ? "s"
                    : ""}
                </p>

              </div>

            </div>

            {trashFiles.length ===
              0 ? (

              <div className="empty-state">

                <div className="empty-large">
                  ♲
                </div>

                <h3>
                  Trash is empty
                </h3>

                <p>
                  Deleted files will
                  appear here.
                </p>

              </div>

            ) : (

              <div className="file-grid">

                {trashFiles.map(
                  (file) => (

                    <div
                      className="file-card"
                      key={file.id}
                    >

                      <div className="file-card-top">

                        <div className="file-icon">
                          {getFileIcon(
                            file.mime_type
                          )}
                        </div>

                      </div>

                      <div className="file-info">

                        <h3
                          title={
                            file.name
                          }
                        >
                          {file.name}
                        </h3>

                        <p>
                          {formatFileSize(
                            file.size
                          )}
                        </p>

                      </div>

                      <div className="file-actions trash-actions">

                        <button
                          className="restore-button"
                          onClick={() =>
                            restoreFile(
                              file.id
                            )
                          }
                        >
                          Restore
                        </button>

                        <button
                          className="permanent-delete-button"
                          onClick={() =>
                            permanentlyDeleteFile(
                              file.id
                            )
                          }
                        >
                          Delete permanently
                        </button>

                      </div>

                    </div>

                  )
                )}

              </div>

            )}

          </section>

        ) : (

          /* =================================================
             DRIVE / STARRED
          ================================================= */

          <section className="content">

            <div className="section-header">

              <div>

                <h2>
                  {activePage ===
                    "starred"
                    ? "Starred files"
                    : "Your files"}
                </h2>

                <p>
                  {activePage ===
                    "starred"
                    ? `${starredFiles.length} starred`
                    : `${filteredFiles.length} file${filteredFiles.length !==
                      1
                      ? "s"
                      : ""
                    }`}
                </p>

              </div>

            </div>

            {activePage ===
              "drive" && (

                <div className="storage-summary">

                  <div className="storage-summary-icon">
                    ◒
                  </div>

                  <div className="storage-summary-copy">

                    <span>
                      Cloud storage
                    </span>

                    <strong>
                      {formatFileSize(
                        usedStorage
                      )}

                      used

                      <small>
                        {" "}
                        of 10 GB
                      </small>
                    </strong>

                  </div>

                  <div className="storage-summary-progress">

                    <div className="storage-summary-track">

                      <div
                        style={{
                          width: `${storagePercent}%`,
                        }}
                      ></div>

                    </div>

                    <span>
                      {formatFileSize(
                        freeStorage
                      )}{" "}
                      available
                    </span>

                  </div>

                </div>

              )}

            {/* EMPTY */}

            {displayFiles.length ===
              0 ? (

              <div className="empty-state">

                <div className="empty-large">

                  {activePage ===
                    "starred"
                    ? "☆"
                    : "▣"}

                </div>

                <h3>

                  {activePage ===
                    "starred"
                    ? "No starred files"
                    : search
                      ? "No files found"
                      : "No files yet"}

                </h3>

                <p>

                  {search
                    ? "Try searching with another name."
                    : activePage ===
                      "starred"
                      ? "Star your important files to find them quickly."
                      : "Upload your first file to Cloudora."}

                </p>

                {!search &&
                  activePage ===
                  "drive" && (

                    <button
                      className="empty-upload"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                    >
                      ＋ Upload your first file
                    </button>

                  )}

              </div>

            ) : (

              /* =================================================
                 FILE GRID
              ================================================= */

              <div className="file-grid">

                {displayFiles.map(
                  (file) => (

                    <div
                      className="file-card"
                      key={file.id}
                    >

                      {/* TOP */}

                      <div className="file-card-top">

                        <div className="file-icon">
                          {getFileIcon(
                            file.mime_type
                          )}
                        </div>

                        <button
                          className={
                            file.is_starred
                              ? "star-button starred"
                              : "star-button"
                          }
                          onClick={() =>
                            toggleStar(
                              file
                            )
                          }
                          title={
                            file.is_starred
                              ? "Remove from starred"
                              : "Add to starred"
                          }
                        >

                          {file.is_starred
                            ? "★"
                            : "☆"}

                        </button>

                      </div>

                      {/* INFO */}

                      <div className="file-info">

                        <h3
                          title={
                            file.name
                          }
                        >
                          {file.name}
                        </h3>

                        <p>
                          {formatFileSize(
                            file.size
                          )}
                        </p>

                      </div>

                      {/* ACTIONS */}

                      <div className="file-actions">

                        <button
                          onClick={() =>
                            viewFile(file)
                          }
                        >
                          View
                        </button>

                        <button
                          onClick={() =>
                            downloadFile(file)
                          }
                        >
                          Download
                        </button>

                        <button
                          className="share-action"
                          onClick={() =>
                            openShareModal(file)
                          }
                        >
                          Share
                        </button>

                        <button
                          className="delete-action"
                          onClick={() =>
                            deleteFile(file.id)
                          }
                        >
                          Delete
                        </button>

                      </div>
                    </div>

                  )
                )}

              </div>

            )}

          </section>

        )}

      </main>

      {/* =====================================================
          SHARE MODAL
      ===================================================== */}

      {shareFileData && (

        <div
          className="modal-overlay"
          onClick={closeShareModal}
        >

          <div
            className="share-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* HEADER */}

            <div className="share-modal-header">

              <div>

                <h2>
                  Share file
                </h2>

                <p
                  title={
                    shareFileData.name
                  }
                >
                  {shareFileData.name}
                </p>

              </div>

              <button
                className="modal-close"
                onClick={
                  closeShareModal
                }
                disabled={
                  shareLoading
                }
              >
                ×
              </button>

            </div>

            {/* SHARE WITH USER */}

            <div className="share-section">

              <h3>
                Share with user
              </h3>

              <p>
                Give another Cloudora
                user access to this
                file.
              </p>

              <input
                className="share-input"
                type="email"
                placeholder="user@example.com"
                value={
                  shareEmail
                }
                onChange={(e) =>
                  setShareEmail(
                    e.target.value
                  )
                }
              />

              <div className="permission-row">

                <label>
                  Permission
                </label>

                <select
                  value={
                    sharePermission
                  }
                  onChange={(e) =>
                    setSharePermission(
                      e.target.value
                    )
                  }
                >

                  <option value="viewer">
                    Viewer — Can view
                  </option>

                  <option value="editor">
                    Editor — Can edit
                  </option>

                </select>

              </div>

              <button
                className="primary-share-button"
                onClick={
                  shareWithUser
                }
                disabled={
                  shareLoading
                }
              >
                {shareLoading
                  ? "Sharing..."
                  : "Share with user"}
              </button>

            </div>

            <div className="share-divider"></div>

            {/* PUBLIC LINK */}

            <div className="share-section">

              <h3>
                Public link
              </h3>

              <p>
                Create a link that
                can be opened without
                using the device's
                native share menu.
              </p>

              <div className="permission-row">

                <label>
                  Link permission
                </label>

                <select
                  value={
                    shareLinkPermission
                  }
                  onChange={(e) =>
                    setShareLinkPermission(
                      e.target.value
                    )
                  }
                >

                  <option value="viewer">
                    Viewer — Can view
                  </option>

                  <option value="editor">
                    Editor — Can edit
                  </option>

                </select>

              </div>

              <button
                className="primary-share-button"
                onClick={
                  generatePublicLink
                }
                disabled={
                  shareLoading
                }
              >
                {shareLoading
                  ? "Generating..."
                  : "Generate public link"}
              </button>

              {shareLink && (

                <div className="generated-link-box">

                  <input
                    value={
                      shareLink
                    }
                    readOnly
                  />

                  <button
                    onClick={
                      copyShareLink
                    }
                  >
                    Copy
                  </button>

                </div>

              )}

            </div>

            {/* LINK ACTIONS */}

            {shareLink && (

              <div className="share-link-actions">

                <button
                  onClick={
                    copyShareLink
                  }
                >
                  🔗 Copy link
                </button>

                <button
                  onClick={
                    emailShareLink
                  }
                >
                  ✉ Email
                </button>

                <button
                  onClick={
                    openShareLink
                  }
                >
                  ↗ Open link
                </button>

              </div>

            )}

            {shareMessage && (

              <div className="share-message">
                ✓ {shareMessage}
              </div>

            )}

          </div>

        </div>

      )}

    </div>
  );
}

// =====================================================
// FILE ICON
// =====================================================

function getFileIcon(type) {
  if (!type) {
    return "📄";
  }

  if (
    type.startsWith("image/")
  ) {
    return "🖼";
  }

  if (
    type === "application/pdf"
  ) {
    return "📕";
  }

  if (
    type === "application/zip"
  ) {
    return "📦";
  }

  if (
    type === "text/plain"
  ) {
    return "📄";
  }

  if (
    type.includes("word")
  ) {
    return "📝";
  }

  if (
    type.includes("excel") ||
    type.includes("spreadsheet")
  ) {
    return "📊";
  }

  if (
    type.includes("powerpoint") ||
    type.includes("presentation")
  ) {
    return "📊";
  }

  return "📄";
}

// =====================================================
// FILE SIZE
// =====================================================

function formatFileSize(bytes) {
  if (!bytes) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  if (
    bytes <
    1024 *
    1024 *
    1024
  ) {
    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  return `${(
    bytes /
    (1024 *
      1024 *
      1024)
  ).toFixed(1)} GB`;
}

export default App;