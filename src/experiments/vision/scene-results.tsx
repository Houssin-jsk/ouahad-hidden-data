import type { SceneDiscovery } from "@/scene/ranking";
import { SCENE_LIBRARY } from "@/scene/candidates";
export function SceneResults({ discovery }: { discovery: SceneDiscovery }) {
  const [best, ...alternatives] = discovery.leading;
  return (
    <section aria-label="Scene discovery">
      <p className="eyebrow">SCENE DISCOVERY · EXPERIMENTAL</p>
      <h2>Closest scene match</h2>
      <h3>{best.description}</h3>
      <p>
        Closest within our {SCENE_LIBRARY.length}-description library. This is a
        supplied description, not a generated caption.
      </p>
      <h3>Themes among leading matches</h3>
      <p>{discovery.themes.join(" · ")}</p>
      <h3>Alternative interpretations</h3>
      <ol>
        {alternatives.slice(0, 3).map((match) => (
          <li key={match.id}>{match.description}</li>
        ))}
      </ol>
      <p role="note">
        {discovery.viewAgreement === "different-leading-matches"
          ? "Ambiguous across views: different crops favor different descriptions. Keep the alternatives in mind."
          : discovery.viewAgreement === "same-leading-match"
            ? "These views share a leading match. Overlapping crops are correlated; agreement is not proof of correctness."
            : "Whole-image view only. A leading match does not establish that the scene is correct."}
      </p>
      {discovery.views.length > 1 && (
        <details>
          <summary>Compare image coverage</summary>
          <ul>
            {discovery.views.map((view) => (
              <li key={view.name}>
                <strong>{view.name}</strong> · {view.ranking[0].description}
              </li>
            ))}
          </ul>
          <p>
            The full-image match stays primary. Crop scores are not averaged and
            these are not object detections.
          </p>
        </details>
      )}
      <details>
        <summary>Technical similarity details</summary>
        <p>
          Cosine similarity of CLIP image/text embeddings. Higher means closer
          in this embedding space; no calibrated probability or universal
          confidence threshold is used. Top-two gap:{" "}
          {(best.cosine - discovery.leading[1].cosine).toFixed(3)}.
        </p>
        <ol>
          {discovery.leading.map((match) => (
            <li key={match.id}>
              {match.description} · cosine {match.cosine.toFixed(3)}
            </li>
          ))}
        </ol>
        <p>
          Library {discovery.libraryVersion}. No category-summed scores or
          synonym voting.
        </p>
      </details>
      <p>
        The library can miss unfamiliar scenes. Matching does not count objects,
        establish identity or location, or explain causes. All pixels remain in
        your browser.
      </p>
    </section>
  );
}
