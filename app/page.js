"use client";

import { useEffect, useRef, useState } from "react";

const SUGGESTIONS = [
  { emoji: "🛡️", lines: ["Safe solo trips", "for women"], prompt: "Suggest safe solo trip destinations in India for women travelers, with practical safety tips" },
  { emoji: "🥾", lines: ["Treks in", "Maharashtra"], prompt: "Best treks in Maharashtra" },
  { emoji: "🛕", lines: ["Khajuraho in", "3 days"], prompt: "Plan a 3-day trip to Khajuraho" },
  { emoji: "🏛️", lines: ["Hampi ruins", "expedition"], prompt: "Plan a Hampi ruins expedition" },
  { emoji: "❄️", lines: ["Snowfall", "destinations"], prompt: "Best snowfall destinations in India right now" },
  { emoji: "🎋", lines: ["Meghalaya's hidden", "bamboo trek"], prompt: "Tell me about the bamboo trek in Meghalaya as a hidden gem, and similar offbeat spots nearby" },
];

const LOADING_PHRASES = [
  "Thinking...",
  "Checking the best season...",
  "Mapping out the route...",
  "Looking at stay options...",
  "Packing the itinerary...",
];

function extractPlaceCandidates(text) {
  const matches = [...text.matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1].trim());
  const seen = new Set();
  return matches
    .filter((m) => {
      if (m.length < 3 || m.length > 50) return false;
      if (seen.has(m)) return false;
      seen.add(m);
      return true;
    })
    .slice(0, 6);
}

function renderMarkdown(text) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  const lines = escaped.split("\n");
  let html = "";
  let inList = false;
  let paragraphBuffer = [];

  function flushParagraph() {
    if (paragraphBuffer.length) {
      html += "<p>" + paragraphBuffer.join("<br>") + "</p>";
      paragraphBuffer = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const isListLine = /^[-*]\s+/.test(line);
    if (line === "") {
      flushParagraph();
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      continue;
    }
    if (isListLine) {
      flushParagraph();
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += "<li>" + line.replace(/^[-*]\s+/, "") + "</li>";
    } else {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      paragraphBuffer.push(line);
    }
  }
  flushParagraph();
  if (inList) html += "</ul>";
  return html;
}

function extractHotelCards(text) {
  const openMarker = "```hotel-cards";
  const openIdx = text.indexOf(openMarker);
  if (openIdx === -1) return { cards: null, cleanText: text };
  const before = text.slice(0, openIdx);
  const afterOpen = text.slice(openIdx + openMarker.length);
  const closeIdx = afterOpen.indexOf("```");
  if (closeIdx === -1) {
    return { cards: null, cleanText: before.trim() };
  }
  const jsonStr = afterOpen.slice(0, closeIdx).trim();
  const after = afterOpen.slice(closeIdx + 3);
  let cards = null;
  try {
    cards = JSON.parse(jsonStr);
    if (!Array.isArray(cards)) cards = null;
  } catch {
    cards = null;
  }
  return { cards, cleanText: (before + after).trim() };
}

const BOOKING_AFFILIATE_ID = process.env.NEXT_PUBLIC_BOOKING_AFFILIATE_ID || "";

function hotelSearchUrl(query) {
  if (BOOKING_AFFILIATE_ID) {
    return (
      "https://www.booking.com/searchresults.html?aid=" +
      encodeURIComponent(BOOKING_AFFILIATE_ID) +
      "&ss=" +
      encodeURIComponent(query)
    );
  }
  return "https://www.google.com/travel/hotels?q=" + encodeURIComponent(query);
}

function HotelCards({ cards, savedPlaces, onSave }) {
  if (!cards || !cards.length) return null;
  return (
    <div className="hotel-cards-wrap">
      <div className="hotel-cards-grid">
        {cards.map((card, idx) => {
          const isSaved = savedPlaces.some((p) => p.name === card.name);
          return (
            <div className="hotel-card" key={card.name + idx}>
              <span className={"tier-badge tier-" + (card.tier || "mid-range")}>{card.tier || "mid-range"}</span>
              <div className="hotel-name">{card.name}</div>
              <div className="hotel-price">{card.price}</div>
              {card.note && <div className="hotel-note">{card.note}</div>}
              <div className="hotel-actions">
                <a
                  className="hotel-btn"
                  href={hotelSearchUrl(card.search || card.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  Website
                </a>
                <button
                  className={"hotel-btn" + (isSaved ? " saved" : "")}
                  onClick={() => !isSaved && onSave(card.name, card.price)}
                  disabled={isSaved}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                  </svg>
                  {isSaved ? "Saved" : "Save"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="hotel-disclaimer">
        Prices are approximate and subject to change without notice. Please contact the property directly to confirm current rates and availability.
        {BOOKING_AFFILIATE_ID && " Website links go through Booking.com and may earn Desi Nomads a small commission at no extra cost to you."}
      </div>
    </div>
  );
}

function extractQuickReplies(text) {
  const openMarker = "```quick-replies";
  const openIdx = text.indexOf(openMarker);
  if (openIdx === -1) return { replies: null, cleanText: text };
  const before = text.slice(0, openIdx);
  const afterOpen = text.slice(openIdx + openMarker.length);
  const closeIdx = afterOpen.indexOf("```");
  if (closeIdx === -1) {
    return { replies: null, cleanText: before.trim() };
  }
  const jsonStr = afterOpen.slice(0, closeIdx).trim();
  const after = afterOpen.slice(closeIdx + 3);
  let replies = null;
  try {
    replies = JSON.parse(jsonStr);
    if (!Array.isArray(replies)) replies = null;
  } catch {
    replies = null;
  }
  return { replies, cleanText: (before + after).trim() };
}

function QuickReplies({ replies, onSelect, disabled }) {
  if (!replies || !replies.length) return null;
  return (
    <div className="quick-replies">
      {replies.map((label, idx) => (
        <button
          key={label + idx}
          className="quick-reply-card"
          onClick={() => onSelect(label)}
          disabled={disabled}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function extractItineraryDays(text) {
  const openMarker = "```itinerary-days";
  const openIdx = text.indexOf(openMarker);
  if (openIdx === -1) return { days: null, cleanText: text };
  const before = text.slice(0, openIdx);
  const afterOpen = text.slice(openIdx + openMarker.length);
  const closeIdx = afterOpen.indexOf("```");
  if (closeIdx === -1) {
    return { days: null, cleanText: before.trim() };
  }
  const jsonStr = afterOpen.slice(0, closeIdx).trim();
  const after = afterOpen.slice(closeIdx + 3);
  let days = null;
  try {
    days = JSON.parse(jsonStr);
    if (!Array.isArray(days)) days = null;
  } catch {
    days = null;
  }
  return { days, cleanText: (before + after).trim() };
}

function parsePriceEstimate(priceStr) {
  if (!priceStr) return 0;
  const nums = priceStr.match(/[\d,]+/g);
  if (!nums || !nums.length) return 0;
  const values = nums.map((n) => parseInt(n.replace(/,/g, ""), 10)).filter((n) => !isNaN(n));
  if (!values.length) return 0;
  if (values.length >= 2) return Math.round((values[0] + values[1]) / 2);
  return values[0];
}

function SaveChips({ text, savedPlaces, onSave }) {
  const candidates = extractPlaceCandidates(text);
  if (!candidates.length) return null;
  return (
    <div className="save-chips">
      {candidates.map((name) => {
        const isSaved = savedPlaces.some((p) => p.name === name);
        return (
          <button
            key={name}
            className={"save-chip" + (isSaved ? " saved" : "")}
            onClick={() => !isSaved && onSave(name)}
            disabled={isSaved}
          >
            {isSaved ? "✓ Saved" : "+ Save " + name}
          </button>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [totalBudget, setTotalBudget] = useState(null);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [loadingPhraseIdx, setLoadingPhraseIdx] = useState(0);
  const [tripDays, setTripDays] = useState([]);
  const [feedback, setFeedback] = useState({});
  const [listening, setListening] = useState(false);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
  }, []);

  function toggleVoiceInput() {
    if (!recognitionRef.current) {
      alert("Voice input isn't supported in this browser. Try Chrome on desktop or Android.");
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  }

  const estimatedCost = savedPlaces.reduce((sum, p) => sum + parsePriceEstimate(p.price), 0);

  useEffect(() => {
    if (!loading) {
      setLoadingPhraseIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingPhraseIdx((i) => (i + 1) % LOADING_PHRASES.length);
    }, 1600);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    document.body.classList.toggle("light", theme === "light");
  }, [theme]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function sendMessage(text) {
    if (!text.trim() || loading) return;
    const updated = [...messages, { role: "user", content: text }];
    setMessages([...updated, { role: "assistant", content: "", streaming: true }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (!res.ok || contentType.includes("application/json")) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No reply received.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              const snapshot = accumulated;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: snapshot, streaming: true };
                return copy;
              });
            }
          } catch {
            // ignore any malformed/partial chunk
          }
        }
      }

      const finalText = accumulated;
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: finalText };
        return copy;
      });

      const { days } = extractItineraryDays(finalText);
      if (days && days.length) {
        setTripDays(days);
      }
    } catch (err) {
      const errorMessage = err.message || "Hazel is having trouble connecting right now. Please try again.";
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: "", error: true, errorMessage };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  }

  function handleSave(name, price) {
    setSavedPlaces((prev) => (prev.some((p) => p.name === name) ? prev : [...prev, { name, price }]));
  }

  function removePlace(idx) {
    setSavedPlaces((prev) => prev.filter((_, i) => i !== idx));
  }

  function sendFeedback(idx, rating) {
    setFeedback((prev) => ({ ...prev, [idx]: rating }));
    const question = messages[idx - 1]?.role === "user" ? messages[idx - 1].content : "";
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, question, answer: messages[idx]?.content || "" }),
    }).catch(() => {
      // feedback logging is best-effort; failing silently is fine here
    });
  }

  function startEditBudget() {
    setBudgetDraft(totalBudget ? String(totalBudget) : "");
    setEditingBudget(true);
  }

  function commitBudget() {
    const v = parseFloat(budgetDraft);
    setTotalBudget(isNaN(v) ? null : v);
    setEditingBudget(false);
  }

  function exportTrip() {
    let out = "DESI NOMADS — MY TRIP\n\n";
    out += "Budget\n  Total budget: " + (totalBudget ? "₹" + totalBudget.toLocaleString("en-IN") : "Not set") + "\n";
    out += "  Estimated cost (from saved stays): " + (estimatedCost > 0 ? "₹" + estimatedCost.toLocaleString("en-IN") : "Not enough data yet") + "\n\n";
    if (tripDays.length) {
      out += "Itinerary\n";
      tripDays.forEach((d) => {
        out += `  Day ${d.day}: ${d.title}` + (d.summary ? ` — ${d.summary}` : "") + "\n";
      });
      out += "\n";
    }
    out += `Saved places (${savedPlaces.length})\n`;
    out += savedPlaces.length
      ? savedPlaces.map((p) => "  - " + p.name + (p.price ? ` (${p.price})` : "")).join("\n")
      : "  None saved yet.";
    const blob = new Blob([out], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "desi-nomads-trip.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function newChat() {
    setMessages([]);
    setInput("");
  }

  return (
    <main>
      <header>
        <div className="header-inner">
        <div className="brand">
          <img src="/logo.png" alt="Desi Nomads" style={{ height: 44, width: "auto", display: "block" }} />
          <div className="brand-text">
            <div className="name logo-font">Desi Nomads</div>
            <div className="tagline">PLAN BEFORE YOU TRAVEL</div>
          </div>
        </div>
        <div className="header-right">
          <div className="powered-pill">✨ Powered by Hazel AI</div>
          <button className="btn-outline" onClick={newChat}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Chat
          </button>
          <div className="icon-toggle" onClick={() => setTheme(theme === "light" ? "dark" : "light")} title="Toggle theme">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          </div>
          <div className="avatar-wrap">
            <button className="avatar" onClick={() => setShowProfile(!showProfile)}>K</button>
            {showProfile && (
              <div className="profile-popover">
                <div className="profile-label">Guest</div>
                <div className="profile-divider"></div>
                <div className="profile-note">Need help or have a question?</div>
                <a className="profile-email" href="mailto:queries@desi-nomad.com">queries@desi-nomad.com</a>
              </div>
            )}
          </div>
        </div>
        </div>
      </header>

      <div className="app-body">
        <div className="chat-panel">
          <div className="messages-scroll" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="hero">
                <img className="mark" src="/logo.png" alt="" style={{ height: 70, width: "auto" }} />
                <h1>
                  ✨ Hi, I&apos;m <span className="accent">Hazel</span>
                </h1>
                <p className="sub">Your AI Travel Planner for India.</p>
                <p className="desc">
                  Discover hotels, restaurants, road trips, hidden gems,
                  <br />
                  itineraries and travel budgets — all in one conversation.
                </p>
                <div className="suggestions">
                  {SUGGESTIONS.map((s) => (
                    <button key={s.prompt} className="sugg-card" onClick={() => sendMessage(s.prompt)}>
                      <span className="emo">{s.emoji}</span>
                      <span className="label">
                        {s.lines.map((line, i) => (
                          <span key={i}>
                            {line}
                            {i < s.lines.length - 1 && <br />}
                          </span>
                        ))}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="thread">
              {messages.map((m, idx) => (
                <div key={idx} className={"msg-row " + (m.role === "user" ? "user" : "assistant")}>
                  {m.role !== "user" && <div className="hazel-icon">✨</div>}
                  {m.role === "user" ? (
                    <div className="bubble">
                      <p>{m.content}</p>
                    </div>
                  ) : m.error ? (
                    <div className="error-note">
                      {m.errorMessage || "Hazel is having trouble connecting right now. Please try again."}
                    </div>
                  ) : m.streaming && !m.content ? (
                    <div className="bubble">
                      <div className="typing-row">
                        <div className="typing">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                        <span className="typing-phrase" key={loadingPhraseIdx}>{LOADING_PHRASES[loadingPhraseIdx]}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bubble">
                      {(() => {
                        const { cards, cleanText: afterHotels } = extractHotelCards(m.content);
                        const { replies, cleanText: afterReplies } = extractQuickReplies(afterHotels);
                        const { cleanText } = extractItineraryDays(afterReplies);
                        return (
                          <>
                            {cleanText && <div dangerouslySetInnerHTML={{ __html: renderMarkdown(cleanText) }} />}
                            {m.streaming && <span className="stream-cursor">▍</span>}
                            {!m.streaming && <HotelCards cards={cards} savedPlaces={savedPlaces} onSave={handleSave} />}
                            {!m.streaming && (
                              <QuickReplies replies={replies} onSelect={sendMessage} disabled={loading} />
                            )}
                            {!m.streaming && !cards && (
                              <SaveChips text={cleanText} savedPlaces={savedPlaces} onSave={handleSave} />
                            )}
                            {!m.streaming && (
                              <div className="feedback-row">
                                <button
                                  className={"feedback-btn" + (feedback[idx] === "up" ? " active" : "")}
                                  onClick={() => sendFeedback(idx, "up")}
                                  disabled={!!feedback[idx]}
                                  title="Good answer"
                                >
                                  👍
                                </button>
                                <button
                                  className={"feedback-btn" + (feedback[idx] === "down" ? " active" : "")}
                                  onClick={() => sendFeedback(idx, "down")}
                                  disabled={!!feedback[idx]}
                                  title="Not helpful"
                                >
                                  👎
                                </button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="input-wrap">
            <div className="input-bar">
              <button className="icon-btn" title="Attach" type="button">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage(input);
                }}
                placeholder="Ask Hazel about hotels, itineraries, restaurants, budget or anything travel..."
              />
              <button
                className={"icon-btn" + (listening ? " listening" : "")}
                title={listening ? "Listening... click to stop" : "Voice input"}
                type="button"
                onClick={toggleVoiceInput}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
                </svg>
              </button>
              <button className="send-btn" title="Send" onClick={() => sendMessage(input)} disabled={loading}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
                </svg>
              </button>
            </div>
            <div className="disclaimer">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Hazel can make mistakes. Please verify important travel details. Questions?{" "}
              <a className="footer-email" href="mailto:queries@desi-nomad.com">queries@desi-nomad.com</a>
            </div>
          </div>
        </div>

        <div className="sidebar">
          <div className="sidebar-header" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <div className="title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
              </svg>
              My Trip
            </div>
            <svg
              className={"chev" + (sidebarCollapsed ? " collapsed" : "")}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </div>

          {!sidebarCollapsed && (
            <div className="sidebar-content">
              <div className="save-box">
                <svg
                  className="b-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ display: "block", margin: "0 auto 10px" }}
                >
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                </svg>
                Save places from the chat
                <br />
                to build your trip
              </div>

              <div>
                <div className="section-label">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" />
                    <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                  </svg>
                  Budget Summary
                </div>
                <div className="row-line">
                  <span>Total Budget</span>
                  {editingBudget ? (
                    <span className="val">
                      <input
                        type="number"
                        autoFocus
                        value={budgetDraft}
                        onChange={(e) => setBudgetDraft(e.target.value)}
                        onBlur={commitBudget}
                        onKeyDown={(e) => e.key === "Enter" && commitBudget()}
                        placeholder="₹ amount"
                      />
                    </span>
                  ) : (
                    <span className="val editable" onClick={startEditBudget}>
                      {totalBudget ? "₹" + totalBudget.toLocaleString("en-IN") : "—"}
                    </span>
                  )}
                </div>
                <div className="row-line">
                  <span>Estimated Cost</span>
                  <span className="val">{estimatedCost > 0 ? "₹" + estimatedCost.toLocaleString("en-IN") : "—"}</span>
                </div>
                <div className="row-line">
                  <span>Remaining</span>
                  <span className="val">
                    {totalBudget ? "₹" + Math.max(totalBudget - estimatedCost, 0).toLocaleString("en-IN") : "—"}
                  </span>
                </div>
              </div>

              {tripDays.length > 0 && (
                <div>
                  <div className="section-label">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    Trip Timeline
                  </div>
                  <div className="timeline-list">
                    {tripDays.map((d, idx) => (
                      <div className="timeline-item" key={idx}>
                        <div className="timeline-day">Day {d.day}</div>
                        <div className="timeline-title">{d.title}</div>
                        {d.summary && <div className="timeline-summary">{d.summary}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="section-label">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                  </svg>
                  Saved Places ({savedPlaces.length})
                </div>
                {savedPlaces.length === 0 ? (
                  <div className="places-empty">No places saved yet. Save hotels, restaurants or attractions from the chat.</div>
                ) : (
                  savedPlaces.map((item, idx) => (
                    <div className="place-item" key={item.name + idx}>
                      <span>
                        {item.name}
                        {item.price && <span className="place-price"> · {item.price}</span>}
                      </span>
                      <span className="rm" onClick={() => removePlace(idx)}>
                        ✕
                      </span>
                    </div>
                  ))
                )}
              </div>

              <button className="export-btn" onClick={exportTrip}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Export Trip
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}