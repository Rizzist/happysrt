import AppShell from "../components/AppShell";
import { useAuth } from "../contexts/AuthContext";

export default function Home() {
  const { user, loading, isAnonymous } = useAuth();

  if (loading) return <div style={{ padding: 24 }}>Booting guest session...</div>;

  return <AppShell user={user} isAnonymous={isAnonymous} />;
}
