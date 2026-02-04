// components/ThreadView.js
import styled from "styled-components";
import TutorialThread from "./TutorialThread";
import ThreadComposer from "./ThreadComposer";
import { useThreads } from "../contexts/threadsContext";

export default function ThreadView({ thread }) {
  const { addItem } = useThreads();
  const isDefault = thread?.id === "default";

  const startRun = async ({ file, options }) => {
    // v1: local-only. We store file metadata (not the file itself).
    // Later: upload to B2/Appwrite storage, store mediaUrl/fileId, then run jobs.
    await addItem(thread.id, {
      type: "run",
      payload: {
        media: {
          sourceType: "local",
          filename: file?.name || "",
          size: file?.size || 0,
          mime: file?.type || "",
        },
        options,
        status: "ready",
      },
    });
  };

  return (
    <Wrap>
      <Header>
        <Left>
          <Title>{thread?.title || "Thread"}</Title>
          <Sub>
            {isDefault ? "Tutorial thread (always available)" : "Upload media → transcribe / translate / summarize"}
          </Sub>
        </Left>
      </Header>

      <Body>
        {isDefault ? (
          <TutorialThread />
        ) : (
          <Messages>
            {(thread?.items || []).length === 0 ? (
              <Empty>
                <EmptyTitle>No runs yet</EmptyTitle>
                <EmptySub>Upload an audio/video file below, choose options, then click Start.</EmptySub>
              </Empty>
            ) : (
              (thread.items || []).map((it) => (
                <Card key={it.id}>
                  <CardTop>
                    <CardTitle>Run</CardTitle>
                    <CardTime>{new Date(it.createdAt).toLocaleString()}</CardTime>
                  </CardTop>

                  <Row>
                    <Key>File</Key>
                    <Val>{it?.payload?.media?.filename || "—"}</Val>
                  </Row>

                  <Row>
                    <Key>Transcription</Key>
                    <Val>{it?.payload?.options?.transcribeLang || "auto"}</Val>
                  </Row>

                  <Row>
                    <Key>Translate</Key>
                    <Val>
                      {(it?.payload?.options?.translate || []).length
                        ? (it.payload.options.translate || []).join(", ")
                        : "off"}
                    </Val>
                  </Row>

                  <Row>
                    <Key>Summary</Key>
                    <Val>{it?.payload?.options?.summarize ? "on" : "off"}</Val>
                  </Row>

                  <Row>
                    <Key>Status</Key>
                    <Val>{it?.payload?.status || "—"}</Val>
                  </Row>
                </Card>
              ))
            )}
          </Messages>
        )}
      </Body>

      {!isDefault && <ThreadComposer onStart={startRun} />}
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
  font-weight: 900;
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
  padding: 18px;
  background: var(--bg);
`;

const Messages = styled.div`
  max-width: 920px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Empty = styled.div`
  border: 1px dashed var(--border);
  border-radius: 16px;
  padding: 16px;
  background: #fff;
`;

const EmptyTitle = styled.div`
  font-weight: 900;
  color: var(--text);
`;

const EmptySub = styled.div`
  margin-top: 6px;
  font-size: 12px;
  color: var(--muted);
`;

const Card = styled.div`
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 16px;
  padding: 14px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
`;

const CardTop = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
`;

const CardTitle = styled.div`
  font-weight: 900;
  color: var(--text);
`;

const CardTime = styled.div`
  font-size: 12px;
  color: var(--muted);
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 10px;
  padding: 6px 0;
  border-top: 1px solid rgba(0,0,0,0.04);

  &:first-of-type {
    border-top: 0;
  }
`;

const Key = styled.div`
  font-size: 12px;
  color: var(--muted);
  font-weight: 800;
`;

const Val = styled.div`
  font-size: 12px;
  color: var(--text);
  font-weight: 700;
`;
