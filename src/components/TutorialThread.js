// components/TutorialThread.js
import styled from "styled-components";

export default function TutorialThread() {
  return (
    <Thread>
      <Card>
        <H2>Welcome to HappySRT</H2>
        <P>
          This is the <b>Default</b> thread. It’s always here so new users (including guests)
          know how the app works.
        </P>
        <Hint>
          Red is used only as a small accent — you’ll see it on active items and small UI details.
        </Hint>
      </Card>

      <Card>
        <H3>What you’ll do here</H3>
        <List>
          <li><b>Upload</b> audio/video (or paste a link)</li>
          <li><b>Transcribe</b> into text + timestamps</li>
          <li><b>Translate</b> into your target language</li>
          <li><b>Summarize</b> into key bullet points</li>
        </List>
        <Note>
          For now, the sidebar threads are placeholders — clicking them will intentionally show a blank panel.
        </Note>
      </Card>

      <Card>
        <H3>Next UI pieces (we’ll build next)</H3>
        <List>
          <li>Upload dropzone + file picker</li>
          <li>Actions: Transcribe / Translate / Summarize</li>
          <li>Persist “threads” to Appwrite DB + Storage per user</li>
          <li>Upgrade guest → real account without losing data</li>
        </List>
      </Card>
    </Thread>
  );
}

const Thread = styled.div`
  max-width: 920px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Card = styled.div`
  border-radius: 16px;
  padding: 18px;
  background: var(--panel);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
`;

const H2 = styled.h2`
  margin: 0 0 10px;
  font-size: 18px;
  letter-spacing: -0.2px;
`;

const H3 = styled.h3`
  margin: 0 0 10px;
  font-size: 15px;
  letter-spacing: -0.1px;
`;

const P = styled.p`
  margin: 0 0 10px;
  color: var(--text);
  line-height: 1.55;
`;

const Hint = styled.div`
  font-size: 12px;
  color: var(--muted);
`;

const List = styled.ul`
  margin: 0;
  padding-left: 18px;
  color: var(--text);

  li { margin: 8px 0; }
`;

const Note = styled.div`
  margin-top: 12px;
  font-size: 12px;
  color: var(--muted);
  padding-left: 10px;
  border-left: 3px solid var(--accent);
`;
