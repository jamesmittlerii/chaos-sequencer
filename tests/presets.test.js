import { decodeState, encodeState, parseLocation, shareUrl } from "../js/presets.js";
import defaultPreset from "../presets/default.json" with { type: "json" };
import trioPreset from "../presets/trio.json" with { type: "json" };

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const roundTrip = decodeState(encodeState(trioPreset));
assert(roundTrip.params.voice2Enable === true, "encode/decode lost voice flags");
assert(roundTrip.params.root === "D", "encode/decode lost root");
assert(roundTrip.params.timingInfluence === 0, "numeric zeros must survive");

const loc = {
  href: "https://jamesmittlerii.github.io/chaos-sequencer/",
  hash: "#p=" + encodeState(defaultPreset),
  search: "",
  pathname: "/chaos-sequencer/",
  origin: "https://jamesmittlerii.github.io",
};
const parsed = parseLocation(loc);
assert(parsed.type === "inline", "hash p= should parse as inline");
assert(parsed.preset.params.scale === "pentatonic-minor", "inline preset payload");

const named = parseLocation({ hash: "#preset=trio", search: "", href: loc.href });
assert(named.type === "named" && named.name === "trio", "named catalog hash");

const shared = shareUrl(trioPreset, loc);
assert(shared.startsWith("https://jamesmittlerii.github.io/chaos-sequencer/#p="), shared);
assert(!shared.includes("?"), "share URLs should not keep query strings");

console.log("presets ok");
