import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useThreads } from "../contexts/threadsContext";
import { useAuth } from "../contexts/AuthContext";
import { getLocalMedia } from "../lib/mediaStore";

const LANGS = [
  { value: "auto", label: "Auto" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ar", label: "Arabic" },
  { value: "ur", label: "Urdu" },
  { value: "hi", label: "Hindi" },
];

function ensureDraftShape(d) {
  const out = d && typeof d === "object" ? { ...d } : {};
  if (!Array.isArray(out.files)) out.files = [];
  return out;
}

export default function ThreadComposer({ thread }) {
  const { addDraftMediaFromFile, addDraftMediaFromUrl, deleteDraftMedia } = useThreads();
  const { user, isAnonymous } = useAuth();

  const [url, setUrl] = useState("");

  // Your decorative options (kept as-is)
  const [doTranscribe, setDoTranscribe] = useState(true);
  const [doTranslate, setDoTranslate] = useState(false);
  const [doSummarize, setDoSummarize] = useState(false);

  const [asrModel, setAsrModel] = useState("deepgram");
  const [asrLang, setAsrLang] = useState("auto");

  const [trProvider, setTrProvider] = useState("google");
  const [trLang, setTrLang] = useState("en");

  const [sumModel, setSumModel] = useState("gpt-4o-mini");

  const draft = ensureDraftShape(thread?.draft);
  const files = draft.files || [];

  // Map itemId -> objectURL for local previews (video/audio)
  const [objectUrls, setObjectUrls] = useState({});

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!thread?.id) return;

      const next = {};
      for (const f of files) {
        const itemId = f?.itemId;
        const clientFileId = f?.clientFileId;
        const local = f?.local;

        if (!itemId || !clientFileId || !local) continue;

        try {
          const blob = await getLocalMedia(isAnonymous ? "guest" : user?.$id, thread.id, clientFileId);
          if (blob) {
            next[itemId] = URL.createObjectURL(blob);
          }
        } catch {
          // ignore
        }
      }

      if (!alive) return;

      // revoke removed URLs
      setObjectUrls((prev) => {
        for (const k of Object.keys(prev)) {
          if (!next[k]) URL.revokeObjectURL(prev[k]);
        }
        return next;
      });
    })();

    return () => {
      alive = false;
    };
  }, [thread?.id, isAnonymous, user?.$id, files.length]);

  const canStart = useMemo(() => {
    return files.length > 0 || Boolean(url.trim());
  }, [files.length, url]);

  const onChooseFiles = async (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = ""; // allow picking same file again later
    if (!thread?.id || picked.length === 0) return;

    // one toast per file (context already uses toast.promise)
    for (const f of picked) {
      await addDraftMediaFromFile(thread.id, f);
    }
  };

  const onAddUrl = async () => {
    const clean = String(url || "").trim();
    if (!clean || !thread?.id) return;
    await addDraftMediaFromUrl(thread.id, clean);
    setUrl("");
  };

  return (
    <Dock>
      <Box>
        {files.length > 0 && (
          <MediaGrid>
            {files.map((f) => {
              const previewUrl = objectUrls[f.itemId] || (f.sourceType === "url" ? f.url : "");
              const isVideo = Boolean(f?.local?.isVideo) || String(f?.local?.mime || "").startsWith("video/");
              const isAudio = String(f?.local?.mime || "").startsWith("audio/");

              return (
                <Card key={f.itemId}>
                  <Thumb>
                    {previewUrl ? (
                      isVideo ? (
                        <video src={previewUrl} muted playsInline />
                      ) : isAudio ? (
                        <AudioBadge>audio</AudioBadge>
                      ) : (
                        <LinkBadge>link</LinkBadge>
                      )
                    ) : (
                      <EmptyThumb>…</EmptyThumb>
                    )}

                    <HoverActions>
                      <IconButton
                        type="button"
                        title="Play"
                        onClick={() => {
                          if (!previewUrl) return;
                          // simple play: open a tiny modal-like window
                          window.open(previewUrl, "_blank", "noopener,noreferrer");
                        }}
                      >
                        ▶
                      </IconButton>
                      <IconButton
                        type="button"
                        title="Delete"
                        onClick={() => deleteDraftMedia(thread.id, f.itemId)}
                      >
                        ✕
                      </IconButton>
                    </HoverActions>
                  </Thumb>

                  <Meta>
                    <Name title={f?.local?.name || f?.audio?.b2?.filename || f?.url || ""}>
                      {f?.local?.name || f?.audio?.b2?.filename || f?.url || "Media"}
                    </Name>
                    <Sub>
                      {f.stage === "uploaded"
                        ? "Uploaded (audio)"
                        : f.stage === "local_video"
                        ? "Video stored locally"
                        : f.stage === "linked"
                        ? "Linked"
                        : f.stage || "Draft"}
                    </Sub>
                  </Meta>
                </Card>
              );
            })}
          </MediaGrid>
        )}

        <TopRow>
          <Attach>
            <HiddenFile type="file" multiple onChange={onChooseFiles} />
            <AttachButton type="button" title="Attach media">📎</AttachButton>
          </Attach>

          <UrlInput
            placeholder="Paste a media URL and press +"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />

          <AddUrlButton type="button" onClick={onAddUrl} disabled={!url.trim()}>
            +
          </AddUrlButton>

          <StartButton type="button" disabled={!canStart} title="Start later">
            Start
          </StartButton>
        </TopRow>

        <OptionsRow>
          <Pill type="button" $on={doTranscribe} onClick={() => setDoTranscribe((v) => !v)}>
            Transcription
          </Pill>
          <Pill type="button" $on={doTranslate} onClick={() => setDoTranslate((v) => !v)}>
            Translation
          </Pill>
          <Pill type="button" $on={doSummarize} onClick={() => setDoSummarize((v) => !v)}>
            Summarization
          </Pill>
        </OptionsRow>

        {(doTranscribe || doTranslate || doSummarize) && (
          <Panel>
            {doTranscribe && (
              <Group>
                <GroupTitle>Transcription</GroupTitle>
                <Fields>
                  <Field>
                    <Label>Model</Label>
                    <Select value={asrModel} onChange={(e) => setAsrModel(e.target.value)}>
                      <option value="deepgram">Deepgram</option>
                      <option value="whisper">Whisper</option>
                      <option value="assemblyai">AssemblyAI</option>
                    </Select>
                  </Field>
                  <Field>
                    <Label>Language</Label>
                    <Select value={asrLang} onChange={(e) => setAsrLang(e.target.value)}>
                      {LANGS.map((l) => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                      ))}
                    </Select>
                  </Field>
                </Fields>
              </Group>
            )}

            {doTranslate && (
              <Group>
                <GroupTitle>Translation</GroupTitle>
                <Fields>
                  <Field>
                    <Label>Provider</Label>
                    <Select value={trProvider} onChange={(e) => setTrProvider(e.target.value)}>
                      <option value="google">Google Translate</option>
                      <option value="deepl">DeepL</option>
                      <option value="gpt">AI (LLM)</option>
                    </Select>
                  </Field>
                  <Field>
                    <Label>Target</Label>
                    <Select value={trLang} onChange={(e) => setTrLang(e.target.value)}>
                      {LANGS.filter((l) => l.value !== "auto").map((l) => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                      ))}
                    </Select>
                  </Field>
                </Fields>
              </Group>
            )}

            {doSummarize && (
              <Group>
                <GroupTitle>Summarization</GroupTitle>
                <Fields>
                  <Field>
                    <Label>Model</Label>
                    <Select value={sumModel} onChange={(e) => setSumModel(e.target.value)}>
                      <option value="gpt-4o-mini">ChatGPT (fast)</option>
                      <option value="gpt-4o">ChatGPT (best)</option>
                      <option value="claude">Claude (later)</option>
                    </Select>
                  </Field>
                  <Field>
                    <Label>Style</Label>
                    <Select defaultValue="bullets">
                      <option value="bullets">Bullets</option>
                      <option value="tldr">TL;DR</option>
                      <option value="chapters">Chapters</option>
                    </Select>
                  </Field>
                </Fields>
              </Group>
            )}

            <Hint>
              Upload + draft persistence is live. Providers/runs wiring comes next.
            </Hint>
          </Panel>
        )}
      </Box>
    </Dock>
  );
}

/* --- styles --- */

const Dock = styled.div`
  padding: 16px 18px;
  border-top: 1px solid var(--border);
  background: var(--bg);
  display: flex;
  justify-content: center;
`;

const Box = styled.div`
  width: 100%;
  max-width: 860px;
`;

const MediaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;

  @media (max-width: 900px) { grid-template-columns: repeat(3, 1fr); }
  @media (max-width: 680px) { grid-template-columns: repeat(2, 1fr); }
`;

const Card = styled.div`
  border: 1px solid var(--border);
  background: var(--panel);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--shadow);
`;

const Thumb = styled.div`
  position: relative;
  height: 110px;
  background: rgba(0,0,0,0.05);

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &:hover > div {
    opacity: 1;
    pointer-events: auto;
  }
`;

const EmptyThumb = styled.div`
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-weight: 900;
`;

const AudioBadge = styled.div`
  height: 100%;
  display: grid;
  place-items: center;
  font-weight: 950;
  color: var(--text);
`;

const LinkBadge = styled.div`
  height: 100%;
  display: grid;
  place-items: center;
  font-weight: 950;
  color: var(--text);
`;

const HoverActions = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease;
  background: linear-gradient(to top, rgba(0,0,0,0.35), rgba(0,0,0,0.0));
`;

const IconButton = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.35);
  background: rgba(255,255,255,0.18);
  color: #fff;
  font-weight: 900;
  cursor: pointer;

  &:hover {
    background: rgba(255,255,255,0.26);
  }
`;

const Meta = styled.div`
  padding: 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Name = styled.div`
  font-weight: 900;
  font-size: 12px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Sub = styled.div`
  font-size: 11px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TopRow = styled.div`
  display: grid;
  grid-template-columns: 44px 1fr 44px 92px;
  gap: 10px;
  align-items: center;
`;

const Attach = styled.label`
  position: relative;
  display: inline-grid;
  place-items: center;
`;

const HiddenFile = styled.input`
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
`;

const AttachButton = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--panel);
  display: grid;
  place-items: center;
  font-size: 16px;
  box-shadow: var(--shadow);
`;

const UrlInput = styled.input`
  height: 44px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--text);
  padding: 0 14px;
  outline: none;
  box-shadow: var(--shadow);

  &::placeholder { color: rgba(107,114,128,0.9); }
`;

const AddUrlButton = styled.button`
  height: 44px;
  width: 44px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--text);
  font-weight: 950;
  cursor: pointer;
  box-shadow: var(--shadow);

  &:hover:enabled { background: var(--hover); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const StartButton = styled.button`
  height: 44px;
  border-radius: 14px;
  border: 1px solid rgba(239,68,68,0.25);
  background: rgba(239,68,68,0.10);
  color: var(--accent);
  font-weight: 950;
  cursor: pointer;
  box-shadow: var(--shadow);

  &:hover:enabled { background: rgba(239,68,68,0.14); }
  &:disabled { cursor: not-allowed; opacity: 0.55; }
`;

const OptionsRow = styled.div`
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const Pill = styled.button`
  border-radius: 999px;
  border: 1px solid ${(p) => (p.$on ? "rgba(239,68,68,0.28)" : "var(--border)")};
  background: ${(p) => (p.$on ? "rgba(239,68,68,0.10)" : "var(--panel)")};
  color: ${(p) => (p.$on ? "var(--accent)" : "var(--text)")};
  font-weight: 900;
  font-size: 12px;
  padding: 8px 10px;
  cursor: pointer;
  box-shadow: var(--shadow);

  &:hover { background: ${(p) => (p.$on ? "rgba(239,68,68,0.12)" : "var(--hover)")}; }
`;

const Panel = styled.div`
  margin-top: 12px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--panel);
  box-shadow: var(--shadow);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Group = styled.div`
  border: 1px solid var(--border);
  background: rgba(0,0,0,0.015);
  border-radius: 14px;
  padding: 10px;
`;

const GroupTitle = styled.div`
  font-weight: 950;
  font-size: 12px;
  color: var(--text);
  margin-bottom: 8px;
`;

const Fields = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 720px) { grid-template-columns: 1fr; }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.div`
  font-size: 11px;
  color: var(--muted);
  font-weight: 800;
`;

const Select = styled.select`
  height: 38px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text);
  padding: 0 10px;
  outline: none;

  &:focus {
    border-color: rgba(239,68,68,0.35);
    box-shadow: 0 0 0 3px rgba(239,68,68,0.10);
  }
`;

const Hint = styled.div`
  font-size: 11px;
  color: var(--muted);
  padding: 0 2px;
`;
