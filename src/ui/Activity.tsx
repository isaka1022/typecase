import type { ActivityEntry } from "../state/activity";

interface Props {
  entries: ActivityEntry[];
}

export default function Activity({ entries }: Props) {
  return (
    <div className="studio__section">
      <h3 className="studio__title">
        <span>What has happened</span>
      </h3>
      {entries.length === 0 ? (
        <p className="note">
          Nothing yet. Ask your agent to diagnose the page — everything it does to the layout will be
          listed here, with the reason.
        </p>
      ) : (
        <ol className="activity">
          {entries.map((entry) => (
            <li key={entry.id} className={`activity__item activity__item--${entry.actor}`}>
              <span className="activity__actor">{entry.actor === "agent" ? "agent" : "you"}</span>
              <p className="activity__headline">{entry.headline}</p>
              {entry.detail && <p className="activity__detail">{entry.detail}</p>}
              {entry.source && <span className="activity__source">{entry.source}</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
