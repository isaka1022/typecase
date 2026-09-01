import type { Finding } from "../typography/diagnose";

interface Props {
  findings: Finding[];
  script: "latin" | "cjk";
  mixedScript: boolean;
}

export default function Diagnostics({ findings, script, mixedScript }: Props) {
  const failing = findings.filter((f) => f.severity !== "ok").length;
  return (
    <div className="studio__section">
      <h3 className="studio__title">
        <span>Diagnosis</span>
        <span>{failing === 0 ? "all clear" : `${failing} to fix`}</span>
      </h3>
      {/* Latin is the assumption everywhere else, so only say it when it is not. */}
      {script === "cjk" && (
        <p className="note script-note">
          Judged as Japanese{mixedScript ? " (mixed with Latin)" : ""}. The character counts and the line
          spacing are held to different ranges than they would be for Latin text.
        </p>
      )}
      {findings.length === 0 ? (
        <p className="note">Measuring the page…</p>
      ) : (
        findings.map((finding) => (
          <div key={finding.ruleId} className={`finding finding--${finding.severity}`}>
            <div className="finding__head">
              <span className="finding__title">{finding.title}</span>
              <span className="finding__measured">{finding.measured}</span>
            </div>
            <p className="finding__message">{finding.message}</p>
            {finding.severity !== "ok" && (
              <p className="finding__why">
                {finding.why}
                <em className="finding__source">— {finding.source}</em>
                {finding.provenance && <em className="finding__provenance">{finding.provenance}</em>}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}
