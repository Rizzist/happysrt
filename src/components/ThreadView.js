// components/ThreadView.js
import styled from "styled-components";
import TutorialThread from "./TutorialThread";

export default function ThreadView({ thread }) {
  const isDefault = thread?.id === "default";

  return (
    <Wrap>
      <Header>
        <Left>
          <Title>{thread?.title || "Thread"}</Title>
          <Sub>
            {isDefault
              ? "Tutorial thread (always available)"
              : "Sample thread (nonfunctional placeholder)"}
          </Sub>
        </Left>
      </Header>

      <Body>
        {isDefault ? <TutorialThread /> : <Blank />}
      </Body>
    </Wrap>
  );
}

const Wrap = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  padding: 16px 18px;
  border-bottom: 1px solid var(--border);
  background: var(--panel);
`;

const Left = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Title = styled.div`
  font-weight: 800;
  font-size: 15px;
  color: var(--text);
`;

const Sub = styled.div`
  font-size: 12px;
  color: var(--muted);
`;

const Body = styled.div`
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 22px 18px;
  background: var(--bg);
`;

const Blank = styled.div`
  height: 100%;
`;
