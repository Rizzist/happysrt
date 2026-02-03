// components/Sidebar.js
import styled from "styled-components";

export default function Sidebar({
  collapsed,
  onToggle,
  threads,
  activeId,
  onSelect,
  user,
  isAnonymous,
}) {
  return (
    <Wrap $collapsed={collapsed}>
      <Top>
        <Brand>
          {/* Collapsed: logo acts as toggle (only shows hover affordance) */}
          {/* Expanded: logo is just a logo (no hover affordance) */}
          <LogoButton
            type="button"
            onClick={collapsed ? onToggle : undefined}
            aria-label={collapsed ? "Expand sidebar" : "Logo"}
            title={collapsed ? "Expand sidebar" : "HappySRT"}
            $clickable={collapsed}
          >
            <LogoImg src="/logo.png" alt="HappySRT" />
            <LogoHoverOverlay $enabled={collapsed}>
              <OverlayIcon aria-hidden="true">»</OverlayIcon>
            </LogoHoverOverlay>
          </LogoButton>

          {!collapsed && <BrandText>HappySRT</BrandText>}
        </Brand>

        {/* Expanded: show collapse button on the right */}
        {!collapsed && (
          <CollapseButton
            type="button"
            onClick={onToggle}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            «
          </CollapseButton>
        )}
      </Top>

      <NavLabel $collapsed={collapsed}>Threads</NavLabel>

      <ThreadList>
        {threads.map((t) => (
          <ThreadItem
            key={t.id}
            $active={t.id === activeId}
            onClick={() => onSelect(t.id)}
            title={t.title}
            $collapsed={collapsed}
          >
            {!collapsed ? <span>{t.title}</span> : null}
          </ThreadItem>
        ))}
      </ThreadList>

      <Footer>
        <UserChip>
          <Avatar />
          {!collapsed && (
            <UserMeta>
              <UserLine>
                {isAnonymous ? "Guest" : "User"}{" "}
                <Pill $accent>{isAnonymous ? "anonymous" : "signed in"}</Pill>
              </UserLine>
              <UserSub>{user?.$id ? `ID: ${user.$id}` : ""}</UserSub>
            </UserMeta>
          )}
        </UserChip>
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

  cursor: ${(p) => (p.$clickable ? "default" : "default")};

  /* Only clickable when collapsed */
  ${(p) =>
    p.$clickable &&
    `
    cursor: default;

    ${Wrap}:hover & {
      cursor: pointer;
    }
  `}
`;

const LogoImg = styled.img`
  width: 28px;
  height: 28px;
  object-fit: contain;
  display: block;
  border-radius: 8px;
`;

/* Overlay only enabled when collapsed */
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

/* Right-side collapse control (only visible when expanded) */
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

const NavLabel = styled.div`
  font-size: 12px;
  color: var(--muted);
  padding: 0 6px;
  display: ${(p) => (p.$collapsed ? "none" : "block")};
`;

const ThreadList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
  overflow: auto;
`;

const ThreadItem = styled.button`
  width: 100%;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;

  padding: ${(p) => (p.$collapsed ? "10px 6px" : "10px 10px")};
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
    font-weight: ${(p) => (p.$active ? "700" : "600")};
  }
`;

const Footer = styled.div`
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border);
`;

const UserChip = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(0,0,0,0.03);
  border: 1px solid var(--border);
`;

const Avatar = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: rgba(0,0,0,0.08);
`;

const UserMeta = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const UserLine = styled.div`
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
`;

const UserSub = styled.div`
  font-size: 12px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Pill = styled.span`
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid ${(p) => (p.$accent ? "rgba(239,68,68,0.25)" : "var(--border)")};
  background: ${(p) => (p.$accent ? "rgba(239,68,68,0.08)" : "var(--hover)")};
  color: ${(p) => (p.$accent ? "var(--accent)" : "var(--muted)")};
  font-weight: 700;
`;
