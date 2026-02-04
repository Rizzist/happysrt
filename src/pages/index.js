// pages/index.js
import AppShell from "../components/AppShell";
import BootScreen from "../components/BootScreen";
import { useAuth } from "../contexts/AuthContext";

export default function Home() {
  const { user, loading, isAnonymous, mediaTokens, loginWithGoogle, logout } = useAuth();

  return (
    <>
      <BootScreen show={loading} />
      {!loading && (
        <AppShell
          user={user}
          isAnonymous={isAnonymous}
          mediaTokens={mediaTokens}
          onGoogleLogin={loginWithGoogle}
          onLogout={logout}
        />
      )}
    </>
  );
}
