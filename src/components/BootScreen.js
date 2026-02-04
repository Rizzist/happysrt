// components/BootScreen.js
import { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";

export default function BootScreen({ show }) {
  const [mounted, setMounted] = useState(true);
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (show) {
      setMounted(true);
      // next tick so transition applies
      requestAnimationFrame(() => setVisible(true));
      return;
    }

    // fade out then unmount
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 320);
    return () => clearTimeout(t);
  }, [show]);

  if (!mounted) return null;

  return (
    <Overlay $visible={visible}>
      <Card>
        <Logo src="/logo.png" alt="happysrt" />
        <Title>happysrt</Title>
        <Sub>Loading your workspace…</Sub>
        <Spinner />
      </Card>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;

  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);

  opacity: ${(p) => (p.$visible ? 1 : 0)};
  pointer-events: ${(p) => (p.$visible ? "auto" : "none")};
  transition: opacity 280ms ease;
`;

const Card = styled.div`
  width: 320px;
  border-radius: 18px;
  background: var(--panel);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  padding: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
`;

const Logo = styled.img`
  width: 44px;
  height: 44px;
  object-fit: contain;
  border-radius: 12px;
`;

const Title = styled.div`
  font-weight: 900;
  letter-spacing: 0.2px;
  color: var(--text);
`;

const Sub = styled.div`
  font-size: 12px;
  color: var(--muted);
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 2px solid rgba(0,0,0,0.12);
  border-top-color: var(--accent);
  animation: ${spin} 0.8s linear infinite;
`;
