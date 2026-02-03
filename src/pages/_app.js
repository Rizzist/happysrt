// pages/_app.js
import { createGlobalStyle } from "styled-components";
import { AuthProvider } from "../contexts/AuthContext";

const GlobalStyle = createGlobalStyle`
  :root{
    --bg: #ffffff;
    --panel: #ffffff;
    --panel-2: #f7f7f8;     /* chatgpt-ish sidebar gray */
    --text: #111827;
    --muted: #6b7280;
    --border: #e5e7eb;
    --hover: #f3f4f6;

    --accent: #ef4444;      /* red accent */
    --accent-soft: rgba(239, 68, 68, 0.10);

    --shadow: 0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06);
  }

  * { box-sizing: border-box; }
  html, body, #__next { height: 100%; }

  body {
    margin: 0;
    padding: 0;
    background: var(--bg);
    color: var(--text);
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  a { color: inherit; text-decoration: none; }
  button { font-family: inherit; }

  /* Optional: nicer scrollbars (Chromium) */
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 999px; }
  ::-webkit-scrollbar-track { background: transparent; }
`;

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <GlobalStyle />
      <Component {...pageProps} />
    </AuthProvider>
  );
}
