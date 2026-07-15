import type { FireMessage } from "../data/fireDeck";

type FireMessageCardProps = {
  message: FireMessage;
  title?: string;
};

function getTypeLabel(type: FireMessage["type"]) {
  if (type === "quote") return "Citação";
  if (type === "reflection") return "Reflexão";
  return "Codex";
}

export function FireMessageCard({
  message,
  title = "Reflexão da Fogueira",
}: FireMessageCardProps) {
  return (
    <section className="fire-message-card">
      <div className="fire-message-header">
        <span className="fire-message-kicker">🔥 {title}</span>
        <span className="fire-message-type">{getTypeLabel(message.type)}</span>
      </div>

      <p className="fire-message-text">“{message.text}”</p>

      <div className="fire-message-footer">
        <span>— {message.signature}</span>
        <span>{message.universe}</span>
      </div>
    </section>
  );
}