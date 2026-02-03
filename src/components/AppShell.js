// components/AppShell.js
import { useMemo, useState } from "react";
import styled from "styled-components";
import Sidebar from "./Sidebar";
import ThreadView from "./ThreadView";

export default function AppShell({ user, isAnonymous }) {
  const threads = useMemo(
    () => [
      { id: "default", title: "Default (How it works)", kind: "tutorial" },
      { id: "t1", title: "Interview – sample", kind: "blank" },
      { id: "t2", title: "Meeting – sample", kind: "blank" },
      { id: "t3", title: "YouTube Clip – sample", kind: "blank" },
      { id: "t4", title: "Podcast – sample", kind: "blank" },
    ],
    []
  );

  const [collapsed, setCollapsed] = useState(false);
  const [activeId, setActiveId] = useState("default");

  const activeThread = threads.find((t) => t.id === activeId) || threads[0];

  return (
    <Shell>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        threads={threads}
        activeId={activeId}
        onSelect={setActiveId}
        user={user}
        isAnonymous={isAnonymous}
      />

      <Main>
        <ThreadView thread={activeThread} />
      </Main>
    </Shell>
  );
}

const Shell = styled.div`
  height: 100vh;
  width: 100%;
  display: flex;
  overflow: hidden;
  background: var(--bg);
`;

const Main = styled.main`
  flex: 1;
  min-width: 0;
  display: flex;
  background: var(--bg);
`;
