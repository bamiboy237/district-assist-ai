import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { isAbortError } from "../api/client";
import type { AssistantReply } from "../api/client";
import type { AppContext } from "../app-context";

type Message =
  | { id: string; role: "user"; content: string }
  | {
      id: string;
      role: "assistant";
      content: string;
      citations: AssistantReply["citations"];
    };

export function AssistantPage() {
  const { api, district } = useOutletContext<AppContext>();
  const [searchParams, setSearchParams] = useSearchParams();
  const importId = searchParams.get("importId") ?? "";
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedMessage = message.trim();
    const trimmedImportId = importId.trim();
    if (!trimmedImportId) {
      setError("Enter an import ID or open this screen from an import result.");
      return;
    }
    if (!trimmedMessage) {
      setError("Write a question about this import.");
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setError(null);
    setIsSending(true);
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedMessage,
    };
    setMessages((existing) => [...existing, userMessage]);
    setMessage("");

    try {
      const reply = await api.askAboutImport(
        district.id,
        { message: trimmedMessage, importId: trimmedImportId },
        controller.signal,
      );
      setMessages((existing) => [
        ...existing,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: reply.answer,
          citations: reply.citations,
        },
      ]);
    } catch (reason) {
      if (isAbortError(reason)) return;
      setError(
        reason instanceof Error
          ? reason.message
          : "The assistant could not answer that question.",
      );
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      setIsSending(false);
    }
  }

  function updateImportId(value: string) {
    setSearchParams(value ? { importId: value } : {}, { replace: true });
  }

  return (
    <section className="assistant-page" aria-labelledby="assistant-heading">
      <header className="page-header">
        <div>
          <p className="eyebrow">Import support</p>
          <h1 id="assistant-heading">Ask about an import</h1>
          <p>
            Get a factual explanation of one import’s status, counts, and validation
            categories.
          </p>
        </div>
      </header>

      <div className="assistant-layout">
        <aside className="assistant-scope" aria-labelledby="assistant-scope-heading">
          <h2 id="assistant-scope-heading">Assistant scope</h2>
          <p>
            This assistant explains import results. It does not make decisions about
            students or expose individual student records.
          </p>
          <ul>
            <li>Import status and row counts</li>
            <li>Validation error categories</li>
            <li>Suggestions for correcting the source CSV</li>
          </ul>
        </aside>

        <div className="assistant-panel">
          <label className="field">
            <span>Import ID</span>
            <input
              className="import-id"
              value={importId}
              onChange={(event) => updateImportId(event.target.value)}
              placeholder="Open an import result to prefill this"
              inputMode="text"
            />
          </label>
          {messages.length === 0 ? (
            <div className="conversation-empty">
              <p>Try: “Which validation issue affected the most rows?”</p>
            </div>
          ) : (
            <ol className="conversation" aria-label="Assistant conversation">
              {messages.map((entry) => (
                <li key={entry.id} className={`message message-${entry.role}`}>
                  <p className="message-role">
                    {entry.role === "user" ? "You" : "DistrictAssist"}
                  </p>
                  <p>{entry.content}</p>
                  {entry.role === "assistant" && entry.citations.length > 0 ? (
                    <div className="citations">
                      {entry.citations.map((citation) => (
                        <Link
                          key={`${entry.id}-${citation.id}`}
                          to={`/imports?importId=${citation.id}`}
                        >
                          Import reference
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          )}

          <form className="assistant-form" onSubmit={(event) => void submit(event)}>
            <label className="field">
              <span>Your question</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Ask about the selected import"
                disabled={isSending}
              />
            </label>
            {error ? (
              <p className="error-notice" role="alert">
                {error}
              </p>
            ) : null}
            <button
              className="button button-primary"
              type="submit"
              disabled={isSending}
            >
              {isSending ? "Getting answer…" : "Ask assistant"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
