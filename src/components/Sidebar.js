// components/Sidebar.js
import styled from "styled-components";
import UserBadge from "./UserBadge";

export default function Sidebar({
  collapsed,
  onToggle,
  threads,
  activeId,
  onSelect,
  onCreateThread,
  user,
  isAnonymous,
  mediaTokens,
  onGoogleLogin,
  onLogout,
}) {
  return (
    <Wrap $collapsed={collapsed}>
      <Top>
        <Brand>
          <LogoButton
            type="button"
            onClick={collapsed ? onToggle : undefined}
            aria-label={collapsed ? "Expand sidebar" : "Logo"}
            title={collapsed ? "Expand sidebar" : "happysrt"}
            $clickable={collapsed}
          >
            <LogoImg src="/logo.png" alt="happysrt" />
            <LogoHoverOverlay $enabled={collapsed}>
              <OverlayIcon aria-hidden="true">»</OverlayIcon>
            </LogoHoverOverlay>
          </LogoButton>

          {!collapsed && <BrandText>HappySRT</BrandText>}
        </Brand>

        {!collapsed && (
          <CollapseButton type="button" onClick={onToggle} aria-label="Collapse sidebar" title="Collapse sidebar">
            «
          </CollapseButton>
        )}
      </Top>

      {!collapsed && (
        <>
          <NewThreadButton type="button" onClick={onCreateThread}>
            + New thread
          </NewThreadButton>

          <NavLabel>Threads</NavLabel>

          <ThreadList>
            {threads.map((t) => (
              <ThreadItem
                key={t.id}
                $active={t.id === activeId}
                onClick={() => onSelect(t.id)}
                title={t.title}
              >
                <span>{t.title}</span>
              </ThreadItem>
            ))}
          </ThreadList>
        </>
      )}

      <Footer>
        {!collapsed && (
          <UserBadge
            user={user}
            isAnonymous={isAnonymous}
            mediaTokens={mediaTokens}
            onGoogleLogin={onGoogleLogin}
            onLogout={onLogout}
          />
        )}
      </Footer>
    </Wrap>
  );
}

const Wrap = styled.aside`
  width: ${(p) => (p.$collapsed ? "58px" : "250px")};
  transition: width 180ms ease;
  background: var(--panel-2);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 14px;
  gap: 12px;
`;

const Top = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`;

const LogoButton = styled.button`
  position: relative;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  display: inline-grid;
  place-items: center;

  ${(p) =>
    p.$clickable
      ? `
    cursor: default;
    ${Wrap}:hover & { cursor: pointer; }
  `
      : `
    cursor: default;
  `}
`;

const LogoImg = styled.img`
  width: 28px;
  height: 28px;
  object-fit: contain;
  display: block;
  border-radius: 8px;
`;

const LogoHoverOverlay = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 10px;
  opacity: 0;
  pointer-events: none;
  display: grid;
  place-items: center;
  transition: opacity 120ms ease, background 120ms ease, border 120ms ease;

  ${(p) =>
    p.$enabled
      ? `
    ${Wrap}:hover & {
      opacity: 1;
      background: rgba(0, 0, 0, 0.06);
      border: 1px solid var(--border);
    }
  `
      : `
    display: none;
  `}
`;

const OverlayIcon = styled.div`
  font-weight: 800;
  color: var(--text);
  font-size: 16px;
  line-height: 1;
`;

const BrandText = styled.div`
  font-weight: 800;
  letter-spacing: 0.2px;
  white-space: nowrap;
  color: var(--text);
`;

const CollapseButton = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--text);
  cursor: pointer;

  &:hover {
    background: var(--hover);
  }
`;

const NewThreadButton = styled.button`
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(239, 68, 68, 0.25);
  background: rgba(239, 68, 68, 0.08);
  color: var(--accent);
  font-weight: 900;
  padding: 10px 12px;
  cursor: pointer;

  &:hover {
    background: rgba(239, 68, 68, 0.12);
  }
`;

const NavLabel = styled.div`
  font-size: 12px;
  color: var(--muted);
  padding: 0 6px;
`;

const ThreadList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 4px;
  overflow: auto;
`;

const ThreadItem = styled.button`
  width: 100%;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 10px 10px;

  border-radius: 12px;
  border: 1px solid ${(p) => (p.$active ? "rgba(239,68,68,0.35)" : "transparent")};
  background: ${(p) => (p.$active ? "var(--panel)" : "transparent")};
  color: var(--text);
  cursor: pointer;

  &:hover {
    background: ${(p) => (p.$active ? "var(--panel)" : "rgba(0,0,0,0.04)")};
  }

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: ${(p) => (p.$active ? "800" : "650")};
  }
`;

const Footer = styled.div`
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border);
`;
