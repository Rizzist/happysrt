// components/ThreadComposer.js
import { useMemo, useRef, useState } from "react";
import styled from "styled-components";

const LANGS = [
  { code: "auto", label: "Auto detect" },
  { code: "en", label: "English" },
  { code: "ur", label: "Urdu" },
  { code: "hi", label: "Hindi" },
  { code: "ar", label: "Arabic" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
];

const TARGETS = [
  { code: "en", label: "English" },
  { code: "ur", label: "Urdu" },
  { code: "hi", label: "Hindi" },
  { code: "ar", label: "Arabic" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
];

export default function ThreadComposer({ onStart }) {
  const fileRef = useRef(null);

  const [file, setFile] = useState(null);
  const [transcribeLang, setTranscribeLang] = useState("auto");
  const [doTranslate, setDoTranslate] = useState(false);
  const [translateTargets, setTranslateTargets] = useState(["en"]);
  const [doSummary, setDoSummary] = useState(true);

  const fileLabel = useMemo(() => {
    if (!file) return "Upload media (audio/video)";
    return `${file.name} • ${(file.size / (1024 * 1024)).toFixed(2)} MB`;
  }, [file]);

  const toggleTarget = (code) => {
    setTranslateTargets((prev) => {
      if (prev.includes(code)) return prev.filter((x) => x !== code);
      return [...prev, code];
    });
  };

  const start = () => {
    if (!file) return;

    onStart({
      file,
      options: {
        transcribeLang,
        translate: doTranslate ? translateTargets : [],
        summarize: !!doSummary,
      },
    });

    // reset just the file (so they can reuse settings)
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Bar>
      <Row>
        <HiddenFile
          ref={fileRef}
          type="file"
          accept="audio/*,video/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <UploadButton type="button" onClick={() => fileRef.current?.click()}>
          {file ? "Change file" : "Upload"}
        </UploadButton>

        <FilePill title={file ? file.name : ""}>{fileLabel}</FilePill>

        <StartButton type="button" onClick={start} disabled={!file}>
          Start
        </StartButton>
      </Row>

      <Options>
        <Group>
          <Label>Transcription</Label>
          <Select value={transcribeLang} onChange={(e) => setTranscribeLang(e.target.value)}>
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </Select>
        </Group>

        <Group>
          <ToggleRow>
            <Check
              type="checkbox"
              checked={doTranslate}
              onChange={(e) => setDoTranslate(e.target.checked)}
            />
            <Label>Translate</Label>
          </ToggleRow>

          <Targets $disabled={!doTranslate}>
            {TARGETS.map((t) => (
              <TargetBtn
                key={t.code}
                type="button"
                onClick={() => toggleTarget(t.code)}
                disabled={!doTranslate}
                $on={doTranslate && translateTargets.includes(t.code)}
              >
                {t.label}
              </TargetBtn>
            ))}
          </Targets>
        </Group>

        <Group>
          <ToggleRow>
            <Check
              type="checkbox"
              checked={doSummary}
              onChange={(e) => setDoSummary(e.target.checked)}
            />
            <Label>Summary</Label>
          </ToggleRow>
        </Group>
      </Options>
    </Bar>
  );
}

const Bar = styled.div`
  border-top: 1px solid var(--border);
  background: var(--panel);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Row = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const HiddenFile = styled.input`
  display: none;
`;

const UploadButton = styled.button`
  border: 1px solid var(--border);
  background: var(--hover);
  color: var(--text);
  border-radius: 12px;
  padding: 10px 12px;
  font-weight: 800;
  cursor: pointer;

  &:hover {
    background: #ededee;
  }
`;

const FilePill = styled.div`
  flex: 1;
  min-width: 0;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 12px;
  padding: 10px 12px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StartButton = styled.button`
  border: 1px solid rgba(239, 68, 68, 0.25);
  background: rgba(239, 68, 68, 0.1);
  color: var(--accent);
  border-radius: 12px;
  padding: 10px 14px;
  font-weight: 900;
  cursor: pointer;

  &:hover {
    background: rgba(239, 68, 68, 0.14);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const Options = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 200px;
`;

const Label = styled.div`
  font-size: 12px;
  color: var(--muted);
  font-weight: 800;
`;

const Select = styled.select`
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text);
  border-radius: 12px;
  padding: 10px 12px;
  font-weight: 700;
  outline: none;
`;

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Check = styled.input`
  width: 16px;
  height: 16px;
`;

const Targets = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  opacity: ${(p) => (p.$disabled ? 0.55 : 1)};
`;

const TargetBtn = styled.button`
  border-radius: 999px;
  padding: 8px 10px;
  font-weight: 800;
  cursor: pointer;

  border: 1px solid ${(p) => (p.$on ? "rgba(239,68,68,0.25)" : "var(--border)")};
  background: ${(p) => (p.$on ? "rgba(239,68,68,0.08)" : "#fff")};
  color: ${(p) => (p.$on ? "var(--accent)" : "var(--text)")};

  &:disabled {
    cursor: not-allowed;
  }
`;
